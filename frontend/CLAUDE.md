# AutoEvoFlow — гид по проекту

> **📌 ПОДДЕРЖКА ЭТОГО ФАЙЛА:** дописывай сюда новые принципы, ловушки и
> архитектурные решения по мере их появления в работе. Особенно — баги графа
> эволюции (в раздел «Критические ловушки») и новые правила связей/раскладки.
> Файл = живая память проекта между сессиями.

Next.js 14 (App Router) платформа автомобильной эволюции. Фронтенд работает
автономно: данные читаются из статических JSON в `public/data/` через `fetch()`
(НЕ через webpack import — иначе OOM на 800+ узлах графа).

> ⚠️ **ЛОВУШКА auth-middleware** (`src/middleware.ts`): matcher ОБЯЗАН исключать
> `data/`, `images/` (статика Next отдаётся по `/data`, НЕ `/public`!) и публичные
> API-прокси (`api/car-image`, `api/netcarshow-image`, `api/latest-cars`). Иначе
> `fetch('/data/evolution/graph.json')` редиректится на `/login` → «Нет данных».
> Если автоматизация пересоздаст middleware с `public` в matcher — это БАГ, чинить.

Запуск dev-сервера:
```
cd frontend && NODE_OPTIONS="--max-old-space-size=2048" npx next dev -p 3200
```

---

## Граф эволюции (`public/data/evolution/graph.json`)

Главный артефакт проекта. ~880 узлов, ~910 рёбер. Рендерится через Cytoscape.js
в `src/components/graph/EvolutionGraph.tsx`. 5 лейаутов: Древо (fork), Династия
(eras), Типаж (zone), Арена (sync), Мощность (cola).

**Мощность (cola)** = X: мощность (л.с.), Y: тип двигателя (полосы `engineBands`),
физика cola кластеризует по видимым рёбрам. **Платформенное зонирование**: группы =
компоненты связности `shares_platform`; каждой группе — цвет-кольцо у узлов
(`PLAT_PALETTE`), а рёбра `shares_platform` в cola короче (42 vs 95) → группы
стягиваются в зоны. Так видны платформенные семьи: MLB-Evo (Q7/Cayenne/Touareg/
Bentayga/Urus/Q8), MQB, MEB (+Ford Explorer/Capri EV), J1/PPE, MSB. shares_platform
показан ТОЛЬКО в Мощности (в Древе скрыт — даёт паутину).

### Структура узла
```json
{ "id":"audi-a4b9", "label":"A4 B9", "type":"generation", "year":2015,
  "brandId":"audi", "brandName":"Audi", "codeName":"B9", "modelSlug":"audi-a4",
  "bodyType":"sedan", "segment":"premium_compact", "zone":"midsize_sed",
  "hp":190, "engineType":"i4t" }
```
- `zone` — ОБЯЗАТЕЛЕН (иначе модель падает в дефолт `midsize_sed`). Значения:
  `hypercar, supercar, sports, gt_coupe, open_top, flagship_sed, exec_sed,
  midsize_sed, estate, suv_large, suv_mid, suv_compact, hatchback, electric,
  pickup, concept`.
- `engineType`: `ev, hybrid, v16h, w16, v12, v12t, flat12, v10, v8t, v8h, v8,
  flat6t, flat6, i8, i6t, i6, i5t, v6t, v6h, v6, i4t, i4h, i4, flat4t, flat4`.

### ⭐ Типы связей (рёбер) — ГЛАВНОЕ ПРАВИЛО
| Тип | Смысл | Колонка X | Глубина (поколение) | Вид в графе |
|-----|-------|-----------|---------------------|-------------|
| `evolves_into` | следующее поколение | та же | +1 | вертикальная стрелка ↓ |
| `variant_of` | версия ТОЙ ЖЕ модели (M3, RS6, S5, AMG, E63) | **та же** | = базы | ⬠ пятиугольник, фуксия |
| `facelifted_to` | рестайлинг (B8.5, LCI, Phase II) | та же, слева | = базы | ○ пунктир, голубой |
| `derived_from` | **САМОСТОЯТЕЛЬНАЯ** производная (A7←A6, X6←X5, Cayman←Boxster, Maybach←S-Class) | **ОТДЕЛЬНАЯ**, сразу справа от родителя | наследует от родителя | ○ кружок |
| `concept_to_production` | концепт → серийная модель (A6 e-tron Concept ⇒ A6 e-tron) | отдельная, примыкает к production | = production − 1 (предшественник) | ◇ золотой ромб |
| `influenced_by` | влияние/происхождение | НЕ влияет | НЕ влияет | пунктир |
| `shares_platform` | общая платформа | НЕ влияет | НЕ влияет | — |

