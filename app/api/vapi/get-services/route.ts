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
    console.log('\n🔧 ===== getServices called =====');
    console.log('📥 Raw request:', JSON.stringify(body, null, 2));

    const toolCallId = body.message?.toolCallList?.[0]?.id || 
                       body.message?.toolCalls?.[0]?.id;
    console.log('🔑 Tool Call ID:', toolCallId);
    
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';
    console.log('🤖 Assistant ID:', assistantId);

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      console.error('❌ Business not found for assistant:', assistantId);
      return NextResponse.json({
        results: [
          {
            toolCallId: toolCallId,
            result: "Services temporarily unavailable"
          }
        ]
      }, { headers: corsHeaders });
    }

    console.log('🏢 Business ID:', business.id);

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

    console.log('📋 Services found:', services?.length || 0);
    if (services && services.length > 0) {
      services.forEach(s => {
        console.log(`   - ${s.name}: €${s.price}, ${s.duration}min`);
      });
    }

    const servicesText = services?.map(s => 
      `${s.name}: €${s.price}, ${s.duration} minutos`
    ).join('; ') || 'Sin servicios';

    const hoursText = hours?.map(h => 
      `${h.day}: ${h.open_time}-${h.close_time}`
    ).join('; ') || 'Sin horario';

    // Extract overall working hours range
    const openTimes = hours?.map(h => h.open_time) || [];
    const closeTimes = hours?.map(h => h.close_time) || [];
    const earliestOpen = openTimes.length ? openTimes.sort()[0] : '09:00';
    const latestClose = closeTimes.length ? closeTimes.sort().reverse()[0] : '20:00';               

    // Include service names list for AI matching
    const serviceNames = services?.map(s => s.name).join(', ') || '';

    console.log('✅ Service names:', serviceNames);
    console.log('📋 Full details:', servicesText);
    console.log('⏰ Working hours:', hoursText);
    console.log('===== getServices END =====\n');

    return NextResponse.json({
      results: [
        {
          toolCallId: toolCallId,
          result: `AVAILABLE_SERVICES: ${serviceNames}

          ${servicesText}

          Horario: ${hoursText}.

          Horario general: ${earliestOpen} - ${latestClose}

          IMPORTANT: When customer requests a service, use EXACT name from AVAILABLE_SERVICES list.`
        }
      ]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ getServices error:', error);
    console.log('===== getServices END (ERROR) =====\n');
    
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id || 
                       body.message?.toolCalls?.[0]?.id;
    
    return NextResponse.json({
      results: [
        {
          toolCallId: toolCallId,
          result: "Error al cargar servicios"
        }
      ]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}