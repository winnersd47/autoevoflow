'use strict'
/**
 * Очистка названия модели от редакционного хвоста заголовка.
 *
 * Общий модуль для publish-new-stories.js (заголовок поста, ключ модели, группировка)
 * и sync-latest-to-project.js (label/id/slug узла графа и файл модели) — раньше один и
 * тот же сырой заголовок давал грязное имя в обоих местах.
 */

// ─── Очистка названия от редакционного хука ───────────────────────────────────
// Заголовки источников — это предложения: "2027 BMW 740 xDrive Builds on Excellence",
// "2027 Toyota RAV4 Raises Prices", "2027 Genesis GV60 / GV60 Magma". Целиком они
// уходили в заголовок поста и в ключ модели — отсюда косметический мусор в канале
// и дубли одной модели из разных статей (Silverado HD ×2, RAV4 ×2, GV60 ×2: ключи
// разные, потому что в 3 токена ключа попадали слова хука).
// Режем по пунктуации ВНЕ скобок и по первому слову-хуку после модели. Проверено на
// 5340 настоящих названиях графа: меняются только заведомо описательные/испорченные.
const HOOK_WORDS = new Set([
  // глаголы 3 л. ед. ч. — типичное начало хука ("Builds on Excellence", "Raises Prices")
  'Builds','Raises','Provides','Embraces','Earns','Gets','Gains','Adds','Brings','Offers','Keeps','Makes','Takes','Drops',
  'Cuts','Grows','Steps','Stays','Returns','Joins','Loses','Boosts','Delivers','Packs','Promises','Proves','Shows','Swaps',
  'Turns','Updates','Upgrades','Arrives','Debuts','Launches','Starts','Ends','Costs','Hits','Beats','Rivals','Leads','Aims',
  'Wants','Needs','Pushes','Pulls','Climbs','Falls','Rises','Looks','Feels','Sounds','Hides','Gives','Opens','Closes',
  'Reveals','Unveils','Introduces','Expands','Extends','Receives','Sees','Becomes','Remains','Continues','Combines','Blends',
  'Mixes','Plays','Fights','Chases','Targets','Tackles','Faces','Meets','Welcomes','Honors','Celebrates','Marks','Goes','Comes',
  'Does','Has','Is','Are','Was','Were','Will','May','Might','Could','Should','Can',
  'Charts','Doubles','Triples','Redefines','Refines','Reinvents','Reimagines','Rewrites','Revives','Restyles','Refreshes','Revamps',
  'Reworks','Retains','Reaches','Reigns','Reminds','Replaces','Sets','Sells','Sends','Signs','Slides','Slips','Snags','Sparks','Speeds',
  'Splits','Stands','Stretches','Strikes','Struggles','Stuns','Succeeds','Suffers','Supports','Surges','Surprises','Switches','Tastes',
  'Teases','Tells','Thinks','Tops','Tows','Treats','Tries','Trims','Unleashes','Unlocks','Wears','Wins','Wows','Yields','Zooms',
  'Attracts','Avoids','Backs','Breaks','Calls','Carries','Catches','Changes','Charges','Checks','Chooses','Claims','Clears','Covers',
  'Crashes','Creates','Crushes','Dares','Demands','Describes','Designs','Dips','Dives','Eases','Embodies','Enters','Escapes','Evolves',
  'Excels','Exceeds','Fills','Finds','Fires','Fixes','Flexes','Follows','Forces','Fuels','Grabs','Handles','Heads','Helps','Holds',
  'Hopes','Hunts','Ignites','Impresses','Improves','Invites','Jumps','Kicks','Knows','Lands','Lasts','Lets','Lifts','Likes','Lives',
  'Matches','Matters','Misses','Moves','Outdoes','Outruns','Overhauls','Passes','Pays','Picks','Plans','Pleases','Powers','Prepares',
  'Presents','Pursues','Puts','Races','Reads','Rebuilds','Recalls','Refuses','Rejects','Relaunches','Relies','Renews','Resets',
  'Resists','Responds','Retires','Reverses','Revisits','Rewards','Rides','Runs','Rushes','Saves','Says','Scores','Seeks','Seems',
  'Settles','Shakes','Shapes','Shares','Shifts','Shines','Shocks','Skips','Slows','Soars','Solves','Spreads','Stacks','Steals',
  'Sticks','Stops','Surpasses','Survives','Sweeps','Swings','Talks','Teams','Tempts','Thrills','Throws','Tightens','Touches','Tours',
  'Transforms','Travels','Tweaks','Twists','Unites','Wakes','Walks','Warns','Wastes','Watches','Weighs','Wraps',
  // наречия
  'Finally','Officially','Quietly','Now','Just','Still','Even','Also','Again','Soon','Already','Almost','Nearly','Only',
  // артикли ("A Big Upgrade") — см. условие в cleanModelName
  'A','An','The',
])
// Добавки по живому прогону на заголовках брендов (sentence-case источники: "Lacks Exhaust", "Reportedly Heads").
for (const w of ['Lacks','Skips','Ditches','Nixes','Axes','Kills','Dumps','Scraps','Abandons','Retreats','Ups','More','Less','Than',
  'Reportedly','Allegedly','Apparently','Probably','Possibly','Likely','Actually','Really','Simply','Barely','Hardly']) HOOK_WORDS.add(w)
