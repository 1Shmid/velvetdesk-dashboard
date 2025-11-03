// app/api/vapi/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const createClient = () =>
  import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  );

const VAPI_API_URL = 'https://api.vapi.ai/call';
const VAPI_HEADERS = {
  Authorization: `Bearer ${process.env.VAPI_API_KEY!}`,
  'Content-Type': 'application/json',
};

export async function POST(request: NextRequest) {
  try {
    const { assistantId, phoneNumber } = await request.json();

    const client = await createClient();

    // 1. Найти бизнес
    const { data: business, error: businessError } = await client
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // 2. Услуги
    const { data: services } = await client
      .from('services')
      .select('name, price, duration')
      .eq('business_id', business.id)
      .eq('is_active', true);

    // 3. Часы работы
    const { data: hours } = await client
      .from('working_hours')
      .select('day, open_time, close_time, is_closed')
      .eq('business_id', business.id);

    // 4. Запуск звонка с контекстом
    const callResponse = await fetch(VAPI_API_URL, {
      method: 'POST',
      headers: VAPI_HEADERS,
      body: JSON.stringify({
        assistantId,
        phoneNumber,
        serverMessages: [
          {
            type: 'text',
            content: `Current services: ${JSON.stringify(services || [])}. Working hours: ${JSON.stringify(hours || [])}. Use this for responses.`,
          },
        ],
      }),
    });

    if (!callResponse.ok) {
      const err = await callResponse.text();
      throw new Error(`VAPI start failed: ${callResponse.status} – ${err}`);
    }

    const call = await callResponse.json();

    return NextResponse.json({ success: true, callId: call.id });
  } catch (error: any) {
    console.error('VAPI start error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}