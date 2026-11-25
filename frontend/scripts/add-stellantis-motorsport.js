'use strict'
// Архив новости «Stellantis останавливает заводской автоспорт» (ноябрь 2026) в виде модельных рядов в графе эволюции.
// Добавляются гоночные программы, которых коснулось (или не коснулось) решение: Peugeot (Ле-Ман/WEC), Alpine (WEC, Формула-1),
// Dacia (Дакар), Citroën и Opel (Формула-E), а также уцелевшие Lancia (Rally2) и Maserati (GT4).
//
//   node scripts/add-stellantis-motorsport.js                    — проверка и план (в файл ничего не пишется)
//   node scripts/add-stellantis-motorsport.js --apply            — записать в public/data/evolution/graph.json
//   node scripts/add-stellantis-motorsport.js --apply --graph X  — записать в другой graph.json (например, копию origin/main)
//
// Идемпотентно: узлы и рёбра, которые уже есть, пропускаются. Существующие узлы не изменяются.
// Принцип: в note — только то, что подтверждено источником (Wikipedia / пресс-релизы Stellantis, Renault Group, Motorsport.com,
// Autosport, electrive, DirtFish — проверено в ноябре 2026). Неподтверждённое («продали завод Alpine», «продали Aston Martin»
// из исходного сообщения) в граф НЕ вносится.

const fs = require('fs')
const path = require('path')

const apply = process.argv.includes('--apply')
const gi = process.argv.indexOf('--graph')
const GRAPH = gi > 0 ? process.argv[gi + 1] : path.join(__dirname, '..', 'public', 'data', 'evolution', 'graph.json')

// Общие поля гоночного узла (как у существующих: zone/segment racing, isRacing)
const race = o => ({ type: 'generation', segment: 'racing', zone: 'racing', isRacing: true, ...o })

const PEUGEOT = { brandId: 'peugeot', brandName: 'Peugeot' }
const ALPINE = { brandId: 'alpine', brandName: 'Alpine' }

