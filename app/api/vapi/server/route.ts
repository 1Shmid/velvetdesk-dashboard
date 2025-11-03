// app/api/vapi/server/route.ts
import { NextRequest, NextResponse } from 'next/server';

const createClient = () =>
  import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  );

// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
// 1. Добавь GET (VAPI проверяет)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
// ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('VAPI server payload:', JSON.stringify(payload, null, 2));

    // 2. Обрабатываем conversation-update (на старте)
    if (payload.type === 'conversation-update' && payload.conversation?.status === 'in-progress') {
      const { assistantId } = payload.assistant || {};
      if (!assistantId) return NextResponse.json({});

      const client = await createClient();

      const { data: business } = await client
        .from('businesses')
        .select('id')
        .eq('vapi_assistant_id', assistantId)
        .single();

      if (!business) return NextResponse.json({});

      const { data: services } = await client
        .from('services')
        .select('name, price, duration')
        .eq('business_id', business.id)
        .eq('is_active', true);

      const { data: hours } = await client
        .from('working_hours')
        .select('day, open_time, close_time, is_closed')
        .eq('business_id', business.id);

      // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
      // 3. Возвращаем messages в формате VAPI
      return NextResponse.json({
        messages: [
          {
            role: 'system',
            content: `Current services: ${JSON.stringify(services || [])}. Working hours: ${JSON.stringify(hours || [])}. Use ONLY this information for all responses.`
          }
        ]
      });
      // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    }

    return NextResponse.json({});
  } catch (error: any) {
    console.error('VAPI server error:', error);
    return NextResponse.json({});
  }
}