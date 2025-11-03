// app/api/vapi/server/route.ts
import { NextRequest, NextResponse } from 'next/server';

const createClient = () =>
  import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  );

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('VAPI server request:', JSON.stringify(payload, null, 2));

    if (payload.type !== 'assistant-request') {
      return NextResponse.json({}); // Ignore other events
    }

    const { assistantId } = payload;
    const client = await createClient();

    // Fetch business
    const { data: business } = await client
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      return NextResponse.json({ assistant: {} });
    }

    // Fetch services
    const { data: services } = await client
      .from('services')
      .select('name, price, duration')
      .eq('business_id', business.id)
      .eq('is_active', true);

    // Fetch hours
    const { data: hours } = await client
      .from('working_hours')
      .select('day, open_time, close_time, is_closed')
      .eq('business_id', business.id);

    // Return enriched assistant config
    return NextResponse.json({
      assistant: {
        model: {
          messages: [
            {
              type: 'text',
              content: `Current services: ${JSON.stringify(services || [])}. Working hours: ${JSON.stringify(hours || [])}. Use ONLY this info for bookings and questions.`
            }
          ]
        }
      }
    });
  } catch (error: any) {
    console.error('VAPI server error:', error);
    return NextResponse.json({ assistant: {} });
  }
}