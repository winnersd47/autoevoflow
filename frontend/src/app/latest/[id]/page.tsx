"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, Calendar, Car } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { PublishedStory, PublishedData, imageSrc } from "../shared";

function Skeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-5 w-24 skeleton rounded" />
        <div className="h-72 skeleton rounded-2xl" />
        <div className="h-8 w-2/3 skeleton rounded" />
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    </div>
  );
}

export default function PublishedStoryPage({ params }: { params: { id: string } }) {
  const { locale } = useLocale();
  const isRu = locale === 'ru';
  const { id } = params;

  const [story,   setStory]   = useState<PublishedStory | null | undefined>(undefined); // undefined = ещё грузится
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/published-stories');
        const d: PublishedData = await r.json();
        if (cancelled) return;
        setStory(d.stories.find(s => s.id === id) ?? null);
      } catch {
        if (!cancelled) setStory(null);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (story === undefined) return <Skeleton />;

  if (!story) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass rounded-2xl p-12 border border-danger/30 text-center max-w-md">
          <h2 className="font-display text-xl font-bold text-danger mb-3">
            {isRu ? 'Публикация не найдена' : 'Story not found'}
          </h2>
          <p className="text-sm text-white/40 mb-6">
            {isRu
              ? 'Возможно, она устарела и была вытеснена более свежими (лента хранит последние 60).'
              : 'It may have rolled off the feed (only the most recent 60 are kept).'}
          </p>
          <Link href="/latest" className="btn-secondary">
            {isRu ? 'Все новинки' : 'All stories'}
          </Link>
        </div>
      </div>
    );
  }

  const src = imageSrc(story.imageUrl);
  const published = new Date(story.publishedAt);
  const publishedStr = published.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        <Link href="/latest"
          className="inline-flex items-center gap-1.5 text-xs text-white/40
            hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-3.5 h-3.5" />
          {isRu ? 'Все новинки' : 'All stories'}
        </Link>

        {/* Hero image */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-surface-elevated mb-6 border border-white/8"
          style={{ aspectRatio: '16/9' }}>
          {!failed && src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={story.fullName}
              className="w-full h-full object-cover"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Car className="w-12 h-12 text-white/10" />
            </div>
          )}
          {story.year && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold
              bg-black/60 text-white/80 backdrop-blur-sm border border-white/10">
              {story.year}
            </div>
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-2">
          {story.brand}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight mb-4">
          {story.name}
        </h1>

        <div className="flex items-center gap-4 text-[11px] text-white/30 mb-8">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {publishedStr}
          </span>
          <span>{isRu ? 'Источник' : 'Source'}: {story.sourceLabel}</span>
        </div>

        {/* Story body — тот же HTML (<b>/<i>), что ушёл в Telegram */}
        <div
          className="prose-story text-[15px] leading-relaxed text-white/70 space-y-4 [&_b]:text-white [&_b]:font-bold [&_i]:text-primary/90 [&_i]:not-italic"
          style={{ whiteSpace: 'pre-line' }}
          dangerouslySetInnerHTML={{ __html: story.story }}
        />

        {/* Telegram CTA */}
        <a
          href="https://t.me/autoevoflowgraphs"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
            bg-primary/10 border border-primary/30 text-primary text-sm font-semibold
            hover:bg-primary/15 transition-all w-full sm:w-auto"
        >
          <Send className="w-4 h-4" />
          {isRu ? 'Больше разборов в Telegram-канале' : 'More stories on the Telegram channel'}
        </a>
      </div>
    </div>
  );
}
