'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

const STORAGE_KEY = 'kpop_bookmarks';

interface StoredBookmark {
  slug: string;
  title: string;
}

function getBookmarks(): StoredBookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Legacy format was string[] — migrate to {slug,title}[]
    return parsed.map((entry: string | StoredBookmark) =>
      typeof entry === 'string'
        ? { slug: entry, title: entry.replace(/-/g, ' ') }
        : entry
    );
  } catch {
    return [];
  }
}

function setBookmarks(entries: StoredBookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

interface BookmarkButtonProps {
  slug: string;
  title: string;
}

export function BookmarkButton({ slug, title }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const bookmarks = getBookmarks();
    setSaved(bookmarks.some((b) => b.slug === slug));
  }, [slug]);

  function toggle() {
    const bookmarks = getBookmarks();
    let next: StoredBookmark[];
    if (saved) {
      next = bookmarks.filter((b) => b.slug !== slug);
    } else {
      next = [{ slug, title }, ...bookmarks].slice(0, 100); // cap at 100
    }
    setBookmarks(next);
    setSaved(!saved);
  }

  if (!mounted) {
    return (
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 bg-gray-50"
        disabled
        aria-label="Save article"
      >
        <Bookmark className="w-4 h-4" />
        Save
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        saved
          ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
      }`}
      aria-label={saved ? 'Remove bookmark' : 'Save article'}
      title={saved ? 'Remove bookmark' : `Save "${title}" to reading list`}
    >
      {saved ? (
        <>
          <BookmarkCheck className="w-4 h-4" />
          Saved
        </>
      ) : (
        <>
          <Bookmark className="w-4 h-4" />
          Save
        </>
      )}
    </button>
  );
}

// Self-sufficient: titles are persisted alongside slugs at bookmark time,
// so no article data needs to be serialized from the server.
export function ReadingList() {
  const [bookmarks, setBookmarksState] = useState<StoredBookmark[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBookmarksState(getBookmarks());
  }, []);

  if (!mounted || bookmarks.length === 0) return null;

  const savedArticles = bookmarks;

  if (savedArticles.length === 0) return null;

  return (
    <section className="mb-10 p-5 bg-yellow-50 rounded-2xl border border-yellow-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-bold text-gray-900">Your Reading List</h2>
          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
            {savedArticles.length}
          </span>
        </div>
        <button
          onClick={() => {
            setBookmarks([]);
            setBookmarksState([]);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {savedArticles.slice(0, 5).map((article) => (
          <a
            key={article.slug}
            href={`/article/${article.slug}`}
            className="flex items-center gap-3 p-2 bg-white rounded-lg hover:bg-yellow-50 transition-colors group"
          >
            <BookmarkCheck className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm text-gray-800 line-clamp-1 group-hover:text-pink-600 transition-colors flex-1">
              {article.title}
            </span>
          </a>
        ))}
        {savedArticles.length > 5 && (
          <p className="text-xs text-gray-400 text-center pt-1">
            +{savedArticles.length - 5} more saved articles
          </p>
        )}
      </div>
    </section>
  );
}
