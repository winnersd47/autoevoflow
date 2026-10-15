import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type {
  Brand,
  Generation,
  SearchFilters,
  SearchMode,
  GraphLayoutType,
  EvolutionEdgeType,
  BodyType,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchHistoryItem {
  id: string;
  query: string;
  mode: SearchMode;
  timestamp: number;
  resultCount?: number;
}

export interface GraphViewSettings {
  layout: GraphLayoutType;
  showLabels: boolean;
  showImages: boolean;
  showConceptCars: boolean;
  showFacelifts: boolean;
  highlightEdgeTypes: EvolutionEdgeType[];
  minEdgeStrength: number;
  zoomLevel: number;
}

export interface FilterState {
  brandIds: string[];
  bodyTypes: BodyType[];
  yearRange: [number, number];
  edgeTypes: EvolutionEdgeType[];
  searchQuery: string;
}

export interface ComparisonSlot {
  generation: Generation | null;
  imageUrl?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "user" | "premium" | "admin";
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "guest";

// ─── Store State ──────────────────────────────────────────────────────────────

export interface AppState {
  // Auth — hydrated server-side (see AuthProvider in layout.tsx), never persisted:
  // it must always reflect the real httpOnly cookie, not a stale local cache.
  auth: { status: AuthStatus; user: AuthUser | null };
  setAuth: (user: AuthUser | null) => void;
  setAuthLoading: () => void;

  // Navigation
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Current context
  currentBrand: Brand | null;
  setCurrentBrand: (brand: Brand | null) => void;

  currentGeneration: Generation | null;
  setCurrentGeneration: (gen: Generation | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;

  searchHistory: SearchHistoryItem[];
  addToSearchHistory: (item: Omit<SearchHistoryItem, "id" | "timestamp">) => void;
  clearSearchHistory: () => void;
  removeFromSearchHistory: (id: string) => void;

  searchFilters: SearchFilters;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  resetSearchFilters: () => void;

  // Selected generations (for comparison / multi-select)
  selectedGenerations: Generation[];
  selectGeneration: (gen: Generation) => void;
  deselectGeneration: (id: string) => void;
  clearSelectedGenerations: () => void;
  isGenerationSelected: (id: string) => boolean;

  // Graph
  graphViewSettings: GraphViewSettings;
  setGraphLayout: (layout: GraphLayoutType) => void;
  setGraphViewSettings: (settings: Partial<GraphViewSettings>) => void;

  graphFilters: FilterState;
  setGraphFilters: (filters: Partial<FilterState>) => void;
  resetGraphFilters: () => void;

  // Comparison mode
  comparisonMode: boolean;
  setComparisonMode: (enabled: boolean) => void;

  comparisonSlotA: ComparisonSlot;
  comparisonSlotB: ComparisonSlot;
  setComparisonSlot: (slot: "A" | "B", generation: Generation | null) => void;
  swapComparisonSlots: () => void;
  clearComparison: () => void;

  // UI state
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // Preferences (persisted)
  preferences: {
    measurementSystem: "metric" | "imperial";
    reducedMotion: boolean;
    compactView: boolean;
  };
  setPreferences: (prefs: Partial<AppState["preferences"]>) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_GRAPH_SETTINGS: GraphViewSettings = {
  layout: "dagre",
  showLabels: true,
  showImages: true,
  showConceptCars: true,
  showFacelifts: true,
  highlightEdgeTypes: ["evolves_into", "influenced_by", "shares_platform"],
  minEdgeStrength: 0.3,
  zoomLevel: 1,
};

const DEFAULT_GRAPH_FILTERS: FilterState = {
  brandIds: [],
  bodyTypes: [],
  yearRange: [1950, new Date().getFullYear() + 2],
  edgeTypes: [],
  searchQuery: "",
};

const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  brandIds: [],
  bodyTypes: [],
  yearRange: [1950, new Date().getFullYear() + 2],
  markets: [],
  engineTypes: [],
  tags: [],
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Auth
        auth: { status: "idle", user: null },
        setAuth: (user) => set({ auth: { status: user ? "authenticated" : "guest", user } }),
        setAuthLoading: () => set((s) => ({ auth: { ...s.auth, status: "loading" } })),

        // Navigation
        sidebarOpen: false,
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

        // Current context
        currentBrand: null,
        setCurrentBrand: (brand) => set({ currentBrand: brand }),

        currentGeneration: null,
        setCurrentGeneration: (gen) => set({ currentGeneration: gen }),

        // Search
        searchQuery: "",
        setSearchQuery: (q) => set({ searchQuery: q }),

        searchMode: "semantic",
        setSearchMode: (mode) => set({ searchMode: mode }),

        searchHistory: [],
        addToSearchHistory: (item) =>
          set((s) => ({
            searchHistory: [
              {
                ...item,
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
              },
              ...s.searchHistory.slice(0, 49),
            ],
          })),
        clearSearchHistory: () => set({ searchHistory: [] }),
        removeFromSearchHistory: (id) =>
          set((s) => ({
            searchHistory: s.searchHistory.filter((h) => h.id !== id),
          })),

        searchFilters: DEFAULT_SEARCH_FILTERS,
        setSearchFilters: (filters) =>
          set((s) => ({ searchFilters: { ...s.searchFilters, ...filters } })),
        resetSearchFilters: () => set({ searchFilters: DEFAULT_SEARCH_FILTERS }),

        // Selected generations
        selectedGenerations: [],
        selectGeneration: (gen) =>
          set((s) => {
            if (s.selectedGenerations.some((g) => g.id === gen.id)) return s;
            return { selectedGenerations: [...s.selectedGenerations, gen] };
          }),
        deselectGeneration: (id) =>
          set((s) => ({
            selectedGenerations: s.selectedGenerations.filter((g) => g.id !== id),
          })),
        clearSelectedGenerations: () => set({ selectedGenerations: [] }),
        isGenerationSelected: (id) => get().selectedGenerations.some((g) => g.id === id),

        // Graph
        graphViewSettings: DEFAULT_GRAPH_SETTINGS,
        setGraphLayout: (layout) =>
          set((s) => ({ graphViewSettings: { ...s.graphViewSettings, layout } })),
        setGraphViewSettings: (settings) =>
          set((s) => ({ graphViewSettings: { ...s.graphViewSettings, ...settings } })),

        graphFilters: DEFAULT_GRAPH_FILTERS,
        setGraphFilters: (filters) =>
          set((s) => ({ graphFilters: { ...s.graphFilters, ...filters } })),
        resetGraphFilters: () => set({ graphFilters: DEFAULT_GRAPH_FILTERS }),

        // Comparison
        comparisonMode: false,
        setComparisonMode: (enabled) => set({ comparisonMode: enabled }),

        comparisonSlotA: { generation: null },
        comparisonSlotB: { generation: null },
        setComparisonSlot: (slot, generation) =>
          slot === "A"
            ? set({ comparisonSlotA: { generation } })
            : set({ comparisonSlotB: { generation } }),
        swapComparisonSlots: () =>
          set((s) => ({
            comparisonSlotA: s.comparisonSlotB,
            comparisonSlotB: s.comparisonSlotA,
          })),
        clearComparison: () =>
          set({
            comparisonSlotA: { generation: null },
            comparisonSlotB: { generation: null },
            comparisonMode: false,
          }),

        // UI state
        activeModal: null,
        openModal: (id) => set({ activeModal: id }),
        closeModal: () => set({ activeModal: null }),

        // Preferences
        preferences: {
          measurementSystem: "metric",
          reducedMotion: false,
          compactView: false,
        },
        setPreferences: (prefs) =>
          set((s) => ({ preferences: { ...s.preferences, ...prefs } })),
      }),
      {
        name: "automotive-ai-store",
        partialize: (state) => ({
          searchHistory: state.searchHistory,
          searchMode: state.searchMode,
          graphViewSettings: state.graphViewSettings,
          preferences: state.preferences,
        }),
      }
    )
  )
);

// ─── Derived Selectors ────────────────────────────────────────────────────────

export const selectComparisonReady = (state: AppState): boolean =>
  state.comparisonSlotA.generation !== null && state.comparisonSlotB.generation !== null;

export const selectHasActiveFilters = (state: AppState): boolean => {
  const f = state.searchFilters;
  return (
    (f.brandIds?.length ?? 0) > 0 ||
    (f.bodyTypes?.length ?? 0) > 0 ||
    (f.tags?.length ?? 0) > 0
  );
};
