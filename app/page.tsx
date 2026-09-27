'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type BotType = 'Grid' | 'DCA' | 'Combo' | 'Quant' | null;
type Tool = 'none' | 'arrowUp' | 'arrowDown' | 'buyLevel' | 'sellLevel';

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
  // for arrows: candle index, for levels: price
  index?: number;
  price?: number;
}

export default function Home() {
  const [selectedBot, setSelectedBot] = useState<BotType>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [tool, setTool] = useState<Tool>('none');
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [offset, setOffset] = useState(0); // pan offset in candles
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerId = useRef(0);

  // Fetch real BTC 1h candles from Hyperliquid
  const fetchCandles = useCallback(async () => {
    setLoadingChart(true);
    try {
      const end = Date.now();
      const start = end - 14 * 24 * 60 * 60 * 1000; // 14 days
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'candleSnapshot',
          req: {
            coin: 'BTC',
            interval: '1h',
            startTime: start,
            endTime: end,
          },
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
        setOffset(Math.max(0, parsed.length - 80)); // show last ~80 candles
      }
    } catch (e) {
      console.error('Failed to load candles', e);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBot) fetchCandles();
  }, [selectedBot, fetchCandles]);

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
    const padL = 8;
    const padR = 68;
    const padT = 16;
    const padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    // visible range
    const visibleCount = Math.min(80, candles.length);
    const startIdx = Math.max(0, Math.min(offset, candles.length - visibleCount));
    const endIdx = Math.min(candles.length, startIdx + visibleCount);
    const visible = candles.slice(startIdx, endIdx);

    if (!visible.length) return;

    const prices = visible.flatMap((c) => [c.h, c.l]);
    const minP = Math.min(...prices) * 0.998;
    const maxP = Math.max(...prices) * 1.002;
    const range = maxP - minP || 1;

    const xScale = (i: number) => padL + (i / (visibleCount - 1 || 1)) * chartW;
    const yScale = (p: number) => padT + ((maxP - p) / range) * chartH;

    // background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // grid lines
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }

    // price labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const p = maxP - (i / 4) * range;
      const y = padT + (i / 4) * chartH;
      ctx.fillText(p.toFixed(0), W - padR + 6, y + 4);
    }

    // candles
    const candleW = Math.max(3, (chartW / visibleCount) * 0.65);
    visible.forEach((c, i) => {
      const x = xScale(i);
      const yO = yScale(c.o);
      const yC = yScale(c.c);
      const yH = yScale(c.h);
      const yL = yScale(c.l);
      const up = c.c >= c.o;
      const color = up ? '#3fb950' : '#f85149';

      // wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();

      // body
      ctx.fillStyle = color;
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(1.5, Math.abs(yC - yO));
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // markers
    markers.forEach((m) => {
      if (m.type === 'arrowUp' && m.index !== undefined) {
        const localIdx = m.index - startIdx;
        if (localIdx < 0 || localIdx >= visible.length) return;
        const c = visible[localIdx];
        const x = xScale(localIdx);
        const y = yScale(c.l) + 14;
        ctx.fillStyle = '#3fb950';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 12);
        ctx.lineTo(x + 7, y + 12);
        ctx.closePath();
        ctx.fill();
      }
      if (m.type === 'arrowDown' && m.index !== undefined) {
        const localIdx = m.index - startIdx;
        if (localIdx < 0 || localIdx >= visible.length) return;
        const c = visible[localIdx];
        const x = xScale(localIdx);
        const y = yScale(c.h) - 14;
        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y - 12);
        ctx.lineTo(x + 7, y - 12);
        ctx.closePath();
        ctx.fill();
      }
      if ((m.type === 'buyLevel' || m.type === 'sellLevel') && m.price !== undefined) {
        const y = yScale(m.price);
        if (y < padT || y > padT + chartH) return;
        ctx.strokeStyle = m.type === 'buyLevel' ? 'rgba(63, 185, 80, 0.85)' : 'rgba(248, 81, 73, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();
        ctx.setLineDash([]);
        // label
        ctx.fillStyle = m.type === 'buyLevel' ? '#3fb950' : '#f85149';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(m.price.toFixed(0), W - padR - 4, y - 4);
      }
    });

    // time labels (first / mid / last)
    ctx.fillStyle = '#6e7681';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    [0, Math.floor(visible.length / 2), visible.length - 1].forEach((i) => {
      if (i >= visible.length) return;
      const d = new Date(visible[i].t);
      const label = `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:00`;
      ctx.fillText(label, xScale(i), H - 8);
    });

    // current price line
    const last = visible[visible.length - 1];
    if (last) {
      const y = yScale(last.c);
      ctx.strokeStyle = 'rgba(46, 230, 197, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2ee6c5';
      ctx.fillRect(W - padR + 2, y - 9, 58, 18);
      ctx.fillStyle = '#0b0e14';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(last.c.toFixed(0), W - padR + 31, y + 4);
    }
  }, [selectedBot, candles, offset, markers]);

  // Mouse handlers for pan + place markers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current || !candles.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'none') {
      setDragging(true);
      setDragStartX(e.clientX);
      setDragStartOffset(offset);
      return;
    }

    // place marker
    const padL = 8;
    const padR = 68;
    const padT = 16;
    const padB = 28;
    const chartW = rect.width - padL - padR;
    const chartH = rect.height - padT - padB;
    const visibleCount = Math.min(80, candles.length);
    const startIdx = Math.max(0, Math.min(offset, candles.length - visibleCount));
    const visible = candles.slice(startIdx, startIdx + visibleCount);

    if (!visible.length) return;

    const prices = visible.flatMap((c) => [c.h, c.l]);
    const minP = Math.min(...prices) * 0.998;
    const maxP = Math.max(...prices) * 1.002;
    const range = maxP - minP || 1;

    if (tool === 'arrowUp' || tool === 'arrowDown') {
      const idxLocal = Math.round(((x - padL) / chartW) * (visibleCount - 1));
      if (idxLocal < 0 || idxLocal >= visible.length) return;
      const globalIdx = startIdx + idxLocal;
      setMarkers((prev) => [
        ...prev,
        { id: ++markerId.current, type: tool, index: globalIdx },
      ]);
    } else if (tool === 'buyLevel' || tool === 'sellLevel') {
      const price = maxP - ((y - padT) / chartH) * range;
      setMarkers((prev) => [
        ...prev,
        { id: ++markerId.current, type: tool, price },
      ]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const candleStep = 8; // px per candle approx
    const delta = Math.round(-dx / candleStep);
    const visibleCount = 80;
    const maxOffset = Math.max(0, candles.length - visibleCount);
    setOffset(Math.max(0, Math.min(maxOffset, dragStartOffset + delta)));
  };

  const handlePointerUp = () => setDragging(false);

  const handleBotClick = (bot: BotType) => {
    if (!bot) return;
    setSelectedBot(bot);
    setMarkers([]);
    setTool('none');
  };

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
          padding: '36px 24px 28px',
          maxWidth: selectedBot ? '720px' : '620px',
          width: '100%',
          textAlign: 'center',
          boxShadow:
            '0 0 0 1px rgba(46, 230, 197, 0.04), 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 80px rgba(46, 230, 197, 0.04)',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* top accent line */}
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(46, 230, 197, 0.35)',
              boxShadow: '0 0 20px rgba(46, 230, 197, 0.15)',
              background: '#05080c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/iconhq.png"
              alt="Hyper Quant"
              width={48}
              height={48}
              style={{ display: 'block', objectFit: 'contain' }}
            />
          </div>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          HYPER QUANT
        </h1>

        {/* Title changes */}
        <p
          style={{
            color: selectedBot ? '#e6edf3' : '#e6edf3',
            fontSize: selectedBot ? '17px' : '18px',
            fontWeight: 600,
            lineHeight: 1.4,
            margin: '0 0 22px',
            letterSpacing: '-0.01em',
          }}
        >
          {selectedBot ? 'My Test QuantBot (#6)' : 'Create Bot'}
        </p>

        {/* BOT SELECTION */}
        {!selectedBot && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '8px',
              width: '100%',
            }}
          >
            {/* GRID */}
            <div
              onClick={() => handleBotClick('Grid')}
              style={{
                background: 'rgba(13, 17, 23, 0.7)',
                border: '1px solid rgba(48, 54, 61, 0.9)',
                borderRadius: '14px',
                padding: '16px 12px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(46, 230, 197, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 10px',
                  borderRadius: 12,
                  background: 'rgba(46, 230, 197, 0.08)',
                  border: '1px solid rgba(46, 230, 197, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#2ee6c5" strokeWidth="1.8" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#5ef0d4" strokeWidth="1.8" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#e6edf3', marginBottom: '6px' }}>Grid</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '11px', lineHeight: 1.4, color: '#8b949e', textAlign: 'left' }}>
                <li style={{ marginBottom: 3 }}>• Extract profit from volatility</li>
                <li style={{ marginBottom: 3 }}>• Market making</li>
                <li>• Trailing for every grid</li>
              </ul>
            </div>

            {/* DCA */}
            <div
              onClick={() => handleBotClick('DCA')}
              style={{
                background: 'rgba(13, 17, 23, 0.7)',
                border: '1px solid rgba(48, 54, 61, 0.9)',
                borderRadius: '14px',
                padding: '16px 12px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(46, 230, 197, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 10px',
                  borderRadius: 12,
                  background: 'rgba(46, 230, 197, 0.08)',
                  border: '1px solid rgba(46, 230, 197, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18h16" stroke="#2ee6c5" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6 18V14" stroke="#2ee6c5" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M10 18V11" stroke="#2ee6c5" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M14 18V8" stroke="#5ef0d4" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M18 18V5" stroke="#5ef0d4" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#e6edf3', marginBottom: '6px' }}>DCA</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '11px', lineHeight: 1.4, color: '#8b949e', textAlign: 'left' }}>
                <li style={{ marginBottom: 3 }}>• Use averaging</li>
                <li style={{ marginBottom: 3 }}>• Take profit on any market</li>
                <li>• Technical + Order Flow filters</li>
              </ul>
            </div>

            {/* COMBO */}
            <div
              onClick={() => handleBotClick('Combo')}
              style={{
                background: 'rgba(13, 17, 23, 0.7)',
                border: '1px solid rgba(48, 54, 61, 0.9)',
                borderRadius: '14px',
                padding: '16px 12px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(46, 230, 197, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 10px',
                  borderRadius: 12,
                  background: 'rgba(46, 230, 197, 0.08)',
                  border: '1px solid rgba(46, 230, 197, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="12" r="5.5" stroke="#2ee6c5" strokeWidth="1.7" />
                  <circle cx="15" cy="12" r="5.5" stroke="#5ef0d4" strokeWidth="1.7" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#e6edf3', marginBottom: '6px' }}>Combo</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '11px', lineHeight: 1.4, color: '#8b949e', textAlign: 'left' }}>
                <li style={{ marginBottom: 3 }}>• Combined strategy</li>
                <li style={{ marginBottom: 3 }}>• Grid stability</li>
                <li>• DCA reliability</li>
              </ul>
            </div>

            {/* QUANT */}
            <div
              onClick={() => handleBotClick('Quant')}
              style={{
                background: 'rgba(13, 17, 23, 0.7)',
                border: '1px solid rgba(48, 54, 61, 0.9)',
                borderRadius: '14px',
                padding: '16px 12px 14px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 18px rgba(46, 230, 197, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(48, 54, 61, 0.9)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 10px',
                  borderRadius: 12,
                  background: 'rgba(46, 230, 197, 0.08)',
                  border: '1px solid rgba(46, 230, 197, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17l5-6 4 3 5-8 4 4" stroke="#2ee6c5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 20h18" stroke="#5ef0d4" strokeWidth="1.5" opacity="0.5" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#e6edf3', marginBottom: '6px' }}>Quant</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '11px', lineHeight: 1.4, color: '#8b949e', textAlign: 'left' }}>
                <li style={{ marginBottom: 2 }}>• 3 trading systems</li>
                <li style={{ marginBottom: 2 }}>• Order Flow + TA</li>
                <li>• Pump/dump protection</li>
              </ul>
            </div>

            {/* CUSTOM - disabled */}
            <div
              style={{
                background: 'rgba(13, 17, 23, 0.4)',
                border: '1px solid rgba(48, 54, 61, 0.55)',
                borderRadius: '14px',
                padding: '16px 12px 14px',
                textAlign: 'center',
                opacity: 0.7,
                cursor: 'not-allowed',
                gridColumn: '1 / -1',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  margin: '0 auto 10px',
                  borderRadius: 12,
                  background: 'rgba(110, 118, 129, 0.12)',
                  border: '1px solid rgba(110, 118, 129, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="#6e7681" strokeWidth="1.6" />
                  <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#6e7681" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#8b949e', marginBottom: '6px' }}>Custom Bot</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e3b341', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                In Development
              </div>
            </div>
          </div>
        )}

        {/* CHART VIEW */}
        {selectedBot && (
          <div style={{ width: '100%' }}>
            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                marginBottom: '12px',
              }}
            >
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
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: tool === t.id ? '1px solid rgba(46, 230, 197, 0.55)' : '1px solid #30363d',
                    background: tool === t.id ? 'rgba(46, 230, 197, 0.12)' : 'rgba(13, 17, 23, 0.8)',
                    color: tool === t.id ? '#2ee6c5' : '#8b949e',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => setMarkers([])}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  background: 'rgba(13, 17, 23, 0.8)',
                  color: '#8b949e',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>

            {/* Chart container */}
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '340px',
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
                    fontSize: '14px',
                    zIndex: 2,
                    background: 'rgba(13,17,23,0.7)',
                  }}
                >
                  Loading BTC 1h candles…
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  cursor: tool === 'none' ? (dragging ? 'grabbing' : 'grab') : 'crosshair',
                  display: 'block',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '11px',
                color: '#6e7681',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>BTC-PERP · 1h · Hyperliquid</span>
              <span>Drag to pan · Click to place markers</span>
            </div>

            {/* Back button */}
            <button
              onClick={() => {
                setSelectedBot(null);
                setMarkers([]);
                setTool('none');
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
            marginTop: '22px',
            paddingTop: '16px',
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
