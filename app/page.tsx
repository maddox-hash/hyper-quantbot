'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignTypedData } from 'wagmi';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

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
      const agentPrivKey = generatePrivateKey();
      const agentAccount = privateKeyToAccount(agentPrivKey);
      const nonce = Date.now();

      setStatus('Подпишите разрешение для Агента в кошельке...');
      const signature = await signTypedDataAsync({
        domain,
        types: agentTypes,
        primaryType: 'HyperliquidTransaction:ApproveAgent',
        message: {
          hyperliquidChain: 'Mainnet',
          agentAddress: agentAccount.address as `0x${string}`,
          agentName: 'HyperQuant',
          nonce: BigInt(nonce),
        },
      });

      setStatus('Регистрация агента на Hyperliquid...');
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainWallet: address,
          agentAddress: agentAccount.address,
          agentPrivateKey: agentPrivKey,
          agentSignature: signature,
          nonce,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка при активации');

      setStatus('Успешно! Агент создан и зарегистрирован на Hyperliquid.');
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
