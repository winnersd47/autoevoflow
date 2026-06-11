"use client";

import React from "react";
import { Inter, Orbitron } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "@/styles/globals.css";
import Navigation from "@/components/layout/Navigation";
import ParticleBackground from "@/components/three/ParticleBackground";
import { LocaleProvider } from "@/contexts/LocaleContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} dark`} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#050508" />
        <meta name="description" content="AutoEvoFlow — explore car lineages with semantic search, interactive evolution graphs and AI-powered design analysis" />
        <link rel="icon" href="/favicon.ico" />
        <title>AutoEvoFlow</title>
      </head>
      <body className={`font-sans bg-background text-text-primary antialiased min-h-screen overflow-x-hidden`}>
        <QueryClientProvider client={queryClient}>
          <LocaleProvider>
          {/* Ambient background */}
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-gradient-radial from-accent/20 via-background to-background" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/3 rounded-full blur-3xl" />
          </div>

          {/* Navigation */}
          <Navigation />

          {/* Page content */}
          <main className="relative z-10 min-h-[calc(100vh-64px)]">{children}</main>

          {/* Footer */}
          <footer className="relative z-10 border-t border-border mt-24 py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary text-xs font-display font-bold">AI</span>
                </div>
                <span className="font-display text-sm text-text-secondary tracking-widest uppercase">
                  AutoEvoFlow
                </span>
              </div>
              <p className="text-text-muted text-xs">
                &copy; {new Date().getFullYear()} AutoEvoFlow. Powered by CLIP, DINOv2 &amp; Neo4j.
              </p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="badge-primary">v0.1.0</span>
                <span>MIT License</span>
              </div>
            </div>
          </footer>

          {process.env["NODE_ENV"] === "development" && <ReactQueryDevtools />}
          </LocaleProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
