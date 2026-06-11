import * as d3 from "d3";
import type {
  Generation,
  LineageTree,
  GraphData,
  GraphNode,
  GraphEdge,
  EvolutionEdgeType,
  D3HierarchyData,
  CytoscapeElements,
  CytoscapeElement,
  PositionedNode,
  D3ForceNode,
  D3ForceLink,
} from "./types";

// ─── Edge Colour Map ──────────────────────────────────────────────────────────

const EDGE_COLORS: Record<EvolutionEdgeType, string> = {
  evolves_into: "#00d4ff",
  influenced_by: "#ff9500",
  shares_platform: "#00ff88",
  derived_from: "#a78bfa",
  inspired: "#f472b6",
  concept_to_production: "#ffd700",
  facelifted_to: "#38bdf8",
  rebadged_as: "#94a3b8",
  variant_of: "#e879f9",   // fuchsia — official brand performance/body variant
};

const EDGE_DASH_ARRAY: Partial<Record<EvolutionEdgeType, string>> = {
  influenced_by: "6,4",
  inspired: "4,4",
  rebadged_as: "8,4",
};

const EDGE_WIDTH: Record<EvolutionEdgeType, number> = {
  evolves_into: 2.5,
  influenced_by: 1.5,
  shares_platform: 2,
  derived_from: 2,
  inspired: 1.5,
  concept_to_production: 3,
  facelifted_to: 2,
  rebadged_as: 1,
  variant_of: 2.5,
};

// ─── getEdgeColor ─────────────────────────────────────────────────────────────

export function getEdgeColor(edgeType: EvolutionEdgeType): string {
  return EDGE_COLORS[edgeType] ?? "#444466";
}

export function getEdgeDashArray(edgeType: EvolutionEdgeType): string | undefined {
  return EDGE_DASH_ARRAY[edgeType];
}

export function getEdgeWidth(edgeType: EvolutionEdgeType): number {
  return EDGE_WIDTH[edgeType] ?? 1.5;
}

// ─── getNodeSize ──────────────────────────────────────────────────────────────

export function getNodeSize(generation: Pick<Generation, "isConcept" | "isFacelift">): number {
  if (generation.isConcept) return 28;
  if (generation.isFacelift) return 32;
  return 44;
}

export function getNodeSizeFromGraphNode(node: GraphNode): number {
  if (node.type === "brand") return 60;
  if (node.type === "model") return 50;
  if (node.isConcept) return 28;
  if (node.isFacelift) return 34;
  return 44;
}

// ─── buildEvolutionTree ───────────────────────────────────────────────────────

export function buildEvolutionTree(lineageData: LineageTree): D3HierarchyData {
  const nodeMap = new Map<string, D3HierarchyData>();

  // Initialise all nodes
  for (const gen of lineageData.nodes) {
    nodeMap.set(gen.id, {
      id: gen.id,
      name: `${gen.model?.name ?? ""} ${gen.codeName}`.trim(),
      year: gen.startYear,
      imageUrl: gen.thumbnailUrl,
      codeName: gen.codeName,
      isFacelift: gen.isFacelift,
      children: [],
    });
  }

  // Build parent -> children relationships using "evolves_into" edges
  const childSet = new Set<string>();
  for (const edge of lineageData.edges) {
    if (edge.edgeType === "evolves_into" || edge.edgeType === "facelifted_to") {
      const parent = nodeMap.get(edge.sourceId);
      const child = nodeMap.get(edge.targetId);
      if (parent && child) {
        parent.children = parent.children ?? [];
        parent.children.push(child);
        childSet.add(edge.targetId);
      }
    }
  }

  // Find root (not a child of any other node)
  let root: D3HierarchyData | undefined;
  for (const [id, node] of nodeMap) {
    if (!childSet.has(id)) {
      root = node;
      break;
    }
  }

  // Fallback: use root from lineageData
  if (!root) {
    root = nodeMap.get(lineageData.rootGenerationId) ?? Array.from(nodeMap.values())[0]!;
  }

  // Sort children by year
  const sortChildren = (node: D3HierarchyData) => {
    if (node.children?.length) {
      node.children.sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
      node.children.forEach(sortChildren);
    }
  };

  sortChildren(root);
  return root;
}

// ─── buildCytoscapeElements ───────────────────────────────────────────────────

export function buildCytoscapeElements(graphData: GraphData): CytoscapeElements {
  const elements: CytoscapeElement[] = [];

  // Dynamically compute facelift / variant targets from edges
  // (works even when isFacelift is not set in the source data)
  const flTargets  = new Set(graphData.edges.filter(e => e.type === 'facelifted_to').map(e => e.target));
  const varTargets = new Set(graphData.edges.filter(e => e.type === 'variant_of').map(e => e.target));

  for (const node of graphData.nodes) {
    const isFl  = node.isFacelift  || flTargets.has(node.id);
    const isVar = varTargets.has(node.id);
    elements.push({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        imageUrl: node.imageUrl,
        year: node.year,
        brandId: node.brandId,
        brandName: node.brandName,
        codeName: node.codeName,
        isFacelift: isFl,
        isConcept: node.isConcept,
        modelSlug: node.modelSlug,
        bodyType: node.bodyType,
        segment: node.segment,
        zone: node.zone,
        hp: node.hp,
        engineType: node.engineType,
      },
      classes: [
        node.type,
        isFl  ? "facelift"    : "",   // dashed border
        isVar ? "variant-mod" : "",   // fuchsia border (colour of variant_of arrow)
        node.isConcept ? "concept" : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  for (const edge of graphData.edges) {
    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        strength: edge.strength,
        label: edge.label,
      },
      classes: edge.type,
    });
  }

  return elements;
}

