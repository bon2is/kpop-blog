'use client';

import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';

export default function AdSenseScript() {
  useEffect(() => {
    // Check if script already exists
    if (document.querySelector(`script[src*="adsbygoogle"]`)) return;

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, []);

  return null;
}
