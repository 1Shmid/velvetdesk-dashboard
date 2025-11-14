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

// Spanish weekday mapping
const SPANISH_WEEKDAYS: { [key: string]: number } = {
  'domingo': 0,
  'lunes': 1,
  'martes': 2,
  'miércoles': 3,
  'miercoles': 3, // without accent
  'jueves': 4,
  'viernes': 5,
  'sábado': 6,
  'sabado': 6 // without accent
};

// English weekday mapping (for working_hours table)
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Calculate next occurrence of a weekday
 * @param weekdayStr - Spanish weekday (e.g., "lunes") or YYYY-MM-DD
 * @returns YYYY-MM-DD date string
 */
function calculateDate(weekdayStr: string): string {
  console.log('📅 calculateDate input:', weekdayStr);
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(weekdayStr)) {
    console.log('✅ Already formatted date:', weekdayStr);
    return weekdayStr;
  }

  const normalized = weekdayStr.toLowerCase().trim();
  const targetDay = SPANISH_WEEKDAYS[normalized];

  if (targetDay === undefined) {
    console.error('❌ Unknown weekday:', weekdayStr);
    return new Date().toISOString().split('T')[0]; // fallback to today
  }

  const today = new Date();
  const currentDay = today.getDay();
  
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7; // next week
  
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntil);
  
  const result = targetDate.toISOString().split('T')[0];
  console.log(`✅ "${weekdayStr}" → ${result} (in ${daysUntil} days)`);
  
  return result;
}

/**
 * Convert time to HH:MM format
 * @param timeStr - "12", "15:00", "3 de la tarde"
 * @returns HH:MM string
 */
