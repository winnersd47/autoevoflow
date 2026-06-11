// ─── UI Component Barrel Exports ────────────────────────────────────────────

export { GenerationCard, GenerationCardSkeleton } from './GenerationCard'
export type { } from './GenerationCard' // component-level types are inlined

export { Timeline } from './Timeline'

export { SearchBar } from './SearchBar'

export { AIAnalysisPanel } from './AIAnalysisPanel'

// ─── Re-export component prop types (derived from component signatures) ──────

// These help consumers strongly-type their usage without importing from deep paths.
// NOTE: All non-exported interface types in the component files are intentionally
// not re-exported here; consumers should import them from @/lib/types instead.
