import { createClient } from '@supabase/supabase-js';
import { updateCalendarEvent } from '@/lib/google-calendar';
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
    console.log('\n🔄 ===== modifyBooking called =====');
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
            success: false, 
            message: 'Parámetros requeridos' 
          })
        }]
      }, { headers: corsHeaders });
    }

    const rawParams = typeof params === 'string' ? JSON.parse(params) : params;
    const { booking_id, new_date, new_time, new_service } = rawParams;

    console.log('🔍 Modify params:', { booking_id, new_date, new_time, new_service });

    if (!booking_id) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            success: false, 
            message: 'booking_id requerido' 
          })
        }]
      }, { headers: corsHeaders });
    }

    if (!new_date && !new_time && !new_service) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            success: false, 
            message: 'Debes especificar al menos un cambio' 
          })
        }]
      }, { headers: corsHeaders });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, business_id, service_id, customer_name, booking_date, booking_time, calendar_event_id')
      .eq('id', booking_id)
      .in('status', ['booked', 'confirmed'])
      .single();

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError);
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            success: false, 
            message: 'Cita no encontrada o ya cancelada' 
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('✅ Booking found:', booking);

    // Prepare updates
    const updates: any = {};
    
    if (new_date) updates.booking_date = new_date;
    if (new_time) updates.booking_time = new_time;
    
    if (new_service) {
      const { data: service } = await supabase
        .from('services')
        .select('id, duration')
        .eq('business_id', booking.business_id)
        .ilike('name', new_service)
        .single();
      
      if (service) {
        updates.service_id = service.id;
      }
    }

    // Update booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking_id);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            success: false, 
            message: 'Error al modificar la cita' 
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('✅ Booking updated in database');

    // Update Calendar if event exists
    if (booking.calendar_event_id) {
      const finalServiceId = updates.service_id || booking.service_id;
      const { data: serviceData } = await supabase
        .from('services')
        .select('name, duration')
        .eq('id', finalServiceId)
        .single();

      const calendarUpdates: any = {
        customer_name: booking.customer_name,
      };
      
      if (serviceData) {
        calendarUpdates.service_name = serviceData.name;
        calendarUpdates.duration = serviceData.duration;
      }
      if (new_date) calendarUpdates.booking_date = new_date;
      if (new_time) calendarUpdates.booking_time = new_time;

      try {
        await updateCalendarEvent(booking.calendar_event_id, calendarUpdates);
        console.log('✅ Calendar updated');
      } catch (calError) {
        console.error('⚠️ Calendar update failed:', calError);
      }
    }

    // Build message
    const changes = [];
    if (new_date) changes.push(`fecha: ${new_date}`);
    if (new_time) changes.push(`hora: ${new_time}`);
    if (new_service) changes.push(`servicio: ${new_service}`);

    console.log('===== modifyBooking END =====\n');

    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({
          success: true,
          message: `Cita modificada: ${changes.join(', ')}`
        })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ modifyBooking error:', error);
    console.log('===== modifyBooking END (ERROR) =====\n');
    
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id;
    
    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({ 
          success: false,
          message: 'Error al modificar la cita'
        })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}