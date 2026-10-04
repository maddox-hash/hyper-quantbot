'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignTypedData } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// --- SETTINGS ---
const BUILDER_ADDRESS = '0x8E5B541b59C43cCD688215C1c52CB6E4B885D5e9';
const MAX_FEE_RATE = '0.03%';
const HYPERLIQUID_EXCHANGE = 'https://api.hyperliquid.xyz/exchange';
const HYPERLIQUID_INFO = 'https://api.hyperliquid.xyz/info';
const TELEGRAM_BOT_URL = 'https://t.me/hyperquant_trade_bot';
const AGENT_NAME = 'HyperQuant';
const MIN_BALANCE_USD = 50;
const TARGET_ABSTRACTION = 'unifiedAccount' as const;

const domain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 42161,
  verifyingContract: '0x0000000000000000000000000000000000000000',
} as const;

const agentTypes = {
  'HyperliquidTransaction:ApproveAgent': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'agentAddress', type: 'address' },
    { name: 'agentName', type: 'string' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

const builderFeeTypes = {
  'HyperliquidTransaction:ApproveBuilderFee': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

const abstractionTypes = {
  'HyperliquidTransaction:UserSetAbstraction': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'user', type: 'address' },
    { name: 'abstraction', type: 'string' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

type FaqItem = {
  q: string;
  a?: React.ReactNode;
  demo?: 'quant' | 'bots';
};

function splitSignature(signature: `0x${string}`) {
  return {
    r: signature.slice(0, 66) as `0x${string}`,
    s: (`0x${signature.slice(66, 130)}`) as `0x${string}`,
    v: parseInt(signature.slice(130, 132), 16),
  };
}

function isUserRejected(message: string) {
  return /reject|denied|cancel|user rejected/i.test(message);
}

async function submitToHyperliquid(
  action: Record<string, unknown>,
  signature: { r: string; s: string; v: number },
  nonce: number
) {
  const res = await fetch(HYPERLIQUID_EXCHANGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, nonce, signature }),
  });
  const data = await res.json();
  if (data.status !== 'ok') {
    throw new Error(
      data.response ? JSON.stringify(data.response) : 'Hyperliquid API rejected the action'
    );
  }
  return data;
}

async function hlInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(HYPERLIQUID_INFO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Info API HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

type AccountInfo = {
  balance: number | null;
  agent: { name: string; address: string } | null;
  abstraction: string | null;
  loading: boolean;
  error: string | null;
};

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        background: ok ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
        color: ok ? '#3fb950' : '#f85149',
      }}
      aria-hidden
    >
      {ok ? '✓' : '✗'}
    </span>
  );
}

function isAbstractionOk(mode: string | null) {
  return mode === 'unifiedAccount';
}

const hl = (text: string) => (
  <span style={{ color: '#2ee6c5', fontWeight: 700 }}>{text}</span>
);

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What bots do you offer?',
    a: (
      <>
        Classic {hl('DCA')}, {hl('Grid')} and {hl('Combo')} bots — with optional indicators,
        signals and webhooks. Flexible trailing is supported, including per-level trailing
        inside the Grid bot.
        <br />
        <br />
        {hl('Quant Bot')} combines three built-in strategies to decide trade entries.
        <br />
        <br />A {hl('Custom Bot')} is also in development and will offer the most flexible
        settings.
      </>
    ),
    demo: 'bots',
  },
  {
    q: 'Do you have access to my funds?',
    a: (
      <>
        No. You only create a trading agent on Hyperliquid and connect its API so our bots can
        trade on your behalf. We never hold your funds or private keys.{' '}
        <span
          style={{
            color: '#e6edf3',
            fontWeight: 600,
            background: 'rgba(46, 230, 197, 0.1)',
            borderLeft: '2px solid #2ee6c5',
            padding: '2px 8px',
            display: 'inline',
            borderRadius: 4,
          }}
        >
          A trading agent cannot withdraw or transfer your funds — this is documented in
          Hyperliquid&apos;s own docs.
        </span>
      </>
    ),
  },
  {
    q: 'What is the 0.01% builder fee?',
    a: 'It is our service fee on top of Hyperliquid’s own exchange fee (0.015%). It only applies on the FREE plan. The DEMO plan carries a separate 0.03% fee when trading with the Quant Bot.',
  },
  {
    q: 'What is Quant Bot?',
    a: 'Our proprietary bot, currently in its final testing stage. It combines 3 different market-analysis systems. It helps find good entry points alongside a major player while avoiding traps. As a last resort, the position is protected by a flexible stop loss.\n\nQuant Bot builds a full market view from technical analysis, order flow (+ Price Action), liquidations and volume. It reduces risk on weak setups or skips them entirely.',
    demo: 'quant',
  },
  {
    q: 'What is the minimum amount required for the bots to work?',
    a: 'It depends on the bot type, but in all cases you need at least $50 for correct operation — otherwise the bot cannot be started.\n\nFor Quant Bot we recommend at least $200, because it follows a fixed built-in strategy and does not offer flexible settings.',
  },
  {
    q: 'What is a Unified Account?',
    a: 'A Unified Account merges your spot and futures balances into one account for simpler trading. It is required for agents to work correctly and to avoid common errors.\n\nBy default it is enabled on all new accounts. Do not confuse it with hedging mode.',
  },
];

