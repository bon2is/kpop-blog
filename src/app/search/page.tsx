import { getAllArticles } from '@/lib/articles';
import SearchClient from './SearchClient';

export default function SearchPage() {
  // Load all articles at build time
  const allArticles = getAllArticles();

  return <SearchClient articles={allArticles} />;
}
