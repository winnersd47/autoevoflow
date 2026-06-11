'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Search,
  Camera,
  X,
  Loader2,
  Clock,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Network,
} from 'lucide-react'
import type { SearchMode } from '@/lib/types'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onImageUpload: (f: File) => void
  onClear: () => void
  suggestions?: string[]
  recentSearches?: string[]
  imagePreviewUrl?: string | null
  mode: SearchMode
  onModeChange: (m: SearchMode) => void
  isLoading?: boolean
  placeholder?: string
}

// ─── Placeholder cycler ────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  'BMW E46 evolution...',
  'Porsche 911 history...',
  'Cars like Ferrari F40...',
  'Toyota Supra lineage...',
  'Who influenced the Audi TT?',
  'Mercedes W124 successors...',
]

function useCyclingPlaceholder(active: boolean) {
  const [idx, setIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [typing, setTyping] = useState(true)

  useEffect(() => {
    if (!active) return
    const target = PLACEHOLDERS[idx]!
    let i = 0

    const typeTimer = setInterval(() => {
      setDisplayed(target.slice(0, i + 1))
      i++
      if (i >= target.length) {
        clearInterval(typeTimer)
        setTyping(false)

        const waitTimer = setTimeout(() => {
          // erase
          let j = target.length
          const eraseTimer = setInterval(() => {
            setDisplayed(target.slice(0, j - 1))
            j--
            if (j <= 0) {
              clearInterval(eraseTimer)
              setIdx((prev) => (prev + 1) % PLACEHOLDERS.length)
              setTyping(true)
            }
          }, 30)
        }, 2200)
        return () => clearTimeout(waitTimer)
      }
    }, 60)

    return () => clearInterval(typeTimer)
  }, [idx, active])

  return displayed
}

// ─── Mode Tab ─────────────────────────────────────────────────────────────────

interface ModeTabProps {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
}

function ModeTab({ label, icon, active, onClick }: ModeTabProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
        active
          ? 'text-[#00d4ff] bg-[#00d4ff]/15 border border-[#00d4ff]/30'
          : 'text-white/40 hover:text-white/70 border border-transparent hover:border-white/10'
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="activeModeBg"
          className="absolute inset-0 rounded-lg bg-[#00d4ff]/10"
          style={{ zIndex: -1 }}
        />
      )}
    </button>
  )
}

// ─── Suggestion Item ──────────────────────────────────────────────────────────

interface SuggestionItemProps {
  text: string
  icon?: React.ReactNode
  highlighted?: boolean
  onClick: () => void
}

