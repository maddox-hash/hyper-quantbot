'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignTypedData } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// --- SETTINGS ---
const BUILDER_ADDRESS = '0x8E5B541b59C43cCD688215C1c52CB6E4B885D5e9';
const MAX_FEE_RATE = '0.03%';
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/exchange';
// Change this to your bot username if different
const TELEGRAM_BOT_URL = 'https://t.me/hyperquantbot';

// IMPORTANT: when signing through a real browser wallet (MetaMask/WalletConnect via
// wagmi), domain.chainId MUST match the network the wallet is actually connected to
// (Arbitrum One = 42161), otherwise the wallet itself rejects the request with
// "Invalid parameters were provided to the RPC method" before it ever reaches Hyperliquid.
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

function splitSignature(signature: `0x${string}`) {
  return {
    r: signature.slice(0, 66) as `0x${string}`,
    s: (`0x${signature.slice(66, 130)}`) as `0x${string}`,
    v: parseInt(signature.slice(130, 132), 16),
  };
}

async function submitToHyperliquid(
  action: Record<string, unknown>,
  signature: { r: string; s: string; v: number },
  nonce: number
) {
  const res = await fetch(HYPERLIQUID_API, {
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

export default function Home() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [telegramId, setTelegramId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleApproveAndActivate = async () => {
    if (!address) return;
    setLoading(true);
    setStatus('Generating trading agent...');

    try {
      const agentPrivKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(agentPrivKey);

      const agentNonce = Date.now();
      const builderNonce = agentNonce + 1;

      setStatus('Sign agent approval in your wallet (1/2)...');
      const agentAction = {
        type: 'approveAgent',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        agentAddress: agentAccount.address,
        agentName: 'HyperQuant',
        nonce: agentNonce,
      };
      const agentSig = await signTypedDataAsync({
        domain,
        types: agentTypes,
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        message: {
          hyperliquidChain: 'Mainnet',
          agentAddress: agentAccount.address as `0x${string}`,
          agentName: 'HyperQuant',
          nonce: BigInt(agentNonce),
        },
      });
      setStatus('Registering agent on Hyperliquid...');
      await submitToHyperliquid(agentAction, splitSignature(agentSig), agentNonce);

      setStatus('Sign builder fee approval in your wallet (2/2)...');
      const builderAction = {
        type: 'approveBuilderFee',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1',
        maxFeeRate: MAX_FEE_RATE,
        builder: BUILDER_ADDRESS,
        nonce: builderNonce,
      };
      const builderSig = await signTypedDataAsync({
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
      setStatus('Registering builder fee...');
      await submitToHyperliquid(builderAction, splitSignature(builderSig), builderNonce);

      setStatus('Saving data...');
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_wallet: address,
          agent_address: agentAccount.address,
          agent_private_key: agentPrivKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save data');

      setStatus('Activated successfully. You can return to Telegram.');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong';
      setStatus(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
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
          padding: '40px 28px 36px',
          maxWidth: '560px',
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
        <p
          style={{
            color: '#8b949e',
            fontSize: '14px',
            lineHeight: 1.5,
            margin: '0 0 24px',
          }}
        >
          Algorithmic Trading System
        </p>

        {/* ===== BOT TYPES SECTION ===== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            marginBottom: '28px',
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
              <li style={{ marginBottom: 4 }}>• Извлекайте прибыль из волатильности</li>
              <li style={{ marginBottom: 4 }}>• Маркетмейкинг</li>
              <li>• Трейлинг для каждой сетки — не упустите сильное движение</li>
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
              <li style={{ marginBottom: 4 }}>• Используйте усреднение</li>
              <li style={{ marginBottom: 4 }}>• Забирайте прибыль на любом рынке</li>
              <li style={{ marginBottom: 4 }}>• Накапливайте активы</li>
              <li>• Тех. индикаторы + Order Flow фильтры</li>
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
              <li style={{ marginBottom: 4 }}>• Совмещённая стратегия</li>
              <li style={{ marginBottom: 4 }}>• Стабильность Grid bot</li>
              <li>• Надёжность и прибыль DCA</li>
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
              <li style={{ marginBottom: 3 }}>• 3 встроенных торговых системы</li>
              <li style={{ marginBottom: 3 }}>• Технический анализ рынка</li>
              <li style={{ marginBottom: 3 }}>• Анализ лимитных ордеров</li>
              <li style={{ marginBottom: 3 }}>• Order Flow</li>
              <li style={{ marginBottom: 3 }}>• Анализ волатильности</li>
              <li>• Защита от памп/дамп</li>
            </ul>
          </div>
        </div>
        {/* ===== END BOT TYPES ===== */}

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
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter ID from the Telegram bot"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value.replace(/[^\d]/g, ''))}
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
                transition: 'border-color 0.15s, box-shadow 0.15s',
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
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '12px',
              color: '#8b949e',
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: '#e3b341', fontWeight: 600 }}>Note:</span>{' '}
            Enter your Telegram ID if you have an active paid subscription.
            Leave this field empty on the free plan — a builder fee of{' '}
            <span style={{ color: '#2ee6c5' }}>0.01%</span> will apply
            (up to <span style={{ color: '#2ee6c5' }}>0.03%</span> for our MVP Quant Bot).
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <ConnectButton
            label="Connect wallet"
            showBalance={false}
            accountStatus="address"
          />
        </div>

        {isConnected && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleApproveAndActivate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                border: 'none',
                background: loading
                  ? '#30363d'
                  : 'linear-gradient(90deg, #2ee6c5 0%, #5ef0d4 100%)',
                color: loading ? '#8b949e' : '#0b0e14',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '0.01em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, transform 0.15s',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 20px rgba(46, 230, 197, 0.25)',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.92';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {loading ? 'Processing...' : 'Activate Hyper Quant'}
            </button>

            {status && (
              <p
                style={{
                  marginTop: '16px',
                  marginBottom: 0,
                  fontSize: '13px',
                  lineHeight: 1.45,
                  color: status.startsWith('Error') ? '#ff7b72' : '#7ee787',
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
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(46, 230, 197, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.55)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(46, 230, 197, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(46, 230, 197, 0.35)';
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
