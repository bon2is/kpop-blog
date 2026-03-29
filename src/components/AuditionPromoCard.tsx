'use client';

import Link from 'next/link';
import { trackEvent } from '@/components/GoogleAnalytics';

const PROMO_URL = 'https://www.andxo.com/audition';

interface Props {
  /** GA event label — identifies where the card was clicked */
  source?: string;
}

export default function AuditionPromoCard({ source = 'unknown' }: Props) {
  return (
    <Link
      href={PROMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block mb-8"
      onClick={() => trackEvent('audition_promo_click', 'outbound', source)}
      aria-label="Visit andxo.com for the latest K-Pop audition information"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all duration-300 group-hover:-translate-y-1"
        style={{
          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 40%, #D97706 100%)',
          boxShadow: '0 8px 32px rgba(251,191,36,0.35)',
        }}
      >
        {/* Decorative background circles */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -left-6 -bottom-8 w-36 h-36 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />

        {/* Floating emoji accents */}
        <span className="pointer-events-none absolute top-4 right-24 text-2xl opacity-40 select-none hidden sm:block">🌟</span>
        <span className="pointer-events-none absolute bottom-5 right-12 text-xl opacity-30 select-none hidden sm:block">✨</span>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/25 flex items-center justify-center text-3xl shadow-inner">
            🎤
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-white/30 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Official Partner
              </span>
            </div>
            <h2 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-1">
              K-Pop Audition Info Hub
            </h2>
            <p className="text-amber-100 text-sm sm:text-base leading-snug">
              Looking to debut? Find the latest open auditions, casting calls,&nbsp;and tips at&nbsp;
              <span className="font-semibold text-white">andxo.com/audition</span>
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-2 bg-white text-amber-600 font-bold text-sm px-5 py-2.5 rounded-full shadow-md transition-all duration-200 group-hover:shadow-lg group-hover:scale-105">
              Explore Now
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
