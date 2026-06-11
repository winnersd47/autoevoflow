'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Smartphone, Download, X, ZoomIn,
  ChevronLeft, ChevronRight, ImageOff, Loader2,
} from 'lucide-react'
import type { Generation, VehicleImage } from '@/lib/types'
import { useLocale } from '@/contexts/LocaleContext'

// ─── Resolution presets ────────────────────────────────────────────────────────

interface ResolutionPreset {
  key: string
  w: number
  h: number
  labelKey: string
}

const DESKTOP_PRESETS: ResolutionPreset[] = [
  { key: 'fhd',  w: 1920, h: 1080, labelKey: 'model.galleryFHD' },
  { key: 'qhd',  w: 2560, h: 1440, labelKey: 'model.galleryQHD' },
  { key: '4k',   w: 3840, h: 2160, labelKey: 'model.gallery4K'  },
]

const PHONE_PRESETS: ResolutionPreset[] = [
  { key: 'port', w: 1080, h: 1920, labelKey: 'model.galleryPortrait' },
]

// ─── URL manipulation ─────────────────────────────────────────────────────────
//
// caricos.com URL format:
//   https://images.caricos.com/c/<brand>/<model>/images/<W>x<H>/<model>_<n>_<W>x<H>.jpg
//
// We replace both the folder segment and the filename suffix.

const CARICOS_RE = /^(https:\/\/images\.caricos\.com\/.+\/images\/)(\d+x\d+)\/(.+?)_(\d+x\d+)(\.jpg.*)$/i

function deriveUrl(originalUrl: string, w: number, h: number): string {
  const res = `${w}x${h}`
  const match = originalUrl.match(CARICOS_RE)
  if (match) {
    // match[1] = base path, match[2] = old res folder, match[3] = stem, match[4] = old res suffix, match[5] = ext
    return `${match[1]}${res}/${match[3]}_${res}${match[5]}`
  }
  // For non-caricos sources we can't derive — return as-is only if dimensions match
  return originalUrl
}

function canDerive(url: string): boolean {
  return CARICOS_RE.test(url)
}

// ─── WallpaperImage (single tile with error / loading state) ──────────────────

interface WallpaperTileProps {
  src: string
  alt: string
  resLabel: string
  isPortrait: boolean
  onClick: () => void
  onLoad: () => void
  onError: () => void
  failed: boolean
  loading: boolean
}

