/**
 * قياس زمن مسارات API على Vercel لتفسير استهلاك Fluid Active CPU.
 *
 * في Vercel → Environment Variables:
 * - VERCEL_LOG_SLOW_MS=400  → يطبع JSON لأي طلب أبطأ من 400ms (افتراضي 500 إن لم تُضبط).
 * - VERCEL_LOG_ALL_API=1    → يطبع كل طلب لهذا المسار (للتشخيص القصير فقط).
 */

const DEFAULT_SLOW_MS = 500;

function shouldEmitLogs(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL_ENV === "preview" || process.env.API_TIMING_LOG === "1";
}

function slowThresholdMs(): number {
  const raw = process.env.VERCEL_LOG_SLOW_MS;
  if (raw == null || raw === "") return DEFAULT_SLOW_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SLOW_MS;
}

export function logApiRouteTiming(route: string, durationMs: number, status: number): void {
  if (!shouldEmitLogs()) return;
  const threshold = slowThresholdMs();
  const logAll = process.env.VERCEL_LOG_ALL_API === "1";
  if (!logAll && durationMs < threshold) return;

  console.info(
    JSON.stringify({
      tag: "api_timing",
      route,
      ms: Math.round(durationMs),
      status,
    })
  );
}

/**
 * يلفّ معالج GET/POST ويسجّل الزمن والحالة النهائية.
 */
export async function withApiTiming<T extends Response>(
  route: string,
  handler: () => Promise<T>
): Promise<T> {
  const t0 = performance.now();
  try {
    const res = await handler();
    logApiRouteTiming(route, performance.now() - t0, res.status);
    return res;
  } catch (e) {
    logApiRouteTiming(route, performance.now() - t0, 500);
    throw e;
  }
}
