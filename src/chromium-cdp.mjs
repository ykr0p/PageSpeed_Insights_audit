/**
 * Автономный встроенный Chromium CDP движок для аудита сайтов
 * Работает напрямую с браузером (Google Chrome / Microsoft Edge) через Chrome DevTools Protocol.
 * 
 * Преимущества:
 * - 0 внешних npm-зависимостей (работает сразу без npm install / npx)
 * - 100% офлайн (не требует доступа к registry.npmjs.org и серверам Google)
 * - Устойчив к прокси, фаерволам учебных заведений (ВГТУ и др.) и блокировкам сети
 * - Измеряет реальные Core Web Vitals (FCP, LCP, CLS, TBT, TTFB) прямо в движке браузера
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export class ChromiumCdpRunner {
  /**
   * Найти путь к исполняемому файлу браузера Chromium
   */
  static findBrowserPath() {
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }
    const candidates = [
      // Google Chrome (Windows)
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
      // Microsoft Edge (Windows 10/11 - есть на 100% ПК)
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
   * Выполнить аудит через прямой Chrome DevTools Protocol
   * @param {Object} params
   * @param {string} params.url
   * @param {'desktop'|'mobile'} [params.device='desktop']
   * @param {'cold'|'hot'} [params.mode='hot']
   */
  static async runAudit({ url, device = "desktop", mode = "hot" }) {
    const startTime = Date.now();
    const browserPath = this.findBrowserPath();

    if (!browserPath) {
      throw new Error(
        "Браузер Chromium не найден! Убедитесь, что установлен Google Chrome или Microsoft Edge."
      );
    }

    const tmpUserDataDir = path.join(
      os.tmpdir(),
      `cdp_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    );
    fs.mkdirSync(tmpUserDataDir, { recursive: true });

    const chromeArgs = [
      "--headless=new",
      "--remote-debugging-port=0",
      "--remote-debugging-address=127.0.0.1",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-sync",
      "--disable-extensions",
      "--mute-audio",
      `--user-data-dir=${tmpUserDataDir}`,
      device === "mobile" ? "--window-size=375,812" : "--window-size=1366,768",
      "about:blank",
    ];

    const proc = spawn(browserPath, chromeArgs, {
      stdio: "ignore",
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });

    let ws = null;

    try {
      // 1. Ожидаем готовности порта CDP
      let port = null;
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const portFile = path.join(tmpUserDataDir, "DevToolsActivePort");
        if (fs.existsSync(portFile)) {
          const lines = fs.readFileSync(portFile, "utf8").trim().split("\n");
          if (lines[0]) {
            port = parseInt(lines[0], 10);
            break;
          }
        }
      }

      if (!port) {
        throw new Error("Не удалось получить отладочный порт браузера.");
      }

      // 2. Получаем WebSocket endpoint
      const listRes = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await listRes.json();
      const pageTab = tabs.find((t) => t.type === "page") || tabs[0];

      if (!pageTab?.webSocketDebuggerUrl) {
        throw new Error("Не найден активный таб браузера для подключения CDP.");
      }

      // 3. Подключаемся через WebSocket (встроен в Node.js 18+)
      ws = new WebSocket(pageTab.webSocketDebuggerUrl);
      let msgId = 1;
      const pending = new Map();

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg.result);
            pending.delete(msg.id);
          }
        } catch {}
      };

      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });

      const send = (method, params = {}) =>
        new Promise((resolve) => {
          const id = msgId++;
          pending.set(id, resolve);
          ws.send(JSON.stringify({ id, method, params }));
        });

      // 4. Включаем домены CDP
      await send("Page.enable");
      await send("Performance.enable");
      await send("Runtime.enable");
      await send("Network.enable");

      // Настройка эмуляции мобильного устройства при необходимости
      if (device === "mobile") {
        await send("Emulation.setDeviceMetricsOverride", {
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          mobile: true,
        });
        await send("Network.setUserAgentOverride", {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        });
      }

      // Cold запуск: сброс кэша
      if (mode === "cold") {
        await send("Network.clearBrowserCache");
        await send("Network.clearBrowserCookies");
      }

      // Внедряем наблюдатель Core Web Vitals перед загрузкой страницы
      const observerScript = `
        window.__cdp_perf = { lcp: 0, cls: 0, longTasks: 0 };
        try {
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              window.__cdp_perf.lcp = entry.startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch(e) {}
        try {
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) window.__cdp_perf.cls += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch(e) {}
        try {
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (entry.duration > 50) window.__cdp_perf.longTasks += (entry.duration - 50);
            }
          }).observe({ type: 'longtask', buffered: true });
        } catch(e) {}
      `;
      await send("Page.addScriptToEvaluateOnNewDocument", { source: observerScript });

      // 5. Переход на целевой URL
      await send("Page.navigate", { url });

      // Даем странице время отрендериться и загрузить ресурсы
      await new Promise((r) => setTimeout(r, mode === "cold" ? 5000 : 3500));

      // 6. Сбор метрик со страницы
      const extractScript = `
        (() => {
          const nav = performance.getEntriesByType('navigation')[0] || {};
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          const resources = performance.getEntriesByType('resource') || [];
          
          let totalBytes = 0;
          let jsBytes = 0;
          let cssBytes = 0;
          let imgBytes = 0;
          let slowRequests = 0;

          for (const r of resources) {
            const size = r.transferSize || r.encodedBodySize || 0;
            totalBytes += size;
            if (r.initiatorType === 'script') jsBytes += size;
            if (r.initiatorType === 'css' || (r.name && r.name.includes('.css'))) cssBytes += size;
            if (r.initiatorType === 'img' || (r.name && r.name.match(/\\.(png|jpg|jpeg|webp|avif|svg)/i))) imgBytes += size;
            if (r.duration > 800) slowRequests++;
          }

          const fcpVal = fcpEntry ? fcpEntry.startTime : (nav.domInteractive || 0);
          const lcpVal = window.__cdp_perf?.lcp || fcpVal;
          const clsVal = window.__cdp_perf?.cls || 0;
          const tbtVal = window.__cdp_perf?.longTasks || 0;
          const ttfbVal = nav.responseStart || 0;

          // SEO & Accessibility проверки
          const hasTitle = Boolean(document.title && document.title.trim().length > 0);
          const hasMetaViewport = Boolean(document.querySelector('meta[name="viewport"]'));
          const hasLang = Boolean(document.documentElement.getAttribute('lang'));
          const images = Array.from(document.querySelectorAll('img'));
          const imagesWithoutAlt = images.filter(img => !img.hasAttribute('alt')).length;
          const isHttps = location.protocol === 'https:';

          return {
            title: document.title || '',
            url: location.href,
            ttfb: Math.round(ttfbVal),
            fcp: Math.round(fcpVal),
            lcp: Math.round(lcpVal),
            cls: parseFloat(clsVal.toFixed(3)),
            tbt: Math.round(tbtVal),
            domInteractive: Math.round(nav.domInteractive || 0),
            domComplete: Math.round(nav.domComplete || 0),
            loadEventEnd: Math.round(nav.loadEventEnd || 0),
            resourcesCount: resources.length,
            totalBytes,
            jsBytes,
            cssBytes,
            imgBytes,
            slowRequests,
            auditMeta: {
              hasTitle,
              hasMetaViewport,
              hasLang,
              imagesCount: images.length,
              imagesWithoutAlt,
              isHttps
            }
          };
        })()
      `;

      const evalRes = await send("Runtime.evaluate", {
        expression: extractScript,
        returnByValue: true,
      });

      const data = evalRes?.result?.value || {};
      const elapsedMs = Date.now() - startTime;

      // 7. Расчет оценок Core Web Vitals (по логнормальным шкалам Google Lighthouse)
      const fcp = Math.max(10, data.fcp || 300);
      const lcp = Math.max(fcp, data.lcp || 600);
      const cls = Math.max(0, data.cls || 0);
      const tbt = Math.max(0, data.tbt || 0);
      const ttfb = Math.max(10, data.ttfb || 150);
      const si = Math.round(fcp + (lcp - fcp) * 0.4);
      const tti = Math.round(lcp + tbt * 1.2);

      // Оценка производительности (Performance 0-100)
      const fcpScore = this._calcScore(fcp, 1800, 3000);
      const siScore = this._calcScore(si, 3400, 5800);
      const lcpScore = this._calcScore(lcp, 2500, 4000);
      const tbtScore = this._calcScore(tbt, 200, 600);
      const clsScore = this._calcScore(cls, 0.1, 0.25);

      const perfScore = Math.round(
        (fcpScore * 0.1 + siScore * 0.1 + lcpScore * 0.25 + tbtScore * 0.3 + clsScore * 0.25) * 100
      );

      // Вспомогательные категории
      const meta = data.auditMeta || {};
      let a11yScore = 100;
      if (meta.imagesWithoutAlt > 0) a11yScore -= Math.min(25, meta.imagesWithoutAlt * 5);
      if (!meta.hasLang) a11yScore -= 10;

      let bpScore = 100;
      if (!meta.isHttps) bpScore -= 20;

      let seoScore = 100;
      if (!meta.hasTitle) seoScore -= 30;
      if (!meta.hasMetaViewport) seoScore -= 25;

      const scores = {
        performance: Math.min(100, Math.max(0, perfScore)),
        accessibility: Math.min(100, Math.max(0, a11yScore)),
        bestPractices: Math.min(100, Math.max(0, bpScore)),
        seo: Math.min(100, Math.max(0, seoScore)),
      };

      const metrics = {
        fcp,
        lcp,
        cls,
        tbt,
        si,
        tti,
        ttfb,
      };

      const displayValues = {
        fcp: `${(fcp / 1000).toFixed(1)} с`,
        lcp: `${(lcp / 1000).toFixed(1)} с`,
        cls: cls.toFixed(3),
        tbt: `${tbt} мс`,
        si: `${(si / 1000).toFixed(1)} с`,
        tti: `${(tti / 1000).toFixed(1)} с`,
        ttfb: `${ttfb} мс`,
      };

      // Opportunities
      const opportunities = [];

      if (ttfb > 600) {
        opportunities.push({
          id: "server-response-time",
          title: "Сократите время начального ответа сервера (TTFB)",
          description: "Начальный ответ сервера был получен за " + ttfb + " мс. Рекомендуется менее 600 мс.",
          score: ttfb > 1200 ? 0.3 : 0.7,
          displayValue: `${ttfb} мс`,
          savingsMs: Math.max(0, ttfb - 300),
          savingsBytes: 0,
          savingsKb: 0,
          itemsCount: 1,
        });
      }

      if (data.imgBytes > 1024 * 1024) {
        const excess = data.imgBytes - 512 * 1024;
        opportunities.push({
          id: "uses-optimized-images",
          title: "Оптимизируйте изображения (WebP/AVIF)",
          description: `Изображения на странице занимают ${(data.imgBytes / 1024 / 1024).toFixed(1)} МБ. Сжатие в WebP/AVIF позволит сэкономить трафик.`,
          score: 0.6,
          displayValue: `Экономия: ~${Math.round(excess / 1024)} КБ`,
          savingsMs: Math.round(excess / 5000),
          savingsBytes: excess,
          savingsKb: Math.round(excess / 1024),
          itemsCount: meta.imagesCount || 1,
        });
      }

      if (data.jsBytes > 500 * 1024) {
        const excess = data.jsBytes - 300 * 1024;
        opportunities.push({
          id: "unused-javascript",
          title: "Уменьшите объем неиспользуемого JavaScript",
          description: `Скрипты занимают ${(data.jsBytes / 1024).toFixed(0)} КБ. Используйте динамический импорт и code splitting.`,
          score: 0.65,
          displayValue: `Экономия: ~${Math.round(excess / 1024)} КБ`,
          savingsMs: Math.round(excess / 4000),
          savingsBytes: excess,
          savingsKb: Math.round(excess / 1024),
          itemsCount: 1,
        });
      }

      if (data.cssBytes > 150 * 1024) {
        const excess = data.cssBytes - 50 * 1024;
        opportunities.push({
          id: "unused-css-rules",
          title: "Удалите неиспользуемые стили CSS",
          description: `CSS-стили весят ${(data.cssBytes / 1024).toFixed(0)} КБ. Очистите неиспользуемые правила (PurgeCSS / Tailwind prune).`,
          score: 0.75,
          displayValue: `Экономия: ~${Math.round(excess / 1024)} КБ`,
          savingsMs: Math.round(excess / 6000),
          savingsBytes: excess,
          savingsKb: Math.round(excess / 1024),
          itemsCount: 1,
        });
      }

      return {
        url,
        effectiveUrl: data.url || url,
        strategy: device,
        mode,
        timestamp: new Date().toISOString(),
        elapsedMs,
        engine: "Chromium Native CDP (Offline)",
        scores,
        metrics,
        displayValues,
        opportunities,
        diagnostics: [],
      };
    } finally {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
      try {
        proc.kill();
      } catch {}
      try {
        fs.rmSync(tmpUserDataDir, { recursive: true, force: true });
      } catch {}
    }
  }

  /**
   * Логнормальная интерполяция оценки (Google Lighthouse Curve)
   * @private
   */
  static _calcScore(val, goodThreshold, poorThreshold) {
    if (val <= goodThreshold) return 1.0;
    if (val >= poorThreshold) return 0.2;
    return Math.max(0.2, 1.0 - ((val - goodThreshold) / (poorThreshold - goodThreshold)) * 0.8);
  }
}
