# ⚡ PageSpeed Insights & Core Web Vitals Audit Toolkit

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google Lighthouse](https://img.shields.io/badge/Lighthouse-13.5-orange.svg)](https://developers.google.com/speed/pagespeed/insights/)
[![Core Web Vitals](https://img.shields.io/badge/Core%20Web%20Vitals-100%25%20Green-success.svg)](https://web.dev/vitals/)

Универсальный автономный софт для комплексного аудита производительности и **Core Web Vitals** любых веб-сайтов и страниц. Поддерживает запуск на **любом ПК** (Windows, macOS, Linux) без сложной настройки.

Работает в двух взаимодополняющих режимах:
1. **Облачный Google PageSpeed Insights API (v5):** мощный аудит на серверах Google, 0% нагрузки на процессор, получение полевых пользовательских данных (CrUX).
2. **Локальный движок Lighthouse (Playwright/CDP):** аудит локальных сайтов (`localhost:3000`), dev-серверов и страниц за авторизацией без ограничений по квотам.

Включает глубокий сравнительный анализ **Cold (холодный запуск)** и **Hot (горячий запуск)**, автоматический краулер карты сайта (`sitemap.xml`), интерактивные HTML-отчеты с графиками, Markdown-сводки, экспертную систему рекомендаций с примерами кода и интерактивную презентацию на базе кейса Workdo SaaS (83 страницы, 100/100).

---

## 🚀 Запуск на любом компьютере

### Требования
* **[Node.js](https://nodejs.org)** версии **18 или новее** (LTS).
* Для облачного аудита **не требуется `npm install`** — весь базовый код написан на нативном JavaScript (ESM) со встроенным `fetch`.

---

### 1. Клонирование репозитория

```bash
git clone https://github.com/ykr0p/PageSpeed_Insights_audit.git
cd PageSpeed_Insights_audit
```

---

### 2. Запуск в один клик

#### На Windows:
Просто запустите двойным кликом файл **`run.bat`**:
1. Откроется интерактивное окно ввода адреса сайта.
2. Введите URL (например, `https://mysite.ru`) и выберите режим: одну страницу или весь сайт.
3. Готовый интерактивный HTML-отчет **автоматически откроется в вашем браузере**.

#### На macOS / Linux:
```bash
chmod +x run.sh
./run.sh
```

---

### 3. Запуск через командную строку (CLI)

```bash
# 1. Быстрый аудит одной страницы (Cold + Hot, Desktop):
node bin/psi-audit.mjs --url https://vash-sait.ru --open

# 2. Мобильный аудит:
node bin/psi-audit.mjs --url https://vash-sait.ru --device mobile --open

# 3. Полный аудит: оба устройства (Desktop + Mobile) и оба режима (Cold + Hot):
node bin/psi-audit.mjs --url https://vash-sait.ru --device both --mode both --open

# 4. Аудит ВСЕХ страниц сайта автоматически через sitemap.xml:
node bin/psi-audit.mjs --url https://vash-sait.ru --all --open

# 5. Аудит с ограничением количества страниц:
node bin/psi-audit.mjs --url https://vash-sait.ru --all --limit 20 --open

# 6. Пакетный аудит страниц из config.json:
node bin/psi-audit.mjs --config config.json --open

# 7. Замер времени серверного SSR-стриминга (TTFB / HTML finish):
node bin/ssr-check.mjs https://vash-sait.ru
```

---

## 🔑 Настройка API-ключа Google (Опционально)

Утилита может работать без ключа, однако для постоянного использования без ограничений рекомендуется добавить бесплатный персональный ключ Google (выделяется **25 000 запросов в день**):

1. Получите бесплатный ключ в 1 клик (без привязки карты): [Google PageSpeed API: Get Started](https://developers.google.com/speed/docs/insights/v5/get-started).
2. Создайте файл `.env` в корне проекта (на основе `.env.example`):
   ```env
   GOOGLE_PAGESPEED_API_KEY=AIzaSy...ваш_ключ...
   ```
   *(Файл `.env` добавлен в `.gitignore` и никогда не утечет в git).*
3. Либо укажите ключ прямо в [`config.json`](config.json) в поле `"apiKey"`.

---

## ❄️ Cold vs 🔥 Hot: В чем разница?

Замерять скорость сайта только один раз — грубая ошибка:
* **Cold (Холодный запуск):** симулирует **первый визит** нового пользователя с пустым кэшем браузера. Все стили, шрифты WOFF2, JS-бандлы и изображения скачиваются по сети с нуля. В облачном API применяется cache-buster, в локальном — `Network.clearBrowserCache`.
* **Hot (Горячий запуск):** симулирует **повторный переход**. Статические файлы берутся из локального дискового/оперативного кэша браузера (304 Not Modified), TCP-соединение прогрето. Показывает чистую скорость серверных вычислений и гидратации React/Vue.

---

## 📊 Результаты и Отчеты

После каждого замера в папке `reports/` автоматически формируются:
1. **Цветная консольная сводка** с индикацией зеленых/желтых/красных зон Core Web Vitals.
2. **Таблица сравнения Cold vs Hot** с расчетом точной дельты (разницы в миллисекундах и процентах).
3. **Интерактивный дашборд HTML (`reports/latest-report.html`)**:
   * Круговые шкалы оценок: Performance, Accessibility, Best Practices, SEO.
   * Карточки Core Web Vitals (LCP, CLS, TBT, FCP, TTFB, Speed Index).
   * Топ возможностей экономии ресурсов (**Opportunities**) с расчетом выигрыша в миллисекундах и килобайтах.
   * **Экспертные рекомендации** по устранению узких мест с примерами кода (ПЛОХО / ХОРОШО).
4. **Markdown-отчет (`reports/audit_...md`)** для вставки в задачи Jira, Linear или проектную wiki.

> Посмотреть готовый образец отчета можно в файле: [`reports/demo-workdo-report.html`](reports/demo-workdo-report.html).

---

## 🖥️ Локальный аудит (localhost / Dev / Staging)

Для тестирования локальных проектов (`http://localhost:3000`) или страниц за закрытой корпоративной сетью:

```bash
# 1. Установите зависимости браузера (однократно):
npm install -D playwright playwright-lighthouse
npx playwright install chromium

# 2. Запустите аудит локального сайта:
node bin/psi-audit.mjs --url http://localhost:3000 --local --open
```

---

## 🎓 Презентация и Кейс Workdo SaaS (83 страницы)

В репозиторий включены уникальные обучающие материалы по оптимизации реальной крупной multi-tenant платформы:

* **[`PRESENTATION.html`](PRESENTATION.html)** — интерактивная полноэкранная веб-презентация из 14 слайдов с графиками, архитектурными схемами и кодом. Открывается двойным кликом в любом браузере (управление стрелками `←` `→`, клавиша `F` для полноэкранного режима).
* **[`WORKDO_CASE_STUDY.md`](WORKDO_CASE_STUDY.md)** — развернутый технический отчет:
  * Как проект был выведен из красной зоны (18 медленных страниц, LCP до 16.8 с) в **100% зеленую зону** со средним Performance **100** и LCP **413 ms**.
  * Разбор реальных серверных и клиентских капканов: сетевой водопад Upstash Redis в SSR, N+1 в расчете зарплат, каскадные таймеры Framer Motion, `opacity: 0` на заголовках первого экрана, сдвиги верстки шрифтов (CLS 0.21).
  * 9 этапов внедрения архитектурных решений (Split Rate Limiter, SARGable SQL, Pure SSG, dynamic imports).

---

## ⚙️ Параметры командной строки

| Параметр | Описание | Значение по умолчанию |
|---|---|:---:|
| `--url <url>` | URL страницы (или несколько через запятую) | Интерактивный запрос |
| `--all`, `--crawl` | Протестировать ВСЕ страницы сайта через `sitemap.xml` | `false` |
| `--sitemap <url>` | Прямой адрес sitemap.xml для парсинга | `null` |
| `--limit <число>` | Лимит страниц при массовом парсинге sitemap | `30` |
| `--mode <режим>` | Режим аудита: `cold`, `hot` или `both` | `both` |
| `--device <девайс>`| Тип устройства: `desktop`, `mobile` или `both` | `desktop` |
| `--repeats <число>`| Количество повторных горячих замеров | `2` |
| `--key <apiKey>` | Ключ Google PageSpeed API | Из `.env` / `config.json` |
| `--config <файл>` | Путь к JSON-файлу с конфигурацией | `config.json` |
| `--out <папка>` | Папка для сохранения отчетов | `./reports` |
| `--local` | Использовать локальный Lighthouse вместо облака | Автоматически |
| `--open` | Автоматически открыть отчет в браузере | `false` |

---

## 📄 Лицензия

MIT License &bull; Свободно для коммерческого и частного использования.
