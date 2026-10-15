// ─── Core Automotive Types ────────────────────────────────────────────────────
// Aligned with NetCarShow.com taxonomy (netcarshow.com/explore/)

export type BodyType =
  | "sedan"        // 4-door saloon
  | "coupe"        // 2-door / fastback coupé
  | "suv"          // Sport Utility Vehicle
  | "crossover"    // Car-based SUV/CUV
  | "wagon"        // Estate / station wagon
  | "hatchback"    // 3/5-door hatch
  | "convertible"  // Cabriolet / open top
  | "roadster"     // 2-seat open sports
  | "pickup"       // Truck / ute
  | "van"          // MPV / minivan / people carrier
  | "minivan"
  | "concept";     // Show/concept car

/** NetCarShow-aligned segment taxonomy.
 *  Applies within each BodyType — see SEGMENT_ZONES for display grouping. */
export type SegmentType =
  // ── Coupe / Convertible ──────────────────────────────────────────────────
  | "supercar"          // Coupe: Super car        (e.g. Ferrari 296, Lamborghini Huracán)
  | "hypercar"          // Coupe: Hypercar         (e.g. LaFerrari, Bugatti Chiron)
  | "sports"            // Coupe/Conv: Sports car  (e.g. Porsche 718, Toyota GR86)
  | "grand_tourer"      // Coupe: Grand tourer     (e.g. Ferrari GTC4, BMW 8 Series)
  // ── Universal size segments ───────────────────────────────────────────────
  | "flagship"          // Sedan: Flagship         (e.g. Rolls-Royce Phantom, Bentley Mulsanne)
  | "luxury"            // Sedan/SUV: Luxury       (e.g. Mercedes S-Class, BMW 7 Series)
  | "premium_fullsize"  // Sedan/SUV               (e.g. Audi A8, Genesis G90)
  | "fullsize"          // Sedan/SUV               (e.g. Toyota Camry, Chevy Suburban)
  | "premium_midsize"   // Sedan/SUV/Coupe         (e.g. BMW 5 Series, Audi A6)
  | "midsize"           // Universal               (e.g. Honda Accord, Toyota RAV4)
  | "premium_compact"   // Sedan/Hatch/SUV         (e.g. BMW 3 Series, Audi A4)
  | "compact"           // Universal               (e.g. VW Golf, Toyota Corolla)
  | "subcompact"        // Hatchback               (e.g. Audi A1, Ford Fiesta)
  | "small"             // Hatch/Coupe: Small      (e.g. Mini, Smart)
  | "city"              // Hatchback: City car     (e.g. Fiat 500, VW up!)
  // ── Pickup ───────────────────────────────────────────────────────────────
  | "heavy_duty"        // Pickup: Heavy-duty      (e.g. Ram 3500, Ford F-350)
  // ── MPV / Van ────────────────────────────────────────────────────────────
  | "large_mpv"         // MPV/Van: Large
  | "compact_mpv"       // MPV/Van: Compact
  // ── Misc ─────────────────────────────────────────────────────────────────
  | "micro"
  | "commercial";

