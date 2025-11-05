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
    console.log('🔧 getServices called:', JSON.stringify(body, null, 2));
    
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';

    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      return NextResponse.json({
        result: "Services temporarily unavailable"
      }, { headers: corsHeaders });
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
      `${s.name}: €${s.price}, ${s.duration} minutos`
    ).join('; ') || 'Sin servicios';

    const hoursText = hours?.map(h => 
      `${h.day}: ${h.open_time}-${h.close_time}`
    ).join('; ') || 'Sin horario';

    console.log('✅ Returning:', servicesText);

    return NextResponse.json({
      result: `Servicios: ${servicesText}. Horario: ${hoursText}`
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ getServices error:', error);
    return NextResponse.json({
      result: "Error al cargar servicios"
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}