/** DCA (~0–4s) then Grid (~4–10s), loop ~10s */
function BotsDemo({ active }: { active: boolean }) {
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);

  useEffect(() => {
    if (!active) {
      setT(0);
      return;
    }
    start.current = performance.now();
    const loop = (now: number) => {
      setT(((now - start.current) % 10000) / 10000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  const W = 300;
  const H = 130;
  const padX = 10;
  const padY = 14;
  const cW = W - padX * 2;
  const cH = H - padY * 2;

  // Phase split
  const dcaPhase = t < 0.42;
  const u = dcaPhase ? t / 0.42 : (t - 0.42) / 0.58;

  // --- DCA price: drift down with buys, then bounce to TP ---
  const dcaPrice = (x: number) => {
    if (x < 0.55) return 0.28 + x * 0.55; // drop
    const k = (x - 0.55) / 0.45;
    return 0.28 + 0.55 * 0.55 - k * 0.42; // bounce
  };

  // DCA buys at 0.15, 0.3, 0.45 of phase; avg moves down
  const dcaBuys = [0.12, 0.28, 0.42];
  const filledBuys = dcaBuys.filter((b) => u >= b);
  const avgY =
    filledBuys.length === 0
      ? dcaPrice(0)
      : filledBuys.reduce((s, b) => s + dcaPrice(b), 0) / filledBuys.length;
  // TP sits above avg (fixed offset in chart space)
  const tpY = Math.max(0.08, avgY - 0.18);
  const tpHit = u >= 0.72 && dcaPrice(u) <= tpY + 0.02;

  // --- Grid: price mild wave, grid levels ---
  const gridPrice = (x: number) => 0.45 + Math.sin(x * Math.PI * 2) * 0.18 + x * 0.05;
  const gridBase = 0.55;
  const spacing = 0.12;
  // Buy levels below “center”, shift after fills
  const shift = u > 0.35 ? spacing * 0.5 : 0;
  const buyLevels = [gridBase + spacing, gridBase + spacing * 2, gridBase + spacing * 3].map(
    (y) => y - shift
  );
  const sellLevels = [gridBase - spacing, gridBase - spacing * 2].map((y) => y - shift);

  const modeLabel = dcaPhase ? 'DCA · averaging' : 'Grid · dynamic levels';

  const drawLine = (priceFn: (x: number) => number, maxX: number) => {
    const pts: string[] = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * maxX;
      const px = padX + x * cW;
      const py = padY + priceFn(x) * cH;
      pts.push(`${px},${py}`);
    }
    return pts.join(' ');
  };

  const priceFn = dcaPhase ? dcaPrice : gridPrice;
  const line = drawLine(priceFn, Math.max(0.02, u));
  const cx = padX + u * cW;
  const cy = padY + priceFn(u) * cH;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 12,
        border: '1px solid rgba(46, 230, 197, 0.25)',
        background: 'linear-gradient(160deg, #0d1117 0%, #0a0e14 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #21262d',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#2ee6c5',
          }}
        >
          {modeLabel}
        </span>
        <span style={{ fontSize: 10, color: '#6e7681' }}>demo</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={padX}
            x2={W - padX}
            y1={padY + g * cH}
            y2={padY + g * cH}
            stroke="#21262d"
          />
        ))}

        {dcaPhase && (
          <>
            {/* TP line moves with average */}
            {filledBuys.length > 0 && (
              <line
                x1={padX}
                x2={W - padX}
                y1={padY + tpY * cH}
                y2={padY + tpY * cH}
                stroke="#3fb950"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                opacity={0.85}
              />
            )}
            {filledBuys.length > 0 && (
              <text
                x={W - padX - 4}
                y={padY + tpY * cH - 4}
                fill="#3fb950"
                fontSize={9}
                textAnchor="end"
              >
                TP
              </text>
            )}
            {/* avg cost */}
            {filledBuys.length > 0 && (
              <line
                x1={padX}
                x2={W - padX}
                y1={padY + avgY * cH}
                y2={padY + avgY * cH}
                stroke="#e3b341"
                strokeDasharray="2 3"
                opacity={0.7}
              />
            )}
            {dcaBuys.map((b, i) =>
              u >= b ? (
                <g key={i}>
                  <circle
                    cx={padX + b * cW}
                    cy={padY + dcaPrice(b) * cH}
                    r={4}
                    fill="#2ee6c5"
                  />
                  <text
                    x={padX + b * cW + 5}
                    y={padY + dcaPrice(b) * cH + 3}
                    fill="#2ee6c5"
                    fontSize={8}
                  >
                    BUY
                  </text>
                </g>
              ) : null
            )}
            {tpHit && (
              <text
                x={cx + 6}
                y={cy - 6}
                fill="#3fb950"
                fontSize={10}
                fontWeight={700}
              >
                TAKE
              </text>
            )}
          </>
        )}

        {!dcaPhase && (
          <>
            {buyLevels.map((y, i) => (
              <line
                key={`b${i}`}
                x1={padX}
                x2={W - padX}
                y1={padY + y * cH}
                y2={padY + y * cH}
                stroke="rgba(46,230,197,0.45)"
                strokeDasharray="3 3"
              />
            ))}
            {sellLevels.map((y, i) => (
              <line
                key={`s${i}`}
                x1={padX}
                x2={W - padX}
                y1={padY + y * cH}
                y2={padY + y * cH}
                stroke="rgba(248,81,73,0.4)"
                strokeDasharray="3 3"
              />
            ))}
            <text x={padX + 2} y={padY + buyLevels[0] * cH - 3} fill="#2ee6c5" fontSize={8}>
              buys
            </text>
            <text x={padX + 2} y={padY + sellLevels[0] * cH - 3} fill="#f85149" fontSize={8}>
              sells
            </text>
          </>
        )}

        <polyline
          points={line}
          fill="none"
          stroke="#2ee6c5"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <circle cx={cx} cy={cy} r={3.5} fill="#5ef0d4" />
      </svg>
    </div>
  );
}

