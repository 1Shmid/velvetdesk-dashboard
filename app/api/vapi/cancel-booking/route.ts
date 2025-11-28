import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { deleteCalendarEvent } from '@/lib/google-calendar';

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
    console.log('\n❌ ===== cancelBooking called =====');
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
    const { booking_id } = rawParams;

    console.log('🔍 Cancel params:', { booking_id });

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

    // Get booking details before canceling
    const { data: booking } = await supabase
    .from('bookings')
    .select('id, booking_date, booking_time, calendar_event_id, service_id')
    .eq('id', booking_id)
    .single();

    if (!booking) {
    console.error('❌ Booking not found:', booking_id);
    return NextResponse.json({
        results: [{
        toolCallId,
        result: JSON.stringify({ 
            success: false, 
            message: 'Cita no encontrada' 
        })
        }]
    }, { headers: corsHeaders });
    }

    // Get service name
    const { data: service } = await supabase
    .from('services')
    .select('name')
    .eq('id', booking.service_id)
    .single();

    const serviceName = service?.name || 'Servicio';

    console.log('✅ Booking found:', { ...booking, serviceName });

    // Update booking status to cancelled
    const { error: updateError } = await supabase
    .from('bookings')
    .update({ 
        status: 'cancelled'
        // Убрали updated_at
    })
    .eq('id', booking_id);

    if (updateError) {
      console.error('❌ Error updating booking:', updateError);
      return NextResponse.json({
        results: [{
          toolCallId,
          result: JSON.stringify({ 
            success: false, 
            message: 'Error al cancelar la cita' 
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('✅ Booking cancelled in database');

    // Delete Google Calendar event if exists
    if (booking.calendar_event_id) {
      try {
        const { deleteCalendarEvent } = await import('@/lib/google-calendar');
        await deleteCalendarEvent(booking.calendar_event_id);
        console.log('✅ Calendar event deleted:', booking.calendar_event_id);
      } catch (calError) {
        console.error('⚠️ Calendar deletion failed:', calError);
        // Continue anyway - booking is cancelled in DB
      }
    }

    console.log('===== cancelBooking END =====\n');

    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({
          success: true,
          message: `Cita cancelada: ${serviceName} el ${booking.booking_date} a las ${booking.booking_time}`
        })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ cancelBooking error:', error);
    console.log('===== cancelBooking END (ERROR) =====\n');
    
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id;
    
    return NextResponse.json({
      results: [{
        toolCallId,
        result: JSON.stringify({ 
          success: false,
          message: 'Error al cancelar la cita'
        })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}