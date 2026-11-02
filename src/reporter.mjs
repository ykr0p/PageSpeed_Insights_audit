/**
 * Модуль генерации отчетов: консольный вывод, Markdown и JSONL
 */

import fs from "node:fs";
import path from "node:path";
import { getMetricStatus } from "./recommendations.mjs";

// ANSI escape-коды для цветного вывода в терминале
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgYellow: "\x1b[43m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
};

function colorByStatus(status, text) {
  if (status === "good") return `${COLORS.green}${text}${COLORS.reset}`;
  if (status === "needs-improvement") return `${COLORS.yellow}${text}${COLORS.reset}`;
  return `${COLORS.red}${text}${COLORS.reset}`;
}

export class Reporter {
  /**
   * Вывести сводку прогона в консоль
   * @param {Object} res Результат аудита
   */
  static printRunSummary(res) {
    const pScore = res.scores.performance ?? "-";
    const pStatus = getMetricStatus("performance", res.scores.performance);
    const badge = pStatus === "good" ? " [100% GREEN] " : pStatus === "needs-improvement" ? " [NEEDS IMPR] " : " [POOR] ";

    console.log("\n" + "=".repeat(80));
    console.log(
      `${COLORS.bold}АУДИТ:${COLORS.reset} ${COLORS.cyan}${res.url}${COLORS.reset} | ${COLORS.bold}Режим:${COLORS.reset} ${res.mode.toUpperCase()} | ${COLORS.bold}Девайс:${COLORS.reset} ${res.strategy.toUpperCase()}`
    );
    console.log(
      `${COLORS.bold}Performance:${COLORS.reset} ${colorByStatus(pStatus, `${pScore}/100`)} ${badge} | ${COLORS.dim}Время анализа: ${res.elapsedMs}ms${COLORS.reset}`
    );
    console.log("-".repeat(80));

    // Таблица Core Web Vitals
    const m = res.metrics;
    const fcp = m.fcp != null ? `${Math.round(m.fcp)} ms` : "-";
    const lcp = m.lcp != null ? `${Math.round(m.lcp)} ms` : "-";
    const cls = m.cls != null ? m.cls.toFixed(4) : "-";
    const tbt = m.tbt != null ? `${Math.round(m.tbt)} ms` : "-";
    const si = m.si != null ? `${Math.round(m.si)} ms` : "-";
    const ttfb = m.ttfb != null ? `${Math.round(m.ttfb)} ms` : "-";

    console.log(
      `  FCP (First Contentful Paint):      ${colorByStatus(getMetricStatus("fcp", m.fcp), fcp.padEnd(10))} (норма <= 1800 ms)`
    );
    console.log(
      `  LCP (Largest Contentful Paint):    ${colorByStatus(getMetricStatus("lcp", m.lcp), lcp.padEnd(10))} (норма <= 2500 ms)`
    );
    console.log(
      `  CLS (Cumulative Layout Shift):    ${colorByStatus(getMetricStatus("cls", m.cls), cls.padEnd(10))} (норма <= 0.1000)`
    );
    console.log(
      `  TBT (Total Blocking Time):         ${colorByStatus(getMetricStatus("tbt", m.tbt), tbt.padEnd(10))} (норма <= 200 ms)`
    );
    console.log(
      `  Speed Index:                       ${colorByStatus("good", si.padEnd(10))} (визуальное заполнение)`
    );
    console.log(
      `  TTFB (Server Response Time):       ${colorByStatus(getMetricStatus("ttfb", m.ttfb), ttfb.padEnd(10))} (норма <= 800 ms)`
    );

    // Другие категории
    const s = res.scores;
    console.log(
      `\n  Дополнительно: Accessibility: ${s.accessibility ?? "-"} | Best Practices: ${s.bestPractices ?? "-"} | SEO: ${s.seo ?? "-"}`
    );

    // Топ-3 возможностей оптимизации
    if (res.opportunities && res.opportunities.length > 0) {
      console.log(`\n${COLORS.bold}  Топ возможностей оптимизации:${COLORS.reset}`);
      for (const opp of res.opportunities.slice(0, 3)) {
        const timeSav = opp.savingsMs ? `${opp.savingsMs}ms` : "";
        const byteSav = opp.savingsKb ? `${opp.savingsKb}KB` : "";
        const savStr = [timeSav, byteSav].filter(Boolean).join(", ");
        console.log(`   * ${opp.title}: ${COLORS.yellow}экономия ${savStr}${COLORS.reset}`);
      }
    }
    console.log("=".repeat(80) + "\n");
  }