const NODES = [
  // ── Peugeot: спорт-прототипы для Ле-Мана и WEC (программа WEC закрыта немедленно, ноябрь 2026) ────────────────
  race({
    id: 'peugeot-905', label: '905', fullName: 'Peugeot 905', year: 1990, ...PEUGEOT,
    modelSlug: 'peugeot-905', familyKey: 'peugeot-905', bodyType: 'coupe', hp: 650, engineType: 'v10',
    note: 'Спорт-прототип Peugeot Talbot Sport под регламент чемпионата мира 1991 г. (проект объявлен в ноябре 1988 г., официальная презентация — 4 июля 1990 г., Маньи-Кур), дебют — последние два этапа сезона 1990. Карбоновое шасси Dassault, атмосферный V10 SA35-A1 объёмом 3499 см³ (близкий по конструкции к моторам Ф1 того времени), 650 PS при 12 500 об/мин. За карьеру 17 гонок и 9 побед; победа в «24 часах Ле-Мана» 1992 (Уорвик / Далма / Бландел) и титулы пилотов и команд чемпионата мира среди спорт-прототипов 1992 г.; в 1993-м в Ле-Мане победил 905B. Преемник — 908 HDi FAP. Источник: Wikipedia Peugeot 905.',
  }),
  race({
    id: 'peugeot-905b', label: '905B', fullName: 'Peugeot 905B', year: 1991, ...PEUGEOT,
    modelSlug: 'peugeot-905', familyKey: 'peugeot-905', bodyType: 'coupe', hp: 715, engineType: 'v10',
    note: 'Эволюционная версия 905 для борьбы с Jaguar во второй половине сезона 1991: переработанная аэродинамика (двухъярусное заднее крыло, опциональное переднее крыло во всю ширину) и более мощный мотор SA35-A2 (≈715 л.с. по данным Wikipedia). Дебют — этап на Нюрбургринге 1991. На 905B Peugeot выиграл «24 часа Ле-Мана» 1993 (Брэбэм / Бушю / Элари); на эту победу ссылаются номера 93 и 94 у 9X8. Источники: Wikipedia Peugeot 905, Peugeot 9X8.',
  }),
  race({
    id: 'peugeot-908-hdi-fap', label: '908 HDi FAP', fullName: 'Peugeot 908 HDi FAP', year: 2007, ...PEUGEOT,
    modelSlug: 'peugeot-908', familyKey: 'peugeot-908', bodyType: 'coupe', hp: 730, engineType: 'v12t',
    note: 'LMP1-прототип Peugeot Sport с дизелем HDi FAP 5,5 л (максимум регламента Ле-Мана): V12 с развалом 100° для понижения центра тяжести, более 730 л.с. и 1200 Н·м. Разработка с 2005 г., презентация 15 июня 2006 г., дебют и первая победа — 1000 км Монцы 2007; всего 20 побед. Победитель «24 часов Ле-Мана» 2009 (дубль). Вторая дизельная спортивная машина крупного производителя после Audi R10 TDI. HDi — «впрыск высокого давления», FAP — сажевый фильтр. Источник: Wikipedia Peugeot 908 HDi FAP.',
  }),
  race({
    id: 'peugeot-908-hy', label: '908 HY', fullName: 'Peugeot 908 HY', year: 2008, ...PEUGEOT,
    modelSlug: 'peugeot-908', familyKey: 'peugeot-908', bodyType: 'coupe', hp: 730, engineType: 'v12t',
    note: 'Гибридный вариант дизельного 908 с системой рекуперации энергии (KERS): представлен на 1000 км Сильверстоуна 2008 г. Тот же дизельный V12 5,5 л, что у 908 HDi FAP. Источник: Wikipedia Peugeot 908 HDi FAP.',
  }),
  race({
    id: 'peugeot-908-v8', label: '908', fullName: 'Peugeot 908', codeName: 'V8 HDi', year: 2011, ...PEUGEOT,
    modelSlug: 'peugeot-908', familyKey: 'peugeot-908', bodyType: 'coupe', hp: 550, engineType: 'v8t',
    note: 'Преемник 908 HDi FAP под регламент Ле-Мана 2011 г.: дизельный V8 HDi FAP объёмом 3,7 л (развал 90°, 550 л.с.) вместо V12 5,5 л — лимит объёма дизелей снизили, плюс увеличенные передние колёса и обязательный по регламенту ACO стабилизатор-плавник. Проект 90X, официальная презентация — 3 февраля 2011 г.; дебют и первая победа — 12 часов Себринга 2011. Последний прототип марки до возвращения в 2022 г. с 9X8 («первый за 11 лет»). Источники: Wikipedia Peugeot 908, Peugeot 908 HDi FAP; Autosport.',
  }),
  race({
    id: 'peugeot-9x8', label: '9X8', fullName: 'Peugeot 9X8', year: 2022, ...PEUGEOT,
    modelSlug: 'peugeot-9x8', familyKey: 'peugeot-9x8', bodyType: 'coupe', hp: 671, engineType: 'v6h',
    note: 'Гиперкар Peugeot Sport класса Le Mans Hypercar (чемпионат мира по гонкам на выносливость WEC) — первый прототип марки за 11 лет; о возвращении Peugeot объявил 13 ноября 2019 г. Бензиновый V6 с двумя турбокомпрессорами (500 кВт, ≈671 л.с.) на заднюю ось и электромотор ≈268 л.с. на переднюю; аэродинамика без заднего крыла. Дебют — 6 часов Монцы 2022, первый полный сезон — 2023 (первый подиум WEC — 3-е место в Монце 2023). Преемник 905, 908 HDi FAP и 908; номера 93 и 94 — отсылка к победе Peugeot в Ле-Мане 1993. ПРОГРАММА ЗАКРЫТА: в ноябре 2026 г. Stellantis остановил заводской автоспорт ради стратегического плана FaSTLAne 2030 — кампания WEC прекращена немедленно (клиентский автоспорт сохраняется). Источники: Wikipedia Peugeot 9X8, Stellantis.',
  }),
  race({
    id: 'peugeot-9x8-2024', label: '9X8 с задним крылом', fullName: 'Peugeot 9X8 (обновление с задним крылом)', year: 2024, ...PEUGEOT,
    modelSlug: 'peugeot-9x8', familyKey: 'peugeot-9x8', bodyType: 'coupe', hp: 671, engineType: 'v6h',
    note: 'Обновлённая версия 9X8, представленная 25 марта 2024 г.: добавлено заднее крыло — прежняя бескрылая концепция оказалась малоконкурентной из-за зависимости от граунд-эффекта, особенно на неровных трассах. Одновременно отказались от одинаковой ширины шин (31 см со всех сторон): 29 см спереди и 34 см сзади, как у соперников. Источник: Wikipedia Peugeot 9X8.',
  }),

  // ── Alpine: WEC (уход по итогам сезона 2026) ───────────────────────────────────────────────────────────────
  race({
    id: 'alpine-a450', label: 'A450', fullName: 'Alpine A450', year: 2013, ...ALPINE,
    modelSlug: 'alpine-a450', familyKey: 'alpine-endurance', bodyType: 'roadster', hp: 490, engineType: 'v8',
    note: 'LMP2-прототип возвращения Alpine в гонки на выносливость: машина команды Signatech на шасси Oreca 03 с атмосферным V8 Nissan 4,5 л (его выбрало большинство команд LMP2 по Wikipedia Oreca 03). В 2013 г. Signatech выиграла командный и личный зачёты LMP2 в Европейской серии Ле-Мана (ELMS); в чемпионате мира WEC машина выступала в 2015 г. Мощность ≈490 л.с. — по однотипному шасси Oreca 05 (для A450 Wikipedia цифру не приводит). Источники: Wikipedia Signatech, Oreca 03, Oreca 05; 24h-lemans.com.',
  }),
  race({
    id: 'alpine-a460', label: 'A460', fullName: 'Alpine A460', year: 2016, ...ALPINE,
    modelSlug: 'alpine-a460', familyKey: 'alpine-endurance', bodyType: 'coupe', hp: 490, engineType: 'v8',
    note: 'Закрытый LMP2-прототип Alpine сезона 2016 (WEC): технически идентичен Oreca 05 (те же шасси и внутренние узлы) с брендингом Alpine, мотор Nissan V8 (490 л.с.); преемник A450. В 2016 г. победа в классе LMP2 в «24 часах Ле-Мана» и титулы WEC в LMP2 (командный и личный). Вторая A460 выступала за Baxi DC Racing. Источники: Wikipedia Oreca 05, Signatech; 24h-lemans.com.',
  }),
  race({
    id: 'alpine-a470', label: 'A470', fullName: 'Alpine A470', year: 2017, ...ALPINE,
    modelSlug: 'alpine-a470', familyKey: 'alpine-endurance', bodyType: 'coupe', hp: 603, engineType: 'v8',
    note: 'LMP2-прототип Alpine на шасси Oreca 07 (регламент LMP2 2017 г.) с атмосферным мотором Gibson V8: 603 л.с. в 2017–2020 гг. (по Wikipedia Oreca 07). Победы в классе LMP2 в «24 часах Ле-Мана» 2018 и 2019 гг.; Signatech выигрывала зачёт LMP2 чемпионата WEC в 2016 и 2018–19. Источники: Wikipedia Oreca 07, Signatech; 24h-lemans.com.',
  }),
  race({
    id: 'alpine-a480', label: 'A480', fullName: 'Alpine A480', year: 2021, ...ALPINE,
    modelSlug: 'alpine-a480', familyKey: 'alpine-endurance', bodyType: 'coupe', hp: 610, engineType: 'v8',
    note: 'Первый Hypercar Alpine: «дедушкин» Rebellion R13 (шасси Oreca на базе Oreca 07), переименованный в A480 и допущенный в класс Hypercar в 2021–2022 гг. Для паритета с гибридной Toyota GR010 вес по BoP подняли до 930 кг (с 824 кг в LMP1), а пиковую мощность снизили до 610 л.с. (450 кВт) при заявленных 625 л.с. по спецификации Hypercar. Signatech заняла 3-е место в общем зачёте «24 часов Ле-Мана» 2021. Источники: Wikipedia Rebellion R13, Signatech.',
  }),
  race({
    id: 'alpine-a424', label: 'A424', fullName: 'Alpine A424', year: 2024, ...ALPINE,
    modelSlug: 'alpine-a424', familyKey: 'alpine-endurance', bodyType: 'coupe', hp: 680, engineType: 'v6h',
    note: 'LMDh-прототип Alpine для класса Hypercar WEC, построенный Oreca на базе нового шасси LMP2. Силовая установка — V6 на основе Mecachrome V634 из Формулы-2 с одним турбокомпрессором плюс унифицированная гибридная система (Williams Advanced Engineering, Bosch, Xtrac), суммарно 500 кВт. Шоу-кар A424_β показан 9 июня 2023 г. в Ле-Мане. Дебют — 1812 км Катара 2024; в Ле-Мане 2024 обе машины сошли из-за отказов турбин; первый подиум — 3-е место на 6 часах Фудзи 2024, первая победа — 6 часов Фудзи 2025. ПРОГРАММА ЗАКРЫВАЕТСЯ: Alpine объявила (февраль 2026) об уходе из WEC по итогам сезона 2026 ради Формулы-1. Источники: Wikipedia Alpine A424; Motorsport.com, Autosport.',
  }),

  // ── Alpine: Формула-1 (собственные моторы Renault закрыты, с 2026 — Mercedes) ──────────────────────────────
  race({
    id: 'alpine-a521', label: 'A521', fullName: 'Alpine A521', year: 2021, ...ALPINE,
    modelSlug: 'alpine-a521', familyKey: 'alpine-f1', bodyType: 'roadster', hp: 950, engineType: 'v6h',
    note: 'Первый болид Формулы-1 под именем Alpine (до этого команда выступала как Renault F1; предшественник — Renault R.S.20). Сезон 2021: Фернандо Алонсо (возвращение в Ф1) и Эстебан Окон; единственная победа машины — Гран-при Венгрии 2021. Силовая установка Renault, более 950 л.с. Источник: Wikipedia Alpine A521.',
  }),
  race({
    id: 'alpine-a522', label: 'A522', fullName: 'Alpine A522', year: 2022, ...ALPINE,
    modelSlug: 'alpine-a522', familyKey: 'alpine-f1', bodyType: 'roadster', hp: 950, engineType: 'v6h',
    note: 'Первое шасси Alpine под технический регламент 2022 г. (граунд-эффект). Пилоты — Алонсо и Окон; побед нет. Силовая установка Renault, более 950 л.с. Источник: Wikipedia Alpine A522.',
  }),
  race({
    id: 'alpine-a523', label: 'A523', fullName: 'Alpine A523', year: 2023, ...ALPINE,
    modelSlug: 'alpine-a523', familyKey: 'alpine-f1', bodyType: 'roadster', hp: 950, engineType: 'v6h',
    note: 'Болид сезона 2023: пилоты Пьер Гасли (первый сезон в команде из Энстоуна) и Эстебан Окон; побед нет. Шасси Alpine, силовая установка Renault; мощность ≈950 л.с. — оценка по A521/A522 (регламент силовых установок заморожен). Источник: Wikipedia Alpine A523.',
  }),
  race({
    id: 'alpine-a524', label: 'A524', fullName: 'Alpine A524', year: 2024, ...ALPINE,
    modelSlug: 'alpine-a524', familyKey: 'alpine-f1', bodyType: 'roadster', hp: 950, engineType: 'v6h',
    note: 'Четвёртая машина Alpine в Ф1 после ребрендинга Renault. Пилоты — Гасли и Окон, в конце сезона к ним присоединился Джек Дуэн; побед нет. Мощность ≈950 л.с. — оценка по A521/A522. Источник: Wikipedia Alpine A524.',
  }),
  race({
    id: 'alpine-a525', label: 'A525', fullName: 'Alpine A525', year: 2025, ...ALPINE,
    modelSlug: 'alpine-a525', familyKey: 'alpine-f1', bodyType: 'roadster', hp: 950, engineType: 'v6h',
    note: 'Пятая машина Alpine в Ф1 и последняя перед переходом на моторы Mercedes: пилоты — Гасли и «вращающееся» второе место (Джек Дуэн от Австралии до Майами, затем Франко Колапинто). Renault объявил о закрытии собственной моторной программы Формулы-1 в сентябре 2024 г.; площадка Viry-Châtillon, где делали моторы, по заявлению Renault превращается в центр инноваций. Мощность ≈950 л.с. — оценка по A521/A522. Источники: Wikipedia Alpine A525, Alpine A526; Renault Group, Motorsport.com.',
  }),
  race({
    id: 'alpine-a526', label: 'A526', fullName: 'Alpine A526', year: 2026, ...ALPINE,
    modelSlug: 'alpine-a526', familyKey: 'alpine-f1', bodyType: 'roadster', engineType: 'v6h',
    note: 'Шестая машина Alpine в Ф1 и первая у команды из Энстоуна со времён Lotus E23 Hybrid (2015) с силовой установкой Mercedes — собственных моторов Renault у Alpine больше нет. Построена под новый регламент 2026 г. (аэродинамика и силовые установки). Пилоты — Гасли и Колапинто. Мощность в источнике не приведена. Источник: Wikipedia Alpine A526.',
  }),

  // ── Dacia: Дакар (проект закрывается после сезона 2026) ──────────────────────────────────────────────────
  race({
    id: 'dacia-sandrider', label: 'Sandrider', fullName: 'Dacia Sandrider', year: 2024, brandId: 'dacia', brandName: 'Dacia',
    modelSlug: 'dacia-sandrider', bodyType: 'roadster', hp: 360, engineType: 'v6t',
    note: 'Ралли-рейдовый прототип класса FIA Ultimate T1+, построенный Dacia вместе с Prodrive (при участии Renault-Alpine); внешне основан на концепте Dacia Manifesto, но не является переделкой Prodrive Hunter. Двигатель — 3,0 л twin-turbo V6 на базе Nissan Z (VR30DDTT) с усиленной системой наддува, около 360 л.с. и 539 Н·м, синтетическое топливо Aramco; карбоновый кузов на трубчатой раме. Дебют и первая победа — Ралли Марокко 2024. Победитель Дакара-2026 (Насер Аль-Аттия / Фабьян Люркен) — первая победа Dacia в Дакаре, шестая у Аль-Аттии. ПРОГРАММА ЗАКРЫВАЕТСЯ: Dacia проведёт полный сезон чемпионата мира по ралли-рейдам 2026 и завершит проект финалом в Абу-Даби; участие в Дакаре-2027 исключено. Источники: Wikipedia Dacia Sandrider; Motorsport.com, DirtFish, Renault Group.',
  }),

  // ── Citroën и Opel: Формула-E (кампания заканчивается по итогам сезона 2026–27) ──────────────────────────
  race({
    id: 'citroen-racing-fe-gen3evo', label: 'Formula E Gen3 Evo', fullName: 'Citroën Racing Formula E Gen3 Evo', year: 2025,
    brandId: 'citroen', brandName: 'Citroën', modelSlug: 'citroen-racing-formula-e', familyKey: 'citroen-formula-e',
    bodyType: 'roadster', hp: 470, engineType: 'ev',
    note: 'Одноместный электрический болид Citroën Racing Formula E Team на шасси Spark GEN3 Evo (сезон 2025–26) — дебют марки в формульных и электрических гонках; Citroën заменил в чемпионате Maserati MSG Racing. Представлен в Париже 20 октября 2025 г.; до 350 кВт (≈470 л.с.), 0–100 км/ч за 1,86 с, около 320 км/ч (данные Stellantis). Пилоты — Ник Кэссиди и Жан-Эрик Вернь. Подиум в дебютной гонке (Сан-Паулу 2025, Кэссиди), первая победа — Кэссиди, ePrix Мехико 2026. ПРОГРАММА ЗАКРЫВАЕТСЯ: в ноябре 2026 г. Stellantis объявил о завершении кампании в Формуле-E по итогам сезона 2026–27. Источники: Wikipedia Citroën Racing, 2025–26 Formula E World Championship; Stellantis Media.',
  }),
  race({
    id: 'opel-gse-27fe', label: 'GSE 27FE', fullName: 'Opel GSE 27FE', year: 2026, brandId: 'opel', brandName: 'Opel',
    modelSlug: 'opel-gse-27fe', bodyType: 'roadster', hp: 805, engineType: 'ev',
    note: 'Первый формульный болид Opel для электрической серии Formula E поколения Gen4 (сезон 2026–27). Название: GSE — спортивные электромобили Opel, 27 — сезон 2026/27, FE — Formula E. Мировая премьера — 22 апреля 2026 г., Paul Ricard (Ле-Кастле), за рулём тест-пилот Софи Флёрш; до 600 кВт, полный привод, до 335 км/ч (данные electrive). Opel GSE Formula E Team — 12-я команда чемпионата, вошла вместо вышедшей DS Automobiles; пилоты — Тео Пуршер и Митч Эванс. ЕДИНСТВЕННЫЙ СЕЗОН: в ноябре 2026 г. Stellantis объявил об остановке заводского автоспорта — команда прекратит работу по итогам 2026–27. Источники: Wikipedia Opel GSE Formula E Team, 2026–27 Formula E World Championship; electrive.com; Stellantis Media.',
  }),

  // ── Программы, которых решение не коснулось ───────────────────────────────────────────────────────────────
  race({
    id: 'lancia-ypsilon-rally2-hf-integrale', label: 'Ypsilon Rally2 HF Integrale', fullName: 'Lancia Ypsilon Rally2 HF Integrale', year: 2026,
    brandId: 'lancia', brandName: 'Lancia', modelSlug: 'lancia-ypsilon-rally2', bodyType: 'hatchback', hp: 287, engineType: 'i4t',
    note: 'Ралли-автомобиль Lancia класса Rally2 на базе дорожной Lancia Ypsilon: 1,6 л турбо (доработанные мотор и коробка Citroën C3 Rally2), 287 л.с. Разрабатывался в 2025 г., показан на тестах в августе–сентябре 2025 г., дебютировал на Ралли Монте-Карло 2026 (WRC2); первая победа в WRC2 — Ралли Хорватии 12 апреля 2026 г. (Йоан Россель / Арно Дюнан). Название отсылает к Lancia Delta HF Integrale. ПРОГРАММА СОХРАНЕНА: 24 ноября 2026 г. Lancia подтвердила гомологацию комплекта WRC для развития машины от Rally2 до Rally1 (WRC27). Источник: Wikipedia Lancia Ypsilon Rally2 HF Integrale.',
  }),
  race({
    id: 'maserati-granturismo-project-gt4', label: 'GranTurismo Project GT4', fullName: 'Maserati GranTurismo Project GT4', year: 2026,
    brandId: 'maserati', brandName: 'Maserati', modelSlug: 'maserati-granturismo-project-gt4', bodyType: 'coupe', engineType: 'v6t',
    note: 'Прототип-превью новой GT4-машины Maserati Corse на базе GranTurismo, показанный на Goodwood Festival of Speed 2026 (июль); цель — гонки в классе GT4 с сезона 2028. Кузов и силовая установка от дорожного купе (3,0 л twin-turbo V6 Nettuno), задний привод, подвеска от GranTurismo Trofeo, примерно на 400 кг легче дорожной версии; мощность не раскрыта (регулируется BoP). Разработку ведёт тест-пилот Maserati Андреа Бертолини. Программы Maserati GT2 (MC20 GT2 — есть в графе) и GT4 по сообщению о решении Stellantis не затронуты — клиентский автоспорт сохраняется. Источники: Motorsport.com / Carscoops / Evo (пресса), Wikipedia Stellantis.',
  }),
]

