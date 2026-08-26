import type { Metadata } from 'next';
import { siteConfig } from '@/lib/config';

// schedule/page.tsx is a client component and cannot export metadata,
// so the route-level canonical lives here. Without it the page would
// previously inherit no canonical (or worse, a homepage default).
export const metadata: Metadata = {
  title: `K-Pop Idol Schedule & Comeback Calendar | ${siteConfig.name}`,
  description: 'Upcoming K-Pop comebacks, concerts, fan meetings, and broadcast appearances. Track your favorite idols\' schedules in one place.',
  alternates: { canonical: `${siteConfig.url}/schedule` },
  openGraph: {
    title: "K-Pop Idol Schedule & Comeback Calendar | KPOP Daily",
    description: "Upcoming K-Pop comebacks, concerts, and broadcast schedules.",
    type: 'website',
    url: `${siteConfig.url}/schedule`,
  },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