/** Ordered zones for the Timeline zone layout — body-type grouping top→bottom */
export const BODY_TYPE_ZONES: readonly {
  key: string;
  label: string;
  labelRu: string;
  bodyTypes: BodyType[];
  segments?: SegmentType[];
  color: string;
}[] = [
  { key: 'hypercar',     label: 'Hypercars',          labelRu: 'Гиперкары',           bodyTypes: ['coupe','convertible'], segments: ['hypercar'],                                     color: '#ffd700' },
  { key: 'supercar',     label: 'Supercars',           labelRu: 'Суперкары',           bodyTypes: ['coupe','convertible'], segments: ['supercar'],                                     color: '#ff4444' },
  { key: 'sports',       label: 'Sports Cars',         labelRu: 'Спорткары',           bodyTypes: ['coupe','roadster','convertible'], segments: ['sports'],                            color: '#ff9500' },
  { key: 'gt_coupe',     label: 'GT Coupes',           labelRu: 'Гран-Туризмо купе',   bodyTypes: ['coupe'], segments: ['grand_tourer','luxury','premium_midsize'],                    color: '#e879f9' },
  { key: 'open_top',     label: 'Convertibles',        labelRu: 'Кабриолеты',          bodyTypes: ['convertible','roadster'],                                                          color: '#38bdf8' },
  { key: 'flagship_sed', label: 'Flagship Sedans',     labelRu: 'Флагманские седаны',  bodyTypes: ['sedan'], segments: ['flagship','luxury'],                                         color: '#a78bfa' },
  { key: 'exec_sed',     label: 'Executive Sedans',    labelRu: 'Бизнес-седаны',       bodyTypes: ['sedan'], segments: ['premium_fullsize','premium_midsize'],                        color: '#00d4ff' },
  { key: 'midsize_sed',  label: 'Mid Sedans',          labelRu: 'Среднеразмерные',     bodyTypes: ['sedan'], segments: ['fullsize','midsize','premium_compact','compact'],             color: '#00ff88' },
  { key: 'estate',       label: 'Estates & Wagons',    labelRu: 'Универсалы',          bodyTypes: ['wagon'],                                                                           color: '#4ade80' },
  { key: 'suv_large',    label: 'Large SUVs',          labelRu: 'Большие SUV',         bodyTypes: ['suv','crossover'], segments: ['luxury','flagship','large','premium_fullsize'],    color: '#f97316' },
  { key: 'suv_mid',      label: 'Mid SUVs',            labelRu: 'Средние SUV',         bodyTypes: ['suv','crossover'], segments: ['fullsize','premium_midsize','midsize'],            color: '#fb923c' },
  { key: 'suv_compact',  label: 'Compact SUVs',        labelRu: 'Компактные SUV',      bodyTypes: ['suv','crossover'], segments: ['premium_compact','compact','subcompact'],          color: '#fbbf24' },
  { key: 'hatchback',    label: 'Hatchbacks',          labelRu: 'Хэтчбеки',           bodyTypes: ['hatchback'],                                                                       color: '#34d399' },
  { key: 'electric',     label: 'Electric GT',         labelRu: 'Электро-GT',          bodyTypes: ['sedan','coupe','suv'], segments: ['luxury','premium_midsize'],                    color: '#22d3ee' },
  { key: 'pickup',       label: 'Pickups',             labelRu: 'Пикапы',              bodyTypes: ['pickup'],                                                                          color: '#94a3b8' },
  { key: 'concept',      label: 'Concepts',            labelRu: 'Концепты',            bodyTypes: ['concept'],                                                                         color: '#c084fc' },
] as const;

export type DrivetrainType = "FWD" | "RWD" | "AWD" | "4WD";

export type EngineType = "ICE" | "hybrid" | "mild-hybrid" | "plug-in-hybrid" | "BEV" | "FCEV" | "hydrogen";

export type MarketRegion = "global" | "north-america" | "europe" | "asia" | "china" | "japan" | "australia";

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  foundingYear: number;
  logoUrl: string;
  logoWhiteUrl?: string;
  headerImageUrl?: string;
  description: string;
  parentCompany?: string;
  headquarters: string;
  revenue?: string;
  employeeCount?: number;
  modelCount: number;
  generationCount: number;
  tags: string[];
  dna?: DesignDNA;
  aiAnalysisAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Car Model ───────────────────────────────────────────────────────────────

