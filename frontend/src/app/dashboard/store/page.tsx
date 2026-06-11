'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Check, Zap, Crown, Star, CreditCard,
  Clock, Lock, Globe, FileJson, Sparkles,
  Search, BarChart3, Bell, Share2, Code2,
} from 'lucide-react'
import { useLocale } from '@/contexts/LocaleContext'

// ─── Feature definitions ──────────────────────────────────────────────────────

type Feature = { text: string; live: boolean }

interface Plan {
  key: string
  icon: React.ElementType
  color: string
  highlight?: boolean
  badge?: string
  badgeClass: string
  price: { eur: string | null; rub: string | null }
  tagline: string
  features: Feature[]
  cta: string
  ctaClass: string
}

const PLANS: Plan[] = [
  {
    key: 'free',
    icon: Star,
    color: 'border-border',
    badgeClass: 'badge-surface',
    price: { eur: null, rub: null },
    tagline: 'Всё необходимое для изучения',
    features: [
      { text: 'Граф эволюции — 322 узла, 383 связи',    live: true  },
      { text: 'Каталог 180+ моделей с историей',         live: true  },
      { text: 'AI-анализ 7 брендов (кэш)',               live: true  },
      { text: 'ДНК-радар брендов',                       live: true  },
      { text: 'Сравнение до 4 моделей',                  live: true  },
      { text: 'Галерея обоев (FHD / QHD / 4K)',          live: true  },
      { text: 'Visual Search',                           live: false },
      { text: 'AI-анализ по запросу',                    live: false },
    ],
    cta: 'Текущий план',
    ctaClass: 'w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-text-muted flex items-center gap-2 cursor-default',
  },
  {
    key: 'pro',
    icon: Zap,
    color: 'border-primary/40',
    highlight: true,
    badge: 'Популярный',
    badgeClass: 'badge-primary',
    price: { eur: '€4.99', rub: '₽490' },
    tagline: 'AI-функции по запросу',
    features: [
      { text: 'Всё из Free',                             live: true  },
      { text: 'AI-анализ любого бренда по запросу',      live: false },
      { text: 'Visual Search — загрузи фото, найди авто',live: false },
      { text: 'Безлимитные сохранённые сравнения',       live: true  },
      { text: 'Экспорт графа (JSON / PNG)',               live: true  },
      { text: 'Алерты о новых моделях',                  live: false },
      { text: 'Приоритетное добавление брендов',         live: false },
    ],
    cta: 'Подключить Pro',
    ctaClass: 'btn-primary w-full justify-center',
  },
  {
    key: 'premium',
    icon: Crown,
    color: 'border-gold/40',
    badge: 'Полный доступ',
    badgeClass: 'text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded-full text-xs font-semibold',
    price: { eur: '€14.99', rub: '₽1 490' },
    tagline: 'Для разработчиков и профессионалов',
    features: [
      { text: 'Всё из Pro',                              live: true  },
      { text: 'REST API доступ',                         live: false },
      { text: 'Встраиваемые виджеты графа',              live: false },
      { text: 'Ранний доступ к новым функциям',          live: false },
      { text: 'Выделенная поддержка',                    live: false },
      { text: 'Аналитика использования',                 live: false },
    ],
    cta: 'Подключить Premium',
    ctaClass: 'w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gold/20 border border-gold/40 text-gold hover:bg-gold/30 transition-all flex items-center gap-2',
  },
]

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({ f }: { f: Feature }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {f.live
        ? <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        : <Clock className="w-4 h-4 text-text-muted/50 shrink-0 mt-0.5" />
      }
      <span className={f.live ? 'text-text-secondary' : 'text-text-muted/60'}>
        {f.text}
        {!f.live && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/50">скоро</span>}
      </span>
    </li>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StorePage() {
  const { locale } = useLocale()
  const isRu = locale === 'ru'

  const handleSubscribe = (planKey: string) => {
    alert(isRu
      ? `Demo-режим: подключение платёжного шлюза требует запущенного бэкенда. Тариф: ${planKey}`
      : `Demo mode: payment gateway requires backend. Plan: ${planKey}`)
  }

  return (
    <div className="space-y-10 max-w-5xl">

      {/* Header */}
      <div className="text-center space-y-2">
        <span className="section-label block mb-3">{isRu ? 'Тарифы' : 'Pricing'}</span>
        <h1 className="font-display text-3xl font-black text-text-primary">
          {isRu ? 'Честные тарифы' : 'Transparent pricing'}
        </h1>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          {isRu
            ? 'Базовый доступ — бесплатно навсегда. Pro и Premium открывают AI-функции по мере их запуска.'
            : 'Core access is free forever. Pro and Premium unlock AI features as they launch.'}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted px-1">
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-primary" />
          {isRu ? 'Работает сейчас' : 'Live now'}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-text-muted/50" />
          {isRu ? 'В разработке — появится после запуска бэкенда' : 'Coming soon — requires backend launch'}
        </span>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass rounded-2xl border ${plan.color} p-6 flex flex-col
              ${plan.highlight ? 'ring-1 ring-primary/30 shadow-[0_0_32px_rgba(0,212,255,0.08)]' : ''}`}
          >
            {/* Plan header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <plan.icon className={`w-5 h-5 ${
                  plan.highlight ? 'text-primary'
                  : plan.key === 'premium' ? 'text-gold'
                  : 'text-text-muted'
                }`} />
                <span className="font-display font-bold text-text-primary">
                  {plan.key === 'free' ? (isRu ? 'Бесплатно' : 'Free')
                  : plan.key === 'pro' ? 'Pro'
                  : 'Premium'}
                </span>
              </div>
              {plan.badge && <span className={plan.badgeClass}>{plan.badge}</span>}
            </div>

            <p className="text-xs text-text-muted mb-5">{plan.tagline}</p>

            {/* Price */}
            <div className="mb-6 pb-5 border-b border-border">
              {plan.price.rub ? (
                <div className="flex items-end gap-1">
                  <span className="font-display text-4xl font-black text-text-primary leading-none">
                    {isRu ? plan.price.rub : plan.price.eur}
                  </span>
                  <span className="text-text-muted text-sm mb-0.5">{isRu ? '/мес' : '/mo'}</span>
                </div>
              ) : (
                <span className="font-display text-4xl font-black text-text-primary leading-none">
                  {isRu ? '₽0' : '€0'}
                </span>
              )}
              {plan.price.rub && (
                <p className="text-xs text-text-muted mt-1">
                  {isRu ? `также ${plan.price.eur}/mo` : `также ${plan.price.rub}/мес`}
                </p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-2.5 flex-1 mb-6">
              {plan.features.map((f, fi) => (
                <FeatureRow key={fi} f={f} />
              ))}
            </ul>

            {/* CTA */}
            <div className="space-y-2">
              <button
                onClick={() => plan.key !== 'free' && handleSubscribe(plan.key)}
                disabled={plan.key === 'free'}
                className={plan.ctaClass}
              >
                {plan.key !== 'free' && <CreditCard className="w-4 h-4" />}
                {plan.key === 'free'
                  ? (isRu ? 'Текущий план' : 'Current plan')
                  : plan.key === 'pro'
                    ? (isRu ? 'Подключить Pro' : 'Start Pro')
                    : (isRu ? 'Подключить Premium' : 'Go Premium')}
              </button>
              {plan.key !== 'free' && (
                <button
                  onClick={() => handleSubscribe(plan.key + '-crypto')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium
                    border border-border text-text-muted hover:text-text-secondary hover:border-white/15 transition-all"
                >
                  {isRu ? 'Оплатить криптовалютой' : 'Pay with Crypto'}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Roadmap note */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display text-base font-bold text-text-primary mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          {isRu ? 'Что появится после запуска бэкенда' : 'Launching with backend'}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Search, label: isRu ? 'Visual Search' : 'Visual Search', desc: isRu ? 'Загрузи фото → CLIP найдёт похожие' : 'Upload photo → CLIP finds similar cars' },
            { icon: Sparkles, label: isRu ? 'AI по запросу' : 'On-demand AI', desc: isRu ? 'Анализ любого бренда через Claude' : 'Analyze any brand via Claude' },
            { icon: Bell, label: isRu ? 'Алерты' : 'Alerts', desc: isRu ? 'Уведомления о новых моделях' : 'New model notifications' },
            { icon: Code2, label: 'API', desc: isRu ? 'REST API для разработчиков' : 'REST API for developers' },
            { icon: Share2, label: isRu ? 'Виджеты' : 'Embeds', desc: isRu ? 'Граф на вашем сайте' : 'Evolution graph on your site' },
            { icon: BarChart3, label: isRu ? 'Аналитика' : 'Analytics', desc: isRu ? 'Статистика использования' : 'Usage statistics' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <Icon className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text-secondary">{label}</p>
                <p className="text-xs text-text-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment providers */}
      <div className="text-center space-y-4">
        <p className="text-xs text-text-muted uppercase tracking-widest">
          {isRu ? 'Платёжные провайдеры' : 'Payment providers'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { name: 'ЮKassa', desc: isRu ? 'Карты · СБП · SberPay' : 'Cards · SBP · SberPay' },
            { name: 'CryptoCloud', desc: 'USDT · BTC · ETH' },
            { name: 'Prodamus', desc: isRu ? 'Visa · MC · международные' : 'Visa · MC · international' },
          ].map(p => (
            <div key={p.name} className="glass rounded-xl border border-border px-5 py-3 text-center min-w-[120px]">
              <p className="font-display text-sm font-bold text-text-primary">{p.name}</p>
              <p className="text-xs text-text-muted mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          {isRu
            ? '⚠️ Demo-режим — оплата активируется после подключения бэкенда'
            : '⚠️ Demo mode — payments activate after backend launch'}
        </p>
      </div>

    </div>
  )
}