// Ещё добавки по просмотру brands/*.json: глаголы, после которых нет служебного слова ("Stomps Production Car"),
// "Prices Hold Steady", "Production Delayed". Каждое слово проверено регрессией на 5340 названиях графа.
for (const w of ['Stomps','Smashes','Obliterates','Destroys','Demolishes','Blasts','Blows','Rockets','Roars','Rumbles','Slays','Storms',
  'Sprints','Slams','Shimmers','Sparkles','Glows','Gleams','Dazzles','Delights','Defies','Defends','Denies','Departs','Deserves',
  'Dominates','Dashes','Delays','Delayed','Postponed','Postpones','Cancels','Cancelled','Canceled','Confirms','Confirmed','Develops',
  'Discontinues','Dies','Disappears','Disappoints','Explains','Explores','Features','Hints','Hikes','Increases','Leaks','Lowers',
  'Previews','Rallies','Ramps','Reduces','Sharpens','Slashes','Sneaks','Spawns','Steers','Swells','Whips',
  'Prices','Pricing','Recall','Recalls','Hold','Remain','Stay',
  'From']) HOOK_WORDS.add(w)   // "… From Every Angle" (галерейный заголовок)
// Строчные хуки ("starts at", "ups screen", "revealed with"): глаголы/наречия те же, плюс служебные слова.
// Совпадение только для токена из строчных латинских букв — "xDrive", "e-tron", "plug-in" сюда не попадают.
const HOOK_LOWER = new Set([...HOOK_WORDS].filter(w => !/^(A|An|The)$/.test(w)).map(w => w.toLowerCase()))
// 'by'/'of' сознательно НЕТ: "Ferrari Rossa by Pininfarina", "Touring Tree of Life" — официальные названия.
for (const w of ['with','without','for','in','at','on','to','as','and','or','but','that','which','who','from','vs','versus',
  'because','after','before','over','under','into','up','down','out','a','an','the']) HOOK_LOWER.add(w)
