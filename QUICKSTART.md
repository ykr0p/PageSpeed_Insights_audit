# Быстрый старт за 2 минуты (PageSpeed Metrics Toolkit)

## 1. Запуск без установки (чистый Node.js)

Откройте командную строку (cmd или PowerShell) и перейдите в папку:

```bash
cd F:\Download\TPO\metrics
```

### Запустить аудит своего сайта:
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
