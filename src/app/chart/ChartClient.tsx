'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/types';
import { BarChart3, Eye, ThumbsUp, TrendingUp, Clock, Music2, ExternalLink, RefreshCw } from 'lucide-react';
import { getCategoryColor } from '@/lib/config';
import { formatRelativeDate } from '@/lib/utils';
import type { ChartsData, ChartSong, UnifiedSong } from '../../../scripts/fetch-charts';

interface ChartClientProps {
  articles: Article[];
  allArticles: Article[];
}

type ArticleTab = 'views' | 'likes' | 'recent';
type MusicTab = 'unified' | 'melon' | 'genie' | 'bugs';

interface ScoredArticle extends Article {
  views: number;
  likes: number;
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 'md' }: { rank: number; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const base = `${dim} rounded-full flex items-center justify-center font-black flex-shrink-0`;
  if (rank === 1) return <div className={`${base} bg-gradient-to-br from-yellow-400 to-orange-400 text-white`}>1</div>;
  if (rank === 2) return <div className={`${base} bg-gradient-to-br from-gray-300 to-gray-400 text-white`}>2</div>;
  if (rank === 3) return <div className={`${base} bg-gradient-to-br from-amber-500 to-yellow-600 text-white`}>3</div>;
  return <div className={`${base} bg-gray-100 text-gray-500`}>{rank}</div>;
}

// ── Chart rank badges shown on unified view ───────────────────────────────────
function ChartBadges({ chartRanks }: { chartRanks: UnifiedSong['chartRanks'] }) {
  const labels: { key: keyof typeof chartRanks; label: string; color: string }[] = [
    { key: 'melon', label: 'M', color: '#00CD3C' },
    { key: 'genie', label: 'G', color: '#0066FF' },
    { key: 'bugs',  label: 'B', color: '#FF5833' },
  ];
  return (
    <div className="flex gap-1 flex-shrink-0">
      {labels.map(({ key, label, color }) =>
        chartRanks[key] !== undefined ? (
          <span
            key={key}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
            title={`${key.charAt(0).toUpperCase() + key.slice(1)} #${chartRanks[key]}`}
          >
            {label}{chartRanks[key]}
          </span>
        ) : null
      )}
    </div>
  );
}

// ── YouTube icon ──────────────────────────────────────────────────────────────
function YtIcon() {
  return (
    <div className="flex items-center gap-0.5 text-gray-300 group-hover:text-red-500 transition-colors flex-shrink-0">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
      <ExternalLink className="w-3 h-3" />
    </div>
  );
}