function SuggestionItem({ text, icon, highlighted, onClick }: SuggestionItemProps) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150
        ${highlighted ? 'bg-[#00d4ff]/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
    >
      <span className="text-white/30 flex-shrink-0">{icon ?? <Search className="w-3.5 h-3.5" />}</span>
      <span className="text-sm truncate">{text}</span>
      <ChevronRight className="w-3 h-3 text-white/20 ml-auto flex-shrink-0" />
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  onImageUpload,
  onClear,
  suggestions = [],
  recentSearches = [],
  imagePreviewUrl,
  mode,
  onModeChange,
  isLoading = false,
  placeholder,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const placeholderText = useCyclingPlaceholder(focused && !query)

  const showDropdown = focused && (suggestions.length > 0 || recentSearches.length > 0 || imagePreviewUrl)
  const allSuggestions = suggestions.length > 0 ? suggestions : recentSearches.slice(0, 6)

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((i) => Math.min(i + 1, allSuggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((i) => Math.max(i - 1, -1))
      } else if (e.key === 'Enter') {
        if (highlightIdx >= 0 && allSuggestions[highlightIdx]) {
          onQueryChange(allSuggestions[highlightIdx]!)
          setHighlightIdx(-1)
        } else {
          onSearch()
        }
      } else if (e.key === 'Escape') {
        onClear()
        inputRef.current?.blur()
      }
    },
    [highlightIdx, allSuggestions, onQueryChange, onSearch, onClear]
  )

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onImageUpload(file)
      }
    },
    [onImageUpload]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onImageUpload(file)
      e.target.value = ''
    },
    [onImageUpload]
  )

  const isVisualMode = mode === 'visual' || mode === 'multimodal'

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
    >
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 mb-3 px-1">
        <ModeTab
          label="Text"
          icon={<Search className="w-3 h-3" />}
          active={mode === 'semantic'}
          onClick={() => onModeChange('semantic')}
        />
        <ModeTab
          label="Visual"
          icon={<ImageIcon className="w-3 h-3" />}
          active={mode === 'visual'}
          onClick={() => onModeChange('visual')}
        />
        <ModeTab
          label="Multimodal"
          icon={<Sparkles className="w-3 h-3" />}
          active={mode === 'multimodal'}
          onClick={() => onModeChange('multimodal')}
        />
        <ModeTab
          label="Graph"
          icon={<Network className="w-3 h-3" />}
          active={mode === 'graph'}
          onClick={() => onModeChange('graph')}
        />
        {isVisualMode && imagePreviewUrl && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto px-2 py-1 rounded-full text-[10px] font-bold
              bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88]"
          >
            VISUAL ACTIVE
          </motion.span>
        )}
      </div>

      {/* Input Container */}
      <motion.div
        animate={{
          boxShadow: focused
            ? '0 0 0 1px rgba(0,212,255,0.4), 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(0,212,255,0.1)'
            : dragOver
            ? '0 0 0 2px rgba(0,212,255,0.6)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        }}
        transition={{ duration: 0.2 }}
        className="relative flex items-center rounded-2xl overflow-visible border border-white/10 bg-white/5 backdrop-blur-2xl"
      >
        {/* Image preview bubble */}
        <AnimatePresence>
          {imagePreviewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0 }}
              className="ml-3 flex-shrink-0"
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#00d4ff]/40">
                <Image src={imagePreviewUrl} alt="Visual search" fill className="object-cover" />
                <button
                  onClick={onClear}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black border border-white/20
                    flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search icon */}
        <div className="pl-4 flex-shrink-0 text-white/30">
          <Search className="w-5 h-5" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKey}
          placeholder={placeholder ?? (focused && !query ? placeholderText + '|' : 'Search cars by description, features, visual...')}
          className="flex-1 bg-transparent px-3 py-4 text-sm text-white placeholder-white/30 outline-none min-w-0"
        />

        {/* Clear button */}
        <AnimatePresence>
          {(query || imagePreviewUrl) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={onClear}
              className="mr-1 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Camera button */}
        <button
          onClick={() => fileRef.current?.click()}
          className={`mr-1 p-2.5 rounded-xl transition-all duration-200 flex-shrink-0
            ${imagePreviewUrl
              ? 'text-[#00d4ff] bg-[#00d4ff]/15 border border-[#00d4ff]/30'
              : 'text-white/30 hover:text-white/70 hover:bg-white/8'
            }`}
          title="Upload image for visual search"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Search button */}
        <button
          onClick={onSearch}
          disabled={!query && !imagePreviewUrl}
          className="m-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm
            bg-[#00d4ff] text-black transition-all duration-200 flex items-center gap-2
            hover:bg-[#00e8ff] hover:shadow-[0_0_16px_rgba(0,212,255,0.5)]
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none
            active:scale-[0.97] flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </motion.div>

      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl flex items-center justify-center z-20
              border-2 border-dashed border-[#00d4ff]/60 bg-[#00d4ff]/8 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-[#00d4ff]" />
              <span className="text-sm font-semibold text-[#00d4ff]">Drop image for visual search</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50
              bg-[#0a0a0f]/95 border border-white/10 backdrop-blur-2xl"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)' }}
          >
            {recentSearches.length > 0 && suggestions.length === 0 && (
              <div className="px-4 py-2 border-b border-white/8">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                  Recent Searches
                </span>
              </div>
            )}
            {suggestions.length > 0 && (
              <div className="px-4 py-2 border-b border-white/8">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                  Suggestions
                </span>
              </div>
            )}
            {allSuggestions.map((s, i) => (
              <SuggestionItem
                key={s}
                text={s}
                highlighted={i === highlightIdx}
                icon={
                  suggestions.length > 0
                    ? <Search className="w-3.5 h-3.5" />
                    : <Clock className="w-3.5 h-3.5" />
                }
                onClick={() => {
                  onQueryChange(s)
                  setFocused(false)
                  setTimeout(() => onSearch(), 50)
                }}
              />
            ))}
            {allSuggestions.length === 0 && (
              <div className="px-4 py-6 text-center text-white/30 text-sm">
                Start typing to see suggestions
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SearchBar
