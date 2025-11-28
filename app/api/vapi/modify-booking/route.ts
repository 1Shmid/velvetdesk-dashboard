import { createClient } from '@supabase/supabase-js';
import { updateCalendarEvent } from '@/lib/google-calendar';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { booking_id, new_date, new_time, new_service } = await request.json();

    console.log('🔄 Modify booking request:', { booking_id, new_date, new_time, new_service });

    // Validate required parameter
    if (!booking_id) {
      return NextResponse.json(
        { success: false, message: 'booking_id es requerido' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // At least one modification required
    if (!new_date && !new_time && !new_service) {
      return NextResponse.json(
        { success: false, message: 'Debes especificar al menos un cambio (fecha, hora o servicio)' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
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
      return NextResponse.json(
        { success: false, message: 'No encontré esa cita o ya fue cancelada' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Prepare update data
    const updates: any = {};
    
    if (new_date) updates.booking_date = new_date;
    if (new_time) updates.booking_time = new_time;
    if (new_service) {
      // Resolve service_id from service name
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

    // Update booking in database
    const { error: updateError } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', booking_id);

    if (updateError) {
      console.error('❌ Failed to update booking:', updateError);
      return NextResponse.json(
        { success: false, message: 'Error al modificar la cita' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('✅ Booking updated:', booking_id);

    // Update Google Calendar if event exists
    if (booking.calendar_event_id) {
      // Get updated service details for calendar
      const finalServiceId = updates.service_id || booking.service_id;
      const { data: serviceData } = await supabase
        .from('services')
        .select('name, duration')
        .eq('id', finalServiceId)
        .single();

      const calendarUpdates: any = {};
      if (serviceData) {
        calendarUpdates.service_name = serviceData.name;
        calendarUpdates.duration = serviceData.duration;
      }
      if (new_date) calendarUpdates.booking_date = new_date;
      if (new_time) calendarUpdates.booking_time = new_time;
      calendarUpdates.customer_name = booking.customer_name;

      const calendarUpdated = await updateCalendarEvent(
        booking.calendar_event_id,
        calendarUpdates
      );

      if (calendarUpdated) {
        console.log('✅ Calendar event updated');
      } else {
        console.warn('⚠️ Calendar update failed, but booking modified');
      }
    }

    // Build confirmation message
    const changes = [];
    if (new_date) changes.push(`fecha: ${new_date}`);
    if (new_time) changes.push(`hora: ${new_time}`);
    if (new_service) changes.push(`servicio: ${new_service}`);

    return NextResponse.json(
      {
        success: true,
        message: `¡Perfecto! He modificado tu cita. Cambios: ${changes.join(', ')}.`,
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error) {
    console.error('❌ Modify booking error:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}