import { AnalyzeMealResponseData } from "@/types/meal";

interface CachedAnalysisEntry {
  key: string;
  data: AnalyzeMealResponseData;
  cachedAt: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_CACHE_ENTRIES = 50;
const memoryCache = new Map<string, CachedAnalysisEntry>();

/**
 * Normaliza una descripción textual de comida para maximizar aciertos de caché
 * (ej. "2 huevos revueltos y media marraqueta" === "2 Huevos Revueltos  y media marraqueta ").
 */
export function normalizeMealTextCacheKey(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula una huella determinista FNV-1a de 64 bits (hex) sobre bytes o texto base64
 * para cachear análisis de imágenes repetidas sin colisiones triviales.
 */
export function computeContentFingerprint(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function getCachedMealAnalysis(
  rawKey: string,
  now = Date.now()
): AnalyzeMealResponseData | null {
  if (!rawKey) return null;
  const entry = memoryCache.get(rawKey);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    memoryCache.delete(rawKey);
    return null;
  }
  return {
    ...entry.data,
    items: entry.data.items.map((item) => ({ ...item })),
    totals: { ...entry.data.totals },
  };
}

export function setCachedMealAnalysis(
  rawKey: string,
  data: AnalyzeMealResponseData,
  ttlMs = CACHE_TTL_MS,
  now = Date.now()
): void {
  if (!rawKey || !data?.items?.length) return;
  if (memoryCache.size >= MAX_CACHE_ENTRIES && !memoryCache.has(rawKey)) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(rawKey, {
    key: rawKey,
    data: {
      ...data,
      items: data.items.map((item) => ({ ...item })),
      totals: { ...data.totals },
    },
    cachedAt: now,
    expiresAt: now + ttlMs,
  });
}

export function clearMealAnalysisCache(): void {
  memoryCache.clear();
}
