export function retryHeaderSeconds(value: string | null, now = Date.now()): number | undefined {
  if (!value?.trim()) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.min(86400, Math.ceil(numeric));
  const date = Date.parse(value);
  return Number.isFinite(date) && date > now ? Math.min(86400, Math.ceil((date - now) / 1000)) : undefined;
}
export function durationSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const matches = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)];
  if (!matches.length || matches.map(m => m[0]).join("") !== value) return undefined;
  const factors: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600 };
  const seconds = matches.reduce((sum, m) => sum + Number(m[1]) * factors[m[2]], 0);
  return seconds > 0 ? Math.min(86400, Math.ceil(seconds)) : undefined;
}
export function nextPacificDaySeconds(now = Date.now()) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });
  const day = formatter.format(new Date(now));
  let low = now, high = now + 27 * 3600000;
  while (high - low > 1000) { const mid = Math.floor((low + high) / 2); if (formatter.format(new Date(mid)) === day) low = mid; else high = mid; }
  return Math.min(86400, Math.max(1, Math.ceil((high - now) / 1000)));
}
export async function providerRetrySeconds(response: Response, provider: "groq" | "gemini", now = Date.now()): Promise<number> {
  const header = retryHeaderSeconds(response.headers.get("Retry-After"), now);
  if (provider === "groq") {
    const resets = [header];
    if (response.headers.get("x-ratelimit-remaining-requests") === "0") resets.push(durationSeconds(response.headers.get("x-ratelimit-reset-requests")));
    if (response.headers.get("x-ratelimit-remaining-tokens") === "0") resets.push(durationSeconds(response.headers.get("x-ratelimit-reset-tokens")));
    return Math.max(...resets.filter((n): n is number => !!n), header ? 1 : 60);
  }
  let retry = header || 60, daily = false, info: number | undefined;
  // Inspect structured quota metadata only; never retain or log the upstream body.
  try {
    if (Number(response.headers.get("Content-Length")) > 65536) return retry;
    const body = await response.json();
    const details = body?.error?.details;
    if (Array.isArray(details)) for (const detail of details) {
      if (detail?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo") info = durationSeconds(detail.retryDelay);
      if (detail?.["@type"] === "type.googleapis.com/google.rpc.QuotaFailure" && Array.isArray(detail.violations)
        && detail.violations.some((v: { quotaId?: string; quotaMetric?: string }) => /PerDay|per_day/i.test((v.quotaId || "") + (v.quotaMetric || "")))) daily = true;
    }
  } catch { /* A missing/malformed error body does not prevent fallback. */ }
  retry = Math.max(header || 0, info || retry, daily ? nextPacificDaySeconds(now) : 0);
  return Math.min(86400, Math.max(1, Math.ceil(retry)));
}
export function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const abort = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
