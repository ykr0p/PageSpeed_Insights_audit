/**
 * Экспертная система рекомендаций по оптимизации Core Web Vitals и производительности
 * Содержит практические паттерны и рецепты, включая опыт оптимизации Workdo SaaS.
 */

export const CWV_THRESHOLDS = {
  performance: { good: 90, needsImprovement: 50 },
  lcp: { good: 2500, needsImprovement: 4000 }, // ms
  cls: { good: 0.1, needsImprovement: 0.25 },  // unitless
  tbt: { good: 200, needsImprovement: 600 },   // ms
  fcp: { good: 1800, needsImprovement: 3000 }, // ms
  ttfb: { good: 800, needsImprovement: 1800 },  // ms
};

/**
 * Оценить уровень метрики
 * @param {string} metric
 * @param {number} value
 * @returns {'good'|'needs-improvement'|'poor'}
 */
export function getMetricStatus(metric, value) {
  if (value == null || Number.isNaN(value)) return "good";
  const t = CWV_THRESHOLDS[metric];
  if (!t) return "good";

  if (metric === "performance") {
    if (value >= t.good) return "good";
    if (value >= t.needsImprovement) return "needs-improvement";
    return "poor";
  }

  // Для временных метрик (LCP, TBT, FCP, TTFB, CLS) меньше — значит лучше
  if (value <= t.good) return "good";
  if (value <= t.needsImprovement) return "needs-improvement";
  return "poor";
}

/**
 * Сформировать развернутый комплекс рекомендаций на основе результатов аудита
 * @param {Object} auditResult Результат аудита (от PsiClient)
 * @param {Object} [coldHotComparison] Сравнение холодного и горячего прогонов
 * @returns {Array<{category: string, title: string, priority: 'critical'|'high'|'medium'|'low', problem: string, solution: string, codeSample?: string}>}
 */
