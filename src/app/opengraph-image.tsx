import { ImageResponse } from 'next/og';

export const alt = 'KPOP Daily – AI-Curated K-Pop News';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow circles */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,157,0.25) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,132,252,0.2) 0%, transparent 70%)', display: 'flex' }} />

        {/* K-pop emoji decorations */}
        <div style={{ position: 'absolute', top: 40, left: 60, fontSize: 48, display: 'flex', opacity: 0.6 }}>✨</div>
        <div style={{ position: 'absolute', top: 60, right: 80, fontSize: 40, display: 'flex', opacity: 0.5 }}>🎵</div>
        <div style={{ position: 'absolute', bottom: 50, left: 80, fontSize: 36, display: 'flex', opacity: 0.5 }}>💜</div>
        <div style={{ position: 'absolute', bottom: 40, right: 60, fontSize: 44, display: 'flex', opacity: 0.6 }}>⭐</div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 1 }}>
          {/* Logo/Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B9D, #C084FC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>
              🎤
            </div>
            <div style={{
              fontSize: 72, fontWeight: 900, letterSpacing: '-2px',
              background: 'linear-gradient(135deg, #FF6B9D 0%, #C084FC 50%, #60A5FA 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              display: 'flex',
            }}>
              KPOP Daily
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 28, color: 'rgba(255,255,255,0.85)', fontWeight: 400,
            letterSpacing: '0.05em', display: 'flex',
          }}>
            AI-Curated K-Pop News &amp; Insights
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {['BTS', 'BLACKPINK', 'aespa', 'IVE', 'NewJeans', 'Stray Kids'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '6px 16px', borderRadius: 9999,
                  background: 'rgba(255,107,157,0.15)',
                  border: '1px solid rgba(255,107,157,0.4)',
                  color: '#FF9EC4', fontSize: 18, fontWeight: 600,
                  display: 'flex',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 56,
          background: 'rgba(255,107,157,0.15)',
          borderTop: '1px solid rgba(255,107,157,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.6)', fontSize: 22, letterSpacing: '0.05em',
        }}>
          kpop.andxo.com
        </div>
      </div>
    ),
    { ...size }
  );
}
