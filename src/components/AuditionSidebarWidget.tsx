'use client';

import Link from 'next/link';
import { trackEvent } from '@/components/GoogleAnalytics';

const PROMO_URL = 'https://www.andxo.com/audition';

interface Props {
  source?: string;
}

export default function AuditionSidebarWidget({ source = 'sidebar_unknown' }: Props) {
  return (
    <Link
      href={PROMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      onClick={() => trackEvent('audition_promo_click', 'outbound', source)}
      aria-label="K-Pop audition information at andxo.com"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 group-hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(145deg, #FBBF24 0%, #D97706 100%)',
          boxShadow: '0 4px 20px rgba(251,191,36,0.3)',
        }}
      >
        {/* Decorative circle */}
        <div
          className="pointer-events-none absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-2xl">🎤</span>
            <div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">
                Audition Hub
              </p>
              <p className="text-white font-bold text-sm leading-tight">
                K-Pop Auditions & Casting
              </p>
            </div>
          </div>

          {/* Body */}
          <p className="text-amber-100 text-xs leading-relaxed mb-4">
            Latest open auditions, casting calls, and debut tips — all in one place.
          </p>

          {/* CTA */}
          <span className="inline-flex items-center gap-1.5 bg-white text-amber-600 font-bold text-xs px-4 py-2 rounded-full shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-105 w-full justify-center">
            View Auditions
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>

          {/* Domain label */}
          <p className="text-amber-200/70 text-[10px] text-center mt-2">andxo.com/audition</p>
        </div>
      </div>
    </Link>
  );
}
