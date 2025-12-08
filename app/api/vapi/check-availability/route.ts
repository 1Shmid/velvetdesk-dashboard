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

// English weekday mapping (for working_hours table)
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export async function POST(request: NextRequest) {
  let toolCallId: string | undefined;
  
  try {
    const body = await request.json();
    console.log('\n🔧 ===== checkAvailability called =====');
    console.log('📥 Raw request:', JSON.stringify(body, null, 2));

    // Extract tool call ID
    toolCallId = body.message?.toolCallList?.[0]?.id || 
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

    const { service_name, booking_date, booking_time, staff_id } = rawParams;

    // === BUSINESS LOOKUP ===
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';

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

    // === LLM PARSER CALL ===
    console.log('🔍 Calling LLM parser...');
    console.log('   URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('   Endpoint:', '/api/vapi/parse-booking-data');
    console.log('   Params:', { service_name, booking_date, booking_time, staff_id });

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL is not defined');
    }

    const parseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/parse-booking-data`;
    console.log('   Full URL:', parseUrl);

    const parseResponse = await fetch(parseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_name,
        booking_date,
        booking_time,
        staff_id: staff_id || null,
        business_id: business.id,
        language: 'es',
      }),
    });

    console.log('📡 Parser response status:', parseResponse.status);

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      console.error('❌ LLM parser failed:', { 
        status: parseResponse.status, 
        statusText: parseResponse.statusText,
        error: errorText 
      });
      throw new Error(`LLM parser failed with status ${parseResponse.status}: ${errorText}`);
    }

    const parseResult = await parseResponse.json();
    console.log('✨ LLM Parser SUCCESS:', parseResult);

    const { normalized_date, normalized_time, staff_name_or_id } = parseResult;

    if (!normalized_date || !normalized_time) {
      console.error('❌ Invalid parser result:', parseResult);
      throw new Error(`Parser returned invalid data: normalized_date=${normalized_date}, normalized_time=${normalized_time}`);
    }

    const actualDate = normalized_date;
    const actualTime = normalized_time;
    const resolvedStaffId = staff_name_or_id;

    console.log('✅ Final parsed values:', { 
      actualDate, 
      actualTime,
      resolvedStaffId,
      original: { booking_date, booking_time }
    });

    // === SERVICE LOOKUP ===
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

    // === WORKING HOURS CHECK ===
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

    // === GOOGLE CALENDAR AVAILABILITY CHECK ===
    const { checkAvailability: checkGoogleAvailability } = await import('@/lib/google-calendar');
    
    const availability = await checkGoogleAvailability(
      business.id,
      actualDate,
      actualTime,
      service.duration,
      resolvedStaffId || undefined
    );

    console.log('✅ Availability result:', availability);
    console.log('===== checkAvailability END =====\n');

    if (availability.available) {
      const assignedStaff = availability.assignedStaff;
      const availableStaff = availability.availableStaff || [];

      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({
            available: true,
            actual_date: actualDate,
            booking_time: actualTime,
            service_name: service.name,
            assigned_staff: assignedStaff,
            available_staff: availableStaff,
            message: availableStaff.length > 1 
              ? `Horario disponible con ${availableStaff.map(s => s.name).join(' y ')}`
              : `Horario disponible${assignedStaff ? ' con ' + assignedStaff.name : ''}`
          })
        }]
      }, { headers: corsHeaders });
    }

    // Not available - return suggestions
    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({
          available: false,
          actual_date: actualDate,
          reason: 'Horario ocupado',
          suggested_times: availability.suggestedTimes,
          message: availability.suggestedTimes.length > 0 
            ? `Lo siento, esa hora está ocupada. Tengo disponible a las ${availability.suggestedTimes.join(', ')}`
            : 'No hay horarios disponibles para ese día'
        })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌❌❌ checkAvailability FATAL ERROR ❌❌❌');
    console.error('Error details:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('===== checkAvailability END (ERROR) =====\n');
    
    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({ 
          available: false,
          reason: 'Error interno',
          message: 'Lo siento, hubo un error procesando tu solicitud',
          suggested_times: []
        })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}