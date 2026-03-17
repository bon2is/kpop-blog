import { Metadata } from 'next';
import { getAllArticles } from '@/lib/articles';
import ChartClient from './ChartClient';

export const metadata: Metadata = {
  title: 'K-Pop Charts | KPOP Daily',
  description: 'Most-read K-Pop and K-Drama articles this week on KPOP Daily.',
};

export default function ChartPage() {
  const articles = getAllArticles();
  // Pass recent 60 articles for chart (last ~2 weeks at ~4/day)
  return <ChartClient articles={articles.slice(0, 60)} allArticles={articles} />;
}
