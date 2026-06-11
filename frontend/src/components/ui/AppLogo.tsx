"use client";

/**
 * AppLogo — эмблема AutoEvoFlow
 *
 * Философия: автомобиль как узел в цепи эволюции.
 * Силуэт кузова + два колеса-узла (граф-ноды) + цепочка поколений сверху.
 * Размеры: sm (nav, 32px), md (card, 48px), lg (hero, 80px)
 */

import React from "react";
import Link from "next/link";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface AppLogoProps {
  size?: LogoSize;
  withText?: boolean;
  href?: string;
  className?: string;
  animated?: boolean;
}

const SIZE_MAP: Record<LogoSize, { icon: number; text: number; sub: number }> = {
  sm: { icon: 32, text: 15, sub: 8  },
  md: { icon: 48, text: 20, sub: 9  },
  lg: { icon: 72, text: 28, sub: 11 },
  xl: { icon: 96, text: 34, sub: 12 },
};

// ─── The SVG Mark ─────────────────────────────────────────────────────────────

export function AppMark({
  size = "sm",
  animated = false,
  className = "",
}: {
  size?: LogoSize;
  animated?: boolean;
  className?: string;
}) {
  const px = SIZE_MAP[size].icon;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-label="AutoEvoFlow"
      >
        <defs>
          {/* Background fill */}
          <linearGradient id="aef-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#F97316" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#92400E" stopOpacity="0.06" />
          </linearGradient>
          {/* Car stroke gradient */}
          <linearGradient id="aef-car" x1="0" y1="14" x2="40" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#F97316" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>
          {/* Evolution chain gradient */}
          <linearGradient id="aef-chain" x1="8" y1="10" x2="32" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#F97316" stopOpacity="0.4" />
            <stop offset="50%"  stopColor="#F97316" stopOpacity="1"   />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.4" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="aef-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Background container ── */}
        <rect width="40" height="40" rx="10" fill="url(#aef-bg)" />
        <rect
          width="40" height="40" rx="10"
          stroke="#F97316" strokeWidth="0.6" strokeOpacity="0.25" fill="none"
        />

        {/* ── Evolution chain (top) — 3 nodes = past · now · future ── */}
        {/* Connecting line */}
        <line x1="10" y1="10" x2="30" y2="10"
          stroke="url(#aef-chain)" strokeWidth="1" strokeLinecap="round" />
        {/* Past node (small, dim) */}
        <circle cx="10" cy="10" r="1.6" fill="#F97316" opacity="0.45" />
        {/* Present node (larger, bright = THIS car) */}
        <circle cx="20" cy="10" r="2.4" fill="#F97316" opacity="1" />
        <circle cx="20" cy="10" r="1"   fill="#09080A"  />
        {/* Future node (small, dim) */}
        <circle cx="30" cy="10" r="1.6" fill="#F97316" opacity="0.45" />
        {/* Flow arrows between nodes */}
        <path d="M12 9.3 L14.5 10 L12 10.7" fill="#F97316" opacity="0.5" />
        <path d="M25.5 9.3 L28 10 L25.5 10.7" fill="#F97316" opacity="0.5" />

        {/* ── Car cabin silhouette ── */}
        {/* Main roof/cabin arc */}
        <path
          d="M5 28 L8 21 L13 17 L20 16 L27 17 L32 21 L35 28"
          stroke="url(#aef-car)"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          filter="url(#aef-glow)"
        />
        {/* Subtle inner glow duplicate */}
        <path
          d="M5 28 L8 21 L13 17 L20 16 L27 17 L32 21 L35 28"
          stroke="#F97316"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* ── Front wheel — graph node (ring + center dot) ── */}
        <circle cx="11" cy="29" r="4"   fill="none" stroke="url(#aef-car)" strokeWidth="2.2" />
        <circle cx="11" cy="29" r="1.4" fill="#F97316" />
        {/* connection from cab to wheel */}
        <line x1="11" y1="25" x2="11" y2="27" stroke="#F97316" strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Rear wheel — graph node (ring + center dot) ── */}
        <circle cx="29" cy="29" r="4"   fill="none" stroke="url(#aef-car)" strokeWidth="2.2" />
        <circle cx="29" cy="29" r="1.4" fill="#F97316" />
        {/* connection from cab to wheel */}
        <line x1="29" y1="25" x2="29" y2="27" stroke="#F97316" strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Ground chassis line ── */}
        <line
          x1="7" y1="33" x2="33" y2="33"
          stroke="#F97316" strokeWidth="0.8" strokeOpacity="0.2"
          strokeLinecap="round"
        />

        {/* ── Animated pulse on present-node (CSS animation) ── */}
        {animated && (
          <circle cx="20" cy="10" r="2.4" fill="none"
            stroke="#F97316" strokeWidth="1.2" opacity="0.6"
            className="animate-ping origin-[20px_10px]"
          />
        )}
      </svg>

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 rounded-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ boxShadow: "0 0 20px rgba(249,115,22,0.5), 0 0 40px rgba(249,115,22,0.2)" }}
      />
    </div>
  );
}

// ─── Full Logo (mark + text) ──────────────────────────────────────────────────

export function AppLogo({
  size = "sm",
  withText = true,
  href = "/",
  className = "",
  animated = false,
}: AppLogoProps) {
  const { text, sub } = SIZE_MAP[size];
  const gap = size === "xl" ? "gap-4" : size === "lg" ? "gap-3" : "gap-2.5";

  const inner = (
    <span className={`flex items-center ${gap} group ${className}`}>
      <AppMark size={size} animated={animated} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span
            className="font-display font-black tracking-tight text-white"
            style={{ fontSize: text }}
          >
            AutoEvo
            <span style={{ color: "#F97316" }}>Flow</span>
          </span>
          <span
            className="font-semibold uppercase tracking-[0.18em] text-white/30"
            style={{ fontSize: sub, letterSpacing: "0.18em" }}
          >
            AI&nbsp;EVOLUTION&nbsp;PLATFORM
          </span>
        </span>
      )}
    </span>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Hero Emblem (large, standalone, animated) ────────────────────────────────

export function HeroEmblem({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-[28px] animate-pulse"
        style={{ boxShadow: "0 0 60px rgba(249,115,22,0.25), 0 0 120px rgba(249,115,22,0.08)" }} />
      <AppMark size="xl" animated className="relative z-10" />
    </div>
  );
}

export default AppLogo;