// type: evolves_into — преемник программы; variant_of — вариант той же машины; facelifted_to — обновление той же машины;
//       inspired_by — слабая связь (наследие/название); derived_from — донор (источник → производная)
const EDGES = [
  // Peugeot: 905 → 908 HDi FAP → 908 → 9X8 (прямо указано в статьях Wikipedia: «Succeeding the 905, 908 HDi FAP, and 908»)
  { source: 'peugeot-905', target: 'peugeot-905b', type: 'facelifted_to' },
  { source: 'peugeot-905', target: 'peugeot-908-hdi-fap', type: 'evolves_into' },
  { source: 'peugeot-908-hdi-fap', target: 'peugeot-908-hy', type: 'variant_of' },
  { source: 'peugeot-908-hdi-fap', target: 'peugeot-908-v8', type: 'evolves_into' },
  { source: 'peugeot-908-v8', target: 'peugeot-9x8', type: 'evolves_into' },
  { source: 'peugeot-9x8', target: 'peugeot-9x8-2024', type: 'facelifted_to' },
  // Alpine WEC: A450 → A460 → A470 → A480 → A424; в статье A424 предшественником указан и Renault Alpine A442
  { source: 'alpine-a450', target: 'alpine-a460', type: 'evolves_into' },
  { source: 'alpine-a460', target: 'alpine-a470', type: 'evolves_into' },
  { source: 'alpine-a470', target: 'alpine-a480', type: 'evolves_into' },
  { source: 'alpine-a480', target: 'alpine-a424', type: 'evolves_into' },
  { source: 'alpine-a442b', target: 'alpine-a424', type: 'inspired_by' },
  // Alpine Формула-1: каждая — предшественник следующей (инфобокс Wikipedia)
  { source: 'alpine-a521', target: 'alpine-a522', type: 'evolves_into' },
  { source: 'alpine-a522', target: 'alpine-a523', type: 'evolves_into' },
  { source: 'alpine-a523', target: 'alpine-a524', type: 'evolves_into' },
  { source: 'alpine-a524', target: 'alpine-a525', type: 'evolves_into' },
  { source: 'alpine-a525', target: 'alpine-a526', type: 'evolves_into' },
  // Lancia / Maserati
  { source: 'lancia-delta-integrale', target: 'lancia-ypsilon-rally2-hf-integrale', type: 'inspired_by' },
  { source: 'maserati-granturismo2-trofeo', target: 'maserati-granturismo-project-gt4', type: 'derived_from' },
]

