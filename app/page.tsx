'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address, isConnected } = useAccount();

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '16px',
          padding: '40px 30px',
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
          }}
        >
          HYPER QUANT
        </h1>
        <p
          style={{
            color: '#8b949e',
            fontSize: '14px',
            marginBottom: '32px',
            lineHeight: '1.5',
          }}
        >
          Подключите ваш кошелек для работы с ботом Hyper Quant
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <ConnectButton
            label="Подключить кошелек"
            showBalance={false}
            accountStatus="address"
          />
        </div>

        {isConnected && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#0d1117',
              borderRadius: '8px',
              wordBreak: 'break-all',
              fontSize: '12px',
              color: '#58a6ff',
              border: '1px solid #21262d',
            }}
          >
            Успешно подключен:
            <div style={{ marginTop: '4px', fontWeight: 'bold' }}>{address}</div>
          </div>
        )}
      </div>
    </main>
  );
}