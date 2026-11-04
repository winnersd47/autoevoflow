'use client'

// Публичная страница-чат "спросите об истории авто" — поверх /api/ask.
// Это статичный роут (не /[slug]/), поэтому, как /compare, живёт одним
// клиентским файлом без серверной обёртки + _client.tsx (тот паттерн нужен
// только динамическим страницам вроде model/[slug] ради generateStaticParams).

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, MessageCircle, Sparkles, AlertCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

const SUGGESTED_QUESTIONS = [
  'Чем BMW M3 E46 отличается от E36?',
  'Когда вышел первый Tesla Model S?',
  'Расскажи историю Porsche 911',
]

// ─── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/70"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary/15 border border-primary/30 text-text-primary'
            : message.isError
              ? 'border border-danger/30 bg-danger/10 text-danger'
              : 'glass border border-border text-text-primary'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
            {message.isError ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Sparkles className="w-3 h-3 text-primary" />
            )}
            {message.isError ? 'Ошибка' : 'Ассистент AutoEvoFlow'}
          </div>
        )}
        {message.content}
      </div>
    </motion.div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Автопрокрутка к последнему сообщению / индикатору набора текста
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(
    async (overrideText?: string) => {
      const question = (overrideText ?? input).trim()
      if (!question || loading) return

      // История — все сообщения ДО нового вопроса, в формате для API
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: question }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      setLoading(true)

      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || typeof data.answer !== 'string') {
          throw new Error(data?.error || 'Не удалось получить ответ. Попробуйте позже.')
        }
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.answer }])
      } catch (e) {
        setMessages(prev => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: e instanceof Error ? e.message : 'Не удалось получить ответ. Попробуйте позже.',
            isError: true,
          },
        ])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [input, loading, messages]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 text-center">
        <span className="section-label block mb-3">AI-АССИСТЕНТ</span>
        <h1 className="font-display text-3xl font-black text-text-primary mb-2">
          Спросите <span className="text-primary">об истории авто</span>
        </h1>
        <p className="text-text-secondary text-sm max-w-xl mx-auto">
          Вопрос о поколениях, годах выпуска и характеристиках моделей — ответ строится на реальных
          данных графа эволюции AutoEvoFlow, а не придумывается на ходу.
        </p>
      </div>

      {/* ── Chat card ───────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl border border-border flex flex-col h-[70vh] min-h-[420px] overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <p className="text-text-secondary text-sm mb-5 max-w-sm">
                Спросите про конкретное поколение модели — ассистент отвечает на основе данных базы,
                а не выдумывает цифры. Например:
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="btn-ghost justify-start text-left border border-border disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="glass border border-border rounded-2xl">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input bar — pinned at the bottom of the card */}
        <div className="border-t border-border p-3 flex items-center gap-2 bg-surface/40 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Например: чем отличается Porsche 911 996 от 997?"
            disabled={loading}
            className="input-base flex-1"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="btn-primary"
            aria-label="Отправить"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Отправить</span>
          </button>
        </div>
      </div>
    </div>
  )
}
