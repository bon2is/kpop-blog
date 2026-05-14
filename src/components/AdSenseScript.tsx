import Script from 'next/script';

const ADSENSE_CLIENT = 'ca-pub-7999144867236526';

export default function AdSenseScript() {
  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      {/* Auto ads + anchor (하단 sticky) + vignette 활성화 */}
      <Script
        id="adsense-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(window.adsbygoogle=window.adsbygoogle||[]).push({google_ad_client:"${ADSENSE_CLIENT}",enable_page_level_ads:true,overlays:{bottom:true}});`,
        }}
      />
    </>
  );
}
