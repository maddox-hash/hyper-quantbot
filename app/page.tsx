'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignTypedData } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

// --- НАСТРОЙКИ ---
//const SUPABASE_URL = 'https://qqimpejopfpdbnwvaibv.supabase.co';
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaW1wZWpvcGZwZGJud3ZhaWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTg2MTYsImV4cCI6MjEwNTk5NDYxNn0.Ji9ePqo2Y8KtPwQ2PnkzZpNWnQNZUP_5MhA_vuuSz_8';
const BUILDER_ADDRESS = '0x8E5B541b59C43cCD688215C1c52CB6E4B885D5e9';
const MAX_FEE_RATE = '0.1%';
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/exchange';

//const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// IMPORTANT: when signing through a real browser wallet (MetaMask/WalletConnect via
// wagmi), domain.chainId MUST match the network the wallet is actually connected to
// (Arbitrum One = 42161), otherwise the wallet itself rejects the request with
// "Invalid parameters were provided to the RPC method" before it ever reaches Hyperliquid.
// (421614 / 0x66eee is only for SDKs that sign locally with a raw private key, no wallet involved.)
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

// Splits a 65-byte ECDSA signature (0x + 130 hex chars) into r/s/v for Hyperliquid's API
function splitSignature(signature: `0x${string}`) {
  return {
    r: signature.slice(0, 66) as `0x${string}`,
    s: (`0x${signature.slice(66, 130)}`) as `0x${string}`,
    v: parseInt(signature.slice(130, 132), 16),
  };
}

// Posts a signed user action to Hyperliquid so it actually takes effect
async function submitToHyperliquid(action: Record<string, unknown>, signature: { r: string; s: string; v: number }, nonce: number) {
  const res = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, nonce, signature }),
  });
  const data = await res.json();
  if (data.status !== 'ok') {
    throw new Error(data.response ? JSON.stringify(data.response) : 'Hyperliquid API rejected the action');
  }
  return data;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleApproveAndActivate = async () => {
    if (!address) return;
    setLoading(true);
    setStatus('Генерация торгового агента...');

    try {
      // 1. Создаём локального агента
      const agentPrivKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(agentPrivKey);

      // Два разных nonce, чтобы не было коллизии по времени
      const agentNonce = Date.now();
      const builderNonce = agentNonce + 1;

      // 2. Подпись + реальная отправка ApproveAgent
      setStatus('Подпишите разрешение для агента в кошельке (1/2)...');
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
      setStatus('Регистрируем агента на Hyperliquid...');
      await submitToHyperliquid(agentAction, splitSignature(agentSig), agentNonce);

      // 3. Подпись + реальная отправка ApproveBuilderFee
      setStatus('Подпишите комиссию копитрейдинга в кошельке (2/2)...');
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
      setStatus('Регистрируем комиссию билдера...');
      await submitToHyperliquid(builderAction, splitSignature(builderSig), builderNonce);

      // 4. Сохраняем данные в Supabase для Python-бота
      // 4. Сохраняем данные через API
setStatus('Сохранение данных в базу...');
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
if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');

  
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: '16px',
          padding: '40px 30px', maxWidth: '420px', width: '100%', textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <h1
          style={{
            fontSize: '28px', fontWeight: '700', marginBottom: '8px',
            background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}
        >
          HYPER QUANT
        </h1>
        <p style={{ color: '#8b949e', fontSize: '14px', marginBottom: '28px' }}>
          Подключите кошелек и активируйте копитрейдинг
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <ConnectButton label="Подключить кошелек" showBalance={false} accountStatus="address" />
        </div>

        {isConnected && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleApproveAndActivate}
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                background: loading ? '#30363d' : 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
                color: '#000', fontWeight: 'bold', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer', transition: '0.2s',
              }}
            >
              {loading ? 'Обработка...' : 'Активировать Hyper Quant'}
            </button>

            {status && (
              <p style={{ marginTop: '16px', fontSize: '13px', color: status.startsWith('Ошибка') ? '#ff7b72' : '#7ee787' }}>
                {status}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
