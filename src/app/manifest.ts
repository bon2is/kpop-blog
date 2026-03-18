import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KPOP Daily',
    short_name: 'KPOP Daily',
    description: 'AI-curated K-Pop and K-Drama news, updated 4× daily.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9FAFB',
    theme_color: '#EC4899',
    orientation: 'portrait',
    icons: [
      {
        src: '/og-image.png',
        sizes: '1200x630',
        type: 'image/png',
      },
    ],
    categories: ['news', 'entertainment', 'music'],
  };
}
