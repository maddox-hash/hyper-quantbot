'use client';

import { useState } from 'react';

type BotType = 'Grid' | 'DCA' | 'Combo' | 'Quant' | null;
type Direction = 'LONG' | 'SHORT';
type MarginMode = 'cross' | 'isolated';
type TradeMode = 'positional' | 'normal' | 'aggressive';

export default function Home() {
  const [selectedBot, setSelectedBot] = useState<BotType>(null);

  const [investAmount, setInvestAmount] = useState('500');
  const [direction, setDirection] = useState<Direction>('LONG');
  const [leverage, setLeverage] = useState(2);
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  const [tradeMode, setTradeMode] = useState<TradeMode>('normal');
  const [rangeLow, setRangeLow] = useState('');
  const [rangeHigh, setRangeHigh] = useState('');
  const [taEnabled, setTaEnabled] = useState(true);
  const [orderFlowEnabled, setOrderFlowEnabled] = useState(true);
  const [volumesEnabled, setVolumesEnabled] = useState(false);

  const balance = '26,525.02';

  const botMeta: Record<Exclude<BotType, null>, { title: string; icon: React.ReactNode }> = {
    Grid: {
      title: 'Grid Bot',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#5ef0d4" strokeWidth="1.7" />
        </svg>
      ),
    },
    DCA: {
      title: 'DCA Bot',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 18h16" stroke="#2ee6c5" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 18V14" stroke="#2ee6c5" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M10 18V11" stroke="#2ee6c5" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M14 18V8" stroke="#5ef0d4" strokeWidth="2.1" strokeLinecap="round" />
          <path d="M18 18V5" stroke="#5ef0d4" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      ),
    },
    Combo: {
      title: 'Combo Bot',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="12" r="5.2" stroke="#2ee6c5" strokeWidth="1.6" />
          <circle cx="15" cy="12" r="5.2" stroke="#5ef0d4" strokeWidth="1.6" />
        </svg>
      ),
    },
    Quant: {
      title: 'Quant Bot',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 17l5-6 4 3 5-8 4 4" stroke="#2ee6c5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 20h18" stroke="#5ef0d4" strokeWidth="1.4" opacity="0.5" />
        </svg>
      ),
    },
  };

  const handleBotClick = (bot: BotType) => {
    if (!bot) return;
    setSelectedBot(bot);
    setInvestAmount('500');
    setDirection('LONG');
    setLeverage(2);
    setMarginMode('cross');
    setTradeMode('normal');
    setRangeLow('');
    setRangeHigh('');
    setTaEnabled(true);
    setOrderFlowEnabled(true);
    setVolumesEnabled(false);
  };

  const Toggle = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '11px 10px',
        borderRadius: 10,
        border: active ? '1px solid rgba(46,230,197,0.45)' : '1px solid #30363d',
        background: active ? 'rgba(46,230,197,0.1)' : 'rgba(13,17,23,0.6)',
        color: active ? '#2ee6c5' : '#8b949e',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );

  const HelpTip = ({ text }: { text: string }) => (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 5,
        cursor: 'help',
      }}
      onMouseEnter={(e) => {
        const tip = e.currentTarget.querySelector('.hq-tip') as HTMLElement;
        if (tip) tip.style.opacity = '1';
        if (tip) tip.style.visibility = 'visible';
      }}
      onMouseLeave={(e) => {
        const tip = e.currentTarget.querySelector('.hq-tip') as HTMLElement;
        if (tip) tip.style.opacity = '0';
        if (tip) tip.style.visibility = 'hidden';
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '1px solid #6e7681',
          color: '#6e7681',
          fontSize: 10,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ?
      </span>
      <span
        className="hq-tip"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 'calc(100% + 8px)',
          transform: 'translateX(-50%)',
          width: 220,
          padding: '10px 12px',
          borderRadius: 10,
          background: '#161b22',
          border: '1px solid #30363d',
          color: '#c9d1d9',
          fontSize: 12,
          fontWeight: 400,
          lineHeight: 1.45,
          textTransform: 'none',
          letterSpacing: 'normal',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          opacity: 0,
          visibility: 'hidden',
          transition: 'opacity 0.15s, visibility 0.15s',
          zIndex: 50,
          pointerEvents: 'none',
          textAlign: 'left',
        }}
      >
        {text}
      </span>
    </span>
  );

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px 14px',
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
          padding: '32px 20px 24px',
          maxWidth: selectedBot ? '480px' : '620px',
          width: '100%',
          textAlign: 'center',
          boxShadow:
            '0 0 0 1px rgba(46, 230, 197, 0.04), 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 80px rgba(46, 230, 197, 0.04)',
          transition: 'max-width 0.3s ease',
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

        {!selectedBot && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  overflow: 'hidden',
                  border: '1px solid rgba(46, 230, 197, 0.35)',
                  boxShadow: '0 0 18px rgba(46, 230, 197, 0.15)',
                  background: '#05080c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src="/iconhq.png" alt="Hyper Quant" width={44} height={44} style={{ display: 'block', objectFit: 'contain' }} />
              </div>
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                margin: '0 0 4px',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              HYPER QUANT
            </h1>

            <p
              style={{
                color: '#e6edf3',
                fontSize: '17px',
                fontWeight: 600,
                margin: '0 0 20px',
                letterSpacing: '-0.01em',
              }}
            >
              Create Bot
            </p>
          </>
        )}

        {!selectedBot && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
              gap: '11px',
              marginBottom: '6px',
            }}
          >
            {(
              [
                {
                  id: 'Grid' as BotType,
                  title: 'Grid',
                  points: ['Extract profit from volatility', 'Market making', 'Trailing for every grid'],
                },
                {
                  id: 'DCA' as BotType,
                  title: 'DCA',
                  points: ['Use averaging', 'Take profit on any market', 'Technical + Order Flow'],
                },
                {
                  id: 'Combo' as BotType,
                  title: 'Combo',
                  points: ['Combined strategy', 'Grid stability', 'DCA reliability'],
                },
                {
                  id: 'Quant' as BotType,
                  title: 'Quant',
                  points: ['3 trading systems', 'Order Flow + TA', 'Pump/dump protection'],
                },
              ] as const
            ).map((bot) => (
              <div
                key={bot.id}
                onClick={() => handleBotClick(bot.id)}
                style={{
                  background: 'rgba(13, 17, 23, 0.7)',
                  border: '1px solid rgba(48, 54, 61, 0.9)',
                  borderRadius: '13px',
                  padding: '14px 11px 12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(46, 230, 197, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    margin: '0 auto 9px',
                    borderRadius: 11,
                    background: 'rgba(46, 230, 197, 0.08)',
                    border: '1px solid rgba(46, 230, 197, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {botMeta[bot.id!].icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#e6edf3', marginBottom: '5px' }}>{bot.title}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '10.5px', lineHeight: 1.4, color: '#8b949e', textAlign: 'left' }}>
                  {bot.points.map((p) => (
                    <li key={p} style={{ marginBottom: 2 }}>• {p}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div
              style={{
                background: 'rgba(13, 17, 23, 0.4)',
                border: '1px solid rgba(48, 54, 61, 0.5)',
                borderRadius: '13px',
                padding: '14px 11px 12px',
                opacity: 0.68,
                cursor: 'not-allowed',
                gridColumn: '1 / -1',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  margin: '0 auto 9px',
                  borderRadius: 11,
                  background: 'rgba(110, 118, 129, 0.12)',
                  border: '1px solid rgba(110, 118, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="#6e7681" strokeWidth="1.5" />
                  <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#6e7681" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#8b949e', marginBottom: '5px' }}>Custom Bot</div>
              <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#e3b341', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                In Development
              </div>
            </div>
          </div>
        )}

        {selectedBot && (
          <div style={{ width: '100%', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 13,
                  background: 'rgba(46, 230, 197, 0.08)',
                  border: '1px solid rgba(46, 230, 197, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {botMeta[selectedBot].icon}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Create Bot
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#e6edf3' }}>
                  {botMeta[selectedBot].title}
                </div>
              </div>
            </div>

            {/* Investment */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Investment
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 60px 12px 14px',
                    borderRadius: 10,
                    border: '1px solid #30363d',
                    background: '#0d1117',
                    color: '#e6edf3',
                    fontSize: 15,
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(46,230,197,0.45)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#30363d';
                  }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6e7681', fontSize: 13, fontWeight: 600 }}>
                  USDC
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#6e7681' }}>
                Balance: <span style={{ color: '#2ee6c5' }}>{balance} USDC</span>
              </div>
            </div>

            {/* Direction */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Direction
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDirection('LONG')}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 10,
                    border: direction === 'LONG' ? '1px solid rgba(63,185,80,0.5)' : '1px solid #30363d',
                    background: direction === 'LONG' ? 'rgba(63,185,80,0.12)' : 'rgba(13,17,23,0.6)',
                    color: direction === 'LONG' ? '#3fb950' : '#8b949e',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  LONG
                </button>
                <button
                  disabled
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 10,
                    border: '1px solid #30363d',
                    background: 'rgba(13,17,23,0.4)',
                    color: '#484f58',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'not-allowed',
                  }}
                >
                  SHORT
                  <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, color: '#6e7681' }}>Unavailable</div>
                </button>
              </div>
            </div>

            {/* Leverage slider */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '10px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                <span>Leverage · max 3×</span>
                <span style={{ color: '#2ee6c5', fontSize: 15, fontWeight: 700 }}>{leverage}×</span>
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 4,
                  appearance: 'none',
                  background: `linear-gradient(to right, #2ee6c5 0%, #2ee6c5 ${((leverage - 1) / 2) * 100}%, #30363d ${((leverage - 1) / 2) * 100}%, #30363d 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#6e7681' }}>
                <span>1×</span>
                <span>2×</span>
                <span>3×</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setMarginMode('cross')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    border: marginMode === 'cross' ? '1px solid rgba(46,230,197,0.5)' : '1px solid #30363d',
                    background: marginMode === 'cross' ? 'rgba(46,230,197,0.12)' : 'rgba(13,17,23,0.6)',
                    color: marginMode === 'cross' ? '#2ee6c5' : '#8b949e',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cross
                </button>
                <button
                  onClick={() => setMarginMode('isolated')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    border: marginMode === 'isolated' ? '1px solid rgba(46,230,197,0.5)' : '1px solid #30363d',
                    background: marginMode === 'isolated' ? 'rgba(46,230,197,0.12)' : 'rgba(13,17,23,0.6)',
                    color: marginMode === 'isolated' ? '#2ee6c5' : '#8b949e',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Isolated
                </button>
              </div>
            </div>

            {/* Mode */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Mode
                <HelpTip text="Affects risk level, averaging, stop-losses and sensitivity to entry filters." />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(
                  [
                    { id: 'positional' as TradeMode, title: 'Positional', note: '1D timeframe' },
                    { id: 'normal' as TradeMode, title: 'Normal', note: '1H / 4H' },
                    { id: 'aggressive' as TradeMode, title: 'Aggressive', note: 'Scalping mode' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setTradeMode(m.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: tradeMode === m.id ? '1px solid rgba(46,230,197,0.5)' : '1px solid #30363d',
                      background: tradeMode === m.id ? 'rgba(46,230,197,0.1)' : 'rgba(13,17,23,0.6)',
                      color: tradeMode === m.id ? '#e6edf3' : '#8b949e',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</span>
                    <span style={{ fontSize: 12, color: tradeMode === m.id ? '#2ee6c5' : '#6e7681' }}>{m.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trading Range */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Trading Range
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Low"
                  value={rangeLow}
                  onChange={(e) => setRangeLow(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    borderRadius: 10,
                    border: '1px solid #30363d',
                    background: '#0d1117',
                    color: '#e6edf3',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ color: '#6e7681', fontSize: 13 }}>–</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="High"
                  value={rangeHigh}
                  onChange={(e) => setRangeHigh(e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{
                    flex: 1,
                    padding: '11px 12px',
                    borderRadius: 10,
                    border: '1px solid #30363d',
                    background: '#0d1117',
                    color: '#e6edf3',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Modules */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#8b949e', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Modules
                <HelpTip text="Filtering and decision-making systems with different trading approaches. Recommended to enable all of them." />
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Toggle label="Technical Analysis" active={taEnabled} onClick={() => setTaEnabled((v) => !v)} />
                  <Toggle label="Order Flow" active={orderFlowEnabled} onClick={() => setOrderFlowEnabled((v) => !v)} />
                </div>
                <Toggle label="Volumes & Liquidations" active={volumesEnabled} onClick={() => setVolumesEnabled((v) => !v)} />
              </div>
            </div>

            <button
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
                color: '#0b0e14',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(46, 230, 197, 0.25)',
              }}
            >
              Create {botMeta[selectedBot].title}
            </button>

            <button
              onClick={() => setSelectedBot(null)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '11px',
                borderRadius: 10,
                border: '1px solid rgba(46, 230, 197, 0.25)',
                background: 'transparent',
                color: '#2ee6c5',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to bots
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '14px',
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
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #2ee6c5;
              cursor: pointer;
              border: 2px solid #0b0e14;
              box-shadow: 0 0 8px rgba(46, 230, 197, 0.45);
            }
            input[type=range]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: #2ee6c5;
              cursor: pointer;
              border: 2px solid #0b0e14;
              box-shadow: 0 0 8px rgba(46, 230, 197, 0.45);
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
