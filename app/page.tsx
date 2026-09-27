'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type BotType = 'Grid' | 'DCA' | 'Combo' | 'Quant' | null;
type Tool = 'none' | 'arrowUp' | 'arrowDown' | 'buyLevel' | 'sellLevel';
type Interval = '1h' | '4h' | '1d';

interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface Marker {
  id: number;
  type: 'arrowUp' | 'arrowDown' | 'buyLevel' | 'sellLevel';
  index?: number;
  price?: number;
}

export default function Home() {
  const [selectedBot, setSelectedBot] = useState<BotType>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [tool, setTool] = useState<Tool>('none');
  const [showTools, setShowTools] = useState(false);
  const [interval, setInterval] = useState<Interval>('1h');
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // Stats
  const [wins, setWins] = useState(47);
  const [losses, setLosses] = useState(12);
  const [invested, setInvested] = useState('2,450.00');
  const [pnl1d, setPnl1d] = useState('+3.82%');
  const [pnl1w, setPnl1w] = useState('+11.4%');
  const [pnl1m, setPnl1m] = useState('+28.7%');
  const [pnlAll, setPnlAll] = useState('+64.2%');

  const winrate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

  const calcSharpe = () => {
    const total = wins + losses;
    if (total === 0) return '0.00';
    const wr = wins / total;
    const pnl = parseFloat(String(pnlAll).replace(/[^0-9.\-]/g, '')) || 0;
    const lossRatio = losses / total;
    let sharpe = wr * 2.8 + pnl / 40 - lossRatio * 1.1;
    sharpe = Math.max(0.15, Math.min(4.2, sharpe));
    return sharpe.toFixed(2);
  };
  const sharpe = calcSharpe();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerId = useRef(0);

  const fetchCandles = useCallback(async (tf: Interval) => {
    setLoadingChart(true);
    try {
      const end = Date.now();
      const days = tf === '1h' ? 14 : tf === '4h' ? 45 : 180;
      const start = end - days * 24 * 60 * 60 * 1000;
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: { coin: 'BTC', interval: tf, startTime: start, endTime: end },
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const parsed: Candle[] = data.map((c: any) => ({
          t: c.t,
          o: parseFloat(c.o),
          h: parseFloat(c.h),
          l: parseFloat(c.l),
          c: parseFloat(c.c),
          v: parseFloat(c.v),
        }));
        setCandles(parsed);
        setOffset(Math.max(0, parsed.length - 70));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBot) fetchCandles(interval);
  }, [selectedBot, interval, fetchCandles]);

  // Draw chart
  useEffect(() => {
    if (!selectedBot || !candles.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 6;
    const padR = 62;
    const padT = 12;
    const padB = 24;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const visibleCount = Math.min(70, candles.length);
    const startIdx = Math.max(0, Math.min(offset, candles.length - visibleCount));
    const visible = candles.slice(startIdx, startIdx + visibleCount);
    if (!visible.length) return;

    const prices = visible.flatMap((c) => [c.h, c.l]);
    const minP = Math.min(...prices) * 0.9985;
    const maxP = Math.max(...prices) * 1.0015;
    const range = maxP - minP || 1;

    const xScale = (i: number) => padL + (i / (visibleCount - 1 || 1)) * chartW;
    const yScale = (p: number) => padT + ((maxP - p) / range) * chartH;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(48, 54, 61, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#8b949e';
    ctx.font = '10.5px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const p = maxP - (i / 4) * range;
      ctx.fillText(p.toFixed(0), W - padR + 5, padT + (i / 4) * chartH + 3.5);
    }

    const candleW = Math.max(2.8, (chartW / visibleCount) * 0.62);
    visible.forEach((c, i) => {
      const x = xScale(i);
      const yO = yScale(c.o);
      const yC = yScale(c.c);
      const yH = yScale(c.h);
      const yL = yScale(c.l);
      const up = c.c >= c.o;
      const color = up ? '#3fb950' : '#f85149';

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();

      ctx.fillStyle = color;
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(1.4, Math.abs(yC - yO));
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    markers.forEach((m) => {
      if (m.type === 'arrowUp' && m.index !== undefined) {
        const localIdx = m.index - startIdx;
        if (localIdx < 0 || localIdx >= visible.length) return;
        const c = visible[localIdx];
        const x = xScale(localIdx);
        const y = yScale(c.l) + 12;
        ctx.fillStyle = '#3fb950';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6.5, y + 11);
        ctx.lineTo(x + 6.5, y + 11);
        ctx.closePath();
        ctx.fill();
      }
      if (m.type === 'arrowDown' && m.index !== undefined) {
        const localIdx = m.index - startIdx;
        if (localIdx < 0 || localIdx >= visible.length) return;
        const c = visible[localIdx];
        const x = xScale(localIdx);
        const y = yScale(c.h) - 12;
        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6.5, y - 11);
        ctx.lineTo(x + 6.5, y - 11);
        ctx.closePath();
        ctx.fill();
      }
      if ((m.type === 'buyLevel' || m.type === 'sellLevel') && m.price !== undefined) {
        const y = yScale(m.price);
        if (y < padT - 4 || y > padT + chartH + 4) return;
        ctx.strokeStyle = m.type === 'buyLevel' ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4.5, 3.5]);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = m.type === 'buyLevel' ? '#3fb950' : '#f85149';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(m.price.toFixed(0), W - padR - 3, y - 3);
      }
    });

    ctx.fillStyle = '#6e7681';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    [0, Math.floor(visible.length / 2), visible.length - 1].forEach((i) => {
      if (i >= visible.length) return;
      const d = new Date(visible[i].t);
      const label =
        interval === '1d'
          ? `${d.getDate()}/${d.getMonth() + 1}`
          : `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:00`;
      ctx.fillText(label, xScale(i), H - 6);
    });

    const last = visible[visible.length - 1];
    if (last) {
      const y = yScale(last.c);
      ctx.strokeStyle = 'rgba(46,230,197,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2ee6c5';
      ctx.fillRect(W - padR + 1, y - 8, 54, 16);
      ctx.fillStyle = '#0b0e14';
      ctx.font = 'bold 10.5px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(last.c.toFixed(0), W - padR + 28, y + 3.5);
    }
  }, [selectedBot, candles, offset, markers, interval]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current || !candles.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'none' || !showTools) {
      setDragging(true);
      setDragStartX(e.clientX);
      setDragStartOffset(offset);
      return;
    }

    const padL = 6;
    const padR = 62;
    const padT = 12;
    const padB = 24;
    const chartW = rect.width - padL - padR;
    const chartH = rect.height - padT - padB;
    const visibleCount = Math.min(70, candles.length);
    const startIdx = Math.max(0, Math.min(offset, candles.length - visibleCount));
    const visible = candles.slice(startIdx, startIdx + visibleCount);
    if (!visible.length) return;

    const prices = visible.flatMap((c) => [c.h, c.l]);
    const minP = Math.min(...prices) * 0.9985;
    const maxP = Math.max(...prices) * 1.0015;
    const range = maxP - minP || 1;

    if (tool === 'arrowUp' || tool === 'arrowDown') {
      const idxLocal = Math.round(((x - padL) / chartW) * (visibleCount - 1));
      if (idxLocal < 0 || idxLocal >= visible.length) return;
      setMarkers((prev) => [...prev, { id: ++markerId.current, type: tool, index: startIdx + idxLocal }]);
    } else if (tool === 'buyLevel' || tool === 'sellLevel') {
      const price = maxP - ((y - padT) / chartH) * range;
      setMarkers((prev) => [...prev, { id: ++markerId.current, type: tool, price }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const delta = Math.round(-dx / 7.5);
    const maxOffset = Math.max(0, candles.length - 70);
    setOffset(Math.max(0, Math.min(maxOffset, dragStartOffset + delta)));
  };

  const handlePointerUp = () => setDragging(false);

  const handleBotClick = (bot: BotType) => {
    if (!bot) return;
    setSelectedBot(bot);
    setMarkers([]);
    setTool('none');
    setShowTools(false);
    setInterval('1h');
  };

  const Editable = ({
    value,
    onChange,
    color = '#e6edf3',
    fontSize = '14px',
    fontWeight = 600,
  }: {
    value: string | number;
    onChange: (v: string) => void;
    color?: string;
    fontSize?: string;
    fontWeight?: number;
  }) => (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent || '')}
      style={{
        color,
        fontSize,
        fontWeight,
        outline: 'none',
        border: 'none',
        background: 'transparent',
        cursor: 'text',
        minWidth: '12px',
        display: 'inline-block',
      }}
    >
      {value}
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
          maxWidth: selectedBot ? '740px' : '620px',
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

        {/* Logo */}
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
            fontSize: selectedBot ? '16px' : '17px',
            fontWeight: 600,
            margin: '0 0 20px',
            letterSpacing: '-0.01em',
          }}
        >
          {selectedBot ? 'My Test QuantBot (#6)' : 'Create Bot'}
        </p>

        {/* BOT CARDS */}
        {!selectedBot && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
              gap: '11px',
              marginBottom: '6px',
            }}
          >
            {[
              {
                id: 'Grid' as BotType,
                title: 'Grid',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.7" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#5ef0d4" strokeWidth="1.7" />
                  </svg>
                ),
                points: ['Extract profit from volatility', 'Market making', 'Trailing for every grid'],
              },
              {
                id: 'DCA' as BotType,
                title: 'DCA',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M4 18h16" stroke="#2ee6c5" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M6 18V14" stroke="#2ee6c5" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M10 18V11" stroke="#2ee6c5" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M14 18V8" stroke="#5ef0d4" strokeWidth="2.1" strokeLinecap="round" />
                    <path d="M18 18V5" stroke="#5ef0d4" strokeWidth="2.1" strokeLinecap="round" />
                  </svg>
                ),
                points: ['Use averaging', 'Take profit on any market', 'Technical + Order Flow'],
              },
              {
                id: 'Combo' as BotType,
                title: 'Combo',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="9" cy="12" r="5.2" stroke="#2ee6c5" strokeWidth="1.6" />
                    <circle cx="15" cy="12" r="5.2" stroke="#5ef0d4" strokeWidth="1.6" />
                  </svg>
                ),
                points: ['Combined strategy', 'Grid stability', 'DCA reliability'],
              },
              {
                id: 'Quant' as BotType,
                title: 'Quant',
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17l5-6 4 3 5-8 4 4" stroke="#2ee6c5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 20h18" stroke="#5ef0d4" strokeWidth="1.4" opacity="0.5" />
                  </svg>
                ),
                points: ['3 trading systems', 'Order Flow + TA', 'Pump/dump protection'],
              },
            ].map((bot) => (
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
                  {bot.icon}
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

        {/* CHART VIEW */}
        {selectedBot && (
          <div style={{ width: '100%' }}>
            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <button
                onClick={() => {
                  setShowTools((v) => !v);
                  if (showTools) setTool('none');
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: showTools ? '1px solid rgba(46,230,197,0.5)' : '1px solid #30363d',
                  background: showTools ? 'rgba(46,230,197,0.1)' : 'rgba(13,17,23,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: showTools ? '#2ee6c5' : '#8b949e',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" strokeLinecap="round" />
                </svg>
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['1h', '4h', '1d'] as Interval[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setInterval(tf)}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 8,
                      border: interval === tf ? '1px solid rgba(46,230,197,0.5)' : '1px solid #30363d',
                      background: interval === tf ? 'rgba(46,230,197,0.12)' : 'rgba(13,17,23,0.8)',
                      color: interval === tf ? '#2ee6c5' : '#8b949e',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools */}
            {showTools && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', justifyContent: 'center', marginBottom: '10px' }}>
                {[
                  { id: 'none' as Tool, label: 'Pan' },
                  { id: 'arrowUp' as Tool, label: '↑ Entry' },
                  { id: 'arrowDown' as Tool, label: '↓ Exit' },
                  { id: 'buyLevel' as Tool, label: 'Buy Level' },
                  { id: 'sellLevel' as Tool, label: 'Sell Level' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    style={{
                      padding: '6px 11px',
                      borderRadius: 8,
                      border: tool === t.id ? '1px solid rgba(46,230,197,0.55)' : '1px solid #30363d',
                      background: tool === t.id ? 'rgba(46,230,197,0.12)' : 'rgba(13,17,23,0.8)',
                      color: tool === t.id ? '#2ee6c5' : '#8b949e',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  onClick={() => setMarkers([])}
                  style={{
                    padding: '6px 11px',
                    borderRadius: 8,
                    border: '1px solid #30363d',
                    background: 'rgba(13,17,23,0.8)',
                    color: '#8b949e',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            )}

            {/* Chart */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '320px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #21262d',
                background: '#0d1117',
              }}
            >
              {loadingChart && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b949e',
                    fontSize: '13px',
                    zIndex: 2,
                    background: 'rgba(13,17,23,0.75)',
                  }}
                >
                  Loading BTC {interval.toUpperCase()}…
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  cursor: tool === 'none' || !showTools ? (dragging ? 'grabbing' : 'grab') : 'crosshair',
                  display: 'block',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

            <div style={{ marginTop: '7px', fontSize: '10.5px', color: '#6e7681', display: 'flex', justifyContent: 'space-between' }}>
              <span>BTC-PERP · {interval.toUpperCase()} · Hyperliquid</span>
              <span>Drag to pan</span>
            </div>

            {/* STATS PANEL */}
            <div
              style={{
                marginTop: '16px',
                background: 'rgba(13, 17, 23, 0.65)',
                border: '1px solid rgba(48, 54, 61, 0.85)',
                borderRadius: '14px',
                padding: '16px 16px 14px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Performance
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(63,185,80,0.08)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(63,185,80,0.15)' }}>
                  <div style={{ fontSize: '10.5px', color: '#8b949e', marginBottom: 3 }}>Closed in Profit</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>
                    <Editable value={wins} onChange={(v) => setWins(parseInt(v.replace(/\D/g, '') || '0'))} color="#3fb950" fontSize="18px" />
                  </div>
                </div>
                <div style={{ background: 'rgba(248,81,73,0.08)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(248,81,73,0.15)' }}>
                  <div style={{ fontSize: '10.5px', color: '#8b949e', marginBottom: 3 }}>Stop Losses</div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>
                    <Editable value={losses} onChange={(v) => setLosses(parseInt(v.replace(/\D/g, '') || '0'))} color="#f85149" fontSize="18px" />
                  </div>
                </div>
                <div style={{ background: 'rgba(46,230,197,0.07)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(46,230,197,0.15)' }}>
                  <div style={{ fontSize: '10.5px', color: '#8b949e', marginBottom: 3 }}>Winrate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2ee6c5' }}>{winrate}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '0 2px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Invested</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#e6edf3' }}>
                  $<Editable value={invested} onChange={setInvested} color="#e6edf3" fontSize="15px" />
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: '1D', value: pnl1d, set: setPnl1d },
                  { label: '1W', value: pnl1w, set: setPnl1w },
                  { label: '1M', value: pnl1m, set: setPnl1m },
                  { label: 'All', value: pnlAll, set: setPnlAll },
                ].map((item) => {
                  const isPos = String(item.value).trim().startsWith('+') || (!String(item.value).trim().startsWith('-') && parseFloat(String(item.value)) >= 0);
                  return (
                    <div
                      key={item.label}
                      style={{
                        background: isPos ? 'rgba(63,185,80,0.07)' : 'rgba(248,81,73,0.07)',
                        borderRadius: 9,
                        padding: '9px 8px',
                        textAlign: 'center',
                        border: `1px solid ${isPos ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)'}`,
                      }}
                    >
                      <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                        <Editable value={item.value} onChange={item.set} color={isPos ? '#3fb950' : '#f85149'} fontSize="13.5px" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '11px',
                  borderTop: '1px solid rgba(48,54,61,0.6)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#8b949e',
                }}
              >
                <span>Avg. Hold · <span style={{ color: '#e6edf3', fontWeight: 600 }}>4.2h</span></span>
                <span>Max DD · <span style={{ color: '#f85149', fontWeight: 600 }}>-6.8%</span></span>
                <span>Sharpe · <span style={{ color: '#2ee6c5', fontWeight: 600 }}>{sharpe}</span></span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedBot(null);
                setMarkers([]);
                setTool('none');
                setShowTools(false);
              }}
              style={{
                marginTop: '16px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(46, 230, 197, 0.3)',
                background: 'rgba(46, 230, 197, 0.06)',
                color: '#2ee6c5',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ← Back to bots
            </button>
          </div>
        )}

        {/* Footer */}
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