**Ключевое различие `variant_of` vs `derived_from`:**
- `variant_of` = та же модель, другая версия (performance/AMG/RS) → пятиугольник
  В КОЛОНКЕ базы.
- `derived_from` = родственная, но ОТДЕЛЬНАЯ модель → СВОЯ колонка справа от родителя.
- ⚠️ ОПАСНО спутать: если самостоятельная производная, открывающая свою цепь
  `evolves_into`, помечена `variant_of`, то `getColumnKey` утянет ВСЮ её цепь в
  колонку базы. Пример (исправлено): `308 GTB →variant_of→ 288 GTO` тащил halo-линию
  `288 GTO→F40→F50→Enzo→LaFerrari→SF90→F80` в колонку 308 (F40 «висел» от 308).
  Должно быть `308 →derived_from→ 288 GTO` → halo-линия = отдельная ветка справа.
- ⚠️ Один корень с НЕСКОЛЬКИМИ `evolves_into`-детьми сливает все эти цепи в ОДНУ
  колонку (у всех общий evolve-корень). Главная линия — `evolves_into`, ПАРАЛЛЕЛЬНЫЕ
  линии — `derived_from` (своя колонка). Примеры Lamborghini (исправлено):
  `350 GT →derived_from→ Espada→Jarama` (переднемоторные GT отделены от флагмана
  `350 GT→Miura→Countach→Diablo→…`); V10 `Murciélago →derived_from→ Gallardo→Huracán`
  (а не `Diablo →influenced_by→ Gallardo`, из-за чего V10 висела в «Основателях»).

**Электромобили — `evolves_into` vs `derived_from`:**
- EV **заменяет/продолжает** линию (G580 EQ = новый G-Class, заменил W463B) →
  `evolves_into` (следующее поколение в той же колонке).
- EV идёт **параллельно** одноимённой ДВС-модели (A6 e-tron рядом с A6 C8) →
  `derived_from` (отдельная колонка).

### ⚠️ Критические ловушки (баги, которые уже ловили — НЕ повторять)

1. **`evolves_into` НЕЛЬЗЯ вести от фейслифт-ноды.** У фейслифтов (целей
   `facelifted_to`) нет evolves-предшественника в BFS → потомок «зависает» на
   глубине 1. Вести основную цепь от БАЗОВОЙ ноды.
   *Пример:* `A4 B9 → A5 B10` (НЕ `A4 B9.5 → A5 B10`). `ML W166 → GLE W167`
   (НЕ `GLE W166 → GLE W167`).

2. ~~`derived_from` поднимает глубину ПОСЛЕ BFS~~ **РЕШЕНО на уровне алгоритма**
   (см. ниже — единый max-цикл). Раньше производная/variant-модель со своей
   `evolves_into`-цепью получала перевёрнутый порядок поколений (CLK W209 выше
   W208, X6 G06 на уровне X6 E71). Теперь алгоритм считает корректно при ЛЮБОМ
   типе связи. Отдельные ручные обходы через `influenced_by` (CLK←E-Class,
   GL/GLS←ML) больше не обязательны, но и не вредят.

3. **Суб-версии (AMG/Maybach) — `variant_of` от СВОЕГО поколения базы**, а не
   цепь между собой. *Пример:* `E-Class W212 →variant_of→ E63 AMG W212`
   (НЕ `E55 →evolves→ E63 →evolves→ E63 S`).

4. **Двойные связи к одному узлу** (variant_of + evolves_into) создают
   визуальный шум — оставлять одну (обычно variant_of от базы).

