#!/usr/bin/env node
/**
 * CLI Утилита проверки серверного стриминга (SSR Stream Check)
 * Замеряет разницу между получением заголовков (responseStart) и завершением HTML (responseEnd).
 */

import { SsrProbe } from "../src/ssr-probe.mjs";

const url = process.argv[2] || process.env.PERF_BASE_URL || "https://workdo.ru";

console.log(`\n\x1b[1mЗапуск замера SSR-стриминга для:\x1b[0m \x1b[36m${url}\x1b[0m\n`);

async function run() {
  const res = await SsrProbe.probe(url);

  if (res.error) {
    console.error(`\x1b[31m[Ошибка]\x1b[0m ${res.error}`);
    process.exit(1);
  }

  console.log(`Статус HTTP:             ${res.statusCode}`);
  console.log(`Размер HTML:             ${Math.round(res.byteCount / 1024)} KB`);
  console.log(`TTFB (первый байт):      ${res.ttfbMs} ms`);
  console.log(`Длительность стриминга:  ${res.streamDurationMs} ms`);
  console.log(`Полное время ответа:     ${res.totalDurationMs} ms`);

  if (res.isSlow) {
    console.log(
      `\n\x1b[31m[ВНИМАНИЕ]\x1b[0m Длительность стриминга превышает 1500 ms! Возможно наличие последовательных waterfall-запросов к БД или API в SSR-рендеринге.`
    );
  } else {
    console.log(`\n\x1b[32m[ОК]\x1b[0m Серверный рендеринг быстрый (${res.streamDurationMs} ms стриминга).`);
  }
}

run();