// ── проверка и применение ───────────────────────────────────────────────────────────────────────────────────
const SAME_BRAND = new Set(['evolves_into', 'variant_of', 'facelifted_to'])
const ENGINES = new Set(['ev', 'hybrid', 'v16h', 'w16', 'v12', 'v12t', 'flat12', 'v10', 'v8t', 'v8h', 'v8', 'flat6t', 'flat6', 'i8', 'i6t', 'i6', 'i5t', 'v6t', 'v6h', 'v6', 'i4t', 'i4h', 'i4', 'flat4t', 'flat4'])

const raw = fs.readFileSync(GRAPH, 'utf8')
const g = JSON.parse(raw)
const byId = new Map(g.nodes.map(n => [n.id, n]))
const brands = new Set(g.nodes.map(n => n.brandId))
const errors = []

for (const n of NODES) {
  if (!n.id || !n.label || !n.fullName || !n.brandId || !n.brandName || !n.zone || !n.note) errors.push(`${n.id}: не хватает обязательного поля`)
  if (!brands.has(n.brandId)) errors.push(`${n.id}: бренда ${n.brandId} нет в графе (нужно добавить в BRAND_WHITELIST scripts/validate-graph.js)`)
  if (!ENGINES.has(n.engineType)) errors.push(`${n.id}: неизвестный engineType ${n.engineType}`)
  if (/\(\s*(19|20)\d\d\s*\)/.test(n.label)) errors.push(`${n.id}: в label год в скобках — это уже показано в подзаголовке карточки`)
  if (n.hp !== undefined && !(n.hp > 0)) errors.push(`${n.id}: некорректный hp`)
}
const ids = NODES.map(n => n.id)
if (new Set(ids).size !== ids.length) errors.push('дубли id внутри добавляемого набора')

