'use client';

import { useEffect, useState } from 'react';

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, pct));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-gray-100">
      <div
        className="h-full transition-all duration-100 ease-out"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #FF6B9D, #C084FC, #60A5FA)',
        }}
      />
    </div>
  );
}
