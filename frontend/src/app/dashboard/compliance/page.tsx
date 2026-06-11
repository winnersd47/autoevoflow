'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Upload, CheckCircle2, Circle } from 'lucide-react'

interface ComplianceItem {
  id: string
  name: string
  desc: string
  checked: boolean
}

interface ComplianceGroup {
  label: string
  items: ComplianceItem[]
}

const INITIAL: ComplianceGroup[] = [
  {
    label: 'Legal',
    items: [
      { id: 'tos', name: 'Terms of Service', desc: 'Public-facing ToS document published at /terms', checked: true },
      { id: 'privacy', name: 'Privacy Policy', desc: 'GDPR-compliant privacy policy at /privacy', checked: true },
      { id: 'cookie', name: 'Cookie Policy', desc: 'Cookie consent banner and policy document', checked: false },
      { id: 'refund', name: 'Refund Policy', desc: 'Refund and cancellation terms for subscriptions', checked: false },
      { id: 'disclaimer', name: 'Disclaimer', desc: 'Data accuracy disclaimer for automotive information', checked: true },
    ],
  },
  {
    label: 'Financial',
    items: [
      { id: 'payment', name: 'Payment Processing Agreement', desc: 'Agreement with ЮKassa / Stripe / CryptoCloud', checked: false },
      { id: 'aml', name: 'Anti-Money Laundering Policy', desc: 'AML procedures and documentation', checked: false },
      { id: 'kyc', name: 'KYC Procedures', desc: 'Know Your Customer identity verification process', checked: false },
      { id: 'retention', name: 'Data Retention Policy', desc: 'Policy for how long financial data is stored', checked: false },
    ],
  },
  {
    label: 'Technical',
    items: [
      { id: 'security', name: 'Security Audit', desc: 'Third-party security penetration testing report', checked: false },
      { id: 'ssl', name: 'SSL Certificate', desc: 'Valid TLS certificate for autoevoflow.com', checked: true },
      { id: 'gdpr', name: 'GDPR Compliance', desc: 'Full GDPR compliance assessment and documentation', checked: false },
      { id: 'dpa', name: 'Data Processing Agreement', desc: 'DPA with all third-party data processors', checked: true },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'company', name: 'Company Registration', desc: 'Legal entity registration (LLC/Ltd/IP)', checked: false },
      { id: 'vat', name: 'VAT Registration', desc: 'VAT/НДС registration for applicable jurisdictions', checked: false },
      { id: 'banking', name: 'Banking Agreement', desc: 'Business bank account and merchant services', checked: false },
      { id: 'insurance', name: 'Insurance', desc: 'Professional liability and cyber insurance', checked: false },
    ],
  },
]

export default function CompliancePage() {
  const [groups, setGroups] = useState<ComplianceGroup[]>(INITIAL)

  const toggle = (groupLabel: string, id: string) => {
    setGroups(prev => prev.map(g =>
      g.label === groupLabel
        ? { ...g, items: g.items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) }
        : g
    ))
  }

  const allItems = groups.flatMap(g => g.items)
  const completed = allItems.filter(i => i.checked).length
  const total = allItems.length
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="font-display text-2xl font-bold text-text-primary">Compliance Checklist</h2>
      </div>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-border p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-text-secondary">{completed} of {total} items completed</p>
          <span className="font-display text-2xl font-bold text-primary">{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 border border-border overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
          />
        </div>
      </motion.div>

      {/* Groups */}
      {groups.map((group, gi) => (
        <motion.div
          key={group.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.08 }}
          className="glass rounded-2xl border border-border p-5"
        >
          <h3 className="font-display font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {group.label}
          </h3>
          <div className="space-y-3">
            {group.items.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                <button
                  onClick={() => toggle(group.label, item.id)}
                  className="mt-0.5 shrink-0 text-text-muted hover:text-primary transition-colors"
                >
                  {item.checked
                    ? <CheckCircle2 className="w-5 h-5 text-primary" />
                    : <Circle className="w-5 h-5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${item.checked ? 'text-text-primary line-through opacity-60' : 'text-text-primary'}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => alert('Demo: file upload requires backend storage integration.')}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-text-muted
                    hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