const all = new Map([...byId, ...NODES.filter(n => !byId.has(n.id)).map(n => [n.id, n])])
const existingEdges = new Set(g.edges.map(e => `${e.source}>${e.target}:${e.type}`))
for (const e of EDGES) {
  const s = all.get(e.source), t = all.get(e.target)
  if (!s || !t) { errors.push(`ребро ${e.source} → ${e.target}: нет узла`); continue }
  if (s.year > t.year) errors.push(`ребро ${e.source} → ${e.target} [${e.type}]: хронология (${s.year} → ${t.year})`)
  if (SAME_BRAND.has(e.type) && s.brandId !== t.brandId) errors.push(`ребро ${e.source} → ${e.target} [${e.type}]: кросс-брендовое`)
}
if (errors.length) { console.error('❌ Ошибки:\n - ' + errors.join('\n - ')); process.exit(1) }

const newNodes = NODES.filter(n => !byId.has(n.id))
const newEdges = EDGES.filter(e => !existingEdges.has(`${e.source}>${e.target}:${e.type}`))
console.log(`Граф: ${GRAPH}`)
console.log(`Узлов в наборе: ${NODES.length} → новых ${newNodes.length}, уже есть ${NODES.length - newNodes.length}`)
console.log(`Связей в наборе: ${EDGES.length} → новых ${newEdges.length}, уже есть ${EDGES.length - newEdges.length}`)
for (const n of newNodes) console.log(`  + ${n.brandName.padEnd(9)} ${String(n.year)} ${n.label.padEnd(30)} [${n.id}]`)
for (const e of newEdges) console.log(`  ~ ${e.source} --${e.type}--> ${e.target}`)

if (!apply) { console.log('\n(режим проверки: файл не изменён; для записи — флаг --apply)'); process.exit(0) }
if (!newNodes.length && !newEdges.length) { console.log('\nНечего добавлять — всё уже в графе.'); process.exit(0) }

g.nodes.push(...newNodes)
g.edges.push(...newEdges)
const tmp = GRAPH + '.tmp'
fs.writeFileSync(tmp, JSON.stringify(g, null, 2))
fs.renameSync(tmp, GRAPH)
console.log(`\n✅ Записано. Теперь в графе ${g.nodes.length} узлов и ${g.edges.length} связей.`)
