'use strict'
/**
 * sync-published-to-git.js — двусторонняя синхронизация состояния публикатора
 * с GitHub (→ Vercel пересобирает сайт, страница /latest показывает новые посты).
 *
 * Зачем: /api/published-stories отдаёт public/data/published-stories.json так,
 * как он лежит в деплое, то есть как в git. Раньше его никто не коммитил (кроме
 * человека вручную) — лента застывала, хотя публикации в Telegram шли.
 *
 * Автопубликацию ведёт GitHub Actions (publish-stories.yml) и сам коммитит
 * состояние. Этот скрипт нужен для РУЧНЫХ локальных публикаций (--car-id в
 * еженедельной задаче telegram-gap-fill): состояние СЛИВАЕТСЯ (объединение), а не
 * перезаписывается, иначе локальная копия затёрла бы то, что успел опубликовать CI
 * (и наоборот) — отсюда дубли в канале.
 *
 * Как: git plumbing + ВРЕМЕННЫЙ индекс. Рабочее дерево, индекс и ветка
 * пользователя не трогаются (там постоянно лежат незакоммиченные правки других
 * плановых задач). Коммит строится поверх origin/main и содержит только FILES.
 *
 * Режимы:
 *   (без флагов)  слить local+origin, обновить локальные файлы, закоммитить и запушить в origin/main
 *   --pull        только подтянуть из origin/main и слить в локальные файлы (без push) — перед ручной публикацией
 *   --dry-run     показать, что было бы выгружено, без push
 */
const { execFileSync } = require('child_process')
const fs   = require('fs')
const os   = require('os')
const path = require('path')

const DRY_RUN = process.argv.includes('--dry-run')
const PULL    = process.argv.includes('--pull')
const MAX_STORIES = 60 // как MAX_PUBLISHED_STORIES в publish-new-stories.js

const FILES = [
  'frontend/public/data/published-stories.json', // сама лента /latest
  'frontend/public/data/published-ids.json',     // дедупликация публикатора
  'frontend/public/data/model-link-registry.json',
]

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: opts.cwd || __dirname,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

const REPO_ROOT = git(['rev-parse', '--show-toplevel']).trim()
const g = (args, env) => git(args, { cwd: REPO_ROOT, env }).trim()
const log = (m) => console.log(`[sync-published] ${m}`)

// ─── Слияние: объединение, при конфликте побеждает более новая запись ───────

const latest = (...xs) => xs.filter(Boolean).sort().pop()
// Одинаковое состояние не трогаем: пересортировка/пересчёт updatedAt породили бы
// пустой коммит (и деплой Vercel) на каждом запуске.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function mergeIds(remote, local) {
  if (same(remote, local)) return local
  const ids  = [...new Set([...(remote.ids || []), ...(local.ids || [])])]
  const keys = [...new Set([...(remote.keys || []), ...(local.keys || [])])]
  const records = { ...(remote.records || {}) }
  for (const [k, v] of Object.entries(local.records || {})) {
    if (!records[k] || String(v.updatedAt || '') > String(records[k].updatedAt || '')) records[k] = v
  }
  return { ids, keys, records, updatedAt: latest(remote.updatedAt, local.updatedAt), total: ids.length }
}

function mergeStories(remote, local) {
  if (same(remote, local)) return local
  const byKey = new Map()
  for (const s of [...(remote.stories || []), ...(local.stories || [])]) {
    const k = s.modelKey || s.id
    const cur = byKey.get(k)
    const winner = !cur || String(s.publishedAt) > String(cur.publishedAt) ? s : cur
    const other  = winner === s ? cur : s
    // teaserSentAt — защита от повторного тизера во втором канале, терять нельзя
    if (other?.teaserSentAt && !winner.teaserSentAt) byKey.set(k, { ...winner, teaserSentAt: other.teaserSentAt })
    else byKey.set(k, winner)
  }
  const stories = [...byKey.values()]
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, MAX_STORIES)
  return { stories, updatedAt: latest(remote.updatedAt, local.updatedAt) }
}

function mergeRegistry(remote, local) {
  if (same(remote, local)) return local
  const out = { ...remote }
  for (const [k, v] of Object.entries(local)) {
    if (!out[k] || String(v.usedAt || '') > String(out[k].usedAt || '')) out[k] = v
  }
  return out
}

