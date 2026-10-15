// wiki-laptime-lib.js — парсинг и fuzzy-матч списков круга Википедии:
//   List of Nürburgring Nordschleife lap times (раздел "Production/street-legal")
//   List of Top Gear test track Power Lap times
// Дополняют A777 (a777-lib.js) там, где у него нет страницы — особенно
// mainstream/muscle/EV сегмент (Dodge, Chevrolet, Hyundai, Tesla, BYD и т.п.),
// который специализированный A777 покрывает слабо.
//
// Формат источника — свободный текст ("Mercedes-AMG One", "Porsche 911 GT2 RS
// Manthey Performance Kit (991.2)"), не URL-слаг — но та же fuzzy-логика и те
// же уроки из a777-lib.js применимы 1:1: требуем БУКВАЛЬНОЕ имя модели (первое
// слово ярлыка) + 100% совпадение остальных токенов, иначе голая "911 GT3"
// точно так же утянет время RS/Turbo S вместо себя.
'use strict'

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
  'Accept': 'application/json',
}

async function fetchWikitext(page, timeoutMs = 15000) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    const data = await res.json()
    return data?.parse?.wikitext ?? null
  } catch { return null }
}

function cleanWikiText(s) {
  return s
    .replace(/\[\[([^|\]#]*)#[^|\]]*\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]#]+)#[^\]]*\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''/g, '').replace(/''/g, '')
    .trim()
}

// Универсальный разбор строк викитаблицы: ячейки либо по одной на строку
// (начинаются с | или !), либо через || / !! на одной строке — оба формата
// встречаются в разных списках Википедии (Нюрбургринг vs Top Gear).
function parseWikiTableRows(tableText) {
  const rowChunks = tableText.split(/\n\|-/).slice(1)
  const rows = []
  for (const chunk of rowChunks) {
    const lines = chunk.split('\n')
    const cellParts = []
    let cur = null
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('|}')) continue
      if (/^[|!]/.test(trimmed)) {
        if (cur !== null) cellParts.push(cur)
        cur = trimmed.replace(/^[|!]/, '')
      } else if (cur !== null) {
        cur += '\n' + trimmed
      }
    }
    if (cur !== null) cellParts.push(cur)
    const cells = []
    for (const part of cellParts) {
      const subParts = part.split(/\|\||!!/)
      for (let sp of subParts) {
        sp = sp.replace(/^style="[^"]*"\|/, '').replace(/^[a-z-]+="[^"]*"\|/i, '')
        cells.push(sp)
      }
    }
    if (cells.length) rows.push(cells.map(c => cleanWikiText(c)))
  }
  return rows
}

function extractSection(wikitext, heading) {
  const re = new RegExp(`====?\\s*${heading}\\s*=?===\\n([\\s\\S]*?)(?=\\n==)`)
  const m = wikitext.match(re)
  return m ? m[1] : null
}
function extractFirstTable(text) {
  const m = (text || '').match(/\{\|[\s\S]*?\n\|\}/)
  return m ? m[0] : null
}

// ─── Источник 1: Нюрбургринг, раздел Production/street-legal ────────────────
// Колонки: Length, Time, Vehicle, Driver, Date, Notes
async function fetchNurburgringEntries() {
  const wikitext = await fetchWikitext('List of Nürburgring Nordschleife lap times')
  if (!wikitext) return []
  const section = extractSection(wikitext, 'Production/street-legal')
  const table = extractFirstTable(section)
  if (!table) return []
  const rows = parseWikiTableRows(table)
  const entries = []
  for (const cells of rows) {
    if (cells.length < 5) continue
    const timeMatch = (cells[1] || '').match(/^(\d+):(\d{2}(?:\.\d+)?)$/)
    if (!timeMatch) continue
    const vehicle = cells[2]
    const yearMatch = (cells[4] || '').match(/(\d{4})/)
    entries.push({
      time: `${timeMatch[1]}:${timeMatch[2]}`,
      vehicle,
      year: yearMatch ? parseInt(yearMatch[1], 10) : null,
      source: 'wikipedia-nurburgring',
    })
  }
  return entries
}

// ─── Источник 2: Top Gear test track Power Laps ──────────────────────────────
// Колонки: Time, Vehicle, Episode (без даты — год определить нельзя)
async function fetchTopGearEntries() {
  const wikitext = await fetchWikitext('List of Top Gear test track Power Lap times')
  if (!wikitext) return []
  const table = extractFirstTable(wikitext)
  if (!table) return []
  const rows = parseWikiTableRows(table)
  const entries = []
  for (const cells of rows) {
    if (cells.length < 2) continue
    const timeMatch = (cells[0] || '').match(/^(\d{1,2}):(\d{2}(?:\.\d+)?)$/)
    if (!timeMatch) continue
    const vehicle = cells[1]
    entries.push({
      time: `${parseInt(timeMatch[1], 10)}:${timeMatch[2]}`,
      vehicle,
      year: null,
      source: 'wikipedia-topgear',
    })
  }
  return entries
}

// ─── Fuzzy-матч ноды графа против списка записей (та же логика, что a777-lib.js,
// адаптированная под свободный текст вместо URL-слага) ──────────────────────
// NFD-нормализация + снятие диакритики ДО фильтрации алфавит-цифр — живой баг:
// "Citroën" без неё превращалось в "citro"+"n" (ë читалась как разделитель), и
// осиротевший токен "n" случайно совпал с "N/A" в описании ДВИГАТЕЛЯ Corvette —
// Citroën C6 утянул время именно Chevrolet Corvette C6. С норм. "citroen" — один
// целый токен, никакой скрытой коллизии с посторонним текстом.
function tokenize(s) {
  return (s || '')
    .normalize('NFD').replace(new RegExp('[̀-ͯ]', 'g'), '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
}
const GEN_SUFFIX_RE = /\([a-z]{1,3}\d{0,3}\)|\b(?:gen\.?\s?\d+|mk\s?\d+|\biii\b|\bii\b|\biv\b)\b/gi
function tokenizeLabel(label) {
  return tokenize((label || '').replace(GEN_SUFFIX_RE, ' '))
}
const { TUNER_TOKENS } = require('./a777-lib.js')

function matchNodeToEntries(node, entries) {
  const brandWords = tokenize(node.brandName)
  const nodeTokens = tokenizeLabel(node.label).filter(t => !brandWords.includes(t))
  if (!nodeTokens.length) return null
  const coreToken  = nodeTokens[0]
  const restTokens = nodeTokens.slice(1)

  let best = null, bestScore = -Infinity
  for (const entry of entries) {
    const entryTokensAll = tokenize(entry.vehicle)
    if (entryTokensAll.some(t => TUNER_TOKENS.has(t)) && !node.isTuning) continue
    // Бренд ноды обязан присутствовать в имени тоже — иначе не наша марка вообще.
    if (!brandWords.some(t => entryTokensAll.includes(t))) continue
    const entryTokens = entryTokensAll.filter(t => !brandWords.includes(t))
    if (!entryTokens.includes(coreToken)) continue

    if (entry.year && node.year && Math.abs(entry.year - node.year) > 3) continue

    const restOverlap = restTokens.length
      ? restTokens.filter(t => entryTokens.includes(t)).length / restTokens.length
      : 1
    if (restOverlap < 1) continue

    const requested = new Set([coreToken, ...restTokens])
    const extraTokens = entryTokens.filter(t => !requested.has(t))
    // Свободный текст Википедии черпает трим-слова из ВСЕЙ истории автопрома —
    // список конкретных "запрещённых" слов (RS/ST/GT/JCW/...) заведомо неполный:
    // проверка вживую поймала голый "M3 G80" утянувшим время именно "M3 CS"
    // (Competition Sport, реально другая машина) просто потому что "cs" не был
    // в списке. Вместо угадывания каждого возможного трим-слова — принцип: ЛЮБОЙ
    // лишний токен, который НЕ чистое число (год/PS/kW/доля ревизии типа "997.1"),
    // считается новым словом описания модели и означает другую машину. Чистые
    // числа безвредны (год, мощность, ".1"/".2" ревизии) — их разрешаем.
    const meaningfulExtras = extraTokens.filter(t => !/^\d+$/.test(t))
    if (meaningfulExtras.length > 0) continue

    const yearDiff = (entry.year && node.year) ? Math.abs(entry.year - node.year) : 0
    const score = (1 + restTokens.length) * 10 - extraTokens.length * 0.5 - yearDiff * 0.2
    if (score > bestScore) { bestScore = score; best = entry }
  }
  return best
}

module.exports = {
  fetchNurburgringEntries, fetchTopGearEntries, matchNodeToEntries, tokenize, tokenizeLabel,
}