5. **`influenced_by` обязан соблюдать хронологию**: `year(источник) ≤ year(цель)`.
   Удалять ТОЛЬКО если источник СТРОГО новее цели (`year(источник) > year(цель)`).
   Одногодки (равный год) — ВАЛИДНЫ (модели одного года влияют друг на друга,
   напр. Golf Mk8 ⇢ ID.3, X5 G05 ⇢ X7 G07). Проверять при каждом добавлении.
   Дубликаты рёбер (одинаковые source+target+type) тоже удалять.

6. **`concept_to_production` и `evolves_into` — тоже хронология**: концепт/предок
   обязан быть НЕ НОВЕЕ потомка (`year(source) ≤ year(target)`). Концепт — это
   ПРЕДШЕСТВЕННИК серийной модели. Ловили: IMs Concept 2019 →c2p→ Leaf 2017 (цель
   старше — перецепили на Ariya 2021); LF-1 2018 →c2p→ LC500 2017 (перецепили на
   RX AL30 2022). Обратные `evolves_into` (source новее target) — почти всегда
   мусор авто-синка скрапера (`sync-ev-*` между `ncs-` нодами). Чинилось
   `fix-concept-chronology.js`.

### Алгоритм глубины (в EvolutionGraph.tsx, fork-блок)
**ЕДИНЫЙ итеративный цикл с `max` до стабилизации** (НЕ раздельные BFS+propagation):
- `evolves_into`: `depth[t] = max(depth[t], depth[s] + 1)`
- `variant_of`/`derived_from`/`facelifted_to`: `depth[t] = max(depth[t], depth[s])`
- Повтор пока есть изменения (обычно 3 итерации, лимит 60).
- Концепты: `depth = depth(production) − 1` после основного цикла.

Почему max-цикл, а не BFS+propagation: variant-модель «приклеивается» к уровню
базы, а её собственная evolves-цепь корректно растёт вниз. Раздельный порядок
(BFS перед propagation) переворачивал такие цепи — это была ловушка #2.
Проверка: 0 перевёрнутых `evolves_into` (depth[source] < depth[target] всегда).

### columnKey (какая модель в какой колонке X)
`getColumnKey(id)` рекурсивно: `variant→base` (getRootFK по variant_of+
facelifted_to, БЕЗ derived_from), затем `evolve→root` (fkEvolveRoot), повтор до
стабилизации. Рекурсия нужна т.к. evolve-корень сам может быть вариантом
(напр. AMG-цепь). `variantParentFK` НЕ включает `derived_from` — поэтому
производные получают отдельную колонку.

### Сортировка
- **Колонки брендов** (между собой) → по году основания (`BRAND_FOUNDED_FK`).
  Škoda 1895 → Rimac 2009.
- **Линии моделей внутри бренда** → по году 1-го поколения (`colKeyYear`).
- **Производная колонка** (derived_from) → переупорядочивается СРАЗУ справа от
  родительской, независимо от года.

### Позиционирование в Древе (fork)
- Базовая модель — на линии поколения (Y = depth × dynLevelH).
- Модификации (`variant_of`, slot +1,+2…) — единый отступ вниз `VAR_DROP_FK=72`,
  смещение по X = slot × NODE_W_FK. Все модификации на ОДНОМ Y.
- Фейслифты (slot −1,−2…) — слева от базы.
- Стрелки `evolves_into` строго вертикальны (вся цепь на одном X).

### Видимость рёбер в Древе (applyEdgeVisibility, case 'fork')
- Показываются: `evolves_into`, `variant_of`, `derived_from`, `concept_to_production`
  (opacity 0.88), `facelifted_to` (0.80).
- `influenced_by` ВНУТРИ бренда И сила **> 0.60** → **ДУГА СВЕРХУ** (opacity 0.58):
  от ВЕРХНЕЙ точки контура влияющего к ВЕРХНЕЙ точке контура цели. Реализация —
  `styleInfluenceArcs()` (вызывается в layoutstop после `distributeFkEndpoints`):
  `curve-style: unbundled-bezier`, `source/target-endpoint = 0px -r` (верх кружка),
  `control-point-distances = (tp.x≥sp.x ? −1 : 1)·78` — выгиб всегда ВВЕРХ
  (Cytoscape строит контрольную точку по перпендикуляру `(−dy, dx)`).
  Влияние ИСКЛЮЧЕНО из `distributeFkEndpoints` (своя точка — верх контура).
