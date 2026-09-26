import { NextResponse } from 'next/server';
import { parseSignature } from 'viem';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qqimpejopfpdbnwvaibv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxaW1wZWpvcGZwZGJud3ZhaWJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTg2MTYsImV4cCI6MjEwNTk5NDYxNn0.Ji9ePqo2Y8KtPwQ2PnkzZpNWnQNZUP_5MhA_vuuSz_8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mainWallet, agentAddress, agentPrivateKey, agentSignature, nonce } = body;

    // Парсим подпись в формат r, s, v для Hyperliquid
    const parsedSig = parseSignature(agentSignature);

    // Формируем запрос к официальному API Hyperliquid
    const hlPayload = {
      action: {
        type: 'approveAgent',
        hyperliquidChain: 'Mainnet',
        signatureChainId: '0xa4b1', // Arbitrum One
        agentAddress: agentAddress,
        agentName: 'HyperQuant',
        nonce: Number(nonce),
      },
      nonce: Number(nonce),
      signature: {
        r: parsedSig.r,
        s: parsedSig.s,
        v: Number(parsedSig.v),
      },
    };

    // Отправляем на биржу с сервера (без CORS-блокировок)
    const hlResponse = await fetch('https://api.hyperliquid.xyz/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hlPayload),
    });

    const hlResult = await hlResponse.json();

    if (hlResult.status !== 'ok') {
      return NextResponse.json({ error: `Hyperliquid error: ${JSON.stringify(hlResult)}` }, { status: 400 });
    }

    // Если біржа подтвердила агента, записываем в базу
    const { error: dbError } = await supabase.from('subscribers').upsert({
      main_wallet: mainWallet.toLowerCase(),
      agent_address: agentAddress.toLowerCase(),
      agent_private_key: agentPrivateKey,
      builder_fee_approved: true,
    }, { onConflict: 'main_wallet' });

    if (dbError) {
      return NextResponse.json({ error: `Supabase error: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catc (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
