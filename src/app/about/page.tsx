import { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig, categories } from '@/lib/config';
import { getAllArticles } from '@/lib/articles';
import { artists } from '@/lib/artists';
import { Sparkles, Zap, Globe, Heart, Shield, Newspaper } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About KPOP Daily',
  description: 'Learn about KPOP Daily — AI-curated K-Pop and K-Drama news with original commentary. Updated 4× daily with the latest stories from trusted sources.',
  keywords: ['About KPOP Daily', 'K-Pop news site', 'AI K-Pop news', 'Kpop Daily about'],
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: 'About KPOP Daily',
    description: 'AI-curated K-Pop and K-Drama news with original commentary.',
    type: 'website',
    url: `${siteConfig.url}/about`,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'KPOP Daily' }],
  },
};

const features = [
  {
    icon: Zap,
    title: 'Updated 4× Daily',
    description: 'Fresh K-Pop and K-Drama news delivered to you every 6 hours — never miss a story.',
  },
  {
    icon: Sparkles,
    title: 'AI-Enhanced Coverage',
    description: 'Each article includes original commentary and analysis powered by AI, going beyond just the headline.',
  },
  {
    icon: Globe,
    title: 'Trusted Sources',
    description: 'We curate from Soompi, Koreaboo, Korea Herald, HelloKpop, and more — always linking back to the originals.',
  },
  {
    icon: Heart,
    title: 'Fan-Focused',
    description: 'Built for K-Pop fans who want to stay in the loop on their favorite artists, comebacks, and dramas.',
  },
  {
    icon: Shield,
    title: 'Transparent Attribution',
    description: 'Every article links to its original source. We summarize and comment — full credit goes to the reporters.',
  },
  {
    icon: Newspaper,
    title: 'All Categories Covered',
    description: 'From music and comebacks to drama, fashion, variety shows, and award seasons — all in one place.',
  },
];

export default function AboutPage() {
  const articles = getAllArticles();
  const articleCount = articles.length;
  const artistCount = artists.length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 items-center justify-center text-white text-3xl mb-6 shadow-lg">
          🎤
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          About <span className="gradient-text">KPOP Daily</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Your daily source for K-Pop and K-Drama news — curated, summarized, and enriched with original commentary by AI.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-16">
        {[
          { value: articleCount.toLocaleString() + '+', label: 'Articles Published' },
          { value: artistCount + '+', label: 'Artist Profiles' },
          { value: '4×', label: 'Daily Updates' },
        ].map(({ value, label }) => (
          <div key={label} className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <p className="text-3xl font-bold gradient-text mb-1">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* What we do */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">What We Do</h2>
        <div className="prose prose-lg max-w-none text-gray-600">
          <p className="mb-4">
            KPOP Daily is an AI-powered news aggregation platform dedicated to the K-Pop and K-Drama community.
            We monitor trusted K-entertainment news sources around the clock and automatically curate the most relevant
            stories for our readers.
          </p>
          <p className="mb-4">
            For each story, our AI provides a concise summary and original commentary — giving you context and analysis
            beyond the headline. We always link to the full original article so you can read the complete story.
          </p>
          <p>
            Our AI also generates beautiful Studio Ghibli-inspired thumbnail artwork for articles, making each story
            visually engaging while being transparent about AI-generated content.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Why KPOP Daily?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Coverage Areas</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
              style={{ backgroundColor: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30` }}
            >
              {cat.symbol} {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className="mb-16 p-6 bg-gray-50 rounded-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Our Sources</h2>
        <p className="text-gray-600 text-sm mb-4">
          We aggregate from trusted K-entertainment journalism outlets and always link to the original articles:
        </p>
        <div className="flex flex-wrap gap-3">
          {['Soompi', 'Koreaboo', 'Korea Herald', 'HelloKpop'].map((source) => (
            <span key={source} className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-gray-700 shadow-sm border border-gray-100">
              {source}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Start Reading</h2>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
          >
            Latest News
          </Link>
          <Link
            href="/artists"
            className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-full border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
          >
            Browse Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
