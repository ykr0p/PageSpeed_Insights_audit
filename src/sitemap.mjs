/**
 * Модуль автопоиска и парсинга sitemap.xml
 * Позволяет автоматически извлекать все страницы любого сайта для массового аудита.
 */

export class SitemapParser {
  /**
   * Получить список всех URL из sitemap.xml сайта
   * @param {string} siteUrl URL сайта или прямой адрес sitemap.xml
   * @param {number} [maxUrls=50] Максимальное количество страниц для аудита
   * @returns {Promise<string[]>}
   */
  static async extractUrls(siteUrl, maxUrls = 50) {
    let sitemapUrl = siteUrl;
    if (!sitemapUrl.endsWith(".xml")) {
      const u = new URL(siteUrl);
      sitemapUrl = `${u.origin}/sitemap.xml`;
    }

    console.log(`\x1b[36m[Sitemap]\x1b[0m Поиск карты сайта: ${sitemapUrl}...`);

    try {
      const res = await fetch(sitemapUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PageSpeed-Toolkit/1.0",
          "Accept": "application/xml,text/xml,*/*",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} при получении ${sitemapUrl}`);
      }

      const xml = await res.text();
      const urls = [];

      // Извлечение всех <loc>...</loc>
      const locRegex = /<loc>\s*(https?:\/\/[^\s<]+)\s*<\/loc>/gi;
      let match;
      const discoveredLocs = [];

      while ((match = locRegex.exec(xml)) !== null) {
        discoveredLocs.push(match[1]);
      }

      // Проверка: это sitemap index (список других sitemap) или конечный список страниц?
      for (const loc of discoveredLocs) {
        if (loc.endsWith(".xml") && urls.length < maxUrls) {
          try {
            console.log(`\x1b[2m  Подгрузка дочернего sitemap: ${loc}\x1b[0m`);
            const subRes = await fetch(loc);
            if (subRes.ok) {
              const subXml = await subRes.text();
              let subMatch;
              while ((subMatch = locRegex.exec(subXml)) !== null) {
                if (!subMatch[1].endsWith(".xml") && !urls.includes(subMatch[1])) {
                  urls.push(subMatch[1]);
                  if (urls.length >= maxUrls) break;
                }
              }
            }
          } catch {}
        } else if (!urls.includes(loc)) {
          urls.push(loc);
        }

        if (urls.length >= maxUrls) break;
      }

      console.log(`\x1b[32m[Sitemap]\x1b[0m Найдено страниц для аудита: ${urls.length}`);
      return urls;
    } catch (err) {
      console.warn(`\x1b[33m[Sitemap]\x1b[0m Не удалось загрузить карту сайта (${err.message}).`);
      return [];
    }
  }
}