function normalizeTime(timeStr: string): string {
  // If already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
  
  const lowerTime = timeStr.toLowerCase().trim();
  
  // "3 de la tarde" → 15:00
  const afternoonMatch = lowerTime.match(/(\d+)\s*(de\s*la\s*tarde|pm)/);
  if (afternoonMatch) {
    const hour = parseInt(afternoonMatch[1]);
    return `${hour === 12 ? 12 : hour + 12}:00`;
  }
  
  // "10 de la mañana" → 10:00
  const morningMatch = lowerTime.match(/(\d+)\s*(de\s*la\s*mañana|am)/);
  if (morningMatch) {
    const hour = parseInt(morningMatch[1]);
    return `${hour.toString().padStart(2, '0')}:00`;
  }
  
  // Just number: "5" → assume afternoon if < 12
  const numberMatch = lowerTime.match(/^\d+$/);
  if (numberMatch) {
    const hour = parseInt(lowerTime);
    // ✅ НОВАЯ ЛОГИКА: если < 12 → предполагаем tarde
    const adjustedHour = (hour >= 1 && hour < 12) ? hour + 12 : hour;
    return `${adjustedHour.toString().padStart(2, '0')}:00`;
  }
  
  return '12:00'; // fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('\n🔧 ===== checkAvailability called =====');
    console.log('📥 Raw request:', JSON.stringify(body, null, 2));

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

    const rawParams = typeof params === 'string' ? JSON.parse(params) : params;
    console.log('📋 Raw parameters:', rawParams);

    const { service_name, booking_date, booking_time } = rawParams;

    // Calculate actual date and normalize time
    const actualDate = calculateDate(booking_date);
    const actualTime = normalizeTime(booking_time);

    console.log('✨ Processed:', { 
      service_name, 
      actualDate, 
      actualTime,
      original: { booking_date, booking_time }
    });

    // Get assistant_id from call context
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';

    // Find business by assistant_id
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      console.error('❌ Business not found for assistant:', assistantId);
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

    console.log('🏢 Business ID:', business.id);

    // Find service by name (case-insensitive, trim spaces)
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration')
      .eq('business_id', business.id)
      .ilike('name', service_name.trim())
      .single();

    if (serviceError || !service) {
      console.error('❌ Service not found:', { service_name, error: serviceError });
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

    console.log('✅ Found service:', { id: service.id, name: service.name, duration: service.duration });

    // Check working hours
    const targetDate = new Date(actualDate);
    const dayOfWeek = WEEKDAY_NAMES[targetDate.getDay()];
    
    console.log('📅 Checking working hours for:', { actualDate, dayOfWeek });

    const { data: workingHours, error: hoursError } = await supabase
      .from('working_hours')
      .select('day, is_closed, open_time, close_time')
      .eq('business_id', business.id)
      .eq('day', dayOfWeek)
      .single();

    console.log('⏰ Working hours:', workingHours);

    if (hoursError || !workingHours || workingHours.is_closed) {
      console.error('❌ Salon closed on this day:', { dayOfWeek, error: hoursError });
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({
            available: false,
            reason: 'Salon closed',
            actual_date: actualDate,
            message: 'Lo siento, el salón está cerrado ese día'
          })
        }]
      }, { headers: corsHeaders });
    }

    // Check if requested time is within working hours
    const requestedTime = actualTime;
    const openTime = workingHours.open_time.slice(0, 5); // HH:MM
    const closeTime = workingHours.close_time.slice(0, 5); // HH:MM

    if (requestedTime < openTime || requestedTime >= closeTime) {
      console.error('❌ Outside working hours:', { requestedTime, openTime, closeTime });
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({
            available: false,
            reason: 'Outside working hours',
            actual_date: actualDate,
            message: `Lo siento, trabajamos de ${openTime} a ${closeTime}`
          })
        }]
      }, { headers: corsHeaders });
    }

    console.log('✅ Within working hours:', { requestedTime, openTime, closeTime });

    // Calculate end time
    const requestedStart = new Date(`${actualDate}T${actualTime}:00`);
    const requestedEnd = new Date(requestedStart.getTime() + service.duration * 60000);

    console.log('🕐 Requested slot:', { 
      start: actualTime, 
      end: requestedEnd.toTimeString().slice(0, 5),
      duration: service.duration 
    });

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
      .eq('booking_date', actualDate)
      .eq('status', 'booked');

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
    }

    console.log('📅 Existing bookings:', existingBookings?.length || 0);
    if (existingBookings && existingBookings.length > 0) {
      existingBookings.forEach(b => {
        console.log('   -', b.booking_time);
      });
    }

    // Check for overlaps
    let hasOverlap = false;
    
    if (existingBookings && existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const bookingDuration = serviceDurationMap.get(booking.service_id) || 30;
        const bookingStart = new Date(`${actualDate}T${booking.booking_time}`);
        const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

        if (requestedStart < bookingEnd && requestedEnd > bookingStart) {
          hasOverlap = true;
          console.log('❌ Overlap detected:', { 
            existing: booking.booking_time, 
            requested: actualTime,
            existingEnd: bookingEnd.toTimeString().slice(0, 5),
            requestedEnd: requestedEnd.toTimeString().slice(0, 5)
          });
          break;
        }
      }
    }

    // If available
    if (!hasOverlap) {
      console.log('✅ Time slot available!');
      console.log('===== checkAvailability END =====\n');
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({
            available: true,
            actual_date: actualDate,
            booking_time: actualTime,
            service_name: service.name, // Use DB name
            message: 'Horario disponible'
          })
        }]
      }, { headers: corsHeaders });
    }

    // If not available, find alternatives AROUND requested time
    console.log('🔍 Finding alternative times around requested slot...');

    const suggestedTimes: string[] = [];
    const requestedHour = parseInt(actualTime.split(':')[0]);
    const openHour = parseInt(openTime.split(':')[0]);
    const closeHour = parseInt(closeTime.split(':')[0]);

    // Search ±2 hours from requested time
    const searchStart = Math.max(requestedHour - 2, openHour);
    const searchEnd = Math.min(requestedHour + 2, closeHour);

    console.log('🔍 Search range:', { searchStart, searchEnd, requested: requestedHour });

    const workStart = new Date(`${actualDate}T${searchStart.toString().padStart(2, '0')}:00:00`);
    const workEnd = new Date(`${actualDate}T${searchEnd.toString().padStart(2, '0')}:00:00`);
    let currentSlot = new Date(workStart);
    
    const requestedTimeStr = actualTime; // e.g., "15:00"
    
    while (currentSlot < workEnd && suggestedTimes.length < 3) {
      const slotEnd = new Date(currentSlot.getTime() + service.duration * 60000);
      if (slotEnd > workEnd) break;
      
      const currentTimeStr = currentSlot.toTimeString().slice(0, 5);
      
      // Skip if this is the requested time (already occupied)
      if (currentTimeStr === requestedTimeStr) {
        currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
        continue;
      }
      
      let isFree = true;
      if (existingBookings) {
        for (const booking of existingBookings) {
          const bookingDuration = serviceDurationMap.get(booking.service_id) || 30;
          const bookingStart = new Date(`${actualDate}T${booking.booking_time}`);
          const bookingEnd = new Date(bookingStart.getTime() + bookingDuration * 60000);

          if (currentSlot < bookingEnd && slotEnd > bookingStart) {
            isFree = false;
            break;
          }
        }
      }
      
      if (isFree) {
        suggestedTimes.push(currentTimeStr);
      }
      
      currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
    }

    console.log('❌ Time slot occupied. Suggestions:', suggestedTimes);
    console.log('===== checkAvailability END =====\n');

    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({
          available: false,
          actual_date: actualDate,
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
    console.log('===== checkAvailability END (ERROR) =====\n');
    
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