'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Data We Collect',
    text: 'We collect information you provide directly, such as your email address, username, and preferences when you create an account. We also collect usage data including pages visited, search queries entered, and features used, to improve the platform experience. Technical data such as IP address and browser type may be logged for security and analytics purposes.',
  },
  {
    title: 'How We Use Your Data',
    text: 'Your data is used to provide and improve the AutoEvoFlow service, personalise your experience, and send service-related communications. We use anonymised, aggregated usage statistics to improve our AI models and feature recommendations. We do not sell, rent, or share your personal data with third parties for marketing purposes.',
  },
  {
    title: 'Data Storage',
    text: 'User data is stored in PostgreSQL databases hosted on EU-based servers. Passwords are hashed using bcrypt and never stored in plain text. Session tokens are stored as HTTP-only cookies. Analytics data is anonymised before storage and retained for a maximum of 24 months. You may request deletion of your data at any time.',
  },
  {
    title: 'Third-Party Services',
    text: 'AutoEvoFlow uses a limited set of third-party services: payment processors (ЮKassa, CryptoCloud) for subscription management, and anonymised analytics. Each third-party service operates under its own privacy policy. We require all processors to maintain GDPR-compliant data handling practices and enter into Data Processing Agreements with us.',
  },
  {
    title: 'Your Rights (GDPR)',
    text: 'Under GDPR, if you are located in the EU or EEA, you have the right to access, rectify, erase, restrict processing, and port your personal data. You also have the right to object to processing and to withdraw consent at any time. To exercise any of these rights, contact us at privacy@autoevoflow.com. We will respond within 30 days.',
  },
  {
    title: 'Contact',
    text: 'For privacy inquiries, data deletion requests, or GDPR rights exercising, contact our Data Protection Officer at privacy@autoevoflow.com. For general inquiries, use legal@autoevoflow.com. Our registered data controller information is available upon request. We are committed to resolving privacy concerns promptly and transparently.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-text-primary">Privacy Policy</h1>
              <p className="text-xs text-text-muted">Last updated: January 2026</p>
            </div>
          </div>
          <p className="text-text-secondary leading-relaxed">
            AutoEvoFlow is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information in compliance with GDPR and applicable data protection laws.
          </p>
        </motion.div>

        <div className="space-y-8">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl border border-border p-6"
            >
              <h2 className="font-display text-lg font-bold text-text-primary mb-3">{section.title}</h2>
              <p className="text-text-secondary text-sm leading-relaxed">{section.text}</p>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4 text-sm text-text-muted">
          <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link>
          <span>·</span>
          <Link href="/" className="hover:text-text-primary transition-colors">AutoEvoFlow Home</Link>
          <span>·</span>
          <span>© 2026 AutoEvoFlow</span>
        </div>
      </div>
    </div>
  )
}
