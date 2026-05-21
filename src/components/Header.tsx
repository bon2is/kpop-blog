'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Menu, X, Search, BarChart3, Users, Clock, ShoppingBag, Calendar } from 'lucide-react';
import { categories } from '@/lib/config';

const RECENT_SEARCHES_KEY = 'kpop_recent_searches';
const MAX_RECENT = 5;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecentSearch(q: string) {
  try {
    const prev = loadRecentSearches();
    const next = [q, ...prev.filter((s) => s !== q)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus search input and load recent searches when modal opens
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
      setRecentSearches(loadRecentSearches());
    }
  }, [isSearchOpen]);

  // Close search on Escape key; open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      } else if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const doSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchQuery);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold gradient-text">KPOP Daily</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  {category.name}
                </Link>
              ))}
              <Link
                href="/artists"
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <Users className="w-4 h-4" />
                Artists
              </Link>
              <Link
                href="/chart"
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Charts
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                  <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </Link>
              <Link
                href="/shop"
                className="flex items-center gap-1 text-gray-600 hover:text-pink-600 font-medium transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Shop
              </Link>
              <Link
                href="/schedule"
                className="flex items-center gap-1 text-gray-600 hover:text-pink-600 font-medium transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </Link>
              <Link
                href="/categories"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                More
              </Link>
            </nav>

            {/* Search & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Open search"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
                <kbd className="hidden lg:inline text-[10px] font-mono bg-white border border-gray-300 rounded px-1 py-0.5 text-gray-400">⌘K</kbd>
              </button>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <nav className="flex flex-col space-y-3">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    className="text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
                <Link
                  href="/artists"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  Artists
                </Link>
                <Link
                  href="/chart"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Charts
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none ml-1">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </Link>
                <Link
                  href="/shop"
                  className="flex items-center gap-2 text-gray-600 hover:text-pink-600 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Shop
                </Link>
                <Link
                  href="/schedule"
                  className="flex items-center gap-2 text-gray-600 hover:text-pink-600 font-medium py-2 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Calendar className="w-4 h-4" />
                  Schedule
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* Search Box */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <form onSubmit={handleSearch}>
              <div className="flex items-center px-6 py-4">
                <Search className="w-6 h-6 text-gray-400 mr-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="flex-1 text-lg outline-none placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </form>
            {/* Recent + Popular searches */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 space-y-3">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Recent
                    </p>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                        setRecentSearches([]);
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((q) => (
                      <button
                        key={q}
                        onClick={() => doSearch(q)}
                        className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-2">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {['BTS', 'BLACKPINK', 'aespa', 'IVE', 'Stray Kids', 'TWICE', 'NewJeans', 'SEVENTEEN'].map((q) => (
                    <button
                      key={q}
                      onClick={() => doSearch(q)}
                      className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