// "Works" сознательно НЕТ в списке: "Defender Works V8", "John Cooper Works" — настоящие комплектации.
const FUNC_NEXT = /^(on|to|for|in|a|an|the|by|with|its|your|you|that|more|less|new|big|all|at|from|up|out|over|into|under|across|through|around|onto|toward|towards|beyond|behind|between|among|against|along|amid|within|without|upon|off|away|back)$/i
// Служебные слова на конце заголовка. Артикли сюда НЕ входят: "A" на конце — часть имени (Ferrari 356 A, 458 Speciale A).
const TRAILING_NOISE = /^(review|reviewed|first|look|drive|driven|test|tested|preview|revealed|unveiled|spied|spotted|teased|leaked|price|pricing|specs|interior|exterior|gallery|photos|video|to|more|less|than|and|or|of|in|on|for|with|the|its|by|at|as|vs|due|production)$/i
// Притяжательная форма ("Folgore's", "Honda’s"): не часть названия модели. Исключения — официальные комплектации ("Founder's Edition").
const POSS_TOK = /^[A-Za-z0-9][\w.-]*[’']s$/i
const POSS_KEEP_NEXT = /^(edition|special|series|collection|package|limited|signature|anniversary|tribute|cup|trophy|spec|version|model|choice)$/i
const stripPoss = (t) => t.replace(/[’']s$/i, '')

// HTML-сущности из скрапера ("Honda&#8217;s Fit"): без декодирования ';' внутри сущности резал название.
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}

function cutAtHookPunctuation(s) {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1)
    else if (depth === 0) {
      // запятая между цифрами — разряды числа ("$27,798"), а не хук
      if (ch === ',' && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || '')) continue
      if (ch === ',' || ch === ';' || ch === '|' || ch === '…' || ch === '–' || ch === '—') return s.slice(0, i)
      // двоеточие — хук только с пробелом после ("Model: hook"); "e:HEV", "D:5" — часть имени
      if (ch === ':' && /\s/.test(s[i + 1] || '')) return s.slice(0, i)
      if (ch === '-' && s[i - 1] === ' ' && s[i + 1] === ' ') return s.slice(0, i)
      if (ch === '.' && s[i + 1] === '.' && s[i + 2] === '.') return s.slice(0, i)
    }
  }
  return s
}