// ── Unified song row ──────────────────────────────────────────────────────────
function UnifiedRow({ song }: { song: UnifiedSong }) {
  return (
    <a
      href={song.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all hover:shadow-md group ${
        song.rank <= 3 ? 'border-pink-100 hover:border-pink-200' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <RankBadge rank={song.rank} />
      <Thumbnail src={song.thumbnail} alt={song.title} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{song.title}</p>
        <p className="text-xs text-gray-500 truncate">{song.artist}</p>
      </div>
      <ChartBadges chartRanks={song.chartRanks} />
      <YtIcon />
    </a>
  );
}

// ── Individual chart song row ─────────────────────────────────────────────────
function SongRow({ song }: { song: ChartSong }) {
  return (
    <a
      href={song.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all hover:shadow-md group ${
        song.rank <= 3 ? 'border-pink-100 hover:border-pink-200' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <RankBadge rank={song.rank} />
      <Thumbnail src={song.thumbnail} alt={song.title} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{song.title}</p>
        <p className="text-xs text-gray-500 truncate">{song.artist}</p>
      </div>
      <YtIcon />
    </a>
  );
}

function Thumbnail({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
      <Music2 className="w-4 h-4 text-pink-400" />
    </div>
  );
}

// ── Music Charts section ──────────────────────────────────────────────────────
function MusicCharts() {
  const [data, setData] = useState<ChartsData | null>(null);
  const [tab, setTab] = useState<MusicTab>('unified');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/data/charts.json')
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json() as Promise<ChartsData>; })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const sourceTabs: { key: MusicTab; label: string; color: string; count: number }[] = data
    ? (
        [
          { key: 'unified' as MusicTab, label: '통합 차트', color: '#FF6B9D', count: data.unified.length },
          { key: 'melon'   as MusicTab, label: 'Melon',     color: '#00CD3C', count: data.melon.length },
          { key: 'genie'   as MusicTab, label: 'Genie',     color: '#0066FF', count: data.genie.length },
          { key: 'bugs'    as MusicTab, label: 'Bugs',      color: '#FF5833', count: data.bugs.length },
        ] as { key: MusicTab; label: string; color: string; count: number }[]
      ).filter((t) => t.count > 0)
    : [];

  const songs =
    !data ? [] :
    tab === 'unified' ? data.unified :
    tab === 'melon'   ? data.melon   :
    tab === 'genie'   ? data.genie   :
    data.bugs;

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Music2 className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-bold text-gray-900">Music Charts</h2>
          {tab === 'unified' && !loading && (
            <span className="text-xs text-gray-400 font-normal">Melon × Genie × Bugs 가중 통합</span>
          )}
        </div>
        {data && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3" />
            {new Date(data.updatedAt).toLocaleDateString('ko-KR', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        )}
      </div>

      {/* Source tabs */}
      {!loading && !error && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {sourceTabs.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                tab === key
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
              style={tab === key ? { backgroundColor: color, borderColor: color } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Legend for unified */}
      {tab === 'unified' && !loading && !error && data && (
        <div className="flex gap-3 mb-4 text-xs text-gray-500 flex-wrap">
          {[
            { label: 'M = Melon', color: '#00CD3C' },
            { label: 'G = Genie', color: '#0066FF' },
            { label: 'B = Bugs',  color: '#FF5833' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="py-10 text-center text-gray-400 text-sm">차트 데이터를 불러올 수 없습니다.</div>
      )}

      {!loading && !error && songs.length === 0 && (
        <div className="py-10 text-center text-gray-400 text-sm">현재 이 차트 데이터가 없습니다.</div>
      )}

      {!loading && songs.length > 0 && (
        <div className="space-y-2">
          {tab === 'unified'
            ? (songs as UnifiedSong[]).map((s) => <UnifiedRow key={`${s.rank}-${s.title}`} song={s} />)
            : (songs as ChartSong[]).map((s) => <SongRow key={`${s.rank}-${s.title}`} song={s} />)
          }
        </div>
      )}
    </section>
  );
}

// ── Article Rankings ──────────────────────────────────────────────────────────
export default function ChartClient({ articles, allArticles }: ChartClientProps) {
  const [tab, setTab] = useState<ArticleTab>('views');
  const [scored, setScored] = useState<ScoredArticle[]>([]);
  const [mounted, setMounted] = useState(false);

  void allArticles;

  useEffect(() => {
    setMounted(true);
    try {
      const views: Record<string, number> = JSON.parse(localStorage.getItem('kpop_views') || '{}');
      const reactions: Record<string, { likes: number; dislikes: number }> = JSON.parse(
        localStorage.getItem('kpop_reactions_counts') || '{}'
      );
      setScored(articles.map((a) => ({ ...a, views: views[a.slug] || 0, likes: reactions[a.slug]?.likes || 0 })));
    } catch {
      setScored(articles.map((a) => ({ ...a, views: 0, likes: 0 })));
    }
  }, [articles]);

  const displayList = mounted
    ? [...scored]
        .sort((a, b) => {
          if (tab === 'views') return b.views - a.views || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          if (tab === 'likes') return b.likes - a.likes || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        })
        .slice(0, 20)
    : articles.slice(0, 20).map((a) => ({ ...a, views: 0, likes: 0 }));

  const tabs: { key: ArticleTab; label: string; icon: React.ReactNode }[] = [
    { key: 'views',  label: 'Most Read',  icon: <Eye className="w-4 h-4" /> },
    { key: 'likes',  label: 'Most Liked', icon: <ThumbsUp className="w-4 h-4" /> },
    { key: 'recent', label: 'Latest',     icon: <Clock className="w-4 h-4" /> },
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

      {/* Music Charts */}
      <MusicCharts />

      {/* Article Rankings */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-gray-900">Article Rankings</h2>
        </div>

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
                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>
                    {article.category.toUpperCase()}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1 mt-0.5">{article.title}</p>
                  <p className="text-xs text-gray-400">{formatRelativeDate(article.publishedAt)}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {tab === 'views' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />{article.views}
                    </span>
                  )}
                  {tab === 'likes' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-pink-600">
                      <ThumbsUp className="w-3.5 h-3.5" />{article.likes}
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
