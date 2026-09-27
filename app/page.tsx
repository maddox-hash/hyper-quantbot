'use client';

export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px',
        boxSizing: 'border-box',
        background:
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(46, 230, 197, 0.12), transparent), #0b0e14',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 20% 80%, rgba(94, 240, 212, 0.06), transparent 40%), radial-gradient(circle at 80% 20%, rgba(46, 230, 197, 0.05), transparent 35%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(165deg, #161b22 0%, #0f1318 100%)',
          border: '1px solid rgba(48, 54, 61, 0.9)',
          borderRadius: '20px',
          padding: '40px 28px 36px',
          maxWidth: '620px',
          width: '100%',
          textAlign: 'center',
          boxShadow:
            '0 0 0 1px rgba(46, 230, 197, 0.04), 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 80px rgba(46, 230, 197, 0.04)',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40%',
            height: '2px',
            borderRadius: '0 0 2px 2px',
            background: 'linear-gradient(90deg, transparent, #2ee6c5, #5ef0d4, transparent)',
            opacity: 0.7,
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(46, 230, 197, 0.35)',
              boxShadow: '0 0 24px rgba(46, 230, 197, 0.18), inset 0 0 0 1px rgba(46, 230, 197, 0.08)',
              background: '#05080c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/iconhq.png"
              alt="Hyper Quant"
              width={56}
              height={56}
              style={{ display: 'block', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          HYPER QUANT
        </h1>

        {/* Subtitle - Create Bot */}
        <p
          style={{
            color: '#e6edf3',
            fontSize: '18px',
            fontWeight: 600,
            lineHeight: 1.4,
            margin: '0 0 28px',
            letterSpacing: '-0.01em',
          }}
        >
          Create Bot
        </p>

        {/* ===== BOT TYPES SECTION ===== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            marginBottom: '8px',
            width: '100%',
          }}
        >
          {/* GRID */}
          <div
            style={{
              background: 'rgba(13, 17, 23, 0.7)',
              border: '1px solid rgba(48, 54, 61, 0.9)',
              borderRadius: '14px',
              padding: '18px 14px 16px',
              textAlign: 'center',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 230, 197, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 12px',
                borderRadius: 14,
                background: 'rgba(46, 230, 197, 0.08)',
                border: '1px solid rgba(46, 230, 197, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(46, 230, 197, 0.12)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#5ef0d4" strokeWidth="1.8" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#e6edf3', marginBottom: '8px' }}>
              Grid
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                fontSize: '11.5px',
                lineHeight: 1.45,
                color: '#8b949e',
                textAlign: 'left',
              }}
            >
              <li style={{ marginBottom: 4 }}>• Extract profit from volatility</li>
              <li style={{ marginBottom: 4 }}>• Market making</li>
              <li>• Trailing for every grid — never miss a strong move</li>
            </ul>
          </div>

          {/* DCA */}
          <div
            style={{
              background: 'rgba(13, 17, 23, 0.7)',
              border: '1px solid rgba(48, 54, 61, 0.9)',
              borderRadius: '14px',
              padding: '18px 14px 16px',
              textAlign: 'center',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 230, 197, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 12px',
                borderRadius: 14,
                background: 'rgba(46, 230, 197, 0.08)',
                border: '1px solid rgba(46, 230, 197, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(46, 230, 197, 0.12)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M4 18h16" stroke="#2ee6c5" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M6 18V14" stroke="#2ee6c5" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M10 18V11" stroke="#2ee6c5" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M14 18V8" stroke="#5ef0d4" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M18 18V5" stroke="#5ef0d4" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M4 10l4-3 4 2 4-4 4 1" stroke="#2ee6c5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#e6edf3', marginBottom: '8px' }}>
              DCA
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                fontSize: '11.5px',
                lineHeight: 1.45,
                color: '#8b949e',
                textAlign: 'left',
              }}
            >
              <li style={{ marginBottom: 4 }}>• Use averaging</li>
              <li style={{ marginBottom: 4 }}>• Take profit on any market</li>
              <li style={{ marginBottom: 4 }}>• Accumulate assets</li>
              <li>• Technical indicators + Order Flow filters</li>
            </ul>
          </div>

          {/* COMBO */}
          <div
            style={{
              background: 'rgba(13, 17, 23, 0.7)',
              border: '1px solid rgba(48, 54, 61, 0.9)',
              borderRadius: '14px',
              padding: '18px 14px 16px',
              textAlign: 'center',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 230, 197, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 12px',
                borderRadius: 14,
                background: 'rgba(46, 230, 197, 0.08)',
                border: '1px solid rgba(46, 230, 197, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(46, 230, 197, 0.12)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="12" r="5.5" stroke="#2ee6c5" strokeWidth="1.7" />
                <circle cx="15" cy="12" r="5.5" stroke="#5ef0d4" strokeWidth="1.7" />
                <path d="M9 12h6" stroke="#2ee6c5" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#e6edf3', marginBottom: '8px' }}>
              Combo
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                fontSize: '11.5px',
                lineHeight: 1.45,
                color: '#8b949e',
                textAlign: 'left',
              }}
            >
              <li style={{ marginBottom: 4 }}>• Combined strategy</li>
              <li style={{ marginBottom: 4 }}>• Stability of Grid bot</li>
              <li>• Reliability & profit of DCA</li>
            </ul>
          </div>

          {/* QUANT */}
          <div
            style={{
              background: 'rgba(13, 17, 23, 0.7)',
              border: '1px solid rgba(48, 54, 61, 0.9)',
              borderRadius: '14px',
              padding: '18px 14px 16px',
              textAlign: 'center',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(46, 230, 197, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 12px',
                borderRadius: 14,
                background: 'rgba(46, 230, 197, 0.08)',
                border: '1px solid rgba(46, 230, 197, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(46, 230, 197, 0.12)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l5-6 4 3 5-8 4 4" stroke="#2ee6c5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 20h18" stroke="#5ef0d4" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                <circle cx="8" cy="11" r="1.3" fill="#2ee6c5" />
                <circle cx="12" cy="14" r="1.3" fill="#2ee6c5" />
                <circle cx="17" cy="6" r="1.3" fill="#5ef0d4" />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#e6edf3', marginBottom: '8px' }}>
              Quant
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                fontSize: '11.5px',
                lineHeight: 1.45,
                color: '#8b949e',
                textAlign: 'left',
              }}
            >
              <li style={{ marginBottom: 3 }}>• 3 built-in trading systems</li>
              <li style={{ marginBottom: 3 }}>• Technical market analysis</li>
              <li style={{ marginBottom: 3 }}>• Limit order analysis</li>
              <li style={{ marginBottom: 3 }}>• Order Flow</li>
              <li style={{ marginBottom: 3 }}>• Volatility analysis</li>
              <li>• Pump / dump protection</li>
            </ul>
          </div>

          {/* CUSTOM BOT - DISABLED */}
          <div
            style={{
              background: 'rgba(13, 17, 23, 0.45)',
              border: '1px solid rgba(48, 54, 61, 0.6)',
              borderRadius: '14px',
              padding: '18px 14px 16px',
              textAlign: 'center',
              opacity: 0.72,
              cursor: 'not-allowed',
              position: 'relative',
              gridColumn: '1 / -1', // full width on small screens, or spans
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 12px',
                borderRadius: 14,
                background: 'rgba(110, 118, 129, 0.12)',
                border: '1px solid rgba(110, 118, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Gears + Wrench icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
                  stroke="#6e7681"
                  strokeWidth="1.6"
                />
                <path
                  d="M19.4 13.2a7.2 7.2 0 0 0 .1-1.2 7.2 7.2 0 0 0-.1-1.2l1.7-1.3a.4.4 0 0 0 .1-.5l-1.6-2.8a.4.4 0 0 0-.5-.2l-2 0.8a6.5 6.5 0 0 0-2.1-1.2l-.3-2.1a.4.4 0 0 0-.4-.3h-3.2a.4.4 0 0 0-.4.3l-.3 2.1a6.5 6.5 0 0 0-2.1 1.2l-2-.8a.4.4 0 0 0-.5.2L2.8 9a.4.4 0 0 0 .1.5l1.7 1.3a7.2 7.2 0 0 0-.1 1.2 7.2 7.2 0 0 0 .1 1.2L2.9 14.5a.4.4 0 0 0-.1.5l1.6 2.8a.4.4 0 0 0 .5.2l2-.8a6.5 6.5 0 0 0 2.1 1.2l.3 2.1a.4.4 0 0 0 .4.3h3.2a.4.4 0 0 0 .4-.3l.3-2.1a6.5 6.5 0 0 0 2.1-1.2l2 .8a.4.4 0 0 0 .5-.2l1.6-2.8a.4.4 0 0 0-.1-.5l-1.7-1.3z"
                  stroke="#6e7681"
                  strokeWidth="1.3"
                  opacity="0.85"
                />
                {/* Small wrench accent */}
                <path
                  d="M16.5 7.5l1.8-1.8a1.2 1.2 0 0 1 1.7 1.7L18.2 9.2"
                  stroke="#6e7681"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#8b949e', marginBottom: '8px' }}>
              Custom Bot
            </div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#e3b341',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
              }}
            >
              In Development
            </div>
          </div>
        </div>
        {/* ===== END BOT TYPES ===== */}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <style>{`
            @keyframes hqPulse {
              0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(63, 185, 80, 0.7); transform: scale(1); }
              50% { opacity: 0.35; box-shadow: 0 0 2px rgba(63, 185, 80, 0.25); transform: scale(0.85); }
            }
          `}</style>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#3fb950',
              boxShadow: '0 0 8px rgba(63, 185, 80, 0.6)',
              animation: 'hqPulse 1.6s ease-in-out infinite',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', color: '#6e7681' }}>
            Secured · Non-custodial · Hyperliquid
          </span>
        </div>
      </div>
    </main>
  );
}
