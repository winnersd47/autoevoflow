import axios, { AxiosInstance, AxiosError } from "axios";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
  type InfiniteData,
} from "@tanstack/react-query";
import type {
  Brand,
  CarModel,
  Generation,
  LineageTree,
  SearchQuery,
  SearchResponse,
  AIAnalysis,
  AIAnalysisType,
  ComparisonResult,
  DesignDNA,
  GraphData,
  PaginatedResponse,
  PlatformStats,
  FuturePrediction,
} from "./types";

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000",
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor — attach auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalise errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const QK = {
  brands: {
    all: () => ["brands"] as const,
    list: (page?: number, limit?: number) => ["brands", "list", page, limit] as const,
    detail: (slug: string) => ["brands", slug] as const,
    models: (slug: string) => ["brands", slug, "models"] as const,
    dna: (slug: string) => ["brands", slug, "dna"] as const,
    graph: (slug: string) => ["brands", slug, "graph"] as const,
  },
  models: {
    all: () => ["models"] as const,
    detail: (slug: string) => ["models", slug] as const,
    generations: (slug: string) => ["models", slug, "generations"] as const,
    evolution: (slug: string) => ["models", slug, "evolution"] as const,
  },
  generations: {
    detail: (id: string) => ["generations", id] as const,
    tree: (id: string) => ["generations", id, "tree"] as const,
    path: (from: string, to: string) => ["generations", "path", from, to] as const,
    dna: (id: string) => ["generations", id, "dna"] as const,
  },
  search: {
    results: (query: string, mode: string) => ["search", mode, query] as const,
    history: () => ["search", "history"] as const,
    suggestions: (q: string) => ["search", "suggestions", q] as const,
  },
  analysis: {
    entity: (type: string, id: string, analysisType?: string) =>
      ["analysis", type, id, analysisType] as const,
  },
  comparison: {
    pair: (id1: string, id2: string) => ["comparison", id1, id2] as const,
  },
  predictions: {
    generation: (id: string) => ["predictions", id] as const,
  },
  stats: {
    platform: () => ["stats", "platform"] as const,
  },
  crossBrand: {
    connections: (brandId: string) => ["cross-brand", brandId] as const,
  },
} as const;

// ─── API Functions ────────────────────────────────────────────────────────────

// Brands
export async function fetchBrands(page = 1, limit = 50): Promise<PaginatedResponse<Brand>> {
  const { data } = await apiClient.get<PaginatedResponse<Brand>>("/api/v1/brands", {
    params: { page, limit },
  });
  return data;
}

export async function fetchBrand(slug: string): Promise<Brand> {
  const { data } = await apiClient.get<Brand>(`/api/v1/brands/${slug}`);
  return data;
}

export async function fetchBrandModels(slug: string): Promise<CarModel[]> {
  const { data } = await apiClient.get<CarModel[]>(`/api/v1/brands/${slug}/models`);
  return data;
}

export async function fetchBrandDNA(slug: string): Promise<DesignDNA> {
  const { data } = await apiClient.get<DesignDNA>(`/api/v1/brands/${slug}/dna`);
  return data;
}

export async function fetchBrandGraph(brandId: string): Promise<GraphData> {
  const { data } = await apiClient.get<GraphData>(`/api/v1/brands/${brandId}/graph`);
  return data;
}

// Models
export async function fetchModel(slug: string): Promise<CarModel> {
  const { data } = await apiClient.get<CarModel>(`/api/v1/models/${slug}`);
  return data;
}

export async function fetchModelGenerations(slug: string): Promise<Generation[]> {
  const { data } = await apiClient.get<Generation[]>(`/api/v1/models/${slug}/generations`);
  return data;
}

export async function fetchModelEvolution(slug: string): Promise<GraphData> {
  const { data } = await apiClient.get<GraphData>(`/api/v1/models/${slug}/evolution`);
  return data;
}

// Generations
export async function fetchGeneration(id: string): Promise<Generation> {
  const { data } = await apiClient.get<Generation>(`/api/v1/generations/${id}`);
  return data;
}

export async function getEvolutionTree(generationId: string): Promise<LineageTree> {
  const { data } = await apiClient.get<LineageTree>(`/api/v1/generations/${generationId}/tree`);
  return data;
}

export async function getEvolutionPath(from: string, to: string): Promise<Generation[]> {
  const { data } = await apiClient.get<Generation[]>(`/api/v1/generations/path`, {
    params: { from, to },
  });
  return data;
}

export async function getCrossBrandConnections(brandId: string): Promise<GraphData> {
  const { data } = await apiClient.get<GraphData>(`/api/v1/brands/${brandId}/cross-brand`);
  return data;
}

// Search
export async function searchSemantic(query: string, filters?: SearchQuery["filters"], limit = 20): Promise<SearchResponse> {
  const { data } = await apiClient.post<SearchResponse>("/api/v1/search/semantic", {
    query,
    filters,
    limit,
  });
  return data;
}

