'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types';
import { BarChart3, Eye, ThumbsUp, TrendingUp, Clock, Music2, ExternalLink, RefreshCw } from 'lucide-react';
import { getCategoryColor } from '@/lib/config';
import { formatRelativeDate } from '@/lib/utils';

interface ChartClientProps {
  articles: Article[];
  allArticles: Article[];
}

type ChartTab = 'views' | 'likes' | 'recent';
type MusicSource = 'melon' | 'genie';

interface ScoredArticle extends Article {
  views: number;
  likes: number;
}

interface ChartSong {
  rank: number;
  title: string;
  artist: string;
  thumbnail?: string;
  youtubeUrl: string;
}

interface ChartsData {
  updatedAt: string;
  melon: ChartSong[];
  genie: ChartSong[];
}

// ── Rank badge colors ─────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const base = 'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0';
  if (rank === 1) return <div className={`${base} bg-gradient-to-br from-yellow-400 to-orange-400 text-white`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gradient-to-br from-gray-300 to-gray-400 text-white`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-gradient-to-br from-amber-500 to-yellow-600 text-white`}>3</div>;
  return <div className={`${base} bg-gray-100 text-gray-500`}>{rank}</div>;
}

// ── Music Charts section ──────────────────────────────────────────────────────
function MusicCharts() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [source, setSource] = useState<MusicSource>('melon');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/data/charts.json')
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json() as Promise<ChartsData>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const songs = data ? (source === 'melon' ? data.melon : data.genie) : [];

  const sourceLabels: { key: MusicSource; label: string; color: string }[] = [
    { key: 'melon', label: 'Melon Top 50', color: '#00CD3C' },
    { key: 'genie', label: 'Genie Top 50', color: '#0066FF' },
  ];

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Music2 className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-bold text-gray-900">Music Charts</h2>
        </div>
        {data && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3" />
            {new Date(data.updatedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Source tabs */}
      <div className="flex gap-2 mb-4">
        {sourceLabels.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setSource(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              source === key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
            style={source === key ? { backgroundColor: color, borderColor: color } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="py-10 text-center text-gray-400 text-sm">
          차트 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {!loading && !error && songs.length === 0 && (
        <div className="py-10 text-center text-gray-400 text-sm">
          현재 이 소스의 차트 데이터가 없습니다.
        </div>
      )}

      {!loading && songs.length > 0 && (
        <div className="space-y-2">
          {songs.map((song) => (
            <a
              key={`${song.rank}-${song.title}`}
              href={song.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all hover:shadow-md group ${
                song.rank <= 3 ? 'border-pink-100 hover:border-pink-200' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <RankBadge rank={song.rank} />

              {/* Thumbnail */}
              {song.thumbnail ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image
                    src={song.thumbnail}
                    alt={song.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-pink-400" />
                </div>
              )}

              {/* Song info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{song.title}</p>
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
              </div>

              {/* YouTube icon */}
              <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 group-hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Article Rankings section ──────────────────────────────────────────────────
export default function ChartClient({ articles, allArticles }: ChartClientProps) {
  const [tab, setTab] = useState<ChartTab>('views');
  const [scored, setScored] = useState<ScoredArticle[]>([]);
  const [mounted, setMounted] = useState(false);

  // suppress unused warning
  void allArticles;

  useEffect(() => {
    setMounted(true);
    try {
      const views: Record<string, number> = JSON.parse(localStorage.getItem('kpop_views') || '{}');
      const reactions: Record<string, { likes: number; dislikes: number }> = JSON.parse(
        localStorage.getItem('kpop_reactions_counts') || '{}'
      );
      const result = articles.map((a) => ({
        ...a,
        views: views[a.slug] || 0,
        likes: reactions[a.slug]?.likes || 0,
      }));
      setScored(result);
    } catch {
      setScored(articles.map((a) => ({ ...a, views: 0, likes: 0 })));
    }
  }, [articles]);

  const displayList: ScoredArticle[] = mounted
    ? [...scored]
        .sort((a, b) => {
          if (tab === 'views')
            return b.views - a.views || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          if (tab === 'likes')
            return b.likes - a.likes || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        })
        .slice(0, 20)
    : articles.slice(0, 20).map((a) => ({ ...a, views: 0, likes: 0 }));

  const tabs: { key: ChartTab; label: string; icon: React.ReactNode }[] = [
    { key: 'views', label: 'Most Read', icon: <Eye className="w-4 h-4" /> },
    { key: 'likes', label: 'Most Liked', icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'recent', label: 'Latest', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="w-8 h-8 text-pink-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">K-Pop Charts</h1>
          <p className="text-gray-500 mt-0.5">실시간 음악 차트 &amp; 인기 뉴스 랭킹</p>
        </div>
      </div>

      {/* ── Music Charts ── */}
      <MusicCharts />

      {/* ── Article Rankings ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900">Article Rankings</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {!mounted && (
          <p className="text-sm text-gray-400 mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Rankings are personalized based on your reading history
          </p>
        )}

        <div className="space-y-3">
          {displayList.map((article, i) => {
            const color = getCategoryColor(article.category);
            return (
              <Link
                key={article.slug}
                href={`/article/${article.slug}`}
                className={`flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:shadow-md ${
                  i < 3 ? 'border-pink-100 hover:border-pink-200' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <RankBadge rank={i + 1} />

                {article.thumbnail ? (
                  <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image src={article.thumbnail} alt={article.title} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-16 h-12 rounded-lg flex-shrink-0" style={{ background: `${color}30` }} />
                )}

                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {article.category.toUpperCase()}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 mt-0.5">{article.title}</p>
                  <p className="text-xs text-gray-400">{formatRelativeDate(article.publishedAt)}</p>
                </div>

                <div className="flex-shrink-0 text-right">
                  {tab === 'views' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                      {article.views}
                    </span>
                  )}
                  {tab === 'likes' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {article.likes}
                    </span>
                  )}
                  {tab === 'recent' && (
                    <span className="text-xs text-gray-400">{formatRelativeDate(article.publishedAt)}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
