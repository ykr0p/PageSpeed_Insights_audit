/**
 * Модуль SSR Streaming Probe
 * Замеряет время первого байта (TTFB) и разницу до завершения HTML-потока (responseStart -> responseEnd).
 * Позволяет выявлять скрытые последовательные водопады в Server-Side Rendering без запуска браузера.
 */

export class SsrProbe {
  /**
   * Замерить стриминг SSR для URL
   * @param {string} url URL страницы
   * @param {Object} [options]
   * @param {string} [options.cookie] Куки авторизации
   * @param {Record<string, string>} [options.headers] Дополнительные заголовки
   * @returns {Promise<SsrProbeResult>}
   */
  static async probe(url, options = {}) {
    const startTime = performance.now();
    let responseStart = 0;
    let responseEnd = 0;
    let byteCount = 0;
    let statusCode = 0;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PageSpeed-SSR-Probe/1.0",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    };

    if (options.cookie) {
      headers["Cookie"] = options.cookie;
    }

    try {
      const res = await fetch(url, { method: "GET", headers });
      statusCode = res.status;
      responseStart = performance.now(); // Время получения первых заголовков ответа

      if (!res.body) {
        throw new Error("Ответ сервера не содержит тела (body)");
      }

      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) byteCount += value.length;
      }
      responseEnd = performance.now(); // Время завершения чтения всего HTML

      const ttfbMs = Math.round(responseStart - startTime);
      const streamDurationMs = Math.round(responseEnd - responseStart);
      const totalDurationMs = Math.round(responseEnd - startTime);

      return {
        url,
        statusCode,
        byteCount,
        ttfbMs,
        streamDurationMs,
        totalDurationMs,
        isSlow: streamDurationMs > 1500,
        status: streamDurationMs <= 500 ? "fast" : streamDurationMs <= 1500 ? "acceptable" : "slow",
      };
    } catch (err) {
      return {
        url,
        statusCode: 0,
        byteCount: 0,
        ttfbMs: 0,
        streamDurationMs: 0,
        totalDurationMs: Math.round(performance.now() - startTime),
        error: err.message,
        status: "error",
      };
    }
  }
}