export async function searchVisual(imageFile: File, limit = 20): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("limit", String(limit));
  const { data } = await apiClient.post<SearchResponse>("/api/v1/search/visual", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function searchMultimodal(
  query: string,
  imageFile: File,
  filters?: SearchQuery["filters"],
  limit = 20
): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append("query", query);
  formData.append("image", imageFile);
  if (filters) formData.append("filters", JSON.stringify(filters));
  formData.append("limit", String(limit));
  const { data } = await apiClient.post<SearchResponse>("/api/v1/search/multimodal", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  const { data } = await apiClient.get<string[]>("/api/v1/search/suggestions", {
    params: { q: query },
  });
  return data;
}

// Analysis
export async function generateAnalysis(
  entityType: "brand" | "model" | "generation" | "comparison",
  entityId: string,
  analysisType: AIAnalysisType = "design_evolution"
): Promise<AIAnalysis> {
  const { data } = await apiClient.post<AIAnalysis>("/api/v1/analysis/generate", {
    entityType,
    entityId,
    analysisType,
  });
  return data;
}

export async function getAnalysis(
  entityType: "brand" | "model" | "generation" | "comparison",
  entityId: string,
  analysisType?: AIAnalysisType
): Promise<AIAnalysis> {
  const { data } = await apiClient.get<AIAnalysis>(`/api/v1/analysis/${entityType}/${entityId}`, {
    params: { analysisType },
  });
  return data;
}

// Comparison
export async function compareGenerations(id1: string, id2: string): Promise<ComparisonResult> {
  const { data } = await apiClient.post<ComparisonResult>("/api/v1/compare/generations", {
    generationIdA: id1,
    generationIdB: id2,
  });
  return data;
}

// Future Prediction
export async function predictFuture(generationId: string): Promise<FuturePrediction> {
  const { data } = await apiClient.post<FuturePrediction>("/api/v1/predict/future", {
    generationId,
  });
  return data;
}

// Platform Stats
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data } = await apiClient.get<PlatformStats>("/api/v1/stats/platform");
  return data;
}

// ─── React Query Hooks ────────────────────────────────────────────────────────

// Brands
export function useBrands(page = 1, limit = 50, options?: Partial<UseQueryOptions<PaginatedResponse<Brand>>>) {
  return useQuery({
    queryKey: QK.brands.list(page, limit),
    queryFn: () => fetchBrands(page, limit),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBrand(slug: string, options?: Partial<UseQueryOptions<Brand>>) {
  return useQuery({
    queryKey: QK.brands.detail(slug),
    queryFn: () => fetchBrand(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBrandModels(slug: string, options?: Partial<UseQueryOptions<CarModel[]>>) {
  return useQuery({
    queryKey: QK.brands.models(slug),
    queryFn: () => fetchBrandModels(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBrandDNA(slug: string, options?: Partial<UseQueryOptions<DesignDNA>>) {
  return useQuery({
    queryKey: QK.brands.dna(slug),
    queryFn: () => fetchBrandDNA(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Models
export function useModel(slug: string, options?: Partial<UseQueryOptions<CarModel>>) {
  return useQuery({
    queryKey: QK.models.detail(slug),
    queryFn: () => fetchModel(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useModelGenerations(slug: string, options?: Partial<UseQueryOptions<Generation[]>>) {
  return useQuery({
    queryKey: QK.models.generations(slug),
    queryFn: () => fetchModelGenerations(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useModelEvolution(slug: string, options?: Partial<UseQueryOptions<GraphData>>) {
  return useQuery({
    queryKey: QK.models.evolution(slug),
    queryFn: () => fetchModelEvolution(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Generations
export function useEvolutionTree(generationId: string, options?: Partial<UseQueryOptions<LineageTree>>) {
  return useQuery({
    queryKey: QK.generations.tree(generationId),
    queryFn: () => getEvolutionTree(generationId),
    enabled: !!generationId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useEvolutionPath(from: string, to: string, options?: Partial<UseQueryOptions<Generation[]>>) {
  return useQuery({
    queryKey: QK.generations.path(from, to),
    queryFn: () => getEvolutionPath(from, to),
    enabled: !!from && !!to,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// Analysis
export function useAnalysis(
  entityType: "brand" | "model" | "generation" | "comparison",
  entityId: string,
  analysisType?: AIAnalysisType,
  options?: Partial<UseQueryOptions<AIAnalysis>>
) {
  return useQuery({
    queryKey: QK.analysis.entity(entityType, entityId, analysisType),
    queryFn: () => getAnalysis(entityType, entityId, analysisType),
    enabled: !!entityId,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}

export function useGenerateAnalysis(
  options?: UseMutationOptions<
    AIAnalysis,
    Error,
    { entityType: "brand" | "model" | "generation" | "comparison"; entityId: string; analysisType?: AIAnalysisType }
  >
) {
  return useMutation({
    mutationFn: ({ entityType, entityId, analysisType }) =>
      generateAnalysis(entityType, entityId, analysisType),
    ...options,
  });
}

// Comparison
export function useComparison(id1: string, id2: string, options?: Partial<UseQueryOptions<ComparisonResult>>) {
  return useQuery({
    queryKey: QK.comparison.pair(id1, id2),
    queryFn: () => compareGenerations(id1, id2),
    enabled: !!id1 && !!id2,
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}

// Platform stats
export function usePlatformStats(options?: Partial<UseQueryOptions<PlatformStats>>) {
  return useQuery({
    queryKey: QK.stats.platform(),
    queryFn: fetchPlatformStats,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// Infinite brands list
export function useInfiniteBrands() {
  return useInfiniteQuery<
    PaginatedResponse<Brand>,
    Error,
    InfiniteData<PaginatedResponse<Brand>>,
    ReturnType<typeof QK.brands.list>,
    number
  >({
    queryKey: QK.brands.list(),
    queryFn: ({ pageParam = 1 }) => fetchBrands(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
  });
}

// Future Prediction
export function usePredictFuture(
  options?: UseMutationOptions<FuturePrediction, Error, string>
) {
  return useMutation({
    mutationFn: (generationId: string) => predictFuture(generationId),
    ...options,
  });
}

// Cross-brand connections
export function useCrossBrandConnections(
  brandId: string,
  options?: Partial<UseQueryOptions<GraphData>>
) {
  return useQuery({
    queryKey: QK.crossBrand.connections(brandId),
    queryFn: () => getCrossBrandConnections(brandId),
    enabled: !!brandId,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}
