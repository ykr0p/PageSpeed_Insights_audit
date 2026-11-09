/**
 * Модуль предварительной самодиагностики системы (Preflight Health Check)
 * Проверяет Node.js, браузер Chromium (Chrome / Edge), доступность серверов Google и хранилище отчетов.
 */

import fs from "node:fs";
import path from "node:path";
import { LocalRunner } from "./local-runner.mjs";

export class PreflightChecker {
  /**
   * Выполнить экспресс-диагностику готовности системы
   * @param {Object} [options]
   * @param {string} [options.apiKey]
   * @param {string} [options.outDir='./reports']
   * @returns {Promise<{ isReady: boolean, googleOnline: boolean, browserPath: string|null, browserName: string, warnings: string[] }>}
   */
  static async check(options = {}) {
    const warnings = [];
    const outDir = options.outDir || "./reports";

    // 1. Проверка версии Node.js
    const nodeVer = process.versions.node || "0.0.0";
    const majorVer = parseInt(nodeVer.split(".")[0], 10) || 0;
    const isNodeOk = majorVer >= 18;
    if (!isNodeOk) {
      warnings.push(`Устаревшая версия Node.js (${nodeVer}). Рекомендуется версия 18 или новее.`);
    }

    // 2. Проверка браузера Chromium
    const browserPath = LocalRunner.findBrowserPath();
    let browserName = "Chromium";
    if (browserPath) {
      const lower = browserPath.toLowerCase();
      if (lower.includes("msedge") || lower.includes("edge")) {
        browserName = "Microsoft Edge";
      } else if (lower.includes("chrome")) {
        browserName = "Google Chrome";
      } else if (lower.includes("brave")) {
        browserName = "Brave";
      } else if (lower.includes("chromium")) {
        browserName = "Chromium";
      }
    } else {
      warnings.push("Браузер на базе Chromium (Chrome/Edge) не найден по стандартным путям. Укажите CHROME_PATH.");
    }

    // 3. Быстрая проверка сетевой доступности серверов Google API (таймаут 1.5 секунды)
    let googleOnline = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch("https://www.googleapis.com", {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      googleOnline = res.ok || res.status < 500;
    } catch {
      googleOnline = false;
    }

    // 4. Проверка хранилища отчетов
    try {
      fs.mkdirSync(outDir, { recursive: true });
    } catch (err) {
      warnings.push(`Не удалось создать папку отчетов ${outDir}: ${err.message}`);
    }

    // 5. Проверка локального движка Lighthouse
    const hasLocalLighthouse = fs.existsSync(
      path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "lighthouse.cmd" : "lighthouse")
    );

    return {
      isReady: isNodeOk && Boolean(browserPath),
      nodeVer,
      isNodeOk,
      browserPath,
      browserName,
      googleOnline,
      hasLocalLighthouse,
      hasApiKey: Boolean(options.apiKey || process.env.GOOGLE_PAGESPEED_API_KEY),
      warnings,
    };
  }

  /**
   * Вывести понятную сводку диагностики в консоль
   * @param {Awaited<ReturnType<typeof PreflightChecker.check>>} diag
   */
  static printStatus(diag) {
    console.log("\x1b[1mСамодиагностика системы перед запуском:\x1b[0m");

    // Node.js
    if (diag.isNodeOk) {
      console.log(`  \x1b[32m[✓]\x1b[0m Node.js: \x1b[36mv${diag.nodeVer}\x1b[0m (OK)`);
    } else {
      console.log(`  \x1b[33m[!]\x1b[0m Node.js: \x1b[33mv${diag.nodeVer}\x1b[0m (рекомендуется v18+)`);
    }

    // Браузер
    if (diag.browserPath) {
      console.log(`  \x1b[32m[✓]\x1b[0m Браузер: \x1b[36m${diag.browserName}\x1b[0m (готов для локального Lighthouse)`);
    } else {
      console.log(`  \x1b[33m[!]\x1b[0m Браузер Chromium не найден по стандартным путям.`);
    }

    // Сеть и Google API
    if (diag.googleOnline) {
      if (diag.hasApiKey) {
        console.log(`  \x1b[32m[✓]\x1b[0m Сеть: \x1b[36mGoogle API доступен\x1b[0m (активен персональный ключ, 25 000 запр/день)`);
      } else {
        console.log(`  \x1b[32m[✓]\x1b[0m Сеть: \x1b[36mGoogle API доступен\x1b[0m (открытая квота Google)`);
      }
    } else {
      console.log(
        `  \x1b[33m[!]\x1b[0m Сеть: \x1b[33mСерверы Google API недоступны\x1b[0m (блокировка/прокси сети).`
      );
      console.log(
        `      \x1b[32m→ Режим по умолчанию: [1] Локальный Lighthouse (работает офлайн и без Google)\x1b[0m`
      );
    }

    console.log("--------------------------------------------------------");
  }
}
