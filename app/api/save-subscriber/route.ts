import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { main_wallet, agent_address, agent_private_key } = await request.json();

    if (!main_wallet || !agent_address || !agent_private_key) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Здесь можно добавить проверку подписи (при желании), 
    // но главное — таблица закрыта от прямого доступа из браузера.

    const { error } = await supabaseAdmin.from('subscribers').upsert(
      {
        main_wallet: main_wallet.toLowerCase(),
        agent_address: agent_address.toLowerCase(),
        agent_private_key,
        builder_fee_approved: true,
      },
      { onConflict: 'main_wallet' }
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
