import Script from 'next/script';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';

// enable_page_level_ads:true(Auto Ads)와 수동 <ins> 태그가 동시에 동작하면
// 두 시스템이 충돌해 impression이 0이 되는 문제가 있다.
// adsbygoogle.js만 로드하고 각 <ins> 컴포넌트에서 직접 push({})를 호출한다.
export default function AdSenseScript() {
  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
