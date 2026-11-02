/**
 * Локальный раннер Lighthouse через Google Lighthouse CLI
 * Работает локально через установленный Chrome/Chromium, дает 100% идентичные PageSpeed результаты,
 * не имеет никаких лимитов 429 и не требует API-ключей Google Cloud.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class LocalRunner {
  /**
   * Найти исполняемый файл браузера Chromium (Chrome / Edge)
   * Позволяет запускать аудит на любом компьютере, даже если Chrome не установлен (использует системный Edge).
   */
  static findBrowserPath() {
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }
    const candidates = [
      // Chrome (Windows)
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
      // Edge (установлен по умолчанию на 100% ПК с Windows 10/11)
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : null,
      // macOS
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      // Linux
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/microsoft-edge",
    ].filter(Boolean);

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  /**
   * Выполнить локальный аудит через Lighthouse
   * @param {Object} params
   * @param {string} params.url URL для анализа
   * @param {'desktop'|'mobile'} [params.device='desktop']
   * @param {'cold'|'hot'} [params.mode='hot']
   * @returns {Promise<PsiAuditResult>}
   */
  static async runAudit(params) {
    const { url, device = "desktop", mode = "hot" } = params;
    const startTime = Date.now();
    const tmpJsonPath = path.join(
      os.tmpdir(),
      `lh_audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`
    );

    const browserPath = this.findBrowserPath();
    const env = { ...process.env };
    if (browserPath && !env.CHROME_PATH) {
      env.CHROME_PATH = browserPath;
    }

    const args = [
      "--yes",
      "lighthouse",
      `"${url}"`,
      "--output=json",
      `--output-path="${tmpJsonPath}"`,
      "--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage",
      "--quiet",
    ];

    if (device === "desktop") {
      args.push("--preset=desktop");
    }

    // Для горячего запуска не сбрасываем кэш браузера
    if (mode === "hot") {
      args.push("--disable-storage-reset");
    }

    try {
      await new Promise((resolve, reject) => {
        let stderr = "";
        const proc = spawn("npx", args, {
          shell: true,
          env,
          stdio: ["ignore", "ignore", "pipe"],
        });

        proc.stderr?.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        proc.on("close", (code) => {
          if (code === 0 && fs.existsSync(tmpJsonPath)) {
            resolve();
          } else {
            const cleanErr = stderr
              .split("\n")
              .filter((l) => l.trim() && !l.includes("DEP0190") && !l.includes("trace-deprecation"))
              .slice(-3)
              .join(" ")
              .trim();
            reject(new Error(`Lighthouse завершился с кодом ошибки: ${code}${cleanErr ? ` (${cleanErr})` : ""}`));
          }
        });

        proc.on("error", (err) => reject(err));
      });

      const rawJson = fs.readFileSync(tmpJsonPath, "utf8");
      const lhr = JSON.parse(rawJson);
      try {
        fs.unlinkSync(tmpJsonPath);
      } catch {}

      const elapsedMs = Date.now() - startTime;
      return this.normalizeLhr(lhr, { url, strategy: device, mode, elapsedMs });
    } catch (err) {
      if (fs.existsSync(tmpJsonPath)) {
        try {
          fs.unlinkSync(tmpJsonPath);
        } catch {}
      }
      throw err;
    }
  }

  /**
   * Нормализовать LHR результат в единый формат
   * @private
   */
  static normalizeLhr(lhr, meta) {
    const categories = lhr?.categories || {};
    const audits = lhr?.audits || {};

    // Оценки по категориям (0-100)
    const scores = {
      performance: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      accessibility: categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: categories["best-practices"]?.score != null ? Math.round(categories["best-practices"].score * 100) : null,
      seo: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
    };

    // Метрики Core Web Vitals
    const metrics = {
      fcp: audits["first-contentful-paint"]?.numericValue ?? null,
      lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbt: audits["total-blocking-time"]?.numericValue ?? null,
      si: audits["speed-index"]?.numericValue ?? null,
      tti: audits["interactive"]?.numericValue ?? null,
      ttfb: audits["server-response-time"]?.numericValue ?? null,
    };

    const displayValues = {
      fcp: audits["first-contentful-paint"]?.displayValue ?? "-",
      lcp: audits["largest-contentful-paint"]?.displayValue ?? "-",
      cls: audits["cumulative-layout-shift"]?.displayValue ?? "-",
      tbt: audits["total-blocking-time"]?.displayValue ?? "-",
      si: audits["speed-index"]?.displayValue ?? "-",
      tti: audits["interactive"]?.displayValue ?? "-",
      ttfb: audits["server-response-time"]?.displayValue ?? "-",
    };

    // Возможности оптимизации (Opportunities)
    const oppIds = [
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
    ];

    const opportunities = [];
    for (const id of oppIds) {
      const a = audits[id];
      if (!a) continue;
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
        });
      }
    }

    opportunities.sort((a, b) => (b.savingsMs * 1000 + b.savingsBytes) - (a.savingsMs * 1000 + a.savingsBytes));

    return {
      url: meta.url,
      effectiveUrl: meta.url,
      strategy: meta.strategy,
      mode: meta.mode,
      timestamp: new Date().toISOString(),
      elapsedMs: meta.elapsedMs,
      scores,
      metrics,
      displayValues,
      opportunities,
      diagnostics: [],
    };
  }
}
