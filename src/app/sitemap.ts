import { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/articles';
import { categories } from '@/lib/config';
import { getAllArtistSlugs } from '@/lib/artists';
import { tagSlug } from '@/lib/utils';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kpop.andxo.com';

  // Static pages
  // NOTE: All URLs MUST end with a trailing slash to match next.config
  // trailingSlash: true. The page canonicals use the trailing-slash form, so a
  // no-slash sitemap URL 308-redirects and Google buckets it as
  // "Alternate page with proper canonical tag" instead of indexing it.
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/articles/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artists/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/chart/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    // /search is intentionally excluded — the page is noindex.
    {
      url: `${baseUrl}/about/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/category/${category.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  }));

  // Article pages — higher priority for recent articles
  const articles = getAllArticles();
  const now = Date.now();
  const dayMs = 86400000;
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => {
    const age = now - new Date(article.publishedAt).getTime();
    const priority = age < dayMs ? 0.9 : age < 7 * dayMs ? 0.8 : age < 30 * dayMs ? 0.75 : 0.65;
    return {
      url: `${baseUrl}/article/${article.slug}/`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: age < 7 * dayMs ? 'daily' : 'weekly',
      priority,
    };
  });

  // Tag pages — only include tags with 3+ articles (thin pages are noindexed).
  // URLs use tagSlug() — identical to generateStaticParams and internal links.
  const tagFreq: Record<string, number> = {};
  articles.forEach((article) => {
    article.tags.forEach((tag) => {
      const slug = tagSlug(tag);
      tagFreq[slug] = (tagFreq[slug] ?? 0) + 1;
    });
  });
  const tagPages: MetadataRoute.Sitemap = Object.entries(tagFreq)
    .filter(([, count]) => count >= 3)
    .map(([slug]) => ({
      url: `${baseUrl}/tag/${slug}/`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));

  // Artist pages
  const artistPages: MetadataRoute.Sitemap = getAllArtistSlugs().map((slug) => ({
    url: `${baseUrl}/artist/${slug}/`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...articlePages, ...tagPages, ...artistPages];
}
