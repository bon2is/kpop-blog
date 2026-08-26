import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import ScrollToTop from '@/components/ScrollToTop';
import { siteConfig } from '@/lib/config';
import './globals.css';

const IS_PROD = process.env.NODE_ENV === 'production';
const ADSENSE_CLIENT = 'ca-pub-7999144867236526';
const GA_ID = 'G-YQYVZJ28RZ';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'K-Pop', 'Korean Pop', 'K-Pop News', 'Kpop', 'Kpop News',
    'BTS', 'BLACKPINK', 'TWICE', 'aespa', 'IVE', 'NewJeans', 'Stray Kids',
    'Korean Entertainment', 'Korean Music', 'Idol News',
    'K-Pop Comeback', 'K-Pop Chart', 'K-Pop Concert',
  ],
  authors: [{ name: 'KPOP Daily', url: siteConfig.url }],
  creator: 'KPOP Daily',
  publisher: 'KPOP Daily',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'KPOP Daily – AI-Curated K-Pop News',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: ['/og-image.png'],
    site: '@kpopdailynews',
    creator: '@kpopdailynews',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    types: {
      'application/rss+xml': `${siteConfig.url}/feed.xml`,
    },
  },
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: siteConfig.name,
  url: siteConfig.url,
  logo: {
    '@type': 'ImageObject',
    url: `${siteConfig.url}/og-image.png`,
    width: 1200,
    height: 630,
  },
  description: siteConfig.description,
  foundingDate: '2024-01-01',
  masthead: `${siteConfig.url}/about`,
  missionCoveragePrioritiesPolicy: `${siteConfig.url}/about`,
  sameAs: [
    'https://twitter.com/kpopdailynews',
    'https://www.threads.net/@kpopdaily',
    'https://bsky.app/profile/kpop.andxo.com',
    'https://discord.gg/49mJaMvZya',
  ],
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: 'en-US',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
          <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
          {/* AdSense 도메인 사전 연결 — 광고 스크립트/광고 서버 TCP+TLS 핸드셰이크를
              미리 열어 첫 광고 fill 을 앞당긴다(viewability/RPM 개선, LCP 영향 미미). */}
          <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
          <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
          <link rel="dns-prefetch" href="https://tpc.googlesyndication.com" />
          <meta name="naver-site-verification" content="a156ba871d90bd061a576b944f0a37bd8eac4e17" />
          <meta name="theme-color" content="#EC4899" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="KPOP Daily" />
          <link rel="alternate" type="application/rss+xml" title="KPOP Daily RSS" href="/feed.xml" />
          <link rel="search" type="application/opensearchdescription+xml" title="KPOP Daily Search" href="/opensearch.xml" />
          {/* Production-only AdSense loader.
              This single global tag enables AdSense Auto Ads overlay formats when
              configured in the AdSense console. Manual <ins> units still push from
              AdBanner.tsx, and ensureAdsScript() detects this id to avoid duplicates. */}
          {IS_PROD && (
            <script
              id="adsbygoogle-js"
              async
              crossOrigin="anonymous"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            />
          )}
          {/* Google Analytics 4 — init script must run before async gtag.js */}
          <script
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `,
            }}
          />
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          {/* Organization + WebSite structured data */}
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationLd, websiteLd]) }}
          />
        </head>
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <GoogleAnalytics />
        {/* AdSense 스크립트는 production head 에서 1회 로드한다.
            Auto Ads overlay formats 활성화용이며, 광고 컴포넌트의 ensureAdsScript()는
            같은 id를 감지해 중복 삽입하지 않는다. */}
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
