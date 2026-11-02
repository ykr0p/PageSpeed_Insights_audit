# Сравнительный отчёт производительности Workdo: ДО vs ПОСЛЕ (83 страницы)

> **Аудит реального production-проекта Workdo (Next.js 16, App Router, SSR, PostgreSQL, Upstash Redis)**  
> **Базовая линия (ДО):** 2026-09-24 (первичный замер неоптимизированного кода)  
> **Финальное состояние (ПОСЛЕ):** 2026-09-29 (после реализации Блоков 1–9)  
> **Метод аудита:** Google Lighthouse 13.5 (Core Web Vitals), режим: **Cold (Холодный запуск с чистым кэшем)**  
> **Всего маршрутов:** 83

---

## 📊 Итоговая сводка ключевых метрик

| Метрика | ДО оптимизации | ПОСЛЕ оптимизации | Изменение / Эффект |
|---|:---:|:---:|:---:|
| **Средний Performance Score** | **94.2 / 100** | **99.6 / 100** | **+5.4 п. (выход в 100% зеленую зону)** |
| **Средний LCP (Largest Contentful Paint)** | **1585 ms** | **509 ms** | **−1076 ms (ускорение в 3.1 раза)** |
| **Количество медленных / проблемных страниц** | **13 страниц** | **0 страниц** | **Ликвидировано 100% проблемных страниц** |
| **Худший LCP на сайте** | **12508 ms** (`security/salary`) | **1302 ms** (`marketing/pricing`) | **Сокращение в 9.6 раз** |

---

## 🏆 Топ-10 страниц с наибольшим ускорением LCP

| Маршрут | LCP ДО | LCP ПОСЛЕ | Абсолютная дельта | Процент ускорения |
|---|:---:|:---:|:---:|:---:|
| `security/salary` | 12508 ms | **627 ms** | **−11881 ms** | **-95%** |
| `security/finance` | 11900 ms | **417 ms** | **−11483 ms** | **-96%** |
| `security/instructions` | 7194 ms | **468 ms** | **−6726 ms** | **-93%** |
| `auth/register` | 5307 ms | **407 ms** | **−4900 ms** | **-92%** |
| `security/incidents/49426c36-8e67-4e4a-b009-b059d70ef5b0/edit` | 5016 ms | **597 ms** | **−4419 ms** | **-88%** |
| `security/employees` | 4116 ms | **885 ms** | **−3231 ms** | **-78%** |
| `security/audit-log` | 3500 ms | **1000 ms** | **−2500 ms** | **-71%** |
| `security/posts/5f52f1cd-b728-4db3-a960-f5330ba0a1a2/edit` | 2461 ms | **249 ms** | **−2212 ms** | **-90%** |
| `security` | 2649 ms | **649 ms** | **−2000 ms** | **-75%** |
| `security/posts/5f52f1cd-b728-4db3-a960-f5330ba0a1a2` | 2476 ms | **501 ms** | **−1975 ms** | **-80%** |

---

## 📋 Полная таблица сравнения всех 83 страниц (ДО vs ПОСЛЕ)