function WallpaperTile({ src, alt, resLabel, isPortrait, onClick, onLoad, onError, failed, loading }: WallpaperTileProps) {
  if (failed) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-xl overflow-hidden cursor-pointer bg-white/4 border border-white/8 hover:border-white/20 transition-colors"
      style={{ aspectRatio: isPortrait ? '9/16' : '16/9' }}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/3">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${loading ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between">
          <span className="text-[10px] text-white/70 font-mono">{resLabel}</span>
          <ZoomIn className="w-4 h-4 text-white/70" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Resolution section ───────────────────────────────────────────────────────

interface ResSectionEntry {
  preset: ResolutionPreset
  items: GalleryItem[]
}

// ─── Flat gallery item ────────────────────────────────────────────────────────

interface GalleryItem {
  id: string
  url: string
  alt: string
  w: number
  h: number
  genName: string
  originalUrl: string
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  items: GalleryItem[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

function Lightbox({ items, index, onClose, onPrev, onNext }: LightboxProps) {
  const { t } = useLocale()
  const item = items[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  if (!item) return null

  const resLabel = `${item.w}×${item.h}`
  const isPortrait = item.h > item.w

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className={`relative ${isPortrait ? 'max-h-[90vh] w-auto' : 'max-w-[90vw] h-auto'}`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.alt}
          className="rounded-xl shadow-2xl object-contain"
          style={{ maxWidth: '90vw', maxHeight: '80vh' }}
        />

        {/* Controls */}
        <div className="absolute top-3 right-3 flex gap-2">
          <a
            href={item.url}
            download
            target="_blank"
            rel="noreferrer"
            title={t('model.galleryDownload')}
            className="p-2 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-all backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            title={t('model.galleryClose')}
            className="p-2 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-all backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prev / Next */}
        {items.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-all backdrop-blur-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 text-white/80 hover:text-white hover:bg-black/80 transition-all backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Footer info */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[11px] text-white/60 font-mono">
            {item.genName}  ·  {resLabel}  ·  {index + 1}/{items.length}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── ResolutionGroup ──────────────────────────────────────────────────────────

interface ResolutionGroupProps {
  label: string
  items: GalleryItem[]
  failedUrls: Set<string>
  onTileClick: (item: GalleryItem) => void
  onLoad: (url: string) => void
  onError: (url: string) => void
  loadedUrls: Set<string>
}

function ResolutionGroup({ label, items, failedUrls, onTileClick, onLoad, onError, loadedUrls }: ResolutionGroupProps) {
  const visible = items.filter(it => !failedUrls.has(it.url))
  if (visible.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono font-bold text-white/35 uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-[10px] text-white/25 font-mono">{visible.length}</span>
      </div>
      <div className={`grid gap-3 ${(items[0] && items[0].h > items[0].w) ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
        {items.map((item) => (
          <WallpaperTile
            key={item.id}
            src={item.url}
            alt={item.alt}
            resLabel={`${item.w}×${item.h}`}
            isPortrait={item.h > item.w}
            onClick={() => onTileClick(item)}
            onLoad={() => onLoad(item.url)}
            onError={() => onError(item.url)}
            failed={failedUrls.has(item.url)}
            loading={!loadedUrls.has(item.url) && !failedUrls.has(item.url)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

interface WallpaperGalleryProps {
  generations: Generation[]
}

type SectionTab = 'desktop' | 'phone'

export function WallpaperGallery({ generations }: WallpaperGalleryProps) {
  const { t } = useLocale()
  const [tab, setTab] = useState<SectionTab>('desktop')
  const [lightbox, setLightbox] = useState<{ items: GalleryItem[]; index: number } | null>(null)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())

  const handleError = useCallback((url: string) => {
    setFailedUrls(prev => { const s = new Set(Array.from(prev)); s.add(url); return s })
  }, [])

  const handleLoad = useCallback((url: string) => {
    setLoadedUrls(prev => { const s = new Set(Array.from(prev)); s.add(url); return s })
  }, [])

  // Collect all source images from all generations
  const sourceImages = useMemo((): (VehicleImage & { genName: string })[] => {
    return generations.flatMap((gen) =>
      (gen.images ?? []).map((img) => ({
        ...img,
        genName: gen.codeName ?? `Gen ${gen.generationNumber}`,
      }))
    )
  }, [generations])

  // Build desktop gallery items — derive all desktop presets for every caricos source image
  const desktopSections: ResSectionEntry[] = useMemo(() => {
    return DESKTOP_PRESETS.map((preset) => {
      const items: GalleryItem[] = sourceImages.flatMap((src) => {
        const isLandscape = src.width >= src.height
        if (!isLandscape) return []

        // If source already matches this preset, use it directly
        if (src.width === preset.w && src.height === preset.h) {
          return [{
            id: `${src.id}-${preset.key}`,
            url: src.url,
            alt: src.altText,
            w: preset.w,
            h: preset.h,
            genName: src.genName,
            originalUrl: src.url,
          }]
        }

        // For caricos.com landscape images, try to derive the other resolutions
        if (canDerive(src.url) && isLandscape) {
          const derived = deriveUrl(src.url, preset.w, preset.h)
          // Avoid duplicating if derived === original
          if (derived !== src.url) {
            return [{
              id: `${src.id}-${preset.key}`,
              url: derived,
              alt: src.altText,
              w: preset.w,
              h: preset.h,
              genName: src.genName,
              originalUrl: src.url,
            }]
          }
        }

        return []
      })

      // Deduplicate by URL
      const seen = new Set<string>()
      const unique = items.filter(it => {
        if (seen.has(it.url)) return false
        seen.add(it.url)
        return true
      })

      return { preset, items: unique }
    })
  }, [sourceImages])

  // Build phone gallery items
  const phoneSections: ResSectionEntry[] = useMemo(() => {
    return PHONE_PRESETS.map((preset) => {
      const items: GalleryItem[] = sourceImages.flatMap((src) => {
        // Direct portrait source
        if (src.width === preset.w && src.height === preset.h) {
          return [{
            id: `${src.id}-${preset.key}`,
            url: src.url,
            alt: src.altText,
            w: preset.w,
            h: preset.h,
            genName: src.genName,
            originalUrl: src.url,
          }]
        }
        // Derive portrait from caricos.com landscape
        if (canDerive(src.url) && src.width >= src.height) {
          const derived = deriveUrl(src.url, preset.w, preset.h)
          return [{
            id: `${src.id}-${preset.key}`,
            url: derived,
            alt: src.altText,
            w: preset.w,
            h: preset.h,
            genName: src.genName,
            originalUrl: src.url,
          }]
        }
        return []
      })

      const seen = new Set<string>()
      const unique = items.filter(it => {
        if (seen.has(it.url)) return false
        seen.add(it.url)
        return true
      })

      return { preset, items: unique }
    })
  }, [sourceImages])

  // Flat list for lightbox
  const allDesktopItems = useMemo(
    () => desktopSections.flatMap(s => s.items).filter(it => !failedUrls.has(it.url)),
    [desktopSections, failedUrls]
  )
  const allPhoneItems = useMemo(
    () => phoneSections.flatMap(s => s.items).filter(it => !failedUrls.has(it.url)),
    [phoneSections, failedUrls]
  )

  const openLightbox = useCallback((item: GalleryItem, allItems: GalleryItem[]) => {
    const idx = allItems.findIndex(it => it.url === item.url)
    setLightbox({ items: allItems, index: Math.max(0, idx) })
  }, [])

  const closeLightbox = useCallback(() => setLightbox(null), [])
  const prevLightbox = useCallback(() =>
    setLightbox(prev => prev ? { ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length } : null)
  , [])
  const nextLightbox = useCallback(() =>
    setLightbox(prev => prev ? { ...prev, index: (prev.index + 1) % prev.items.length } : null)
  , [])

  if (sourceImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <ImageOff className="w-12 h-12 mb-3" />
        <p className="text-sm">{t('model.galleryEmpty')}</p>
      </div>
    )
  }

  const desktopTotal = desktopSections.reduce((s, sec) => s + sec.items.filter(it => !failedUrls.has(it.url)).length, 0)
  const phoneTotal   = phoneSections.reduce((s, sec) => s + sec.items.filter(it => !failedUrls.has(it.url)).length, 0)

  return (
    <div className="space-y-6">
      {/* ── Tab selector ────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('desktop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
            ${tab === 'desktop'
              ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
              : 'border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
        >
          <Monitor className="w-4 h-4" />
          {t('model.galleryDesktop')}
          <span className="text-[10px] opacity-60 font-mono ml-0.5">{desktopTotal}</span>
        </button>
        <button
          onClick={() => setTab('phone')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border
            ${tab === 'phone'
              ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
              : 'border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
        >
          <Smartphone className="w-4 h-4" />
          {t('model.galleryPhone')}
          <span className="text-[10px] opacity-60 font-mono ml-0.5">{phoneTotal}</span>
        </button>
      </div>

      {/* ── Desktop tab ─────────────────────────────────────────────────── */}
      {tab === 'desktop' && (
        <div className="space-y-8">
          {desktopSections.map(({ preset, items }) => (
            <ResolutionGroup
              key={preset.key}
              label={t(preset.labelKey)}
              items={items}
              failedUrls={failedUrls}
              loadedUrls={loadedUrls}
              onTileClick={(item) => openLightbox(item, allDesktopItems)}
              onLoad={handleLoad}
              onError={handleError}
            />
          ))}
        </div>
      )}

      {/* ── Phone tab ───────────────────────────────────────────────────── */}
      {tab === 'phone' && (
        <div className="space-y-8">
          {phoneTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <Smartphone className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">{t('model.galleryNoPortrait')}</p>
            </div>
          ) : (
            phoneSections.map(({ preset, items }) => (
              <ResolutionGroup
                key={preset.key}
                label={t(preset.labelKey)}
                items={items}
                failedUrls={failedUrls}
                loadedUrls={loadedUrls}
                onTileClick={(item) => openLightbox(item, allPhoneItems)}
                onLoad={handleLoad}
                onError={handleError}
              />
            ))
          )}
        </div>
      )}

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <Lightbox
            items={lightbox.items}
            index={lightbox.index}
            onClose={closeLightbox}
            onPrev={prevLightbox}
            onNext={nextLightbox}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default WallpaperGallery
