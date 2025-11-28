import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
    console.log('\n🔍 ===== findBooking called =====');
    console.log('📥 Raw request:', JSON.stringify(body, null, 2));

    const toolCallId = body.message?.toolCallList?.[0]?.id || 
                       body.message?.toolCalls?.[0]?.id;
    
    const params = body.message?.toolCallList?.[0]?.function?.arguments ||
                   body.message?.toolCalls?.[0]?.function?.arguments;
    
    if (!params) {
      console.error('❌ No parameters');
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            found: false, 
            message: 'Parámetros requeridos' 
          })
        }]
      }, { headers: corsHeaders });
    }

    const rawParams = typeof params === 'string' ? JSON.parse(params) : params;
    const { phone_number, customer_name, fallback_phone } = rawParams;

    console.log('🔍 Search params:', { phone_number, customer_name, fallback_phone });

    // Get assistant_id and business
    const assistantId = body.message?.call?.assistantId || '6a693160-26cf-4f29-a143-b2385b89c47a';
    
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      console.error('❌ Business not found');
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            found: false, 
            message: 'Negocio no encontrado' 
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('🏢 Business ID:', business.id);

    let bookings: any[] = [];
    let customerNameFromBooking: string | null = null;

    // Strategy 1: Search by phone_number (primary)
    if (phone_number) {
      console.log('📞 Searching by phone:', phone_number);
      
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          customer_name,
          customer_phone,
          booking_phone,
          status,
          services (
            name,
            duration
          )
        `)
        .eq('business_id', business.id)
        .in('status', ['booked', 'confirmed'])
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .or(`customer_phone.eq.${phone_number},booking_phone.eq.${phone_number}`)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (data && data.length > 0) {
        bookings = data;
        customerNameFromBooking = data[0].customer_name;
        console.log('✅ Found by phone:', bookings.length, 'bookings');
      }
    }

    // Strategy 2: Fallback to name + phone (if phone search failed)
    if (bookings.length === 0 && customer_name && fallback_phone) {
      console.log('📞 Fallback: searching by name + phone:', { customer_name, fallback_phone });
      
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          customer_name,
          customer_phone,
          booking_phone,
          status,
          services (
            name,
            duration
          )
        `)
        .eq('business_id', business.id)
        .in('status', ['booked', 'confirmed'])
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .ilike('customer_name', `%${customer_name}%`)
        .or(`customer_phone.eq.${fallback_phone},booking_phone.eq.${fallback_phone}`)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (data && data.length > 0) {
        bookings = data;
        customerNameFromBooking = data[0].customer_name;
        console.log('✅ Found by name+phone:', bookings.length, 'bookings');
      }
    }

    // No bookings found
    if (bookings.length === 0) {
      console.log('❌ No bookings found');
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            found: false,
            message: phone_number 
              ? 'No encontré citas con tu número' 
              : 'No encontré tu cita'
          })
        }]
      }, { headers: corsHeaders });
    }

    // Format bookings
    const formattedBookings = bookings.map(b => ({
      id: b.id,
      date: b.booking_date,
      time: b.booking_time,
      service: b.services?.name || 'Servicio',
      customer_name: b.customer_name
    }));

    console.log('✅ Bookings found:', formattedBookings);
    console.log('===== findBooking END =====\n');

    // Generate message
    let message: string;
    if (formattedBookings.length === 1) {
      const b = formattedBookings[0];
      message = `Hola, ${customerNameFromBooking}! Tienes una cita: ${b.service} el ${b.date} a las ${b.time}`;
    } else {
      const bookingsList = formattedBookings
        .map((b, i) => `${i + 1}. ${b.service} el ${b.date} a las ${b.time}`)
        .join('; ');
      message = `Hola, ${customerNameFromBooking}! Tienes ${formattedBookings.length} citas: ${bookingsList}`;
    }

    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({
          found: true,
          count: formattedBookings.length,
          customer_name: customerNameFromBooking,
          bookings: formattedBookings,
          message
        })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ findBooking error:', error);
    console.log('===== findBooking END (ERROR) =====\n');
    
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id;
    
    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({ 
          found: false,
          message: 'Error al buscar citas'
        })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}