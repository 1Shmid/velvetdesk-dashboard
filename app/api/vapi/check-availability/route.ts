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
    console.log('🔧 checkAvailability called:', JSON.stringify(body, null, 2));

    // Extract tool call ID
    const toolCallId = body.message?.toolCallList?.[0]?.id || 
                       body.message?.toolCalls?.[0]?.id;
    
    // Extract parameters
    const params = body.message?.toolCallList?.[0]?.function?.arguments ||
                   body.message?.toolCalls?.[0]?.function?.arguments;
    
    if (!params) {
      console.error('❌ No parameters in request');
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({ 
            available: false, 
            reason: 'Missing parameters',
            suggested_times: []
          })
        }]
      }, { headers: corsHeaders });
    }

    const { service_name, booking_date, booking_time } = 
      typeof params === 'string' ? JSON.parse(params) : params;

    console.log('📋 Checking availability:', { service_name, booking_date, booking_time });

    // Get assistant_id from call context
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';

    // Find business by assistant_id
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      console.error('❌ Business not found');
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({ 
            available: false,
            reason: 'Business not found',
            suggested_times: []
          })
        }]
      }, { headers: corsHeaders });
    }

    // Find service by name (case-insensitive, trim spaces)
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration')
      .eq('business_id', business.id)
      .ilike('name', service_name.trim())
      .single();

    if (serviceError || !service) {
      console.error('❌ Service not found:', serviceError);
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({ 
            available: false,
            reason: 'Service not found',
            suggested_times: []
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('✅ Found service:', { id: service.id, duration: service.duration });

    // Calculate end time
    const requestedStart = new Date(`${booking_date}T${booking_time}:00`);
    const requestedEnd = new Date(requestedStart.getTime() + service.duration * 60000);

    // Get all services for this business (to map durations)
    const { data: allServices } = await supabase
      .from('services')
      .select('id, duration')
      .eq('business_id', business.id);

    const serviceDurationMap = new Map(
      allServices?.map(s => [s.id, s.duration]) || []
    );

    // Get all bookings for this date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_time, service_id')
      .eq('business_id', business.id)
      .eq('booking_date', booking_date)
      .eq('status', 'booked');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
    }

    console.log('📅 Existing bookings:', existingBookings?.length || 0);

    // Check for overlaps
    let hasOverlap = false;
    
    if (existingBookings && existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const bookingDuration = serviceDurationMap.get(booking.service_id) || 30;
        const bookingStart = new Date(`${booking_date}T${booking.booking_time}`);
        const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

        if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
          hasOverlap = true;
          console.log('❌ Overlap detected:', { 
            existing: booking.booking_time, 
            requested: booking_time 
          });
          break;
        }
      }
    }

    // If available
    if (!hasOverlap) {
      console.log('✅ Time slot available');
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({
            available: true,
            booking_time: booking_time,
            message: 'Horario disponible'
          })
        }]
      }, { headers: corsHeaders });
    }

    // If not available, find alternatives
    const { data: workingHours } = await supabase
      .from('working_hours')
      .select('open_time, close_time')
      .eq('business_id', business.id)
      .eq('day_of_week', new Date(booking_date).getDay())
      .single();

    const suggestedTimes: string[] = [];
    
    if (workingHours) {
      const workStart = new Date(`${booking_date}T${workingHours.open_time}`);
      const workEnd = new Date(`${booking_date}T${workingHours.close_time}`);
      let currentSlot = new Date(workStart);
      
      while (currentSlot < workEnd && suggestedTimes.length < 3) {
        const slotEnd = new Date(currentSlot.getTime() + service.duration * 60000);
        if (slotEnd > workEnd) break;
        
        let isFree = true;
        if (existingBookings) {
          for (const booking of existingBookings) {
            const bookingDuration = serviceDurationMap.get(booking.service_id) || 30;
            const bookingStart = new Date(`${booking_date}T${booking.booking_time}`);
            const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

            if (currentSlot < bookingEnd && slotEnd > bookingStart) {
              isFree = false;
              break;
            }
          }
        }
        
        if (isFree) {
          suggestedTimes.push(currentSlot.toTimeString().slice(0, 5));
        }
        
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
      }
    }

    console.log('❌ Time slot occupied. Suggestions:', suggestedTimes);

    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({
          available: false,
          reason: 'Horario ocupado',
          suggested_times: suggestedTimes,
          message: suggestedTimes.length > 0 
            ? `Lo siento, esa hora está ocupada. Tengo disponible a las ${suggestedTimes.join(', ')}`
            : 'No hay horarios disponibles para ese día'
        })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ checkAvailability error:', error);
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id;
    
    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({ 
          available: false,
          reason: 'Error interno',
          suggested_times: []
        })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}