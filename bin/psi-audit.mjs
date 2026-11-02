#!/usr/bin/env node
/**
 * CLI Утилита аудита PageSpeed Insights API
 * Поддерживает холодные (cold) и горячие (hot) запуски, десктоп и мобайл, генерацию отчетов HTML и Markdown.
 */

import path from "node:path";
import fs from "node:fs";
import readline from "node:readline/promises";
import { PsiClient } from "../src/psi-client.mjs";
import { LocalRunner } from "../src/local-runner.mjs";
import { Reporter } from "../src/reporter.mjs";
import { HtmlReporter } from "../src/html-reporter.mjs";
import { generateRecommendations } from "../src/recommendations.mjs";
import { SitemapParser } from "../src/sitemap.mjs";

// Автоматическая загрузка настроек из .env
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1")), "..", ".env"),
  ];
  for (const envFile of candidates) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
      }
      break;
    }
  }
}
loadEnv();

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mPageSpeed Metrics Toolkit - CLI Аудитор Производительности\x1b[0m

Использование:
  node bin/psi-audit.mjs [ПАРАМЕТРЫ]

Параметры:
  --url <url>          URL сайта или страницы для тестирования (обязательно или интерактивно)
  --all, --crawl       Протестировать ВСЕ страницы сайта (автоматически через sitemap.xml)
  --sitemap <url>      Прямой адрес sitemap.xml для парсинга всех страниц
  --limit <число>      Лимит страниц при массовом парсинге карты сайта (по умолчанию: 30)
  --mode <режим>       Режим аудита: cold | hot | both (по умолчанию: both)
  --device <девайс>    Тип устройства: desktop | mobile | both (по умолчанию: desktop)
  --repeats <число>    Количество повторных горячих замеров для медианы (по умолчанию: 2)
  --key <apiKey>       Ключ Google PageSpeed API (опционально)
  --config <файл>      Путь к конфигурационному файлу JSON (например, config.json)
  --out <папка>        Папка для сохранения отчетов (по умолчанию: ./reports)
  --local              Использовать локальный Lighthouse CLI вместо облачного API
  --open               Автоматически открыть HTML-отчет в браузере после завершения
  --help, -h           Показать эту справку

Примеры:
  node bin/psi-audit.mjs --url https://mysite.ru
  node bin/psi-audit.mjs --url https://mysite.ru --all
  node bin/psi-audit.mjs --sitemap https://mysite.ru/sitemap.xml --limit 20
  node bin/psi-audit.mjs --config config.json
`);
}

/**
 * Нормализовать и проверить валидность URL
 */
function normalizeUrl(input) {
  if (!input || typeof input !== "string") return null;
  let s = input.trim();
  if (!s || s.startsWith("--")) return null;
  if (!/^https?:\/\//i.test(s)) {
    s = "https://" + s;
  }
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const defaultApiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
  const args = {
    urls: [],
    mode: "both",
    device: "desktop",
    repeats: 2,
    apiKey: defaultApiKey,
    configPath: null,
    outDir: "./reports",
    local: !defaultApiKey, // При наличии API-ключа сразу используем высокоскоростной Google API!
    open: false,
    all: false,
    sitemapUrl: null,
    limit: 30,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--url") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        const parsed = next.split(",").map(normalizeUrl).filter(Boolean);
        if (parsed.length > 0) args.urls = parsed;
      }
    } else if (arg === "--all" || arg === "--crawl") {
      args.all = true;
    } else if (arg === "--sitemap") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.sitemapUrl = normalizeUrl(next);
      }
      args.all = true;
    } else if (arg === "--limit") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.limit = Math.max(1, parseInt(next, 10) || 30);
      }
    } else if (arg === "--mode") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.mode = next;
      }
    } else if (arg === "--device") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.device = next;
      }
    } else if (arg === "--repeats") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.repeats = Math.max(1, parseInt(next, 10) || 1);
      }
    } else if (arg === "--key") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.apiKey = next;
        args.local = false; // при наличии ключа используем облачный API
      }
    } else if (arg === "--api" || arg === "--cloud") {
      args.local = false;
    } else if (arg === "--local") {
      args.local = true;
    } else if (arg === "--config") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.configPath = next;
      }
    } else if (arg === "--out") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        i++;
        args.outDir = next;
      }
    } else if (arg === "--open") {
      args.open = true;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Загрузка config.json при наличии
  let configTargets = [];
  if (args.configPath) {
    if (fs.existsSync(args.configPath)) {
      const cfg = JSON.parse(fs.readFileSync(args.configPath, "utf8"));
      if (cfg.apiKey && !args.apiKey) args.apiKey = cfg.apiKey;
      if (cfg.targets) {
        configTargets = cfg.targets
          .map((t) => (typeof t === "string" ? t : t.url))
          .map(normalizeUrl)
          .filter(Boolean);
      }
      if (cfg.outputDir && args.outDir === "./reports") args.outDir = cfg.outputDir;
    } else {
      console.error(`[Ошибка] Файл конфигурации не найден: ${args.configPath}`);
      process.exit(1);
    }
  }

  let targetUrls = [...args.urls, ...configTargets];

  // Интерактивный диалог, если URL не передан через аргументы
  if (targetUrls.length === 0 && !args.sitemapUrl) {
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log("\n========================================================");
      console.log("       PageSpeed Insights & Lighthouse Toolkit");
      console.log("========================================================\n");

      const inputUrl = await rl.question("1. Введите URL сайта или страницы (Enter = https://workdo.ru): ");
      const cleanUrl = normalizeUrl(inputUrl) || "https://workdo.ru";
      targetUrls.push(cleanUrl);

      console.log("\n2. Режим аудита:");
      console.log("   [1] Локальный Lighthouse (Рекомендуется: без 429 лимитов, как в Workdo)");
      console.log("   [2] Облачный Google PageSpeed Insights API");
      console.log("   [3] ВСЕ страницы сайта (автоматически через sitemap.xml)");
      const choice = await rl.question("Выберите режим [1, 2 или 3, по умолчанию 1]: ");

      if (choice.trim() === "2") {
        args.local = false;
      } else if (choice.trim() === "3") {
        args.all = true;
      } else {
        args.local = true; // По умолчанию локальный Lighthouse без лимитов
      }
      args.open = true; // Автоматически открыть отчет для интерактивного запуска
      rl.close();
    } else {
      targetUrls.push("https://workdo.ru");
    }
  }

  // Автоматический парсинг всех страниц через sitemap.xml
  if (args.all || args.sitemapUrl) {
    const sitemapTarget = args.sitemapUrl || targetUrls[0] || "https://workdo.ru";
    const discovered = await SitemapParser.extractUrls(sitemapTarget, args.limit);
    if (discovered.length > 0) {
      targetUrls = discovered.map(normalizeUrl).filter(Boolean);
    } else {
      console.warn(`[!] Страницы в sitemap не найдены. Аудит будет запущен для базового URL.`);
    }
  }

  // Финальная очистка и валидация
  targetUrls = targetUrls.map(normalizeUrl).filter(Boolean);

  if (targetUrls.length === 0) {
    console.error("\x1b[31m[Ошибка]\x1b[0m Не указан корректный URL для аудита.");
    process.exit(1);
  }

  const client = new PsiClient({ apiKey: args.apiKey });
  const allResults = [];
  const devices = args.device === "both" ? ["desktop", "mobile"] : [args.device];
  const modes = args.mode === "both" ? ["cold", "hot"] : [args.mode];

  const engineName = args.local ? "Локальный Lighthouse 13.5 (без лимитов и задержек)" : "Облачный Google PageSpeed API";
  console.log(`\n\x1b[1mЗапуск аудита производительности...\x1b[0m`);
  console.log(`Движок: \x1b[36m${engineName}\x1b[0m | Страниц: ${targetUrls.length} | Устройства: ${devices.join(", ")} | Режимы: ${modes.join(", ")}`);

  for (const url of targetUrls) {
    for (const dev of devices) {
      let coldResult = null;
      let hotResult = null;

      // Холодный запуск (Cold Run)
      if (modes.includes("cold")) {
        console.log(`\n\x1b[36m▶ Тестирование [COLD] ${url} (${dev})...\x1b[0m`);
        try {
          if (args.local) {
            coldResult = await LocalRunner.runAudit({ url, device: dev, mode: "cold" });
          } else {
            try {
              coldResult = await client.runAudit({ url, strategy: dev, mode: "cold", pass: 1 });
            } catch (apiErr) {
              if (apiErr.message?.includes("429") || apiErr.message?.includes("Лимит") || apiErr.message?.includes("Quota")) {
                console.log(`\x1b[33m[429 Quota]\x1b[0m Облачный Google API временно перегружен для вашего IP.`);
                console.log(`\x1b[32m▶ Автоматическое переключение на локальный Lighthouse 13.5 (без лимитов)...\x1b[0m`);
                coldResult = await LocalRunner.runAudit({ url, device: dev, mode: "cold" });
              } else {
                throw apiErr;
              }
            }
          }
          if (coldResult && coldResult.scores.performance !== null) {
            Reporter.printRunSummary(coldResult);
            allResults.push(coldResult);
          } else {
            console.warn(`\x1b[33m[Предупреждение COLD]\x1b[0m Не удалось получить валидный отчет для ${url}`);
          }
        } catch (err) {
          console.error(`\x1b[31m[Ошибка COLD]\x1b[0m ${err.message}`);
        }
      }

      // Горячий запуск (Hot Run)
      if (modes.includes("hot")) {
        console.log(`\n\x1b[36m▶ Тестирование [HOT] ${url} (${dev})...\x1b[0m`);
        try {
          if (args.local) {
            hotResult = await LocalRunner.runAudit({ url, device: dev, mode: "hot" });
          } else {
            try {
              hotResult = await client.runAudit({ url, strategy: dev, mode: "hot", pass: 1 });
            } catch (apiErr) {
              if (apiErr.message?.includes("429") || apiErr.message?.includes("Лимит") || apiErr.message?.includes("Quota")) {
                console.log(`\x1b[33m[429 Quota]\x1b[0m Облачный Google API временно перегружен для вашего IP.`);
                console.log(`\x1b[32m▶ Автоматическое переключение на локальный Lighthouse 13.5 (без лимитов)...\x1b[0m`);
                hotResult = await LocalRunner.runAudit({ url, device: dev, mode: "hot" });
              } else {
                throw apiErr;
              }
            }
          }
          if (hotResult && hotResult.scores.performance !== null) {
            Reporter.printRunSummary(hotResult);
            allResults.push(hotResult);
          } else {
            console.warn(`\x1b[33m[Предупреждение HOT]\x1b[0m Не удалось получить валидный отчет для ${url}`);
          }
        } catch (err) {
          console.error(`\x1b[31m[Ошибка HOT]\x1b[0m ${err.message}`);
        }
      }

      // Сравнение Cold vs Hot
      if (coldResult && hotResult) {
        Reporter.printColdHotComparison(coldResult, hotResult);
      }
    }
  }

  if (allResults.length === 0) {
    console.error("\x1b[31m[!] Не получено ни одного успешного замера. Проверьте доступность URL.\x1b[0m");
    process.exit(1);
  }

  // Генерация отчетов
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let safeHost = "site";
  try {
    safeHost = new URL(allResults[0].url).hostname.replace(/[^a-zA-Z0-9]/g, "_");
  } catch {}
  const baseFilename = `audit_${safeHost}_${timestamp}`;

  const mdPath = path.resolve(args.outDir, `${baseFilename}.md`);
  const htmlPath = path.resolve(args.outDir, `${baseFilename}.html`);
  const latestHtmlPath = path.resolve(args.outDir, `latest-report.html`);

  const coldRes = allResults.find((r) => r.mode === "cold");
  const hotRes = allResults.find((r) => r.mode === "hot");
  const diff = coldRes && hotRes ? { cold: coldRes.metrics, hot: hotRes.metrics } : null;

  const recommendations = generateRecommendations(allResults[0], diff);

  // Markdown
  Reporter.generateMarkdownReport({
    results: allResults,
    recommendations,
    outputPath: mdPath,
  });

  // HTML
  HtmlReporter.generateHtmlReport({
    results: allResults,
    recommendations,
    coldHotDiff: diff,
    outputPath: htmlPath,
  });

  // Копия последнего отчета в latest-report.html
  fs.copyFileSync(htmlPath, latestHtmlPath);

  console.log(`\n\x1b[32m✔ Аудит успешно завершен!\x1b[0m`);
  console.log(`  📄 Отчет Markdown:  ${mdPath}`);
  console.log(`  🌐 Отчет HTML:      ${htmlPath}`);
  console.log(`  🔗 Свежий отчет:    ${latestHtmlPath}`);

  if (args.open) {
    import("node:child_process").then(({ exec }) => {
      const cmd =
        process.platform === "win32"
          ? `start "" "${htmlPath}"`
          : process.platform === "darwin"
            ? `open "${htmlPath}"`
            : `xdg-open "${htmlPath}"`;
      exec(cmd);
    });
  }
}

main().catch((err) => {
  console.error("\x1b[31mКритическая ошибка:\x1b[0m", err);
  process.exit(1);
});
