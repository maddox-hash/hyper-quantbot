'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignTypedData } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';

// --- НАСТРОЙКИ (ГОТОВЫ К РАБОТЕ) ---
const SUPABASE_URL = 'https://qqimpejopfpdbnwvaibv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaW1wZWpvcGZwZGJud3ZhaWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTg2MTYsImV4cCI6MjEwNTk5NDYxNn0.Ji9ePqo2Y8KtPwQ2PnkzZpNWnQNZUP_5MhA_vuuSz_8';
const BUILDER_ADDRESS = '0x8E5B541b59C43cCD688215C1c52CB6E4B885D5e9';
const MAX_FEE_RATE = '0.001'; // 0.1% комиссия (10 bps)

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Структура EIP-712 подписи для Hyperliquid
const domain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
} as const;

const builderFeeTypes = {
  ApproveBuilderFee: [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'maxFeeRate', type: 'string' },
    { name: 'builder', type: 'address' },
    { name: 'nonce', type: 'uint64' },
  ],
} as const;

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
      // 1. Генерируем уникальный Agent Wallet
      const agentPrivKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(agentPrivKey);

      setStatus('Подпишите подтверждение Builder Fee в кошельке...');

      // 2. Подписываем ApproveBuilderFee
      const nonce = BigInt(Date.now());
      await signTypedDataAsync({
        domain,
        types: builderFeeTypes,
        primaryType: 'ApproveBuilderFee',
        message: {
          hyperliquidChain: 'Mainnet',
          maxFeeRate: MAX_FEE_RATE,
          builder: BUILDER_ADDRESS as `0x${string}`,
          nonce,
        },
      });

      setStatus('Сохранение данных в базу...');

      // 3. Записываем данные в Supabase
      const { error } = await supabase.from('subscribers').upsert({
        main_wallet: address.toLowerCase(),
        agent_address: agentAccount.address.toLowerCase(),
        agent_private_key: agentPrivKey,
        builder_fee_approved: true,
      }, { onConflict: 'main_wallet' });

      if (error) throw error;

      setStatus('Успешно! Ваш аккаунт активирован в Hyper Quant.');
    } catch (err: any) {
      console.error(err);
      setStatus(`Ошибка: ${err.message || 'Отказ от подписи'}`);
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