export function generateRecommendations(auditResult, coldHotComparison = null) {
  const recs = [];
  const { metrics, opportunities = [], scores } = auditResult;

  // 1. Анализ Largest Contentful Paint (LCP)
  if (metrics.lcp != null && metrics.lcp > CWV_THRESHOLDS.lcp.good) {
    const isCritical = metrics.lcp > CWV_THRESHOLDS.lcp.needsImprovement;
    
    // Подкатегория 1.1: Медленный TTFB затягивает LCP
    if (metrics.ttfb != null && metrics.ttfb > CWV_THRESHOLDS.ttfb.good) {
      recs.push({
        category: "LCP / Серверная задержка (TTFB)",
        priority: isCritical ? "critical" : "high",
        title: "Оптимизировать начальный ответ сервера (Time to First Byte)",
        problem: `TTFB составляет ${Math.round(metrics.ttfb)} ms (при пороге 800 ms), что задерживает старт отрисовки LCP на ${Math.round(metrics.lcp)} ms.`,
        solution: "Устраните последовательные запросы к базе данных в SSR/RSC (используйте Promise.allSettled), вынесите проверки rate-limiter во внешние сервисы за пределы SSR-чтений, используйте кэширование на уровне edge/CDN или переведите статические страницы на SSG (Static Site Generation).",
        codeSample: `// ПЛОХО: последовательный водопад в SSR
const user = await getUser();
const stats = await getStats();
const items = await getItems();

// ХОРОШО: параллельный SSR рендеринг
const [userRes, statsRes, itemsRes] = await Promise.allSettled([
  getUser(),
  getStats(),
  getItems()
]);`,
      });
    }

    // Подкатегория 1.2: Скрытые или анимированные заголовки первого экрана
    recs.push({
      category: "LCP / Клиентская отрисовка",
      priority: isCritical ? "critical" : "high",
      title: "Убрать начальную прозрачность (opacity: 0) у LCP-элементов выше сгиба",
      problem: `LCP составляет ${Math.round(metrics.lcp)} ms. Часто текст h1 или баннер первого экрана инициализируются с opacity: 0 в библиотеках анимации (Framer Motion, AOS) и ждут гидратации JS.`,
      solution: "Для элементов Hero-секции и шапки страниц первого экрана удалите initial={{ opacity: 0 }} и искусственные задержки (delay). Текст заголовка должен рендериться мгновенно в исходном HTML.",
      codeSample: `// ПЛОХО: Framer Motion откладывает LCP до окончания гидратации
<motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
  Заголовок
</motion.h1>

// ХОРОШО: Нативный мгновенный рендер или CSS-анимация с GPU
<h1 className="text-3xl font-bold">
  Заголовок
</h1>`,
    });
  }

  // 2. Анализ Cumulative Layout Shift (CLS)
  if (metrics.cls != null && metrics.cls > CWV_THRESHOLDS.cls.good) {
    const isCritical = metrics.cls > CWV_THRESHOLDS.cls.needsImprovement;
    recs.push({
      category: "CLS / Стабильность разметки",
      priority: isCritical ? "critical" : "high",
      title: "Зафиксировать геометрические размеры блоков и настроить метрики шрифтов",
      problem: `CLS равен ${metrics.cls.toFixed(4)} (норма <= 0.1). Элементы страницы смещаются в процессе загрузки контента или переключения шрифтов.`,
      solution: "1. Задавайте точные width/height или aspect-ratio всем изображениям, видео и iframe.\n2. Для асинхронно подгружаемых блоков (сметы, графики, баннеры) резервируйте минимальную высоту (min-h-[...] или skeleton).\n3. В шрифтах укажите font-display: swap и добавьте кириллический набор символов (subsets: ['latin', 'cyrillic']), чтобы предотвратить сдвиг текста при fallback.",
      codeSample: `// ХОРОШО: Резервирование высоты под динамический блок
<div className="min-h-[140px] rounded-lg border p-4">
  {loading ? <Skeleton className="h-full w-full" /> : <DynamicSummary data={data} />}
</div>`,
    });
  }

  // 3. Анализ Total Blocking Time (TBT)
  if (metrics.tbt != null && metrics.tbt > CWV_THRESHOLDS.tbt.good) {
    const isCritical = metrics.tbt > CWV_THRESHOLDS.tbt.needsImprovement;
    recs.push({
      category: "TBT / Нагрузка на главный поток JS",
      priority: isCritical ? "critical" : "high",
      title: "Разгрузить главный поток браузера и устранить каскадные таймеры",
      problem: `TBT равен ${Math.round(metrics.tbt)} ms (норма <= 200 ms). Главный поток процессора заблокирован тяжелым JavaScript во время загрузки.`,
      solution: "1. Уберите каскадные JS-таймеры анимаций по спискам (delay: index * 0.05 для сотен строк таблицы создает сотни одновременных таймеров).\n2. Вынесите тяжелые клиентские библиотеки (Recharts, модальные окна, редакторы) в динамические импорты (next/dynamic или React.lazy) с ssr: false.\n3. Перенесите бесконечные фоновые анимации с JS-потока на нативный CSS GPU Compositor (transform, opacity).",
      codeSample: `// ХОРОШО: Динамический импорт тяжелого графика без блокировки начального рендера
const AnalyticsChart = dynamic(() => import('@/components/AnalyticsChart'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />
});`,
    });
  }

  // 4. Анализ возможностей (Opportunities) от Google Lighthouse
  for (const opp of opportunities) {
    if (opp.id === "render-blocking-resources" && opp.savingsMs > 100) {
      recs.push({
        category: "Ресурсы / Блокировка рендеринга",
        priority: "high",
        title: "Устранить ресурсы, блокирующие первый рендер",
        problem: `Блокирующие CSS и JS скрипты задерживают отрисовку на ~${opp.savingsMs} ms.`,
        solution: "Подключайте сторонние скрипты с атрибутами defer или async. Не используйте @import url(...) внутри файлов CSS — объединяйте их в бандлы или загружайте параллельно.",
      });
    }

    if (opp.id === "unused-javascript" && opp.savingsKb > 50) {
      recs.push({
        category: "JavaScript / Размер бандла",
        priority: "medium",
        title: "Сократить неиспользуемый JavaScript код (Tree-shaking / Code Splitting)",
        problem: `Обнаружено ~${opp.savingsKb} KB неиспользуемого JavaScript кода.`,
        solution: "Настройте разделение кода по маршрутам (Route-based splitting), импортируйте точечные функции из библиотек (например, lodash/get вместо lodash), оптимизируйте импорт иконок.",
      });
    }

    if (opp.id === "modern-image-formats" && opp.savingsKb > 50) {
      recs.push({
        category: "Медиа / Форматы изображений",
        priority: "medium",
        title: "Использовать современные форматы изображений (WebP / AVIF)",
        problem: `Конвертация изображений позволит сэкономить ~${opp.savingsKb} KB сетевого трафика.`,
        solution: "Используйте компонент <Image> фреймворка или конвертируйте PNG/JPEG в форматы AVIF и WebP через Sharp / ImageMagick.",
      });
    }
  }

  // 5. Анализ Cold vs Hot различий
  if (coldHotComparison) {
    const { cold, hot } = coldHotComparison;
    if (cold && hot && cold.lcp && hot.lcp) {
      const diffLcp = cold.lcp - hot.lcp;
      if (diffLcp > 1000) {
        recs.push({
          category: "Кэширование / Cold vs Hot",
          priority: "medium",
          title: "Улучшить скорость холодного старта для новых пользователей",
          problem: `Холодный запуск медленнее горячего на ${Math.round(diffLcp)} ms (Cold LCP: ${Math.round(cold.lcp)} ms vs Hot LCP: ${Math.round(hot.lcp)} ms).`,
          solution: "Настройте длительные заголовки кэширования для статических файлов (Cache-Control: public, max-age=31536000, immutable), внедрите HTTP/2 или HTTP/3, используйте DNS-Prefetch и Preconnect для сторонних API.",
        });
      }
    }
  }

  return recs;
}
