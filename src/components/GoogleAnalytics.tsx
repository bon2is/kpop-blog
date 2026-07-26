'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Keep this in sync with src/app/layout.tsx. Public analytics IDs are intentionally
// hardcoded in this project so a missing Vercel env var cannot disable tracking.
const GA_ID = 'G-YQYVZJ28RZ';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return;
    window.gtag('config', GA_ID, { page_path: pathname });
  }, [pathname]);

  return null;
}

export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

export function trackNewsletterSignup(email: string) {
  trackEvent('newsletter_signup', 'engagement', email.split('@')[1]);
}
