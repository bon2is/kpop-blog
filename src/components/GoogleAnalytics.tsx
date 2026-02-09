'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!GA_ID) return;

    // Only load the script once
    if (!document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      script.async = true;
      document.head.appendChild(script);
    }

    // Initialize gtag (idempotent)
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer.push(args);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, { send_page_view: false });
    }
  }, []);

  // Track page views on route change (SPA navigation)
  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_title: document.title,
    });
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
