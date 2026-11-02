/**
 * Генератор интерактивного HTML-отчета с круговыми диаграммами, карточками Core Web Vitals
 * и практическими рекомендациями по коду.
 */

import fs from "node:fs";
import path from "node:path";
import { getMetricStatus } from "./recommendations.mjs";

export class HtmlReporter {
  /**
   * Сгенерировать интерактивный HTML-отчет
   * @param {Object} params
   * @param {Array} params.results Результаты аудитов
   * @param {Array} params.recommendations Экспертные рекомендации
   * @param {Object} [params.coldHotDiff] Сравнение холодного и горячего запуска
   * @param {string} params.outputPath Путь сохранения
   */
  static generateHtmlReport(params) {
    const { results, recommendations = [], coldHotDiff = null, outputPath } = params;
    const primary = results[0] || {};
    const scores = primary.scores || {};
    const metrics = primary.metrics || {};

    const perfScore = scores.performance ?? 0;
    const a11yScore = scores.accessibility ?? 0;
    const bpScore = scores.bestPractices ?? 0;
    const seoScore = scores.seo ?? 0;

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PageSpeed Metrics Report | ${escapeHtml(primary.url || "Audit")}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
      --blue: #3b82f6;
      --cyan: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.6; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--card-border); padding-bottom: 20px; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
    .header-title h1 { font-size: 26px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
    .badge-desktop { background: rgba(59, 130, 246, 0.2); color: var(--blue); border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-mobile { background: rgba(245, 158, 11, 0.2); color: var(--yellow); border: 1px solid rgba(245, 158, 11, 0.4); }
    .header-meta { color: var(--text-muted); font-size: 14px; }

    /* Radial Score Cards */
    .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 35px; }
    .score-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 20px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
    .score-gauge { position: relative; width: 120px; height: 120px; margin: 0 auto 12px; }
    .score-gauge svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .score-gauge circle { fill: none; stroke-width: 8; stroke-linecap: round; }
    .score-gauge .bg-circle { stroke: #334155; }
    .score-gauge .progress-circle { transition: stroke-dashoffset 1s ease-in-out; }
    .score-number { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 32px; font-weight: 800; }
    .score-label { font-size: 15px; font-weight: 600; color: var(--text-muted); }

    /* Core Web Vitals */
    .section-title { font-size: 20px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; color: #fff; }
    .cwv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-bottom: 35px; }
    .cwv-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
    .cwv-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .cwv-good::before { background: var(--green); }
    .cwv-needs-improvement::before { background: var(--yellow); }
    .cwv-poor::before { background: var(--red); }
    .cwv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .cwv-name { font-size: 14px; font-weight: 600; color: var(--text-muted); }
    .cwv-val { font-size: 30px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .cwv-desc { font-size: 12px; color: var(--text-muted); }

    /* Cold vs Hot Comparison */
    .table-container { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; overflow-x: auto; margin-bottom: 35px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th { background: #182234; padding: 14px 18px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--card-border); }
    td { padding: 14px 18px; border-bottom: 1px solid var(--card-border); }
    tr:last-child td { border-bottom: none; }
    .diff-better { color: var(--green); font-weight: 600; }
    .diff-worse { color: var(--red); font-weight: 600; }

    /* Opportunities & Recommendations */
    .recs-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .rec-item { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 22px; }
    .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; }
    .rec-title { font-size: 17px; font-weight: 700; color: #fff; }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-high { background: rgba(245, 158, 11, 0.2); color: var(--yellow); border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-medium { background: rgba(59, 130, 246, 0.2); color: var(--blue); border: 1px solid rgba(59, 130, 246, 0.4); }
    .rec-problem { color: #fca5a5; font-size: 14px; margin-bottom: 10px; background: rgba(239, 68, 68, 0.1); padding: 10px 14px; border-radius: 8px; }
    .rec-solution { color: #e2e8f0; font-size: 14px; margin-bottom: 14px; white-space: pre-line; }
    pre { background: #0b1120; border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; color: #38bdf8; }

    footer { text-align: center; color: var(--text-muted); font-size: 13px; margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--card-border); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title">
        <h1>PageSpeed Insights Report</h1>
        <span class="badge badge-${escapeHtml(primary.strategy || "desktop")}">${escapeHtml(primary.strategy || "desktop")}</span>
        <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.4);">${escapeHtml(primary.mode || "hot")}</span>
      </div>
      <div class="header-meta">
        <div>URL: <strong>${escapeHtml(primary.url || "-")}</strong></div>
        <div>Дата: ${new Date().toLocaleString("ru-RU")} | Анализ: ${primary.elapsedMs || 0} ms</div>
      </div>
    </header>

    <!-- Оценки Google Lighthouse -->
    <div class="scores-grid">
      ${renderScoreCard("Performance", perfScore)}
      ${renderScoreCard("Accessibility", a11yScore)}
      ${renderScoreCard("Best Practices", bpScore)}
      ${renderScoreCard("SEO", seoScore)}
    </div>

    <!-- Core Web Vitals Карточки -->
    <div class="section-title">
      <span>⚡</span> Core Web Vitals & Метрики загрузки
    </div>
    <div class="cwv-grid">
      ${renderCwvCard("Largest Contentful Paint (LCP)", metrics.lcp ? `${Math.round(metrics.lcp)} ms` : "-", getMetricStatus("lcp", metrics.lcp), "Отрисовка главного содержимого (норма ≤ 2.5 с)")}
      ${renderCwvCard("Cumulative Layout Shift (CLS)", metrics.cls != null ? metrics.cls.toFixed(4) : "-", getMetricStatus("cls", metrics.cls), "Сдвиг разметки страницы (норма ≤ 0.1)")}
      ${renderCwvCard("Total Blocking Time (TBT)", metrics.tbt ? `${Math.round(metrics.tbt)} ms` : "-", getMetricStatus("tbt", metrics.tbt), "Время блокировки главного потока JS (норма ≤ 200 ms)")}
      ${renderCwvCard("First Contentful Paint (FCP)", metrics.fcp ? `${Math.round(metrics.fcp)} ms` : "-", getMetricStatus("fcp", metrics.fcp), "Первая видимая отрисовка (норма ≤ 1.8 с)")}
      ${renderCwvCard("Server Response Time (TTFB)", metrics.ttfb ? `${Math.round(metrics.ttfb)} ms` : "-", getMetricStatus("ttfb", metrics.ttfb), "Начальный ответ сервера (норма ≤ 800 ms)")}
      ${renderCwvCard("Speed Index (SI)", metrics.si ? `${Math.round(metrics.si)} ms` : "-", "good", "Скорость визуального наполнения контентом")}
    </div>

    <!-- Сравнение Cold vs Hot (если доступно) -->
    ${renderColdHotSection(coldHotDiff, results)}

    <!-- Рекомендации по оптимизации -->
    <div class="section-title">
      <span>🛠️</span> Экспертные рекомендации и архитектурные решения
    </div>
    <div class="recs-list">
      ${recommendations.map(renderRecommendation).join("")}
    </div>

    <footer>
      PageSpeed Metrics Toolkit &bull; Построено на основе Google PageSpeed Insights API v5 &bull; Workdo Best Practices
    </footer>
  </div>
</body>
</html>`;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, "utf8");
    console.log(`[HtmlReporter] Интерактивный HTML-отчет сохранен: ${outputPath}`);
    return outputPath;
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getScoreColor(val) {
  if (val >= 90) return "var(--green)";
  if (val >= 50) return "var(--yellow)";
  return "var(--red)";
}

function renderScoreCard(label, val) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, val)) / 100) * circumference;
  const color = getScoreColor(val);

  return `
    <div class="score-card">
      <div class="score-gauge">
        <svg viewBox="0 0 120 120">
          <circle class="bg-circle" cx="60" cy="60" r="${radius}"></circle>
          <circle class="progress-circle" cx="60" cy="60" r="${radius}" stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="score-number" style="color: ${color};">${val}</div>
      </div>
      <div class="score-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function renderCwvCard(title, val, status, desc) {
  return `
    <div class="cwv-card cwv-${status}">
      <div class="cwv-header">
        <div class="cwv-name">${escapeHtml(title)}</div>
      </div>
      <div class="cwv-val">${escapeHtml(val)}</div>
      <div class="cwv-desc">${escapeHtml(desc)}</div>
    </div>
  `;
}

function renderColdHotSection(diff, results) {
  if (!diff && results.length < 2) return "";
  const cold = results.find((r) => r.mode === "cold") || results[0];
  const hot = results.find((r) => r.mode === "hot") || results[1] || results[0];

  const calcDiff = (c, h, lowerIsBetter = true) => {
    if (c == null || h == null) return "-";
    const d = h - c;
    const isGood = lowerIsBetter ? d <= 0 : d >= 0;
    const sign = d > 0 ? "+" : "";
    return `<span class="${isGood ? "diff-better" : "diff-worse"}">${sign}${typeof d === "number" && !Number.isInteger(d) ? d.toFixed(4) : d}</span>`;
  };

  return `
    <div class="section-title">
      <span>🔄</span> Сравнение холодного (Cold) и горячего (Hot) запуска
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Метрика</th>
            <th>Cold (Первый визит)</th>
            <th>Hot (Повторный визит)</th>
            <th>Разница (Delta)</th>
            <th>Интерпретация</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Performance Score</strong></td>
            <td>${cold.scores.performance ?? "-"}/100</td>
            <td>${hot.scores.performance ?? "-"}/100</td>
            <td>${calcDiff(cold.scores.performance, hot.scores.performance, false)}</td>
            <td>Общий индекс эффективности Google Lighthouse</td>
          </tr>
          <tr>
            <td><strong>LCP (Largest Contentful Paint)</strong></td>
            <td>${cold.metrics.lcp ? Math.round(cold.metrics.lcp) + " ms" : "-"}</td>
            <td>${hot.metrics.lcp ? Math.round(hot.metrics.lcp) + " ms" : "-"}</td>
            <td>${calcDiff(cold.metrics.lcp ? Math.round(cold.metrics.lcp) : null, hot.metrics.lcp ? Math.round(hot.metrics.lcp) : null, true)}</td>
            <td>Время загрузки основного видимого блока</td>
          </tr>
          <tr>
            <td><strong>CLS (Cumulative Layout Shift)</strong></td>
            <td>${cold.metrics.cls != null ? cold.metrics.cls.toFixed(4) : "-"}</td>
            <td>${hot.metrics.cls != null ? hot.metrics.cls.toFixed(4) : "-"}</td>
            <td>${calcDiff(cold.metrics.cls, hot.metrics.cls, true)}</td>
            <td>Визуальная стабильность (смещение верстки)</td>
          </tr>
          <tr>
            <td><strong>TBT (Total Blocking Time)</strong></td>
            <td>${cold.metrics.tbt ? Math.round(cold.metrics.tbt) + " ms" : "-"}</td>
            <td>${hot.metrics.tbt ? Math.round(hot.metrics.tbt) + " ms" : "-"}</td>
            <td>${calcDiff(cold.metrics.tbt ? Math.round(cold.metrics.tbt) : null, hot.metrics.tbt ? Math.round(hot.metrics.tbt) : null, true)}</td>
            <td>Время блокировки потока выполнения скриптами</td>
          </tr>
          <tr>
            <td><strong>TTFB (Server Response Time)</strong></td>
            <td>${cold.metrics.ttfb ? Math.round(cold.metrics.ttfb) + " ms" : "-"}</td>
            <td>${hot.metrics.ttfb ? Math.round(hot.metrics.ttfb) + " ms" : "-"}</td>
            <td>${calcDiff(cold.metrics.ttfb ? Math.round(cold.metrics.ttfb) : null, hot.metrics.ttfb ? Math.round(hot.metrics.ttfb) : null, true)}</td>
            <td>Ответ сервера и прогрев соединений БД/кэша</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderRecommendation(rec) {
  return `
    <div class="rec-item">
      <div class="rec-header">
        <div class="rec-title">${escapeHtml(rec.title)}</div>
        <span class="badge badge-${escapeHtml(rec.priority)}">${escapeHtml(rec.priority.toUpperCase())}</span>
      </div>
      <div class="rec-problem"><strong>Проблема:</strong> ${escapeHtml(rec.problem)}</div>
      <div class="rec-solution"><strong>Решение:</strong> ${escapeHtml(rec.solution)}</div>
      ${rec.codeSample ? `<pre><code>${escapeHtml(rec.codeSample)}</code></pre>` : ""}
    </div>
  `;
}
