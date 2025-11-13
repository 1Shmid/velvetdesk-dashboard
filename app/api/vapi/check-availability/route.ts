import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AvailabilityRequest {
  business_id: string;
  service_id: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
}

interface BookingSlot {
  start: Date;
  end: Date;
}

export async function POST(request: NextRequest) {
  try {
    const body: AvailabilityRequest = await request.json();
    const { business_id, service_id, booking_date, booking_time } = body;

    // Validate input
    if (!business_id || !service_id || !booking_date || !booking_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Get service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration')
      .eq('id', service_id)
      .eq('business_id', business_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // 2. Calculate end time
    const requestedStart = new Date(`${booking_date}T${booking_time}:00`);
    const requestedEnd = new Date(requestedStart.getTime() + service.duration * 60000);

    // 3. Get all bookings for this date
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('booking_time, service_id, services(duration)')
      .eq('business_id', business_id)
      .eq('booking_date', booking_date)
      .eq('status', 'booked');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    // 4. Check for overlaps
    let hasOverlap = false;
    
    if (existingBookings && existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const bookingStart = new Date(`${booking_date}T${booking.booking_time}`);
        const bookingDuration = (booking.services as any)?.duration || 30;
        const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

        // Check overlap: (StartA < EndB) AND (EndA > StartB)
        if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
          hasOverlap = true;
          break;
        }
      }
    }

    // 5. If available, return success
    if (!hasOverlap) {
      return NextResponse.json({
        available: true,
        booking_time,
        message: 'Time slot is available'
      });
    }

    // 6. If not available, find alternative slots
    const { data: workingHours, error: hoursError } = await supabase
      .from('working_hours')
      .select('start_time, end_time')
      .eq('business_id', business_id)
      .eq('day_of_week', new Date(booking_date).getDay())
      .single();

    if (hoursError || !workingHours) {
      return NextResponse.json({
        available: false,
        reason: 'No working hours configured for this day',
        suggested_times: []
      });
    }

    // Generate time slots (every 30 minutes within working hours)
    const suggestedTimes: string[] = [];
    const workStart = new Date(`${booking_date}T${workingHours.start_time}`);
    const workEnd = new Date(`${booking_date}T${workingHours.end_time}`);
    
    let currentSlot = new Date(workStart);
    
    while (currentSlot < workEnd && suggestedTimes.length < 3) {
      const slotEnd = new Date(currentSlot.getTime() + service.duration * 60000);
      
      // Skip if slot extends beyond working hours
      if (slotEnd > workEnd) break;
      
      // Check if this slot is free
      let isFree = true;
      if (existingBookings) {
        for (const booking of existingBookings) {
          const bookingStart = new Date(`${booking_date}T${booking.booking_time}`);
          const bookingDuration = (booking.services as any)?.duration || 30;
          const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

          if (currentSlot < bookingEnd && slotEnd > bookingStart) {
            isFree = false;
            break;
          }
        }
      }
      
      if (isFree) {
        const timeStr = currentSlot.toTimeString().slice(0, 5);
        suggestedTimes.push(timeStr);
      }
      
      // Move to next 30-minute slot
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    return NextResponse.json({
      available: false,
      reason: 'Time slot is already booked',
      suggested_times: suggestedTimes,
      message: suggestedTimes.length > 0 
        ? `Lo siento, esa hora está ocupada. Tengo disponible a las ${suggestedTimes.join(', ')}`
        : 'No hay horarios disponibles para ese día'
    });

  } catch (error) {
    console.error('Error in check-availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}