function QuantBotDemo({ active }: { active: boolean }) {
  const [t, setT] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);

  useEffect(() => {
    if (!active) {
      setT(0);
      return;
    }
    start.current = performance.now();
    const loop = (now: number) => {
      setT(((now - start.current) % 8000) / 8000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  const priceAt = (u: number) => {
    if (u < 0.28) return 0.55 - u * 0.35;
    if (u < 0.34) return 0.55 - 0.28 * 0.35;
    if (u < 0.62) {
      const k = (u - 0.34) / 0.28;
      return 0.452 + k * 0.38;
    }
    if (u < 0.7) return 0.832;
    const k = (u - 0.7) / 0.3;
    return 0.832 - k * 0.28;
  };

  const W = 280;
  const H = 140;
  const padX = 8;
  const padY = 12;
  const chartW = W - padX * 2;
  const chartH = H - padY * 2;

  const pts: string[] = [];
  const steps = 80;
  const maxU = Math.max(0.02, t);
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * maxU;
    pts.push(`${padX + u * chartW},${padY + priceAt(u) * chartH}`);
  }

  const cx = padX + t * chartW;
  const cy = padY + priceAt(t) * chartH;

  const sellSignals = [
    { id: 'Bear Divergence', from: 0.1 },
    { id: 'Ask > Bid', from: 0.14 },
    { id: 'Sell pressure ↑', from: 0.18 },
    { id: 'Volume ↑', from: 0.22 },
    { id: 'Price Action', from: 0.26 },
  ];
  const buySignals = [
    { id: 'Bull Divergence', from: 0.52 },
    { id: 'Bid > Ask', from: 0.56 },
    { id: 'Buy pressure ↑', from: 0.6 },
    { id: 'Volume ↑', from: 0.64 },
    { id: 'Price Action', from: 0.68 },
  ];

  const showSell = t >= 0.32 && t < 0.55;
  const showBuy = t >= 0.7;
  const sellX = padX + 0.32 * chartW;
  const sellY = padY + priceAt(0.32) * chartH;
  const buyX = padX + 0.7 * chartW;
  const buyY = padY + priceAt(0.7) * chartH;

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 12,
        border: '1px solid rgba(46, 230, 197, 0.25)',
        background: 'linear-gradient(160deg, #0d1117 0%, #0a0e14 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #21262d',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#2ee6c5',
          }}
        >
          Quant Bot · live sim
        </span>
        <span style={{ fontSize: 10, color: '#6e7681' }}>demo</span>
      </div>
      <div style={{ display: 'flex' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, minWidth: 0 }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={padX}
              x2={W - padX}
              y1={padY + g * chartH}
              y2={padY + g * chartH}
              stroke="#21262d"
            />
          ))}
          <polyline
            points={pts.join(' ')}
            fill="none"
            stroke="#2ee6c5"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {t > 0.02 && (
            <circle cx={cx} cy={cy} r={3.5} fill="#5ef0d4" stroke="#0b0e14" strokeWidth={1} />
          )}
          {showSell && (
            <>
              <line
                x1={sellX}
                x2={sellX}
                y1={padY}
                y2={H - padY}
                stroke="rgba(248,81,73,0.35)"
                strokeDasharray="3 3"
              />
              <circle cx={sellX} cy={sellY} r={5} fill="#f85149" />
              <text x={sellX + 6} y={sellY - 6} fill="#f85149" fontSize={10} fontWeight={700}>
                SELL
              </text>
            </>
          )}
          {showBuy && (
            <>
              <line
                x1={buyX}
                x2={buyX}
                y1={padY}
                y2={H - padY}
                stroke="rgba(63,185,80,0.35)"
                strokeDasharray="3 3"
              />
              <circle cx={buyX} cy={buyY} r={5} fill="#3fb950" />
              <text x={buyX + 6} y={buyY + 12} fill="#3fb950" fontSize={10} fontWeight={700}>
                BUY
              </text>
            </>
          )}
        </svg>
        <div
          style={{
            width: 118,
            flexShrink: 0,
            borderLeft: '1px solid #21262d',
            padding: '8px',
            background: '#0a0d12',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontSize: 9, color: '#6e7681', fontWeight: 600, marginBottom: 2 }}>
            SIGNALS
          </div>
          {(t < 0.5 ? sellSignals : buySignals).map((s) => {
            const on = t >= s.from;
            const bearish = t < 0.5;
            return (
              <div
                key={s.id + (bearish ? 's' : 'b')}
                style={{
                  fontSize: 10,
                  padding: '3px 6px',
                  borderRadius: 4,
                  opacity: on ? 1 : 0.25,
                  background: on
                    ? bearish
                      ? 'rgba(248,81,73,0.12)'
                      : 'rgba(63,185,80,0.12)'
                    : 'transparent',
                  color: on ? (bearish ? '#ff7b72' : '#7ee787') : '#6e7681',
                  border: on
                    ? `1px solid ${bearish ? 'rgba(248,81,73,0.35)' : 'rgba(63,185,80,0.35)'}`
                    : '1px solid transparent',
                  fontWeight: on ? 600 : 400,
                }}
              >
                {on ? '● ' : '○ '}
                {s.id}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div style={{ marginTop: 28, width: '100%', maxWidth: 420, textAlign: 'left' }}>
      <h2
        style={{
          margin: '0 0 14px',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#8b949e',
          textAlign: 'center',
        }}
      >
        FAQ
      </h2>
      <div
        style={{
          borderRadius: 14,
          border: '1px solid rgba(48, 54, 61, 0.95)',
          background: 'linear-gradient(165deg, #161b22 0%, #0f1318 100%)',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        {FAQ_ITEMS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q} style={{ borderTop: i === 0 ? 'none' : '1px solid #21262d' }}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  background: open ? 'rgba(46, 230, 197, 0.06)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#e6edf3',
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  fontFamily: 'inherit',
                }}
              >
                <span>{item.q}</span>
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: open ? 'rgba(46, 230, 197, 0.18)' : 'rgba(48, 54, 61, 0.8)',
                    color: open ? '#2ee6c5' : '#8b949e',
                    fontSize: 16,
                    fontWeight: 700,
                    transform: open ? 'rotate(45deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {open && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div
                    style={{
                      color: '#8b949e',
                      fontSize: 13,
                      lineHeight: 1.55,
                      whiteSpace: typeof item.a === 'string' ? 'pre-line' : undefined,
                    }}
                  >
                    {item.a}
                  </div>
                  {item.demo === 'quant' && <QuantBotDemo active={open} />}
                  {item.demo === 'bots' && <BotsDemo active={open} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusWarn, setStatusWarn] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    balance: null,
    agent: null,
    abstraction: null,
    loading: false,
    error: null,
  });

  const fetchAccountInfo = useCallback(async (userAddress: string): Promise<number | null> => {
    setAccountInfo((prev) => ({ ...prev, error: null }));
    const user = userAddress.toLowerCase();
    try {
      const [clearing, spot, agents, abstractionRaw] = await Promise.all([
        hlInfo<{
          marginSummary?: { accountValue?: string };
          withdrawable?: string;
        }>({ type: 'clearinghouseState', user }),
        hlInfo<{
          balances?: Array<{ coin: string; total: string }>;
        }>({ type: 'spotClearinghouseState', user }),
        hlInfo<Array<{ name: string; address: string; validUntil: number | null }>>({
          type: 'extraAgents',
          user,
        }),
        hlInfo<string>({ type: 'userAbstraction', user }),
      ]);

      const perpValue =
        parseFloat(clearing?.marginSummary?.accountValue ?? clearing?.withdrawable ?? '0') || 0;
      const spotUsdc = Array.isArray(spot?.balances)
        ? spot.balances
            .filter((b) => b.coin === 'USDC')
            .reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0)
        : 0;
      const balance = perpValue + spotUsdc;

      const agentList = Array.isArray(agents) ? agents : [];
      const hqAgent =
        agentList.find((a) => (a.name || '').toLowerCase() === AGENT_NAME.toLowerCase()) ??
        agentList[0] ??
        null;

      const abstraction =
        typeof abstractionRaw === 'string' ? abstractionRaw.replace(/^"|"$/g, '') : null;

      setAccountInfo({
        balance,
        agent: hqAgent
          ? { name: hqAgent.name || AGENT_NAME, address: hqAgent.address }
          : null,
        abstraction,
        loading: false,
        error: null,
      });
      return balance;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load account data';
      setAccountInfo((prev) => ({
        ...prev,
        loading: false,
        error: `Error#201 — Could not load account info from Hyperliquid: ${msg}`,
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setAccountInfo((prev) => ({ ...prev, loading: true }));
      fetchAccountInfo(address);
    } else {
      setAccountInfo({
        balance: null,
        agent: null,
        abstraction: null,
        loading: false,
        error: null,
      });
    }
  }, [isConnected, address, fetchAccountInfo]);

  const handleApproveAndActivate = async () => {
    if (!address) {
      setStatus('Error#101 — Wallet is not connected. Connect your wallet first.');
      setStatusWarn(false);
      return;
    }
    setLoading(true);
    setStatusWarn(false);
    setStatus('Generating trading agent...');

    let stage:
      | 'agent_sign'
      | 'agent_submit'
      | 'builder_sign'
      | 'builder_submit'
      | 'abstraction_sign'
      | 'abstraction_submit'
      | 'save' = 'agent_sign';

    try {
      const agentPrivKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(agentPrivKey);
      const agentNonce = Date.now();
      const builderNonce = agentNonce + 1;
      const abstractionNonce = agentNonce + 2;

      // 1/3 Agent
      stage = 'agent_sign';
      setStatus('Sign agent approval in your wallet (1/3)...');
      const agentAction = {
        type: 'approveAgent',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        agentAddress: agentAccount.address,
        agentName: AGENT_NAME,
        nonce: agentNonce,
      };
      let agentSig: `0x${string}`;
      try {
        agentSig = await signTypedDataAsync({
          domain,
          types: agentTypes,
          primaryType: 'HyperliquidTransaction:ApproveAgent',
          message: {
            hyperliquidChain: 'Mainnet',
            agentAddress: agentAccount.address as `0x${string}`,
            agentName: AGENT_NAME,
            nonce: BigInt(agentNonce),
          },
        });
      } catch (signErr: unknown) {
        const m = signErr instanceof Error ? signErr.message : String(signErr);
        if (isUserRejected(m)) {
          throw new Error(
            'Error#102 — Agent approval signature was canceled or rejected. You skipped the agent authorization step.'
          );
        }
        throw new Error(`Error#102 — Failed to get agent signature: ${m}`);
      }

      stage = 'agent_submit';
      setStatus('Registering agent on Hyperliquid...');
      await submitToHyperliquid(agentAction, splitSignature(agentSig), agentNonce);
      setStatus('Agent registered. Updating status...');
      await fetchAccountInfo(address);

      // 2/3 Builder
      stage = 'builder_sign';
      setStatus('Sign builder fee approval in your wallet (2/3)...');
      const builderAction = {
        type: 'approveBuilderFee',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        maxFeeRate: MAX_FEE_RATE,
        builder: BUILDER_ADDRESS,
        nonce: builderNonce,
      };
      let builderSig: `0x${string}`;
      try {
        builderSig = await signTypedDataAsync({
          domain,
          types: builderFeeTypes,
          primaryType: 'HyperliquidTransaction:ApproveBuilderFee',
          message: {
            hyperliquidChain: 'Mainnet',
            maxFeeRate: MAX_FEE_RATE,
            builder: BUILDER_ADDRESS as `0x${string}`,
            nonce: BigInt(builderNonce),
          },
        });
      } catch (signErr: unknown) {
        const m = signErr instanceof Error ? signErr.message : String(signErr);
        if (isUserRejected(m)) {
          throw new Error(
            'Error#103 — Builder fee signature was canceled or rejected. Re-run activation to complete.'
          );
        }
        throw new Error(`Error#103 — Failed to get builder fee signature: ${m}`);
      }

      stage = 'builder_submit';
      setStatus('Registering builder fee...');
      try {
        await submitToHyperliquid(builderAction, splitSignature(builderSig), builderNonce);
      } catch (apiErr: unknown) {
        const m = apiErr instanceof Error ? apiErr.message : String(apiErr);
        if (!/already|exist|duplicate/i.test(m)) {
          throw new Error(
            `Error#105 — Hyperliquid rejected builder fee registration. Details: ${m}`
          );
        }
      }
      setStatus('Builder fee registered. Updating status...');
      await fetchAccountInfo(address);

      // 3/3 Abstraction
      stage = 'abstraction_sign';
      setStatus('Sign unified account abstraction in your wallet (3/3)...');
      const abstractionAction = {
        type: 'userSetAbstraction',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        user: address.toLowerCase(),
        abstraction: TARGET_ABSTRACTION,
        nonce: abstractionNonce,
      };
      let abstractionSig: `0x${string}`;
      try {
        abstractionSig = await signTypedDataAsync({
          domain,
          types: abstractionTypes,
          primaryType: 'HyperliquidTransaction:UserSetAbstraction',
          message: {
            hyperliquidChain: 'Mainnet',
            user: address.toLowerCase() as `0x${string}`,
            abstraction: TARGET_ABSTRACTION,
            nonce: BigInt(abstractionNonce),
          },
        });
      } catch (signErr: unknown) {
        const m = signErr instanceof Error ? signErr.message : String(signErr);
        if (isUserRejected(m)) {
          throw new Error(
            'Error#107 — Account abstraction signature was canceled or rejected. Re-run activation to enable unified account.'
          );
        }
        throw new Error(`Error#107 — Failed to get abstraction signature: ${m}`);
      }

      stage = 'abstraction_submit';
      setStatus('Enabling unified account...');
      try {
        await submitToHyperliquid(
          abstractionAction,
          splitSignature(abstractionSig),
          abstractionNonce
        );
      } catch (apiErr: unknown) {
        const m = apiErr instanceof Error ? apiErr.message : String(apiErr);
        if (!/already|same|no.?change|noop/i.test(m)) {
          throw new Error(
            `Error#108 — Hyperliquid rejected userSetAbstraction. Details: ${m}`
          );
        }
      }
      setStatus('Abstraction set. Updating status...');
      await fetchAccountInfo(address);

      // Save always
      stage = 'save';
      setStatus('Saving data...');
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_wallet: address,
          agent_address: agentAccount.address,
          agent_private_key: agentPrivKey,
          telegram_id: telegramId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          `Error#106 — Failed to save activation data on server: ${data.error || 'Unknown server error'}`
        );
      }

      const bal = await fetchAccountInfo(address);
      if (bal !== null && bal < MIN_BALANCE_USD) {
        setStatusWarn(true);
        setStatus(
          `Insufficient funds for trading (less than $${MIN_BALANCE_USD}). Please read the FAQ.`
        );
      } else {
        setStatusWarn(false);
        setStatus('Activated successfully. You can return to Telegram.');
      }
    } catch (e: unknown) {
      setStatusWarn(false);
      const message = e instanceof Error ? e.message : 'Something went wrong';
      if (message.startsWith('Error#')) {
        setStatus(message);
      } else {
        const stageMap: Record<string, string> = {
          agent_sign: 'Error#102 — Agent approval step failed or was canceled.',
          agent_submit: 'Error#104 — Failed to register agent on Hyperliquid.',
          builder_sign: 'Error#103 — Builder fee approval step failed or was canceled.',
          builder_submit: 'Error#105 — Failed to register builder fee on Hyperliquid.',
          abstraction_sign: 'Error#107 — Account abstraction step failed or was canceled.',
          abstraction_submit: 'Error#108 — Failed to set unified account abstraction.',
          save: 'Error#106 — Failed to save activation data.',
        };
        setStatus(
          `${stageMap[stage] ?? 'Error#109 — Unexpected error during activation.'} ${message}`
        );
      }
      if (address) {
        try {
          await fetchAccountInfo(address);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const insufficientFunds =
    accountInfo.balance !== null && accountInfo.balance < MIN_BALANCE_USD;
  const agentOk = !!accountInfo.agent;
  const abstractionOk = isAbstractionOk(accountInfo.abstraction);
  const needsActivation = !agentOk || !abstractionOk;
  const activateDisabled = loading || accountInfo.loading || !needsActivation;

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px 16px 48px',
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
          maxWidth: '420px',
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

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(46, 230, 197, 0.35)',
              boxShadow:
                '0 0 24px rgba(46, 230, 197, 0.18), inset 0 0 0 1px rgba(46, 230, 197, 0.08)',
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
        <p style={{ color: '#8b949e', fontSize: '14px', lineHeight: 1.5, margin: '0 0 28px' }}>
          Algorithmic Trading System
        </p>

        <div style={{ textAlign: 'left', marginBottom: '18px' }}>
          <label
            htmlFor="telegram-id"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#8b949e',
              marginBottom: '8px',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Telegram ID
          </label>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                color: '#6e7681',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </span>
            <input
              id="telegram-id"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="Enter your @Nickname from the Telegram"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px 12px 40px',
                borderRadius: '10px',
                border: '1px solid #30363d',
                background: '#0d1117',
                color: '#e6edf3',
                fontSize: '15px',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.45)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46, 230, 197, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#8b949e', lineHeight: 1.5 }}>
            <span style={{ color: '#e3b341', fontWeight: 600 }}>Note:</span> Enter your Telegram
            @Nickname if you have an active paid subscription. Leave empty on the free plan — a
            builder fee of <span style={{ color: '#2ee6c5' }}>0.01%</span> applies (up to{' '}
            <span style={{ color: '#2ee6c5' }}>0.03%</span> for Quant Bot on DEMO).
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <ConnectButton label="Connect wallet" showBalance={false} accountStatus="address" />
        </div>

        {isConnected && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #30363d',
              background: '#0d1117',
              textAlign: 'left',
              fontSize: '13px',
              lineHeight: 1.45,
            }}
          >
            {accountInfo.loading && !accountInfo.agent && accountInfo.balance === null && (
              <p style={{ margin: 0, color: '#8b949e' }}>Loading account data…</p>
            )}
            {accountInfo.error && (
              <p style={{ margin: 0, color: '#ff7b72' }}>{accountInfo.error}</p>
            )}
            {!accountInfo.error &&
              !(accountInfo.loading && !accountInfo.agent && accountInfo.balance === null) && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#8b949e' }}>Agent</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#e6edf3', fontSize: 12, wordBreak: 'break-all' }}>
                      {accountInfo.agent
                        ? `${accountInfo.agent.name} · ${accountInfo.agent.address.slice(0, 6)}…${accountInfo.agent.address.slice(-4)}`
                        : 'Not registered'}
                    </span>
                    <CheckIcon ok={agentOk} />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#8b949e' }}>Account type</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#e6edf3', fontWeight: 500 }}>
                      {accountInfo.abstraction ?? '—'}
                    </span>
                    <CheckIcon ok={abstractionOk} />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: insufficientFunds ? 8 : 0,
                  }}
                >
                  <span style={{ color: '#8b949e' }}>Balance</span>
                  <span style={{ color: '#e6edf3', fontWeight: 600 }}>
                    {accountInfo.balance !== null
                      ? `$${accountInfo.balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—'}
                  </span>
                </div>
                {insufficientFunds && (
                  <p style={{ margin: 0, color: '#e3b341', fontWeight: 600, fontSize: 13 }}>
                    Insufficient funds (less than ${MIN_BALANCE_USD})
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {isConnected && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleApproveAndActivate}
              disabled={activateDisabled}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activateDisabled
                  ? '#30363d'
                  : 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
                color: activateDisabled ? '#8b949e' : '#0b0e14',
                fontWeight: 700,
                fontSize: '15px',
                cursor: activateDisabled ? 'not-allowed' : 'pointer',
                boxShadow: activateDisabled ? 'none' : '0 4px 20px rgba(46, 230, 197, 0.25)',
              }}
            >
              {loading
                ? 'Processing...'
                : !needsActivation
                  ? 'Already activated'
                  : 'Activate Hyper Quant'}
            </button>

            {status && (
              <p
                style={{
                  marginTop: '16px',
                  marginBottom: 0,
                  fontSize: '13px',
                  lineHeight: 1.45,
                  color: status.startsWith('Error')
                    ? '#ff7b72'
                    : statusWarn
                      ? '#e3b341'
                      : '#7ee787',
                  wordBreak: 'break-word',
                }}
              >
                {status}
              </p>
            )}
          </div>
        )}

        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '22px',
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(46, 230, 197, 0.35)',
            background: 'rgba(46, 230, 197, 0.06)',
            color: '#2ee6c5',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Open Telegram Bot
        </a>

        <div
          style={{
            marginTop: '20px',
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
            }}
          />
          <span style={{ fontSize: '12px', color: '#6e7681' }}>
            Secured · Non-custodial · Hyperliquid
          </span>
        </div>
      </div>

      <FaqAccordion />
    </main>
  );
}
