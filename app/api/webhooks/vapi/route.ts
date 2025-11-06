import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    console.log('VAPI Webhook received:', JSON.stringify(payload, null, 2));

    if (payload.message?.type !== 'end-of-call-report') {
      return NextResponse.json({ received: true });
    }

    const call = payload.message?.call;
    const artifact = payload.message?.artifact;
    
    if (!call || !artifact) {
      return NextResponse.json({ error: 'No call data' }, { status: 400 });
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', call.assistantId)
      .single();

    if (businessError || !business) {
      console.error('Business not found for assistant:', call.assistantId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const transcript = payload.message.transcript || '';
    const duration = Math.round(payload.message.durationSeconds || 0);
    const recordingUrl = payload.message.recordingUrl || '';

    // Данные приходят в analysis.structuredData
    const bookingData = payload.message?.analysis?.structuredData || {};

    const customerName      = bookingData.customer_name      || 'Unknown';
    const serviceRequested  = bookingData.service_requested  || 'Unknown';
    const bookingDate       = bookingData.booking_date       || '';
    const bookingTime       = bookingData.booking_time       || '';
    const outcome           = bookingData.outcome            || 'inquiry_only';
    const customerPhone = call.customer?.number || '';  // С какого номера звонил
    const bookingPhone = bookingData.customer_phone || '';  // Какой назвал для записи

    // Формируем summary на основе outcome
    let enhancedSummary = '';
    if (outcome === 'booked') {
    enhancedSummary = `Booking confirmed for ${customerName}, ${serviceRequested}${bookingDate ? ', ' + bookingDate : ''}${bookingTime ? ', ' + bookingTime : ''}`;
    } else if (outcome === 'cancelled') {
    enhancedSummary = `Booking cancelled by ${customerName}`;
    } else {
    enhancedSummary = `Inquiry about ${serviceRequested} by ${customerName}`;
    }

    const { data: savedCall, error: callError } = await supabase
      .from('calls')
      .insert({
        business_id: business.id,
        vapi_call_id: call.id,
        customer_name: customerName,
        customer_phone: customerPhone,  // С какого звонил
        booking_phone: bookingPhone,    // Назвал для записи
        duration: duration,
        status: outcome === 'booked' ? 'booked' : 'missed',
        summary: enhancedSummary,
        transcript: transcript,
        recording_url: recordingUrl,
        call_date: new Date().toISOString()
      })
      .select()
      .single();

    if (callError) {
      console.error('Error saving call:', callError);
      return NextResponse.json({ error: callError.message }, { status: 500 });
    }

    console.log('✅ Call saved:', savedCall.id);

    console.log('🔍 Booking check:', {
        outcome,
        serviceRequested,
        customerName,
        bookingDate,
        bookingTime
        });

    // Создаём booking
    if (outcome === 'booked' && serviceRequested !== 'Unknown') {

        console.log('🔍 Service search:', {
            searchTerm: serviceRequested,
            business_id: business.id
        });

      // Нормализация для поиска
        const normalizeService = (name: string) => {
        return name
            .toLowerCase()
            .replace(/corte de pelo/gi, 'corte de cabello')
            .replace(/tinte de pelo/gi, 'tinte y coloración')
            .trim();
        };

        const normalizedSearch = normalizeService(serviceRequested);

        console.log('🔍 Service search:', {
        original: serviceRequested,
        normalized: normalizedSearch,
        business_id: business.id
        });

        // Сначала точное совпадение
        let { data: services } = await supabase
        .from('services')
        .select('id, name')
        .eq('business_id', business.id)
        .ilike('name', normalizedSearch)
        .limit(1);

        // Если не найдено - частичное совпадение
        if (!services || services.length === 0) {
        const { data: partialMatch } = await supabase
            .from('services')
            .select('id, name')
            .eq('business_id', business.id)
            .ilike('name', `%${normalizedSearch.split(' ')[0]}%`)
            .limit(1);
        
        services = partialMatch;
        }

        console.log('🔍 Service found:', {
            found: services?.length || 0,
            serviceId: services?.[0]?.id
        });

      if (services && services.length > 0) {

        console.log('✅ Creating booking:', {
            customer_name: customerName,
            service_id: services[0].id,
            booking_date: bookingDate,
            booking_time: bookingTime
            });

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            business_id: business.id,
            call_id: savedCall.id,
            customer_name: customerName,
            customer_phone: customerPhone,  // С какого звонил
            booking_phone: bookingPhone,    // Для связи
            service_id: services[0].id,
            booking_date: bookingDate,
            booking_time: bookingTime,
            status: 'booked'
          });

        if (bookingError) {
            console.error('❌ Booking error:', bookingError);
            } else {
            console.log('✅ Booking created successfully');
            }
      } else {
        console.log('⚠️ Service not found:', serviceRequested);
      }
    }

    return NextResponse.json({ success: true, call_id: savedCall.id });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}