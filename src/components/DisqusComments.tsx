'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface DisqusCommentsProps {
  slug: string;
  title: string;
  url: string;
}

declare global {
  interface Window {
    disqus_config?: () => void;
    DISQUS?: {
      reset: (config: { reload: boolean; config: () => void }) => void;
    };
  }
}

const SHORTNAME = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;

export default function DisqusComments({ slug, title, url }: DisqusCommentsProps) {
  const pathname = usePathname();
  const loaded = useRef(false);

  useEffect(() => {
    if (!SHORTNAME) return;

    const config = function (this: { page: { url: string; identifier: string; title: string } }) {
      this.page.url = url;
      this.page.identifier = slug;
      this.page.title = title;
    };

    if (window.DISQUS && loaded.current) {
      window.DISQUS.reset({ reload: true, config });
      return;
    }

    window.disqus_config = config;

    const script = document.createElement('script');
    script.src = `https://${SHORTNAME}.disqus.com/embed.js`;
    script.setAttribute('data-timestamp', String(Date.now()));
    script.async = true;
    document.head.appendChild(script);
    loaded.current = true;

    return () => {
      const existing = document.querySelector(`script[src="${script.src}"]`);
      if (existing) existing.remove();
    };
  }, [pathname, slug, title, url]);

  if (!SHORTNAME) return null;

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-4">댓글</h2>
      <div id="disqus_thread" />
      <noscript>
        댓글을 보려면 JavaScript를 활성화해주세요.{' '}
        <a href={`https://disqus.com/?ref_noscript`} rel="nofollow">
          Disqus에서 제공
        </a>
      </noscript>
    </div>
  );
}
