"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { RefreshCw, ExternalLink, Calendar, Car, Zap, Clock } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatestCar {
  id:          string;
  source:      string;
  sourceLabel: string;
  brand:       string;
  brandSlug:   string;
  name:        string;
  fullName:    string;
  year:        number | null;
  description: string;
  pageUrl:     string;
  thumbUrl:    string;
  imageUrl:    string;
  scrapedAt:   string;
}

interface LatestData {
  cars:      LatestCar[];
  sources:   { id: string; name: string; count: number; ok: boolean; checkedAt: string }[];
  updatedAt: string | null;
}

// ─── Image via proxy (hotlink protection) ─────────────────────────────────────

function CarImage({ car }: { car: LatestCar }) {
  const [failed, setFailed] = useState(false);
  const proxyUrl = `/api/netcarshow-image?url=${encodeURIComponent(car.imageUrl)}`;

  return (
    <div className="relative w-full overflow-hidden bg-surface-elevated"
      style={{ aspectRatio: '16/9' }}>
      {!failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxyUrl}
            alt={car.fullName}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Car className="w-8 h-8 text-white/10" />
          <span className="text-[10px] text-white/20">{car.brand}</span>
        </div>
      )}

      {/* Year badge */}
      {car.year && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold
          bg-black/60 text-white/80 backdrop-blur-sm border border-white/10">
          {car.year}
        </div>
      )}
    </div>
  );
}

// ─── Car Card ─────────────────────────────────────────────────────────────────

function CarCard({ car, idx }: { car: LatestCar; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.35 }}
    >
      <a href={car.pageUrl} target="_blank" rel="noopener noreferrer"
        className="group block rounded-2xl overflow-hidden border border-white/8
          hover:border-primary/30 bg-surface transition-all duration-200
          hover:shadow-[0_4px_24px_rgba(249,115,22,0.10)]">

        {/* 3/4 Front view image */}
        <CarImage car={car} />

        {/* Info */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white/90 group-hover:text-primary
                transition-colors leading-tight truncate">
                {car.name}
              </h3>
              <p className="text-[10px] text-white/30 font-mono mt-0.5">
                {car.brand} · {car.year ?? '—'}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-primary
              flex-shrink-0 mt-0.5 transition-colors" />
          </div>

          {car.description && (
            <p className="mt-2 text-[11px] text-white/40 leading-relaxed line-clamp-2">
              {car.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10
              text-white/25 uppercase tracking-wider">
              {car.sourceLabel}
            </span>
          </div>
        </div>
      </a>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LatestCarsPage() {
  const { locale } = useLocale();
  const isRu = locale === 'ru';

  const [data,    setData]    = useState<LatestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/latest-cars');
      const d = await r.json();
      setData(d);
    } catch { /* ignore */ }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const timer = setInterval(load, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const cars   = data?.cars ?? [];
  const brands = ['all', ...Array.from(new Set(cars.map(c => c.brand))).sort()];
  const shown  = filter === 'all' ? cars : cars.filter(c => c.brand === filter);

  const updatedAgo = data?.updatedAt
    ? Math.round((Date.now() - new Date(data.updatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center
          justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                {isRu ? 'Новинки авто' : 'Latest Cars'}
              </span>
            </div>
            <h1 className="font-display text-3xl font-black text-white leading-tight">
              {isRu ? 'Последние новинки' : 'New Car Reveals'}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {isRu
                ? `${cars.length} новинок с ${data?.sources?.length ?? 0} источника`
                : `${cars.length} cars from ${data?.sources?.length ?? 0} source`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Last update */}
            {updatedAgo !== null && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                <Clock className="w-3 h-3" />
                {isRu
                  ? updatedAgo < 1 ? 'только что' : `${updatedAgo} мин. назад`
                  : updatedAgo < 1 ? 'just now' : `${updatedAgo}m ago`}
              </div>
            )}
            {/* Refresh button */}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
                border border-white/10 hover:border-primary/30 text-white/40
                hover:text-primary transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isRu ? 'Обновить' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Sources row */}
        {data?.sources && data.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {data.sources.map(s => (
              <div key={s.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]
                  font-medium border ${s.ok
                    ? 'border-green-500/20 text-green-400/70 bg-green-500/5'
                    : 'border-red-500/20 text-red-400/50'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-green-400' : 'bg-red-400'}`} />
                {s.name}
                <span className="text-white/20">{s.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Brand filter */}
        {brands.length > 2 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {brands.map(b => (
              <button
                key={b}
                onClick={() => setFilter(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                  ${filter === b
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'border-border text-text-muted hover:border-white/20 hover:text-text-secondary'}`}
              >
                {b === 'all' ? (isRu ? 'Все' : 'All') : b}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && cars.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-white/5 bg-surface animate-pulse">
                <div className="bg-surface-elevated" style={{ aspectRatio: '16/9' }} />
                <div className="px-4 pb-4 pt-2 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cards grid */}
        {shown.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((car, i) => (
              <CarCard key={car.id} car={car} idx={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && shown.length === 0 && (
          <div className="text-center py-20">
            <Car className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30">
              {isRu ? 'Нет данных. Попробуйте обновить.' : 'No data. Try refreshing.'}
            </p>
          </div>
        )}

        {/* Update schedule note */}
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center gap-2
          text-[11px] text-white/20">
          <Calendar className="w-3.5 h-3.5" />
          {isRu
            ? 'Данные обновляются автоматически каждые 6 часов из netcarshow.com'
            : 'Data auto-updates every 6 hours from netcarshow.com'}
        </div>
      </div>
    </div>
  );
}
