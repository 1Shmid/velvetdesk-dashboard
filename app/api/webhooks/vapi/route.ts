import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCalendarEvent } from '@/lib/google-calendar';

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

    // Читаем из structuredData (универсально)
    const bookingOutput = payload.message?.analysis?.structuredData || {};

    const bookingData = {
      customer_name: bookingOutput.customer_name || 'Unknown',
      customer_phone: bookingOutput.customer_phone || '',
      service_requested: bookingOutput.service_requested || 'Unknown',
      booking_date: bookingOutput.booking_date || '',
      booking_time: bookingOutput.booking_time || '',
      outcome: bookingOutput.outcome || 'inquiry_only'
    };

    const customerName = bookingData.customer_name;
    const serviceRequested = bookingData.service_requested;
    const bookingDate = bookingData.booking_date;
    const bookingTime = bookingData.booking_time;
    const outcome = bookingData.outcome;
    const customerPhone = call.customer?.number || '';
    const bookingPhone = bookingData.customer_phone || '';

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
        customer_phone: customerPhone,
        booking_phone: bookingPhone,
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

    // Парсинг даты из дней недели
    const parseBookingDate = (dateStr: string): string => {
      const lowerDate = dateStr.toLowerCase();
      const today = new Date();
      
      // Дни недели
      const weekdays: { [key: string]: number } = {
        'lunes': 1, 'monday': 1,
        'martes': 2, 'tuesday': 2,
        'miércoles': 3, 'miercoles': 3, 'wednesday': 3,
        'jueves': 4, 'thursday': 4,
        'viernes': 5, 'friday': 5,
        'sábado': 6, 'sabado': 6, 'saturday': 6,
        'domingo': 0, 'sunday': 0
      };
      
      // Проверяем день недели
      for (const [day, targetDay] of Object.entries(weekdays)) {
        if (lowerDate.includes(day)) {
          const currentDay = today.getDay();
          let daysUntil = targetDay - currentDay;
          if (daysUntil <= 0) daysUntil += 7;
          
          const result = new Date(today);
          result.setDate(today.getDate() + daysUntil);
          return result.toISOString().split('T')[0];
        }
      }
      
      if (lowerDate.includes('mañana') || lowerDate.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      
      if (lowerDate.includes('hoy') || lowerDate.includes('today')) {
        return today.toISOString().split('T')[0];
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    };

    // Парсинг времени
    const parseBookingTime = (timeStr: string): string => {
      const lowerTime = timeStr.toLowerCase().trim();
      
      // Уже в формате HH:MM (проверяем ПЕРВЫМ!)
      const exactMatch = lowerTime.match(/(\d{1,2}):(\d{2})/);
      if (exactMatch) {
        const h = exactMatch[1].padStart(2, '0');
        const m = exactMatch[2];
        return `${h}:${m}`;
      }
      
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
      
      // "las 12", "a las 12", "12" → 12:00 (только если НЕТ двоеточия)
      const hourOnlyMatch = lowerTime.match(/(?:las\s+|a\s+las\s+)?(\d{1,2})(?:\s|$)/);
      if (hourOnlyMatch) {
        const hour = parseInt(hourOnlyMatch[1]);
        if (hour >= 0 && hour <= 23) {
          return `${hour.toString().padStart(2, '0')}:00`;
        }
      }
      
      // Если ничего не распарсилось - логируем и возвращаем пустую строку
      console.error('⚠️ Failed to parse time:', timeStr);
      return '';
    };

    const parsedDate = parseBookingDate(bookingDate);
    const parsedTime = parseBookingTime(bookingTime);

    // Исправляем дату если в прошлом
    const fixPastDate = (dateStr: string): string => {
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }

      const bookingDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        bookingDate.setDate(bookingDate.getDate() + 7);
        console.log(`📅 Date was in past, moved forward: ${dateStr} → ${bookingDate.toISOString().split('T')[0]}`);
        return bookingDate.toISOString().split('T')[0];
      }
      
      return dateStr;
    };

    const finalBookingDate = fixPastDate(parsedDate);
    const finalBookingTime = parsedTime;

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
        .select('id, name, duration')
        .eq('business_id', business.id)
        .ilike('name', normalizedSearch)
        .limit(1);

      // Если не найдено - частичное совпадение
      if (!services || services.length === 0) {
        const { data: partialMatch } = await supabase
          .from('services')
          .select('id, name, duration')
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
          booking_date: finalBookingDate,
          booking_time: finalBookingTime
        });

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            business_id: business.id,
            call_id: savedCall.id,
            customer_name: customerName,
            customer_phone: customerPhone,
            booking_phone: bookingPhone,
            service_id: services[0].id,
            booking_date: finalBookingDate,
            booking_time: finalBookingTime,
            status: 'booked'
          })
          .select()
          .single();

        if (bookingError) {
          console.error('❌ Booking error:', bookingError);
        } else {
          console.log('✅ Booking created successfully');

          // Обновляем summary с правильным названием сервиса из базы
          const correctServiceName = services[0].name;
          const updatedSummary = `Booking confirmed for ${customerName}, ${correctServiceName}, ${finalBookingDate}, ${finalBookingTime}`;

          await supabase
            .from('calls')
            .update({ summary: updatedSummary })
            .eq('id', savedCall.id);

          // Sync with Google Calendar
          if (booking) {
            const calendarEventId = await createCalendarEvent({
              service_name: correctServiceName,
              customer_name: customerName,
              booking_phone: bookingPhone,
              customer_phone: customerPhone,
              booking_date: finalBookingDate,
              booking_time: finalBookingTime,
              duration: services[0].duration,
            });

            // Update booking with calendar_event_id
            if (calendarEventId) {
              await supabase
                .from('bookings')
                .update({
                  calendar_event_id: calendarEventId,
                  calendar_synced_at: new Date().toISOString(),
                })
                .eq('id', booking.id);

              console.log(`✅ Booking ${booking.id} synced to calendar: ${calendarEventId}`);
            } else {
              console.log(`⚠️ Booking ${booking.id} created but calendar sync failed`);
            }
          }
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