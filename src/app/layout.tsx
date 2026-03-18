import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import AdSenseScript from '@/components/AdSenseScript';
import ScrollToTop from '@/components/ScrollToTop';
import { siteConfig } from '@/lib/config';
import './globals.css';

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
    canonical: siteConfig.url,
    types: {
      'application/rss+xml': `${siteConfig.url}/feed.xml`,
    },
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
          <meta name="agd-partner-manual-verification" />
          <meta name="naver-site-verification" content="a156ba871d90bd061a576b944f0a37bd8eac4e17" />
          <link rel="alternate" type="application/rss+xml" title="KPOP Daily RSS" href="/feed.xml" />
        </head>
      <body className="min-h-screen bg-gray-50 flex flex-col">
        <GoogleAnalytics />
        <AdSenseScript />
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