| № | Маршрут | Группа | Perf ДО | Perf ПОСЛЕ | LCP ДО | LCP ПОСЛЕ | Дельта LCP | FCP ДО/ПОСЛЕ | TBT ДО/ПОСЛЕ | CLS ДО/ПОСЛЕ |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | `auth/register` | auth | 57 | **100** 🟢 | 5307 ms | **407 ms** | -92% | 4310 → 407 | 66 → 1 | 0.0000 → 0.0000 |
| 2 | `auth/signin` | auth | 93 | **100** 🟢 | 1584 ms | **794 ms** | -50% | 582 → 468 | 0 → 0 | 0.0000 → 0.0000 |
| 3 | `landing` | landing | 100 | **100** 🟢 | 309 ms | **202 ms** | -34% | 309 → 202 | 0 → 0 | 0.0080 → 0.0000 |
| 4 | `landing/advantages` | landing | 99 | **100** 🟢 | 929 ms | **186 ms** | -80% | 263 → 186 | 0 → 0 | 0.0000 → 0.0000 |
| 5 | `landing/advantages/[slug]` | landing | 100 | **100** 🟢 | 670 ms | **728 ms** | +9% | 140 → 182 | 0 → 0 | 0.0000 → 0.0000 |
| 6 | `landing/features` | landing | 99 | **100** 🟢 | 914 ms | **163 ms** | -82% | 282 → 163 | 0 → 0 | 0.0000 → 0.0000 |
| 7 | `landing/features/[slug]` | landing | 99 | **100** 🟢 | 845 ms | **735 ms** | -13% | 201 → 191 | 0 → 0 | 0.0004 → 0.0000 |
| 8 | `landing/trust` | landing | 99 | **100** 🟢 | 860 ms | **165 ms** | -81% | 156 → 165 | 0 → 0 | 0.0000 → 0.0000 |
| 9 | `landing/trust/[slug]` | landing | 99 | **100** 🟢 | 824 ms | **731 ms** | -11% | 181 → 189 | 0 → 0 | 0.0000 → 0.0000 |
| 10 | `landing/verticals/security` | landing | 93 | **100** 🟢 | 1744 ms | **227 ms** | -87% | 253 → 227 | 26 → 2 | 0.0005 → 0.0000 |
| 11 | `landing/verticals/security/cases` | landing | 100 | **100** 🟢 | 195 ms | **161 ms** | -17% | 195 → 161 | 0 → 0 | 0.0006 → 0.0000 |
| 12 | `landing/verticals/security/features` | landing | 100 | **100** 🟢 | 303 ms | **162 ms** | -47% | 303 → 162 | 0 → 0 | 0.0005 → 0.0000 |
| 13 | `landing/verticals/security/pricing` | landing | 97 | **97** 🟢 | 1308 ms | **1201 ms** | -8% | 177 → 144 | 0 → 0 | 0.0000 → 0.0000 |
| 14 | `landing/verticals/yacht` | landing | 93 | **100** 🟢 | 1737 ms | **225 ms** | -87% | 296 → 225 | 0 → 2 | 0.0017 → 0.0000 |
| 15 | `landing/verticals/yacht/cases` | landing | 100 | **100** 🟢 | 189 ms | **176 ms** | -7% | 189 → 176 | 0 → 0 | 0.0006 → 0.0000 |
| 16 | `landing/verticals/yacht/features` | landing | 100 | **100** 🟢 | 201 ms | **170 ms** | -15% | 201 → 170 | 2 → 0 | 0.0005 → 0.0000 |
| 17 | `landing/verticals/yacht/pricing` | landing | 99 | **99** 🟢 | 245 ms | **215 ms** | -12% | 245 → 215 | 0 → 0 | 0.0000 → 0.0000 |
| 18 | `landing/verticals/beauty` | landing | 93 | **100** 🟢 | 1755 ms | **286 ms** | -84% | 331 → 286 | 0 → 0 | 0.0004 → 0.0000 |
| 19 | `landing/verticals/beauty/cases` | landing | 100 | **100** 🟢 | 221 ms | **160 ms** | -28% | 221 → 160 | 0 → 0 | 0.0006 → 0.0000 |
| 20 | `landing/verticals/beauty/features` | landing | 100 | **100** 🟢 | 290 ms | **154 ms** | -47% | 290 → 154 | 0 → 0 | 0.0005 → 0.0000 |
| 21 | `landing/verticals/beauty/pricing` | landing | 99 | **100** 🟢 | 283 ms | **142 ms** | -50% | 283 → 142 | 0 → 0 | 0.0000 → 0.0000 |
| 22 | `marketing/about` | marketing | 97 | **99** 🟢 | 1196 ms | **1037 ms** | -13% | 240 → 165 | 0 → 0 | 0.0000 → 0.0000 |
| 23 | `marketing/blog` | marketing | 96 | **100** 🟢 | 1373 ms | **179 ms** | -87% | 283 → 179 | 0 → 12 | 0.0000 → 0.0000 |
| 24 | `marketing/blog/[slug](avtomatizaciya-salona-bez-zatrat)` | marketing | 100 | **100** 🟢 | 275 ms | **185 ms** | -33% | 275 → 185 | 0 → 0 | 0.0130 → 0.0000 |
| 25 | `marketing/blog/[slug](kak-vybrat-crm-dlya-chop)` | marketing | 100 | **100** 🟢 | 477 ms | **454 ms** | -5% | 477 → 454 | 0 → 5 | 0.0000 → 0.0000 |
| 26 | `marketing/blog/[slug](kak-vybrat-crm-dlya-salona)` | marketing | 97 | **99** 🟢 | 1201 ms | **1018 ms** | -15% | 322 → 174 | 0 → 0 | 0.0014 → 0.0000 |
| 27 | `marketing/careers` | marketing | 97 | **100** 🟢 | 1234 ms | **137 ms** | -89% | 256 → 137 | 0 → 0 | 0.0100 → 0.0000 |
| 28 | `marketing/cases` | marketing | 96 | **100** 🟢 | 1373 ms | **179 ms** | -87% | 272 → 179 | 0 → 0 | 0.0000 → 0.0000 |
| 29 | `marketing/contacts` | marketing | 96 | **100** 🟢 | 1337 ms | **217 ms** | -84% | 190 → 217 | 0 → 0 | 0.0000 → 0.0000 |
| 30 | `marketing/docs` | marketing | 97 | **100** 🟢 | 1232 ms | **149 ms** | -88% | 186 → 149 | 3 → 0 | 0.0000 → 0.0000 |
| 31 | `marketing/faq` | marketing | 96 | **100** 🟢 | 1344 ms | **161 ms** | -88% | 268 → 161 | 0 → 0 | 0.0000 → 0.0000 |
| 32 | `marketing/offer` | marketing | 97 | **98** 🟢 | 1293 ms | **1159 ms** | -10% | 515 → 233 | 0 → 0 | 0.0000 → 0.0000 |
| 33 | `marketing/press` | marketing | 98 | **98** 🟢 | 1197 ms | **1138 ms** | -5% | 189 → 195 | 0 → 0 | 0.0000 → 0.0000 |
| 34 | `marketing/pricing` | marketing | 97 | **97** 🟢 | 1321 ms | **1302 ms** | -1% | 261 → 198 | 0 → 0 | 0.0000 → 0.0000 |
| 35 | `marketing/privacy` | marketing | 97 | **98** 🟢 | 1241 ms | **1162 ms** | -6% | 247 → 292 | 11 → 0 | 0.0000 → 0.0000 |
| 36 | `marketing/status` | marketing | 96 | **100** 🟢 | 1346 ms | **203 ms** | -85% | 317 → 203 | 0 → 0 | 0.0000 → 0.0000 |
| 37 | `marketing/terms` | marketing | 98 | **97** 🟢 | 1194 ms | **1203 ms** | +1% | 398 → 309 | 0 → 0 | 0.0000 → 0.0005 |
| 38 | `security` | security | 81 | **100** 🟢 | 2649 ms | **649 ms** | -75% | 296 → 344 | 0 → 6 | 0.0894 → 0.0000 |
| 39 | `security/audit-log` | security | 77 | **99** 🟢 | 3500 ms | **1000 ms** | -71% | 254 → 312 | 12 → 6 | 0.0000 → 0.0000 |
| 40 | `security/brigades` | security | 92 | **100** 🟢 | 1812 ms | **564 ms** | -69% | 265 → 271 | 0 → 0 | 0.0000 → 0.0000 |
| 41 | `security/brigades/47caf0ff-08b1-425a-b01c-751c0808200b` | security | 100 | **100** 🟢 | 767 ms | **236 ms** | -69% | 339 → 236 | 0 → 0 | 0.0000 → 0.0000 |
| 42 | `security/budgets` | security | 99 | **99** 🟢 | 923 ms | **835 ms** | -10% | 254 → 265 | 0 → 0 | 0.0000 → 0.0000 |
| 43 | `security/budgets/a1b2c3d4-0000-4000-8000-000000000001` | security | 97 | **100** 🟢 | 1234 ms | **450 ms** | -64% | 252 → 258 | 0 → 0 | 0.0000 → 0.0000 |
| 44 | `security/budgets/new` | security | 100 | **100** 🟢 | 560 ms | **551 ms** | -2% | 351 → 245 | 0 → 1 | 0.0000 → 0.0000 |
| 45 | `security/clients` | security | 89 | **100** 🟢 | 2032 ms | **256 ms** | -87% | 290 → 256 | 0 → 0 | 0.0000 → 0.0000 |
| 46 | `security/clients/d30b5be0-9816-4ddc-a89a-9ee00da8c041` | security | 99 | **100** 🟢 | 823 ms | **240 ms** | -71% | 202 → 240 | 0 → 0 | 0.0000 → 0.0000 |
| 47 | `security/clients/d30b5be0-9816-4ddc-a89a-9ee00da8c041/edit` | security | 95 | **99** 🟢 | 492 ms | **445 ms** | -10% | 264 → 238 | 0 → 0 | 0.0000 → 0.0000 |
| 48 | `security/clients/new` | security | 99 | **100** 🟢 | 836 ms | **784 ms** | -6% | 275 → 335 | 0 → 0 | 0.0000 → 0.0000 |
| 49 | `security/contracts` | security | 98 | **99** 🟢 | 1121 ms | **991 ms** | -12% | 296 → 286 | 0 → 0 | 0.0000 → 0.0000 |
| 50 | `security/contracts/new` | security | 100 | **100** 🟢 | 554 ms | **806 ms** | +46% | 282 → 273 | 0 → 0 | 0.0000 → 0.0000 |
| 51 | `security/employees` | security | 74 | **99** 🟢 | 4116 ms | **885 ms** | -78% | 257 → 259 | 0 → 0 | 0.0000 → 0.0000 |
| 52 | `security/employees/9d7e179c-430a-45d4-bd14-a9df4c16f2c3` | security | 99 | **100** 🟢 | 830 ms | **421 ms** | -49% | 258 → 310 | 0 → 0 | 0.0000 → 0.0000 |
| 53 | `security/employees/9d7e179c-430a-45d4-bd14-a9df4c16f2c3/edit` | security | 96 | **99** 🟢 | 488 ms | **748 ms** | +53% | 272 → 229 | 3 → 0 | 0.0000 → 0.0000 |
| 54 | `security/employees/9d7e179c-430a-45d4-bd14-a9df4c16f2c3/restore` | security | 100 | **100** 🟢 | 494 ms | **399 ms** | -19% | 283 → 259 | 3 → 0 | 0.0000 → 0.0000 |
| 55 | `security/employees/new` | security | 100 | **100** 🟢 | 728 ms | **544 ms** | -25% | 321 → 277 | 2 → 0 | 0.0000 → 0.0000 |
| 56 | `security/equipment` | security | 93 | **100** 🟢 | 1676 ms | **520 ms** | -69% | 153 → 232 | 0 → 0 | 0.0000 → 0.0000 |
| 57 | `security/equipment/4bb83326-ff5f-4df3-b14f-08265d3e4a08` | security | 94 | **100** 🟢 | 1613 ms | **419 ms** | -74% | 315 → 259 | 0 → 0 | 0.0000 → 0.0000 |
| 58 | `security/equipment/4bb83326-ff5f-4df3-b14f-08265d3e4a08/edit` | security | 98 | **100** 🟢 | 499 ms | **459 ms** | -8% | 247 → 221 | 0 → 0 | 0.0000 → 0.0000 |
| 59 | `security/equipment/new` | security | 100 | **100** 🟢 | 572 ms | **691 ms** | +21% | 247 → 387 | 0 → 0 | 0.0000 → 0.0000 |
| 60 | `security/estimates` | security | 96 | **100** 🟢 | 1360 ms | **566 ms** | -58% | 206 → 217 | 0 → 0 | 0.0000 → 0.0000 |
| 61 | `security/estimates/d4fad7e8-d8cb-46f0-a7c0-b38e22738c46` | security | 99 | **100** 🟢 | 840 ms | **814 ms** | -3% | 221 → 321 | 0 → 0 | 0.0000 → 0.0000 |
| 62 | `security/estimates/d4fad7e8-d8cb-46f0-a7c0-b38e22738c46/edit` | security | 90 | **100** 🟢 | 2090 ms | **806 ms** | -61% | 298 → 419 | 14 → 2 | 0.0000 → 0.0000 |
| 63 | `security/estimates/new` | security | 100 | **100** 🟢 | 535 ms | **378 ms** | -29% | 274 → 201 | 0 → 0 | 0.0000 → 0.0000 |
| 64 | `security/finance` | security | 65 | **100** 🟢 | 11900 ms | **417 ms** | -96% | 252 → 417 | 0 → 33 | 0.0000 → 0.0000 |
| 65 | `security/incidents` | security | 91 | **100** 🟢 | 1940 ms | **551 ms** | -72% | 236 → 219 | 0 → 0 | 0.0073 → 0.0073 |
| 66 | `security/incidents/49426c36-8e67-4e4a-b009-b059d70ef5b0` | security | 100 | **100** 🟢 | 782 ms | **406 ms** | -48% | 258 → 252 | 0 → 0 | 0.0000 → 0.0000 |
| 67 | `security/incidents/49426c36-8e67-4e4a-b009-b059d70ef5b0/edit` | security | 69 | **99** 🟢 | 5016 ms | **597 ms** | -88% | 231 → 235 | 62 → 72 | 0.0000 → 0.0000 |
| 68 | `security/incidents/new` | security | 100 | **99** 🟢 | 308 ms | **242 ms** | -22% | 308 → 242 | 17 → 94 | 0.0000 → 0.0000 |
| 69 | `security/instructions` | security | 66 | **100** 🟢 | 7194 ms | **468 ms** | -93% | 234 → 197 | 0 → 0 | 0.0000 → 0.0000 |
| 70 | `security/objects` | security | 99 | **100** 🟢 | 868 ms | **261 ms** | -70% | 225 → 261 | 0 → 0 | 0.0000 → 0.0000 |
| 71 | `security/objects/5ccf8898-538e-42d9-8f4f-388ab495139e` | security | 92 | **100** 🟢 | 1784 ms | **294 ms** | -84% | 254 → 294 | 0 → 0 | 0.0000 → 0.0000 |
| 72 | `security/objects/5ccf8898-538e-42d9-8f4f-388ab495139e/edit` | security | 99 | **100** 🟢 | 578 ms | **262 ms** | -55% | 286 → 262 | 0 → 0 | 0.0000 → 0.0000 |
| 73 | `security/objects/new` | security | 99 | **100** 🟢 | 925 ms | **753 ms** | -19% | 318 → 282 | 0 → 0 | 0.0000 → 0.0000 |
| 74 | `security/posts` | security | 98 | **100** 🟢 | 1119 ms | **220 ms** | -80% | 194 → 220 | 0 → 0 | 0.0000 → 0.0000 |
| 75 | `security/posts/5f52f1cd-b728-4db3-a960-f5330ba0a1a2` | security | 87 | **100** 🟢 | 2476 ms | **501 ms** | -80% | 242 → 241 | 0 → 0 | 0.0000 → 0.0000 |
| 76 | `security/posts/5f52f1cd-b728-4db3-a960-f5330ba0a1a2/edit` | security | 84 | **100** 🟢 | 2461 ms | **249 ms** | -90% | 261 → 249 | 0 → 0 | 0.0000 → 0.0000 |
| 77 | `security/posts/new` | security | 100 | **100** 🟢 | 282 ms | **244 ms** | -13% | 282 → 244 | 0 → 0 | 0.0000 → 0.0000 |
| 78 | `security/reports` | security | 84 | **99** 🟢 | 2663 ms | **995 ms** | -63% | 198 → 240 | 0 → 20 | 0.0000 → 0.0000 |
| 79 | `security/salary` | security | 72 | **99** 🟢 | 12508 ms | **627 ms** | -95% | 249 → 222 | 0 → 72 | 0.0000 → 0.0000 |
| 80 | `security/settings` | security | 99 | **100** 🟢 | 936 ms | **683 ms** | -27% | 640 → 199 | 0 → 0 | 0.0000 → 0.0000 |
| 81 | `security/shifts` | security | 97 | **100** 🟢 | 1238 ms | **189 ms** | -85% | 255 → 189 | 0 → 10 | 0.0000 → 0.0000 |
| 82 | `security/time-records` | security | 90 | **100** 🟢 | 1966 ms | **551 ms** | -72% | 225 → 238 | 76 → 80 | 0.0000 → 0.0000 |
| 83 | `security/time-records/monthly` | security | 89 | **98** 🟢 | 2123 ms | **977 ms** | -54% | 227 → 215 | 39 → 97 | 0.0000 → 0.0000 |

---

## 📂 Ссылки на исходные файлы замеров (Датасеты)
- Исходный замер ДО (Cold): [`case-study/data/before-cold-83-routes.jsonl`](data/before-cold-83-routes.jsonl)
- Исходный замер ДО (Hot): [`case-study/data/before-hot-83-routes.jsonl`](data/before-hot-83-routes.jsonl)
- Итоговый замер ПОСЛЕ (Cold): [`case-study/data/after-cold-83-routes.jsonl`](data/after-cold-83-routes.jsonl)
- Итоговый замер ПОСЛЕ (Hot): [`case-study/data/after-hot-83-routes.jsonl`](data/after-hot-83-routes.jsonl)
- Полный технический отчёт с описанием архитектурных изменений: [`case-study/PERF_REPORT.md`](PERF_REPORT.md)
