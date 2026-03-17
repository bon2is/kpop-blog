'use client';

import { useEffect, useState } from 'react';
import { TocHeading } from '@/lib/utils';
import { List } from 'lucide-react';

interface TableOfContentsProps {
  headings: TocHeading[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0% -70% 0%', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav className="bg-white rounded-2xl shadow-sm p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-4 h-4 text-pink-500" />
        <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Contents</span>
      </div>
      <ol className="space-y-1">
        {headings.map(({ id, text, level }) => (
          <li key={id} className={level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${id}`}
              className={`block text-sm py-1 leading-snug transition-colors truncate ${
                activeId === id
                  ? 'text-pink-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
