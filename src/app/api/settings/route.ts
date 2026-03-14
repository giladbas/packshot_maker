import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

async function getUser(req: NextRequest) {
  const supabase = createServerClient();
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Mask the API key for display
  const masked = data ? {
    ...data,
    gemini_api_key: data.gemini_api_key
      ? `${data.gemini_api_key.slice(0, 4)}${'*'.repeat(Math.max(0, data.gemini_api_key.length - 8))}${data.gemini_api_key.slice(-4)}`
      : '',
    has_api_key: !!data.gemini_api_key,
  } : { gemini_api_key: '', has_api_key: false, theme: 'dark' };

  return NextResponse.json({ settings: masked });
}

export async function PUT(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if (body.gemini_api_key !== undefined) updateData.gemini_api_key = body.gemini_api_key;
  if (body.theme !== undefined) updateData.theme = body.theme;

  // Upsert settings
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, ...updateData },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