export interface CarModel {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  brandId: string;
  brand?: Brand;
  bodyType: BodyType;
  segment: SegmentType;
  primaryMarket: MarketRegion;
  startYear: number;
  endYear?: number;
  isActive: boolean;
  description: string;
  generationCount: number;
  thumbnailUrl?: string;
  heroImageUrl?: string;
  tags: string[];
  aiAnalysisAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Generation ──────────────────────────────────────────────────────────────

export interface TechnicalSpecs {
  engineDisplacement?: number; // cc
  engineCylinders?: number;
  horsepower?: number; // hp
  torque?: number; // Nm
  topSpeed?: number; // km/h
  acceleration0to100?: number; // seconds
  fuelEconomy?: number; // L/100km or MPG
  electricRange?: number; // km
  batteryCapacity?: number; // kWh
  wheelbase?: number; // mm
  length?: number; // mm
  width?: number; // mm
  height?: number; // mm
  weight?: number; // kg
  cargoVolume?: number; // liters
  seatingCapacity?: number;
  drivetrain?: DrivetrainType;
  engineType?: EngineType;
  transmissionSpeeds?: number;
  transmissionType?: "manual" | "automatic" | "CVT" | "DCT" | "single-speed";
}

export interface Generation {
  id: string;
  slug: string;
  modelId: string;
  model?: CarModel;
  brandId: string;
  brand?: Brand;
  codeName: string; // E30, G20, W222, etc.
  generationNumber: number;
  startYear: number;
  endYear?: number;
  isFacelift: boolean;
  isConcept: boolean;
  bodyTypes: BodyType[];
  engineTypes: EngineType[];
  markets: MarketRegion[];
  specs?: TechnicalSpecs;
  description: string;
  thumbnailUrl?: string;
  heroImageUrl?: string;
  images: VehicleImage[];
  platformCode?: string;
  designerName?: string;
  styleEmbedding?: number[]; // 512-dim vector (not transmitted by default)
  tags: string[];
  aiAnalysisAvailable: boolean;
  evolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Vehicle Image ────────────────────────────────────────────────────────────

export type ImageAngle =
  | "front_34"
  | "rear_34"
  | "front"
  | "rear"
  | "side"
  | "interior"
  | "dashboard"
  | "engine"
  | "detail"
  | "lifestyle";

export interface VehicleImage {
  id: string;
  generationId: string;
  url: string;
  thumbnailUrl: string;
  angle: ImageAngle;
  isPrimary: boolean;
  year?: number;
  altText: string;
  width: number;
  height: number;
  source?: string;
  clipEmbedding?: number[]; // Not transmitted by default
}

// ─── Evolution Graph ──────────────────────────────────────────────────────────

export type EvolutionEdgeType =
  | "evolves_into"
  | "influenced_by"
  | "shares_platform"
  | "derived_from"
  | "inspired"
  | "inspired_by"
  | "concept_to_production"
  | "facelifted_to"
  | "rebadged_as"
  /** Official brand performance/body variant of the same base model (M, AMG, RS, GT3, SVJ…).
   *  Strength encodes class change: ≥0.9 = same class, <0.9 = elevated to higher class. */
  | "variant_of";

export interface EvolutionEdge {
  id: string;
  sourceId: string;
  targetId: string;
  edgeType: EvolutionEdgeType;
  strength: number; // 0–1
  yearStart?: number;
  yearEnd?: number;
  description?: string;
  isBidirectional: boolean;
  metadata?: Record<string, unknown>;
}

export interface LineageTree {
  rootGenerationId: string;
  nodes: Generation[];
  edges: EvolutionEdge[];
  depth: number;
  breadth: number;
  metadata: {
    totalNodes: number;
    totalEdges: number;
    yearRange: [number, number];
    brandIds: string[];
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchMode = "semantic" | "visual" | "graph" | "multimodal";

export type SearchEntityType = "generation" | "model" | "brand" | "concept";

export interface SearchQuery {
  query?: string;
  imageFile?: File;
  mode: SearchMode;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  sessionId?: string;
}

export interface SearchFilters {
  brandIds?: string[];
  bodyTypes?: BodyType[];
  segments?: SegmentType[];
  yearRange?: [number, number];
  markets?: MarketRegion[];
  engineTypes?: EngineType[];
  tags?: string[];
}

export interface SearchResult {
  id: string;
  entityType: SearchEntityType;
  entity: Generation | CarModel | Brand;
  score: number; // 0–1 cosine similarity
  rank: number;
  explanation?: string;
  matchedFeatures?: string[];
  imageUrl?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  mode: SearchMode;
  processingTimeMs: number;
  sessionId: string;
  filters?: SearchFilters;
  suggestions?: string[];
}

// ─── AI Analysis ─────────────────────────────────────────────────────────────

export type AIProvider = "gpt-4o" | "claude-3-5" | "gemini-pro" | "ensemble" | "yandex";

export type AIAnalysisType =
  | "design_evolution"
  | "brand_dna"
  | "generation_comparison"
  | "market_context"
  | "future_prediction"
  | "style_breakdown"
  | "influence_analysis";

export interface AIInsight {
  id: string;
  category: string;
  text: string;
  confidence: number; // 0–1
  importance: "critical" | "high" | "medium" | "low";
  sources?: string[];
  relatedEntityIds?: string[];
}

export interface AIAnalysis {
  id: string;
  entityType: "brand" | "model" | "generation" | "comparison";
  entityId: string;
  analysisType: AIAnalysisType;
  provider: AIProvider;
  headline: string;
  summary: string;
  fullText: string;
  insights: AIInsight[];
  confidenceScore: number;
  tokensUsed?: number;
  processingTimeMs: number;
  createdAt: string;
  expiresAt?: string;
  isCached: boolean;
  metadata?: Record<string, unknown>;
}

// ─── Design DNA ──────────────────────────────────────────────────────────────

export interface DesignDNADimension {
  key: string;
  label: string;
  score: number; // 0–100
  description: string;
  trend: "increasing" | "decreasing" | "stable";
}

export interface DesignDNA {
  id: string;
  entityType: "brand" | "generation";
  entityId: string;
  overallScore: number; // 0–100
  dimensions: DesignDNADimension[];
  dominantStyle: string;
  colorPalette: string[];
  keyElements: string[];
  influencedBy: string[];
  hasInfluenced: string[];
  temporalEvolution?: TemporalDNAPoint[];
  createdAt: string;
}

export interface TemporalDNAPoint {
  year: number;
  score: number;
  dimensionScores: Record<string, number>;
  milestone?: string;
}

// ─── Graph Visualization ──────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: "generation" | "model" | "brand" | "concept";
  year?: number;
  brandId?: string;
  brandName?: string;
  modelName?: string;
  imageUrl?: string;
  score?: number;
  codeName?: string;
  isFacelift?: boolean;
  isConcept?: boolean;
  /** Announced/planned model not yet officially revealed or in production */
  isFuture?: boolean;
  /** Company officially revealed the model with design/official photos — clears isFuture diamond style */
  isRevealed?: boolean;
  /** Exclusive limited-edition production model (numbered series) */
  isLimited?: boolean;
  /** Homologated racing variant (GT1/GT2/GT3/GT4/GTE/Cup, etc.) — not street-legal or a track-only special */
  isRacing?: boolean;
  /** Tuning atelier build — produced/heavily modified by an independent or official tuner atelier */
  isTuning?: boolean;
  /** Name of the tuning atelier who built this (e.g. "AMG", "Brabus", "RUF", "Alpina") */
  atelierName?: string;
  /** Slug used to build /model/<modelSlug> link. Falls back to /brand/<brandId> if absent. */
  modelSlug?: string;
  /** NetCarShow-aligned body type — used for zone grouping in Timeline layout */
  bodyType?: BodyType;
  /** NetCarShow-aligned segment subtype — used for zone placement */
  segment?: SegmentType;
  /** Pre-computed zone key (from BODY_TYPE_ZONES) for fast timeline bucketing */
  zone?: string;
  /** Peak horsepower of the most powerful variant */
  hp?: number;
  /** Engine / drivetrain type — used for Force (powertrain) layout */
  engineType?: string;
  /** Override family grouping key for Хроника/Древо layouts */
  familyKey?: string;
  metadata?: Record<string, unknown>;
  // ── A777 performance data (merged by scripts/merge-a777-to-graph.js) ─────
  a777TopSpeed?:   number;   // km/h
  a777Accel?:      number;   // 0-100 km/h seconds
  a777Torque?:     number;   // Nm
  a777Weight?:     number;   // kg
  a777Price?:      number;   // USD
  a777HpPerTon?:   number;   // hp/t
  a777HpPerLiter?: number;   // hp/l
  a777Nurb?:       string;   // Nürburgring lap time e.g. "7:18.89"
  a777TopGear?:    string;   // Top Gear Track lap time
  a777Hockenheim?: string;   // Hockenheim Short lap time
  a777Tsukuba?:    string;   // Tsukuba Circuit lap time
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EvolutionEdgeType;
  strength: number;
  label?: string;
  year?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── D3 Specific ─────────────────────────────────────────────────────────────

export interface D3HierarchyData {
  id: string;
  name: string;
  year?: number;
  imageUrl?: string;
  codeName?: string;
  isFacelift?: boolean;
  children?: D3HierarchyData[];
}

export interface D3ForceNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

export interface D3ForceLink {
  source: string | D3ForceNode;
  target: string | D3ForceNode;
  type: EvolutionEdgeType;
  strength: number;
}

// ─── Cytoscape Specific ───────────────────────────────────────────────────────

export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: GraphNode["type"];
  imageUrl?: string;
  year?: number;
  brandId?: string;
  brandName?: string;
  codeName?: string;
  isFacelift?: boolean;
  isConcept?: boolean;
  isFuture?: boolean;
  isTuning?: boolean;
  isLimited?: boolean;
  isRacing?: boolean;
  atelierName?: string;
  modelSlug?: string;
  bodyType?: string;
  segment?: string;
  zone?: string;
  hp?: number;
  engineType?: string;
  familyKey?: string;
  a777Nurb?: string;
  a777TopGear?: string;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  type: EvolutionEdgeType;
  strength: number;
  label?: string;
}

export interface CytoscapeElement {
  data: CytoscapeNodeData | CytoscapeEdgeData;
  position?: { x: number; y: number };
  classes?: string;
}

export type CytoscapeElements = CytoscapeElement[];

// ─── Positioned Nodes ─────────────────────────────────────────────────────────

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

// ─── User / Auth ──────────────────────────────────────────────────────────────

export type UserRole = "guest" | "user" | "curator" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  preferences?: UserPreferences;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  defaultSearchMode: SearchMode;
  favoritesBrandIds: string[];
  graphLayout: GraphLayoutType;
  colorScheme: "dark" | "system";
  measurementSystem: "metric" | "imperial";
  language: string;
}

// ─── Graph Layout ─────────────────────────────────────────────────────────────

export type GraphLayoutType = "dagre" | "cola" | "cose" | "breadthfirst" | "timeline" | "force" | "zone" | "eras" | "fork" | "sync" | "perf" | "track";

// ─── Comparison ───────────────────────────────────────────────────────────────

export interface ComparisonDimension {
  key: string;
  label: string;
  unit?: string;
  valueA: number | string;
  valueB: number | string;
  winner?: "A" | "B" | "tie";
  difference?: number;
}

export interface ComparisonResult {
  id: string;
  generationA: Generation;
  generationB: Generation;
  dimensions: ComparisonDimension[];
  similarityScore: number; // 0–1
  embeddingDistance: number;
  aiNarrative?: AIAnalysis;
  radarData: RadarDataPoint[];
  designElements: DesignElementComparison[];
  createdAt: string;
}

export interface RadarDataPoint {
  dimension: string;
  valueA: number;
  valueB: number;
  fullMark: number;
}

export interface DesignElementComparison {
  element: string;
  icon?: string;
  descriptionA: string;
  descriptionB: string;
  similarityScore: number;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  detail?: string;
  path?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalBrands: number;
  totalModels: number;
  totalGenerations: number;
  totalImages: number;
  totalAnalyses: number;
  evolutionConnections: number;
  countriesRepresented: number;
  yearRange: [number, number];
  lastUpdated: string;
}

// ─── Future Prediction ────────────────────────────────────────────────────────

export interface FuturePrediction {
  id: string;
  sourceGenerationId: string;
  sourceGeneration?: Generation;
  predictedYear: number;
  confidence: number;
  imagePrompt: string;
  predictedImageUrl?: string;
  predictedSpecs?: Partial<TechnicalSpecs>;
  designTrends: string[];
  aiNarrative: string;
  provider: AIProvider;
  createdAt: string;
}
