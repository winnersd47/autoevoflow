#!/usr/bin/env node
/**
 * set-admin-password.js — задаёт email/пароль единственного админ-аккаунта
 * сайта локально, без настоящего бэкенда (которого нет и не будет — см.
 * комментарий в src/lib/auth-cookies.ts). Пароль никогда никуда не уходит
 * из этого процесса — только хэш (scrypt + соль) пишется в .env.local.
 *
 * Запускать САМОСТОЯТЕЛЬНО в своём терминале, не через ассистента:
 *   node scripts/set-admin-password.js you@example.com "ваш пароль"
 *
 * После смены пароля нужно перезапустить `npm run dev`/прод-сервер, чтобы
 * подхватить новый .env.local (process.env кэшируется на старте процесса).
 */
'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const [, , email, password] = process.argv
if (!email || !password) {
  console.error('Использование: node scripts/set-admin-password.js <email> <пароль>')
  process.exit(1)
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Похоже, это не email:', email)
  process.exit(1)
}
if (password.length < 8) {
  console.error('Пароль слишком короткий (минимум 8 символов)')
  process.exit(1)
}

const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.scryptSync(password, salt, 64).toString('hex')
const hashField = `${salt}:${hash}`

const envPath = path.join(__dirname, '../.env.local')
let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

function upsertVar(src, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm')
  if (re.test(src)) return src.replace(re, `${key}=${value}`)
  return src.replace(/\n?$/, '') + `\n${key}=${value}\n`
}

content = upsertVar(content, 'ADMIN_EMAIL', email)
content = upsertVar(content, 'ADMIN_PASSWORD_HASH', hashField)
fs.writeFileSync(envPath, content)

console.log(`✅ Готово. ADMIN_EMAIL=${email} записан в .env.local, пароль сохранён только как хэш.`)
console.log('Перезапустите dev/прод-сервер, чтобы изменения подхватились.')