const MERGERS = {
  'published-stories.json': mergeStories,
  'published-ids.json': mergeIds,
  'model-link-registry.json': mergeRegistry,
}

// Защита от выгрузки битого файла: оборванная запись опубликатора сломала бы
// /api/published-stories (500 "parse error") уже на проде.
function validate(rel, data) {
  if (rel.endsWith('published-stories.json') && !(Array.isArray(data.stories) && data.stories.length > 0)) {
    throw new Error('published-stories.json без массива stories')
  }
  if (rel.endsWith('published-ids.json') && !Array.isArray(data.ids)) {
    throw new Error('published-ids.json без массива ids')
  }
}

function readRemote(ref, rel) {
  try { return git(['show', `${ref}:${rel}`], { cwd: REPO_ROOT }) } catch { return null }
}

function attempt() {
  g(['fetch', '--quiet', 'origin', 'main'])
  const base = g(['rev-parse', 'origin/main'])

  const changed = []   // [{rel, blob}] — что уйдёт в коммит
  const adopted = []   // локальные файлы, обновлённые данными из origin
  for (const rel of FILES) {
    const abs = path.join(REPO_ROOT, rel)
    const localText  = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
    const remoteText = readRemote(base, rel)
    const local  = localText  ? JSON.parse(localText)  : null
    const remote = remoteText ? JSON.parse(remoteText) : null
    if (local) validate(rel, local)

    const name = path.basename(rel)
    const merged = local && remote ? MERGERS[name](remote, local) : (local || remote)
    if (!merged) continue
    validate(rel, merged)
    const mergedText = JSON.stringify(merged, null, 2)

    if (mergedText !== localText) {
      if (!DRY_RUN) fs.writeFileSync(abs, mergedText)
      adopted.push(name)
    }
    if (PULL) continue

    const tmp = path.join(os.tmpdir(), `autoevoflow-sync-${process.pid}-${name}`)
    fs.writeFileSync(tmp, mergedText)
    try {
      const blob = g(['hash-object', '-w', tmp])
      let remoteBlob = null
      try { remoteBlob = g(['rev-parse', `${base}:${rel}`]) } catch {}
      if (blob !== remoteBlob) changed.push({ rel, blob })
    } finally { try { fs.unlinkSync(tmp) } catch {} }
  }

  if (adopted.length) log(`${DRY_RUN ? 'было бы обновлено' : 'обновлено'} локально из origin: ${adopted.join(', ')}`)
  if (PULL) { log(adopted.length ? 'подтянуто из origin/main' : 'локальное состояние уже актуально'); return 'pulled' }
  if (!changed.length) { log('нечего выгружать — git уже актуален'); return 'clean' }

  const storiesChanged = changed.some(c => c.rel.endsWith('published-stories.json'))
  log(`к выгрузке: ${changed.map(c => path.basename(c.rel)).join(', ')}`)

  const idx = path.join(os.tmpdir(), `autoevoflow-sync-index-${process.pid}`)
  try {
    const env = { GIT_INDEX_FILE: idx }
    g(['read-tree', base], env)
    for (const c of changed) g(['update-index', '--add', '--cacheinfo', `100644,${c.blob},${c.rel}`], env)
    const tree = g(['write-tree'], env)
    const msg = storiesChanged ? 'chore(feed): sync published stories to site' : 'chore(feed): sync publisher state'
    const commit = g(['commit-tree', tree, '-p', base, '-m', msg])

    if (DRY_RUN) { log(`dry-run: был бы коммит ${commit.slice(0, 7)} поверх ${base.slice(0, 7)} — push пропущен`); return 'dry' }

    g(['push', 'origin', `${commit}:refs/heads/main`])
    log(`выгружено: ${commit.slice(0, 7)} → origin/main (Vercel пересоберёт сайт)`)
    return 'pushed'
  } finally {
    try { fs.unlinkSync(idx) } catch {}
  }
}

function main() {
  for (let i = 1; i <= 3; i++) {
    try { return attempt() } catch (e) {
      const err = String(e.stderr || e.message || e)
      // Кто-то успел запушить в main между fetch и push — повторяем на свежем origin/main.
      if (/rejected|non-fast-forward|fetch first/i.test(err) && i < 3) { log(`push отклонён (main ушёл вперёд), попытка ${i + 1}/3`); continue }
      log(`не удалось: ${err.trim().split('\n')[0]}`)
      process.exit(1)
    }
  }
}

main()
