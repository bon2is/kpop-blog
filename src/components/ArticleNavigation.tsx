import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArticleNavigationProps {
  prev: Article | null;
  next: Article | null;
}

export default function ArticleNavigation({ prev, next }: ArticleNavigationProps) {
  if (!prev && !next) return null;

  return (
    <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
      {prev ? (
        <Link
          href={`/article/${prev.slug}`}
          className="group flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 hover:border-pink-200 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-pink-500 flex-shrink-0 transition-colors" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-1">Previous</p>
            <p className="text-sm font-semibold text-gray-800 group-hover:text-pink-600 line-clamp-2 transition-colors">
              {prev.title}
            </p>
          </div>
          {prev.thumbnail && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative ml-auto">
              <Image src={prev.thumbnail} alt={prev.title} fill className="object-cover" unoptimized />
            </div>
          )}
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/article/${next.slug}`}
          className="group flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 hover:border-pink-200 transition-all text-right sm:flex-row-reverse"
        >
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-pink-500 flex-shrink-0 transition-colors" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-1">Next</p>
            <p className="text-sm font-semibold text-gray-800 group-hover:text-pink-600 line-clamp-2 transition-colors">
              {next.title}
            </p>
          </div>
          {next.thumbnail && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative mr-auto sm:mr-0 sm:ml-auto">
              <Image src={next.thumbnail} alt={next.title} fill className="object-cover" unoptimized />
            </div>
          )}
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