  /**
   * Сгенерировать сравнительную консольную таблицу (Cold vs Hot)
   * @param {Object} cold Результат холодного прогона
   * @param {Object} hot Результат горячего прогона
   */
  static printColdHotComparison(cold, hot) {
    console.log("\n" + "#".repeat(80));
    console.log(`${COLORS.bold}СРАВНЕНИЕ: ХОЛОДНЫЙ (COLD) VS ГОРЯЧИЙ (HOT) ЗАПУСК${COLORS.reset}`);
    console.log(`${COLORS.cyan}URL: ${cold.url} (${cold.strategy})${COLORS.reset}`);
    console.log("#".repeat(80));

    const row = (name, cVal, hVal, delta, isGood) => {
      const dStr = delta > 0 ? `+${delta}` : `${delta}`;
      const dColored = isGood ? `${COLORS.green}${dStr}${COLORS.reset}` : `${COLORS.red}${dStr}${COLORS.reset}`;
      console.log(`  ${name.padEnd(28)} | Cold: ${String(cVal).padEnd(8)} | Hot: ${String(hVal).padEnd(8)} | Delta: ${dColored}`);
    };

    const cP = cold.scores.performance ?? 0;
    const hP = hot.scores.performance ?? 0;
    row("Performance Score", `${cP}/100`, `${hP}/100`, hP - cP, hP >= cP);

    const cLcp = Math.round(cold.metrics.lcp ?? 0);
    const hLcp = Math.round(hot.metrics.lcp ?? 0);
    row("LCP (ms)", cLcp, hLcp, hLcp - cLcp, hLcp <= cLcp);

    const cFcp = Math.round(cold.metrics.fcp ?? 0);
    const hFcp = Math.round(hot.metrics.fcp ?? 0);
    row("FCP (ms)", cFcp, hFcp, hFcp - cFcp, hFcp <= cFcp);

    const cCls = (cold.metrics.cls ?? 0).toFixed(4);
    const hCls = (hot.metrics.cls ?? 0).toFixed(4);
    row("CLS", cCls, hCls, (Number(hCls) - Number(cCls)).toFixed(4), Number(hCls) <= Number(cCls));

    const cTbt = Math.round(cold.metrics.tbt ?? 0);
    const hTbt = Math.round(hot.metrics.tbt ?? 0);
    row("TBT (ms)", cTbt, hTbt, hTbt - cTbt, hTbt <= cTbt);

    const cTtfb = Math.round(cold.metrics.ttfb ?? 0);
    const hTtfb = Math.round(hot.metrics.ttfb ?? 0);
    row("TTFB (ms)", cTtfb, hTtfb, hTtfb - cTtfb, hTtfb <= cTtfb);

    console.log("#".repeat(80) + "\n");
  }

  /**
   * Сформировать Markdown-отчет
   * @param {Object} params
   * @param {Array} params.results Список всех прогонов
   * @param {Array} params.recommendations Список сгенерированных рекомендаций
   * @param {string} params.outputPath Путь для сохранения .md файла
   */
  static generateMarkdownReport(params) {
    const { results, recommendations = [], outputPath } = params;

    let md = `# Отчет аудита производительности и Core Web Vitals\n\n`;
    md += `> Сгенерировано утилитой **PageSpeed Metrics Toolkit** на основе Google PageSpeed Insights API.\n`;
    md += `> Дата формирования: ${new Date().toLocaleString("ru-RU")}\n\n`;

    md += `## 1. Сводная таблица замеров\n\n`;
    md += `| URL | Девайс | Режим | Perf | LCP (ms) | CLS | TBT (ms) | FCP (ms) | TTFB (ms) | Время теста |\n`;
    md += `|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n`;

    for (const r of results) {
      const p = r.scores.performance != null ? r.scores.performance : "-";
      const lcp = r.metrics.lcp != null ? Math.round(r.metrics.lcp) : "-";
      const cls = r.metrics.cls != null ? r.metrics.cls.toFixed(4) : "-";
      const tbt = r.metrics.tbt != null ? Math.round(r.metrics.tbt) : "-";
      const fcp = r.metrics.fcp != null ? Math.round(r.metrics.fcp) : "-";
      const ttfb = r.metrics.ttfb != null ? Math.round(r.metrics.ttfb) : "-";

      md += `| ${r.url} | ${r.strategy} | ${r.mode} | **${p}** | ${lcp} | ${cls} | ${tbt} | ${fcp} | ${ttfb} | ${r.elapsedMs}ms |\n`;
    }
    md += `\n`;

    // 2. Секция рекомендаций
    if (recommendations.length > 0) {
      md += `## 2. Экспертные рекомендации по оптимизации\n\n`;
      for (const rec of recommendations) {
        const priorityBadge =
          rec.priority === "critical" ? "🔴 КРИТИЧЕСКИЙ" : rec.priority === "high" ? "🟠 ВЫСОКИЙ" : "🟡 СРЕДНИЙ";

        md += `### [${priorityBadge}] ${rec.title}\n`;
        md += `**Категория:** \`${rec.category}\`\n\n`;
        md += `**Проблема:** ${rec.problem}\n\n`;
        md += `**Решение:** ${rec.solution}\n\n`;

        if (rec.codeSample) {
          md += "```typescript\n" + rec.codeSample + "\n```\n\n";
        }
      }
    }

    // 3. Возможности экономии
    const firstWithOpps = results.find((r) => r.opportunities && r.opportunities.length > 0);
    if (firstWithOpps) {
      md += `## 3. Детальные возможности экономии ресурсов (Opportunities)\n\n`;
      md += `| Возможность | Оценка экономии времени | Оценка экономии трафика | Описание |\n`;
      md += `|---|:---:|:---:|---|\n`;
      for (const opp of firstWithOpps.opportunities) {
        const time = opp.savingsMs ? `${opp.savingsMs} ms` : "-";
        const bytes = opp.savingsKb ? `${opp.savingsKb} KB` : "-";
        md += `| **${opp.title}** | ${time} | ${bytes} | ${opp.description.replace(/\n/g, " ")} |\n`;
      }
      md += `\n`;
    }

    // Сохранение файла
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, md, "utf8");
    console.log(`[Reporter] Markdown-отчет сохранен: ${outputPath}`);
    return outputPath;
  }
}