// ─── computeNodePositions ─────────────────────────────────────────────────────

export function computeNodePositions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width = 800,
  height = 600
): PositionedNode[] {
  // Use d3-force layout
  const forceNodes: D3ForceNode[] = nodes.map((n) => ({ ...n }));
  const nodeIndex = new Map(forceNodes.map((n, i) => [n.id, i]));

  const forceLinks: D3ForceLink[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
    strength: e.strength,
  }));

  const simulation = d3
    .forceSimulation<D3ForceNode>(forceNodes)
    .force(
      "link",
      d3
        .forceLink<D3ForceNode, D3ForceLink>(forceLinks)
        .id((d) => d.id)
        .distance(120)
        .strength((d) => d.strength * 0.8)
    )
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(50))
    .stop();

  // Run simulation synchronously
  for (let i = 0; i < 300; i++) simulation.tick();

  return forceNodes.map((n) => ({
    ...n,
    x: n.x ?? width / 2,
    y: n.y ?? height / 2,
  })) as PositionedNode[];
}

// ─── computeTimelineLayout ────────────────────────────────────────────────────

export function computeTimelineLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width = 1200,
  height = 500
): PositionedNode[] {
  const sorted = [...nodes].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const minYear = Math.min(...sorted.map((n) => n.year ?? 2000));
  const maxYear = Math.max(...sorted.map((n) => n.year ?? 2000));
  const yearRange = maxYear - minYear || 1;

  const padding = 80;
  const usableWidth = width - padding * 2;

  // Group by brand on Y axis
  const brandYMap = new Map<string, number>();
  let brandCount = 0;
  for (const n of sorted) {
    const key = n.brandId ?? "unknown";
    if (!brandYMap.has(key)) {
      brandYMap.set(key, (brandCount + 0.5) * (height / (brandYMap.size + 1)));
      brandCount++;
    }
  }

  // Recalculate Y positions now we know total brand count
  const totalBrands = brandCount || 1;
  let idx = 0;
  const finalBrandY = new Map<string, number>();
  for (const [k] of brandYMap) {
    finalBrandY.set(k, ((idx + 0.5) * height) / totalBrands);
    idx++;
  }

  return sorted.map((n) => ({
    ...n,
    x: padding + ((( n.year ?? minYear) - minYear) / yearRange) * usableWidth,
    y: finalBrandY.get(n.brandId ?? "unknown") ?? height / 2,
  }));
}

// ─── Graph Statistics ─────────────────────────────────────────────────────────

export function computeGraphStats(graphData: GraphData) {
  const brandCounts = new Map<string, number>();
  for (const n of graphData.nodes) {
    if (n.brandId) {
      brandCounts.set(n.brandId, (brandCounts.get(n.brandId) ?? 0) + 1);
    }
  }

  const edgeTypeCounts: Partial<Record<EvolutionEdgeType, number>> = {};
  for (const e of graphData.edges) {
    edgeTypeCounts[e.type] = (edgeTypeCounts[e.type] ?? 0) + 1;
  }

  return {
    totalNodes: graphData.nodes.length,
    totalEdges: graphData.edges.length,
    brandCount: brandCounts.size,
    edgeTypeCounts,
    yearRange: [
      Math.min(...graphData.nodes.map((n) => n.year ?? Infinity)),
      Math.max(...graphData.nodes.map((n) => n.year ?? -Infinity)),
    ] as [number, number],
  };
}

// ─── Cluster Nodes by Brand ───────────────────────────────────────────────────

export function clusterNodesByBrand(nodes: GraphNode[]): Map<string, GraphNode[]> {
  const clusters = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const key = n.brandId ?? "unknown";
    const list = clusters.get(key) ?? [];
    list.push(n);
    clusters.set(key, list);
  }
  return clusters;
}

// ─── Filter Graph ─────────────────────────────────────────────────────────────

export function filterGraphData(
  graphData: GraphData,
  options: {
    brandIds?: string[];
    yearRange?: [number, number];
    edgeTypes?: EvolutionEdgeType[];
    nodeTypes?: GraphNode["type"][];
  }
): GraphData {
  const { brandIds, yearRange, edgeTypes, nodeTypes } = options;

  let nodes = [...graphData.nodes];
  let edges = [...graphData.edges];

  if (brandIds?.length) {
    nodes = nodes.filter((n) => !n.brandId || brandIds.includes(n.brandId));
  }

  if (yearRange) {
    nodes = nodes.filter((n) => !n.year || (n.year >= yearRange[0] && n.year <= yearRange[1]));
  }

  if (nodeTypes?.length) {
    nodes = nodes.filter((n) => nodeTypes.includes(n.type));
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  if (edgeTypes?.length) {
    edges = edges.filter((e) => edgeTypes.includes(e.type));
  }

  return { nodes, edges };
}

// ─── Export Graph as SVG ──────────────────────────────────────────────────────

export function downloadSVG(svgElement: SVGSVGElement, filename = "evolution-graph.svg"): void {
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgElement);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadPNG(canvas: HTMLCanvasElement, filename = "evolution-graph.png"): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ─── Build Radar Data ─────────────────────────────────────────────────────────

export function buildRadarData(
  dimensionsA: { key: string; label: string; score: number }[],
  dimensionsB?: { key: string; label: string; score: number }[]
) {
  return dimensionsA.map((dim) => ({
    dimension: dim.label,
    valueA: dim.score,
    valueB: dimensionsB?.find((d) => d.key === dim.key)?.score ?? 0,
    fullMark: 100,
  }));
}
