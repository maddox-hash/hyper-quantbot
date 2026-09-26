import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { main_wallet, agent_address, agent_private_key } = body;

    if (!main_wallet || !agent_address || !agent_private_key) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { error } = await supabase.from('subscribers').upsert(
      {
        main_wallet: main_wallet.toLowerCase(),
        agent_address: agent_address.toLowerCase(),
        agent_private_key,
        builder_fee_approved: true,
      },
      { onConflict: 'main_wallet' }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
