/**
 * Google PageSpeed Insights API (v5) Client
 * Поддерживает холодные (cold) и горячие (hot) запуски, мобильные и десктопные стратегии,
 * извлечение Core Web Vitals (LCP, CLS, TBT, FCP, TTFB), возможностей оптимизации и полевых данных (CrUX).
 */

const PSI_API_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export class PsiClient {
  /**
   * @param {Object} options
   * @param {string} [options.apiKey] Ключ Google API (опционально)
   * @param {string} [options.locale='ru'] Язык отчетов
   * @param {number} [options.timeoutMs=120000] Таймаут запроса
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GOOGLE_PAGESPEED_API_KEY || "";
    this.locale = options.locale || "ru";
    this.timeoutMs = options.timeoutMs || 120000;
  }

  /**
   * Выполнить аудит страницы
   * @param {Object} params
   * @param {string} params.url URL для анализа
   * @param {'desktop'|'mobile'} [params.strategy='desktop'] Стратегия устройства
   * @param {'cold'|'hot'} [params.mode='hot'] Режим (cold - сброс кэша через cache-buster, hot - канонический URL)
   * @param {string[]} [params.categories] Категории аудита
   * @param {number} [params.pass=1] Номер прогона
   * @returns {Promise<PsiAuditResult>}
   */
  async runAudit(params) {
    const {
      url,
      strategy = "desktop",
      mode = "hot",
      categories = ["performance"],
      pass = 1,
    } = params;

    if (!url || typeof url !== "string") {
      throw new Error("Параметр url обязателен и должен быть строкой");
    }

    // Подготовка URL с учетом cold/hot режима
    let targetUrl = url;
    if (mode === "cold") {
      // Для холодного запуска добавляем уникальный cache-buster параметр.
      // Это предотвращает отдачу закэшированного ответа Google PSI и CDN сайта.
      const separator = targetUrl.includes("?") ? "&" : "?";
      const cacheBuster = `_psi_cold_${Date.now()}_${Math.random().toString(36).substring(2, 7)}=1`;
      targetUrl = `${targetUrl}${separator}${cacheBuster}`;
    }

    const apiUrl = new URL(PSI_API_ENDPOINT);
    apiUrl.searchParams.set("url", targetUrl);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("locale", this.locale);

    for (const cat of categories) {
      apiUrl.searchParams.append("category", cat);
    }

    if (this.apiKey) {
      apiUrl.searchParams.set("key", this.apiKey);
    }

    const startTime = Date.now();
    let responseData;
    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Cache-Control": mode === "cold" ? "no-cache, no-store" : "default",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 429) {
          const errText = await res.text();
          let errMsg = "";
          try {
            errMsg = JSON.parse(errText)?.error?.message || "";
          } catch {}

          // Если API-ключа нет, ожидание не поможет — Google блокирует анонимный IP на часы.
          // Сразу выбрасываем ошибку для мгновенного переключения на локальный движок без ожидания.
          throw new Error(`Google API 429 (Лимит запросов без ключа): ${errMsg || "Quota exceeded"}`);
        }

        if (!res.ok) {
          const errText = await res.text();
          let errJson;
          try {
            errJson = JSON.parse(errText);
          } catch {}
          const msg = errJson?.error?.message || errText;
          throw new Error(`Google PageSpeed API HTTP ${res.status}: ${msg}`);
        }

        responseData = await res.json();
        break;
      } catch (err) {
        if (attempt >= maxAttempts) {
          throw err;
        }
        const delay = attempt * 2000;
        console.warn(`[PSI API] Ошибка запроса (${err.message}). Повтор через ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (!responseData) {
      throw new Error(`Google PageSpeed API не вернул данные отчета для URL: ${url}`);
    }

    const elapsedMs = Date.now() - startTime;
    return this.parseResponse(responseData, {
      originalUrl: url,
      effectiveUrl: targetUrl,
      strategy,
      mode,
      pass,
      elapsedMs,
    });
  }

  /**
   * Разобрать и нормализовать ответ Google PageSpeed Insights
   * @private
   */
  parseResponse(data, meta) {
    const lhr = data?.lighthouseResult || {};
    const categories = lhr?.categories || {};
    const audits = lhr?.audits || {};

    // Оценки по категориям (0-100)
    const scores = {
      performance: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      accessibility: categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: categories["best-practices"]?.score != null ? Math.round(categories["best-practices"].score * 100) : null,
      seo: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
      pwa: categories.pwa?.score != null ? Math.round(categories.pwa.score * 100) : null,
    };

    // Метрики Core Web Vitals и производительности
    const metrics = {
      fcp: audits["first-contentful-paint"]?.numericValue ?? null, // ms
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null, // ms
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null, // float
      tbt: audits["total-blocking-time"]?.numericValue ?? null, // ms
      si: audits["speed-index"]?.numericValue ?? null, // ms
      tti: audits["interactive"]?.numericValue ?? null, // ms
      ttfb: audits["server-response-time"]?.numericValue ?? null, // ms
    };

    // Человекочитаемые форматированные значения
    const displayValues = {
      fcp: audits["first-contentful-paint"]?.displayValue ?? "-",
      lcp: audits["largest-contentful-paint"]?.displayValue ?? "-",
      cls: audits["cumulative-layout-shift"]?.displayValue ?? "-",
      tbt: audits["total-blocking-time"]?.displayValue ?? "-",
      si: audits["speed-index"]?.displayValue ?? "-",
      tti: audits["interactive"]?.displayValue ?? "-",
      ttfb: audits["server-response-time"]?.displayValue ?? "-",
    };

    // Возможности оптимизации (Opportunities) с оценкой экономии времени и килобайт
    const opportunityAuditIds = [
      "render-blocking-resources",
      "unused-javascript",
      "unused-css-rules",
      "modern-image-formats",
      "uses-optimized-images",
      "offscreen-images",
      "uses-responsive-images",
      "unminified-javascript",
      "unminified-css",
      "uses-text-compression",
      "server-response-time",
      "efficient-animated-content",
      "duplicated-javascript",
      "legacy-javascript",
    ];

    const opportunities = [];
    for (const id of opportunityAuditIds) {
      const a = audits[id];
      if (!a) continue;

      // Если аудит дает потенциальную экономию
      const savingsMs = a.numericValue ?? 0;
      const savingsBytes = a.details?.overallSavingsBytes ?? 0;

      if ((a.score !== null && a.score < 0.9) || savingsMs > 50 || savingsBytes > 10240) {
        opportunities.push({
          id,
          title: a.title,
          description: a.description,
          score: a.score,
          displayValue: a.displayValue || "",
          savingsMs: Math.round(savingsMs),
          savingsBytes: Math.round(savingsBytes),
          savingsKb: Math.round(savingsBytes / 1024),
          itemsCount: a.details?.items?.length || 0,
          items: (a.details?.items || []).slice(0, 5).map((item) => ({
            url: item.url || item.source || "",
            totalBytes: item.totalBytes ? Math.round(item.totalBytes / 1024) : null,
            wastedBytes: item.wastedBytes ? Math.round(item.wastedBytes / 1024) : null,
            wastedMs: item.wastedMs ? Math.round(item.wastedMs) : null,
          })),
        });
      }
    }

    // Сортируем возможности по потенциальному выигрышу времени и размера
    opportunities.sort((a, b) => (b.savingsMs * 1000 + b.savingsBytes) - (a.savingsMs * 1000 + a.savingsBytes));

    // Диагностические метрики (Diagnostics)
    const diagnosticAuditIds = [
      "dom-size",
      "critical-request-chains",
      "font-display",
      "mainthread-work-breakdown",
      "bootup-time",
      "third-party-summary",
      "layout-shifts",
      "long-tasks",
      "network-rtt",
      "network-server-latency",
    ];

    const diagnostics = [];
    for (const id of diagnosticAuditIds) {
      const a = audits[id];
      if (a && (a.score === null || a.score < 0.9)) {
        diagnostics.push({
          id,
          title: a.title,
          displayValue: a.displayValue || "",
          description: a.description,
          score: a.score,
        });
      }
    }

    // Реальные пользовательские данные (CrUX - Chrome User Experience Report)
    const loadingExperience = data?.loadingExperience || {};
    const cruxMetrics = {};
    if (loadingExperience.metrics) {
      for (const [key, val] of Object.entries(loadingExperience.metrics)) {
        cruxMetrics[key] = {
          percentile: val.percentile,
          category: val.category, // FAST, AVERAGE, SLOW
        };
      }
    }

    return {
      url: meta.originalUrl,
      effectiveUrl: meta.effectiveUrl,
      strategy: meta.strategy,
      mode: meta.mode,
      pass: meta.pass,
      timestamp: new Date().toISOString(),
      elapsedMs: meta.elapsedMs,
      scores,
      metrics,
      displayValues,
      opportunities,
      diagnostics,
      crux: {
        overallCategory: loadingExperience.overall_category || "NO_DATA",
        metrics: cruxMetrics,
      },
    };
  }
}
