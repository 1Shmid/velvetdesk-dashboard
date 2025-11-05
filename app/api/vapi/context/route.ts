import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 VAPI Context called:', JSON.stringify(body, null, 2));
    const assistantId = body.message?.call?.assistantId || body.call?.assistantId || body.assistant?.id;
    console.log('🎯 Assistant ID:', assistantId);
    
    if (!assistantId) {
        console.log('❌ No assistant ID found in payload');
      return NextResponse.json({ messages: [] }, { headers: corsHeaders });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      return NextResponse.json({ messages: [] }, { headers: corsHeaders });
    }

    const { data: services } = await supabase
      .from('services')
      .select('name, price, duration')
      .eq('business_id', business.id)
      .eq('is_active', true);

    const { data: hours } = await supabase
      .from('working_hours')
      .select('day, open_time, close_time')
      .eq('business_id', business.id)
      .eq('is_closed', false);

    const servicesText = services?.map(s => 
      `- ${s.name}: €${s.price}, ${s.duration} min`
    ).join('\n') || 'No services available';

    const hoursText = hours?.map(h => 
      `${h.day}: ${h.open_time}-${h.close_time}`
    ).join(', ') || 'Hours not configured';

    console.log('✅ Returning services:', servicesText);
    console.log('✅ Returning hours:', hoursText);

    return NextResponse.json({
    assistant: {
        model: {
        messages: [
            {
            role: "system",
            content: `AVAILABLE SERVICES:\n${servicesText}\n\nWORKING HOURS:\n${hoursText}`
            }
        ]
        }
    }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Context error:', error);
    return NextResponse.json({ messages: [] }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}