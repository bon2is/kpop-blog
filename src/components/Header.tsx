'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Menu, X, Search, BarChart3, Users } from 'lucide-react';
import { categories } from '@/lib/config';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close search on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
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
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
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
            <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
              Press <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to search or <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
