# Быстрый старт за 1 минуту (PageSpeed Metrics Toolkit)

## 1. Запуск в 1 клик на любом ПК (Windows / macOS / Linux)

1. Скачайте или склонируйте проект:
   ```bash
   git clone https://github.com/ykr0p/PageSpeed_Insights_audit.git
   cd PageSpeed_Insights_audit
   ```
2. Запустите:
   - **На Windows:** дважды кликните по **`run.bat`** (софт сам проверит систему, найдет Chrome/Edge и откроет отчет).
   - **На macOS / Linux:** `./run.sh`
3. *(Опционально)* Для полной предварительной установки перед работой без интернета запустите **`setup.bat`** (или `./setup.sh`).

---

## 2. Запуск через командную строку (CLI)
```bash
node bin/psi-audit.mjs --url https://vash-sait.ru
```

### Сразу открыть красивый интерактивный отчет в браузере:
```bash
node bin/psi-audit.mjs --url https://vash-sait.ru --open
```

### Проверить только мобильную версию:
```bash
node bin/psi-audit.mjs --url https://vash-sait.ru --device mobile
```

### Проверить и мобильную, и десктопную версии:
```bash
node bin/psi-audit.mjs --url https://vash-sait.ru --device both
```

---

## 2. Проверка времени серверного ответа SSR (TTFB)

Если у вас сайт на Next.js, Nuxt или любом серверном фреймворке:

```bash
node bin/ssr-check.mjs https://vash-sait.ru
```

---

## 3. Открыть интерактивную презентацию кейса Workdo

Дважды кликните по файлу `PRESENTATION.html` или выполните команду:

```bash
start PRESENTATION.html
```

---

## 4. Где смотреть отчеты?

Все отчеты автоматически сохраняются в папку:
```text
F:\Download\TPO\metrics\reports\
```
- `latest-report.html` — последний сгенерированный визуальный дашборд.
- `audit_<сайт>_<дата>.html` — архивные детальные отчеты.
- `audit_<сайт>_<дата>.md` — отчет в формате Markdown для документации и баг-трекеров.
- `demo-workdo-report.html` — готовый пример эталонного отчета.
