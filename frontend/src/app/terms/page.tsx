'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    num: '1',
    title: 'Acceptance of Terms',
    text: 'By accessing or using AutoEvoFlow ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We reserve the right to update these terms at any time, and your continued use of the Service constitutes acceptance of the revised terms.',
  },
  {
    num: '2',
    title: 'Description of Service',
    text: 'AutoEvoFlow is an automotive intelligence platform that provides information about car models, evolution graphs, AI-powered design analysis, and visual search capabilities. The Service is provided on a "as-is" basis and is intended for informational and educational purposes. Some features are available on a subscription basis as described in our pricing section.',
  },
  {
    num: '3',
    title: 'User Accounts',
    text: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate information when registering. We reserve the right to terminate accounts that violate these terms or that have been inactive for an extended period.',
  },
  {
    num: '4',
    title: 'Intellectual Property',
    text: 'The AutoEvoFlow platform, including its software, design, text, and graphics, is owned by AutoEvoFlow and protected by applicable intellectual property laws. Automotive data, model information, and images are sourced from publicly available databases and are credited to their respective owners. You may not reproduce, distribute, or create derivative works without our explicit written permission.',
  },
  {
    num: '5',
    title: 'Disclaimer',
    text: 'AutoEvoFlow provides automotive data for informational purposes only. While we strive for accuracy, we make no warranties regarding the completeness or accuracy of the information provided. The platform aggregates data from multiple public sources, and discrepancies may exist. Users should verify critical information from authoritative sources before making decisions.',
  },
  {
    num: '6',
    title: 'Limitation of Liability',
    text: 'To the fullest extent permitted by law, AutoEvoFlow shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the twelve months preceding the claim. Some jurisdictions do not allow limitation of liability, so these limitations may not apply to you.',
  },
  {
    num: '7',
    title: 'Contact',
    text: 'For questions about these Terms of Service, please contact us at legal@autoevoflow.com. We will respond to inquiries within 30 business days. For GDPR-related requests, please use our dedicated privacy contact form at autoevoflow.com/privacy.',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-text-primary">Terms of Service</h1>
              <p className="text-xs text-text-muted">Last updated: January 2026</p>
            </div>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Please read these terms carefully before using AutoEvoFlow. These terms govern your access to and use of the AutoEvoFlow platform and services.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.num}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl border border-border p-6"
            >
              <h2 className="font-display text-lg font-bold text-text-primary mb-3 flex items-start gap-3">
                <span className="text-primary font-mono text-sm mt-0.5 shrink-0">{section.num}.</span>
                {section.title}
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">{section.text}</p>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-4 text-sm text-text-muted">
          <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/" className="hover:text-text-primary transition-colors">AutoEvoFlow Home</Link>
          <span>·</span>
          <span>© 2026 AutoEvoFlow</span>
        </div>
      </div>
    </div>
  )
}
