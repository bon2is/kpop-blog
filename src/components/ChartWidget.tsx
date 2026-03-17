'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Music2, ExternalLink, ChevronRight, TrendingUp } from 'lucide-react';

interface UnifiedSong {
  rank: number;
  title: string;
  artist: string;
  thumbnail?: string;
  youtubeUrl: string;
  score: number;
  chartRanks: { melon?: number; genie?: number; bugs?: number };
}

interface ChartsData {
  updatedAt: string;
  unified: UnifiedSong[];
}

const RANK_COLORS = ['#FF6B9D', '#C084FC', '#60A5FA', '#94A3B8', '#94A3B8'];

export default function ChartWidget() {
  const [songs, setSongs] = useState<UnifiedSong[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/charts.json')
      .then((r) => r.ok ? r.json() as Promise<ChartsData> : Promise.reject())
      .then((d) => {
        setSongs(d.unified.slice(0, 5));
        setUpdatedAt(d.updatedAt);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const maxScore = songs[0]?.score || 1;

  // Relative time label
  const timeLabel = updatedAt
    ? (() => {
        const diffMin = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
        if (diffMin < 60) return `${diffMin}분 전 업데이트`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}시간 전 업데이트`;
        return `${Math.floor(diffH / 24)}일 전 업데이트`;
      })()
    : '';

  if (!loading && songs.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-pink-500" />
          <h2 className="text-xl font-bold text-gray-900">실시간 K-Pop 차트</h2>
          <span className="flex items-center gap-1 text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          {timeLabel && <span className="text-xs text-gray-400 hidden sm:block">{timeLabel}</span>}
          <Link
            href="/chart"
            className="flex items-center gap-1 text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors"
          >
            전체 보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Songs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-b border-gray-50 last:border-0 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-gray-100" />
                <div className="w-10 h-10 rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))
          : songs.map((song, i) => (
              <div
                key={song.rank}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors group"
              >
                {/* Rank */}
                <span
                  className="w-7 text-center font-black text-lg flex-shrink-0"
                  style={{ color: RANK_COLORS[i] }}
                >
                  {song.rank}
                </span>

                {/* Thumbnail */}
                {song.thumbnail ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image src={song.thumbnail} alt={song.title} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                    <Music2 className="w-4 h-4 text-pink-400" />
                  </div>
                )}

                {/* Info + score bar */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{song.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500 truncate flex-shrink-0">{song.artist}</p>
                    {/* Score bar */}
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-[40px]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(song.score / maxScore) * 100}%`,
                          background: `linear-gradient(90deg, ${RANK_COLORS[i]}, ${RANK_COLORS[i]}88)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* YouTube link */}
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 flex items-center gap-0.5 text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="YouTube에서 보기"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-3 text-center">
        <Link
          href="/chart"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #FF6B9D, #C084FC)' }}
        >
          <TrendingUp className="w-4 h-4" />
          통합 차트 전체 보기 (Top 50)
        </Link>
      </div>
    </section>
  );
}