- Скрыто: `influenced_by` с силой **≤ 0.60**, кросс-брендовые `influenced_by`,
  ВСЕ `shares_platform` — дают визуальную паутину. Платформы — отдельный срез.

### Сироты влияния — перепозиционирование в Древе (после цикла по брендам)
Узел БЕЗ структурного родителя И потомка (нет входящих/исходящих evolves_into/
variant_of/derived_from/facelifted_to/concept_to_production), но с сильным
(**>0.60**) `influenced_by` → ставится **строго на Y влияющего**, X **сразу справа
от всех его модификаций** (`fkColMaxX[колонка влияющего] + NODE_W_FK`). Иначе такой
узел висел бы в ряду «Основатели» (depth 0). Если место занято соседней колонкой —
сдвиг ТОЛЬКО по X (Y неизменен — требование). 8 кейсов: Purosangue←GTC4Lusso,
Grecale←Levante, X2←X1, iX3←i3, i7←i4, Roma←Portofino, A2←A8 D2, Q4 e-tron←e-tron GT.
Узлы со СВОЕЙ веткой (M2←M3, CLS←E-Class, EQS←EQC, …) НЕ двигаются — только дуга.

---

## Новинки (`/latest`)

Скрапер `scripts/scrape-latest.js` → `public/data/latest-cars.json`. Источники:
netcarshow.com (HTML, класс `swSBE`), carscoops RSS (с фильтром не-модельных
новостей). Изображения netcarshow — паттерн `Brand-Model-Year-wallpaper.jpg`
(НЕ `-1280.jpg` — даёт 404).

**Синхронизация во все вкладки:** `scripts/sync-latest-to-project.js` —
добавляет новинки в граф (с inferZone/inferEngine из описания), brand JSON,
model JSON. Запускается автоматом из scrape-latest.js. Команда:
`npm run update:latest`. В `main()` есть **БЕЛЫЙ СПИСОК** (25 брендов) +
`BRAND_ALIAS` (mercedes-benz→mercedes, aston_martin→astonmartin, …): вне-брендовое
отбрасывается ДО синка во все вкладки.

> ✅ **Баги скрапера (исправлены, держать так):**
> 1. *Авто-родитель.* Раньше `findParentNode` без матча в `SUCCESSORS` брал «самую
>    свежую ноду бренда» и цеплял `evolves_into` (мусор: i5→M2, цепочки концептов).
>    Теперь **возвращает `null`** → узел добавляется без родителя (ручная привязка).
> 2. *Дедуп.* `candidateId` строился иначе, чем `node.id` из `makeGraphNode`, и не
>    совпадал → одни модели (Q7, SQ7, Macan GTS, iX3 LWB) дублировались КАЖДЫЙ
>    прогон. Теперь дедуп по реальному `node.id`.
> 3. *Широкие ключи `SUCCESSORS`.* Ключ `'z '` поймал «ben**Z A**MG» → кросс-брендовое
>    ребро Nissan Z → Mercedes. Кросс-брендовых `evolves_into` быть НЕ должно.
>
> После скрейпа всё равно проверять `sync-ev-*` рёбра и `ncs-` узлы. Чинилось:
> `fix-bmw-porsche-edges.js`, `cleanup-after-scrape.js`.

**Rolls-Royce (31) и Bentley (40)** — полные линейки (`add-rolls-royce-bentley.js`
+ `supplement-q7-rr-bentley.js`):
- RR: Phantom V→VI→VII→VIII (+EWB), Ghost I→II (+Black Badge/EWB), Wraith, Dawn,
  Corniche, Camargue, Cullinan, Spectre; Silver Cloud→Shadow→Spirit→Seraph→Ghost.
