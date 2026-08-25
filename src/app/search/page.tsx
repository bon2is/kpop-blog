import { Metadata } from 'next';
import { getAllArticles, toListItems } from '@/lib/articles';
import { siteConfig } from '@/lib/config';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Search K-Pop News & Articles',
  description: 'Search all K-Pop and K-Drama news articles on KPOP Daily. Find news about BTS, BLACKPINK, aespa, IVE, Stray Kids and more.',
  alternates: { canonical: 'https://kpop.andxo.com/search' },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  const allArticles = getAllArticles();
  const articles = toListItems(allArticles);

  return <SearchClient articles={articles} />;
}