function cleanModelName(name, brand) {
  if (!name) return name
  const orig = String(name)
  let n = cutAtHookPunctuation(decodeEntities(orig).replace(/\s+/g, ' ').trim()).trim()
  n = n.replace(/(\S+)\s*\/\s*\1(?=\s|$)/, '$1') // "GV60 / GV60 Magma" → "GV60 Magma"
  // "The New 2027 BMW X5" → "2027 BMW X5" (приставка только перед годом)
  n = n.replace(/^(?:The\s+)?(?:All-New\s+|Brand-New\s+|New\s+)?(?=(?:19|20)\d{2}\b)/i, '')
  const tokens = n.split(' ')
  const brandWords = String(brand || '').toLowerCase().split(/\s+/).filter(Boolean)
  // слово бренда, включая части составного ("Mercedes-Benz" → mercedes, benz) и притяжательную форму ("Honda’s")
  const brandSet = new Set(brandWords.flatMap(w => [w, ...w.split('-')]))
  const isBrandTok = (t) => { const l = t.toLowerCase().replace(/[’']s$/, ''); return brandSet.has(l) || brandSet.has(l.split('-')[0]) }
  const isYear = (t) => /^(19|20)\d\d$/.test(t)
  // "The Jaguar XJ220 …" → "Jaguar XJ220": артикль перед брендом не часть названия
  if (/^The$/i.test(tokens[0]) && tokens[1] && brandWords.includes(tokens[1].toLowerCase())) tokens.shift()
  // Приставка-мусор перед "год + бренд": "View Photos of the 2027 BMW X5", "See the 2027 Audi A6 …", "Europe’s 2027 Mazda CX-30".
  // Только если после года идёт слово бренда — иначе "Arrow McLaren Signs 2026 Indy 500 …" превратилось бы в гоночный результат.
  if (tokens.length > 2 && !isYear(tokens[0]) && !isBrandTok(tokens[0])) {
    for (let k = 1; k < Math.min(tokens.length - 1, 9); k++) {
      if (isYear(tokens[k]) && isBrandTok(tokens[k + 1])) { tokens.splice(0, k); break }
    }
  }
  // "Honda’s Fit …" → "Honda Fit …": притяжательная форма бренда в начале — не часть названия
  if (POSS_TOK.test(tokens[0]) && isBrandTok(tokens[0])) {
    tokens[0] = stripPoss(tokens[0])
    if (/^New$/i.test(tokens[1] || '')) tokens.splice(1, 1)
  }
  let start = 0
  while (start < tokens.length && (isYear(tokens[start]) || brandWords.includes(tokens[start].toLowerCase()))) start++
  // start — первый токен модели; хук ищем строго ПОСЛЕ него (модель не может остаться пустой)
  let cut = tokens.length
  let depth = 0
  for (let i = 0; i < start + 1 && i < tokens.length; i++) depth += (tokens[i].match(/[(\[]/g) || []).length - (tokens[i].match(/[)\]]/g) || []).length
  // притяжательная форма на первом токене модели ("2027 Ford F-150's Price …") — оставляем модель без 's, дальше не смотрим
  // (притяжательная форма БРЕНДА — "Porsche's Taycan", "Ford's F-150" — не режем: за ней идёт модель, а не рассказ)
  if (start < tokens.length && POSS_TOK.test(tokens[start]) && !isBrandTok(tokens[start]) && !POSS_KEEP_NEXT.test(tokens[start + 1] || '')) {
    tokens[start] = stripPoss(tokens[start]); cut = start + 1
  }
  for (let i = start + 1; i < tokens.length && cut === tokens.length; i++) {
    const next = tokens[i + 1] || ''
    // скобки ("(Car of Tomorrow)") — часть названия, внутри них хуков нет
    const inParens = depth > 0 || /[(\[]/.test(tokens[i])
    depth += (tokens[i].match(/[(\[]/g) || []).length - (tokens[i].match(/[)\]]/g) || []).length
    if (inParens) continue
    // притяжательная форма внутри названия ("Grecale Folgore's Price Cut"): дальше рассказ, а не модель — режем после слова без 's
    if (POSS_TOK.test(tokens[i]) && !isBrandTok(tokens[i]) && !POSS_KEEP_NEXT.test(next)) { tokens[i] = stripPoss(tokens[i]); cut = i + 1; break }
    let isHook = HOOK_WORDS.has(tokens[i])
    // "A/An/The" — хук лишь после >=2 токенов модели и перед словом с заглавной ("RAV4 PHEV A Big Upgrade");
    // иначе это часть комплектации ("GTO The Judge", "Rebel The Machine")
    if (/^(A|An|The)$/.test(tokens[i]) && !(i - start >= 2 && /^[A-Z]/.test(next))) isHook = false
    // неизвестный глагол на -s перед служебным словом ("Builds on", "Aims To", "Charts A")
    if (!isHook && /^[A-Z][a-z]{2,}s$/.test(tokens[i]) && FUNC_NEXT.test(next)) isHook = true
    // редкий глагол с характерным окончанием (Exemplifies, Emphasizes, Showcases, Highlights, Elevates);
    // в 5340 настоящих названиях графа слов с такими окончаниями вне позиции модели нет
    if (!isHook && /^[A-Z][a-z]{3,}(ifies|izes|ises|ates|cases|ights|ides)$/.test(tokens[i])) isHook = true
    // строчный хук ("starts at", "ups screen", "revealed with"); "with" — часть официальных названий
    // ("G 580 with EQ Technology", "M2 with M xDrive"): режем, только если дальше обычное слово, а не код
    if (!isHook && /^[a-z]+$/.test(tokens[i]) && HOOK_LOWER.has(tokens[i])) {
      isHook = tokens[i] !== 'with' || !(next === '' || /^[A-Z0-9]{1,4}$/.test(next) || /\d/.test(next))
    }
    if (!isHook) continue
    cut = i
    break
  }
  const out = tokens.slice(0, cut)
  while (out.length > start + 1 && TRAILING_NOISE.test(out[out.length - 1])) out.pop()
  const res = out.join(' ').trim()
  if (!(out.length > start && res.length >= 2)) return orig
  // Заголовок без года/бренда в начале, от которого после обрезки осталось <3 слов ("View", "Arrow McLaren") — это не модель:
  // лучше оставить как было, чем выдать огрызок за название.
  if (start === 0 && cut < tokens.length && out.length < 3) return orig
  return res
}

// Копия машины с очищенным названием (исходное — в _rawName, для логов).
function withCleanName(car) {
  const brand = car.brand || car.brandName || ''
  const name = cleanModelName(car.name, brand)
  const fullName = cleanModelName(car.fullName, brand)
  if (name === car.name && fullName === car.fullName) return car
  return { ...car, name, fullName, _rawName: car.name || car.fullName }
}

module.exports = { cleanModelName, withCleanName }