- Bentley непрерывный ствол: Speed Six(1928)→8 Litre→Mark VI→R-Type→S1→S2→S3→
  T-Series→Turbo R→Arnage→Mulsanne; Continental GT I–IV + GTC I–III/Speed/
  Supersports/Bacalar/Batur, Flying Spur I–IV, Bentayga (+Speed/EWB/Hybrid).
- 4 концепта-сироты намеренно standalone (нет серийного потомка): RR Project
  Nightingale, Bentley EXP 15/10/100. EXP 9 F →c2p→ Bentayga.

> ⚠️ Бренд-страницы netcarshow (`/rolls-royce/`, `/bentley/`) дают HTTP 200 на HEAD,
> но полный GET ТАЙМАУТИТ из этой среды (тяжёлые, в отличие от `/latest-cars.html`).
> Полный каталог скрапить ненадёжно → линейки дополнены из автобазы (как остальные
> 23 бренда). Audi Q7: добавлено 2-е поколение (4M) + привязаны Q7/SQ7 2027.

**Расписание (бесплатно, без Claude Code):** `scripts/scheduler.js` (node-cron),
`scripts/setup-scheduler.bat` (Windows Task Scheduler), или внешний крон через
`GET /api/cron/scrape`. Каждые 6 часов.

---

## Изображения автомобилей — прокси (hotlink protection)

caricos.com и netcarshow.com отдают картинки ТОЛЬКО с `Referer` своего домена.
Браузерный `<img>` с нашего домена получает HTML-заглушку. Решение — серверные
прокси:
- `/api/car-image?slug=<modelSlug>` — caricos + netcarshow (из model JSON по slug)
- `/api/netcarshow-image?url=<url>` — netcarshow по прямому URL

Используется в тултипах графа (`heroImageUrl`) и карточках брендов.

---

## Цветовая схема

Primary = **Saffron Fire `#F97316`** (Lamborghini Arancio / McLaren Papaya /
Brembo). Тёплый near-black фон `#09080A`. НЕ возвращать старый cyan `#00d4ff`
(он остался только как семантический цвет ребра `evolves_into`).

---

## Бренды в графе (37 — БЕЛЫЙ СПИСОК)

EU (27): bmw, mercedes, audi, volkswagen, porsche, ferrari, lamborghini, mclaren,
astonmartin, bugatti, pagani, koenigsegg, rimac, seat, skoda, lotus, maserati,
rolls-royce, bentley, gordon-murray, zenvo, de-tomaso, morgan, tvr, caterham,
pininfarina, hispano-suiza.
US (3): hennessey, ssc, saleen.
JP (7): toyota, lexus, honda, nissan, mazda, subaru, aspark.

Бутиковые (`add-gma-zenvo-detomaso.js`, `add-boutique-batch2.js`):
- Gordon Murray (T.50→T.33, infl от McLaren F1), Zenvo (ST1→TSR-S→Aurora),
  De Tomaso (Vallelunga→…→P72→P900).
- Morgan (4/4→Plus 4→Plus 8→Aero 8→Plus Six→Supersport + 3 Wheeler→Super 3),
  TVR (Grantura→…→Sagaris→Griffith 2017), Caterham (Seven + варианты, Project V).
- Hennessey (Venom GT→F5), SSC (Aero→Tuatara), Saleen (S7→S1).
- Pininfarina (Battista→B95, shares_platform с Rimac Nevera), Hispano Suiza
  (Carmen→Boulogne), Aspark (Owl).

Список в `src/app/evolution/page.tsx` (BRANDS) — при добавлении бренда обновить
там И в `BRAND_FOUNDED_FK` + `BRAND_COLOR_FK`/`_E` + белом списке `sync-latest-to-project.js`.

> ⚠️ **Скрапер тащит ВНЕ-брендовые ноды** (Ford, Ram, Cadillac, BAIC, Hyundai,
> GMC, Geely, …) и рассинхрон `brandId` (`mercedes-benz` вместо `mercedes`).
> Это ЗАСОРЯЕТ граф (он только для 25 брендов выше). Чистилось скриптом
> `cleanup-scraper-pollution.js` (удалить ноды с `brandId` вне белого списка +
> их рёбра). После скрейпа проверять: `brandId` ∉ белого списка → удалять ноду.
