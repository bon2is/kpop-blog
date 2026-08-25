import { Metadata } from 'next';
import { getAllArticles, toListItems } from '@/lib/articles';
import ChartClient from './ChartClient';

export const metadata: Metadata = {
  title: 'K-Pop Music Charts | Circle · Spotify · YouTube',
  description: 'Real-time K-Pop music charts combining Circle Chart, Spotify Korea, and YouTube Korea rankings. Discover the hottest K-Pop songs and trending artists right now.',
  keywords: [
    'K-Pop chart', 'Kpop chart 2026', 'Circle Chart', 'Melon chart', 'Gaon chart',
    'Spotify Korea chart', 'YouTube Korea chart', 'K-Pop music ranking',
    'top K-Pop songs', 'trending Kpop', 'K-Pop billboard',
  ],
  alternates: { canonical: 'https://kpop.andxo.com/chart' },
  openGraph: {
    title: 'K-Pop Music Charts | KPOP Daily',
    description: 'Real-time K-Pop music charts: Circle, Spotify Korea & YouTube Korea combined rankings.',
    type: 'website',
    url: 'https://kpop.andxo.com/chart',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'K-Pop Music Charts' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'K-Pop Music Charts | KPOP Daily',
    description: 'Real-time K-Pop charts: Circle, Spotify Korea & YouTube Korea.',
    images: ['/og-image.png'],
  },
};

export default function ChartPage() {
  const articles = getAllArticles();
  // Pass recent 60 articles for chart (last ~2 weeks at ~4/day)
  return <ChartClient articles={toListItems(articles.slice(0, 60))} />;
}
