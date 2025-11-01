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

    // Обрабатываем ТОЛЬКО end-of-call-report
    if (payload.message?.type !== 'end-of-call-report') {
        return NextResponse.json({ received: true });
    }


    const call = payload.message?.call;
    const artifact = payload.message?.artifact;

    // DEBUG: Смотрим структуру данных
    console.log('📦 Artifact structure:', JSON.stringify(artifact, null, 2));
    console.log('📦 Messages count:', artifact?.messages?.length);
    if (artifact?.messages?.[0]) {
    console.log('📦 First message structure:', JSON.stringify(artifact.messages[0], null, 2));
    }
    
    if (!call || !artifact) {
      return NextResponse.json({ error: 'No call data' }, { status: 400 });
    }

    // Находим business_id по assistantId
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', call.assistantId)
      .single();

    if (businessError || !business) {
      console.error('Business not found for assistant:', call.assistantId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Используем готовые данные из payload
    const transcript = payload.message.transcript || '';
    const summary = payload.message.summary || '';
    const duration = Math.round(payload.message.durationSeconds || 0);
    const recordingUrl = payload.message.recordingUrl || '';

    
    // Парсим имя из User сообщений
        // Извлекаем структурированные данные из analysis
        const analysis = payload.message?.analysis || {};
        const structuredData = analysis.structuredData || {};

        console.log('📊 Structured Data:', JSON.stringify(structuredData, null, 2));

        // Используем структурированные данные
        const customerName = structuredData.customer_name || 'Unknown';
        const bookingPhone = structuredData.customer_phone || '';
        const serviceRequested = structuredData.service_requested || 'Unknown';
        const bookingDate = structuredData.booking_date || '';
        const bookingTime = structuredData.booking_time || '';
        const callOutcome = structuredData.outcome || 'inquiry_only';

        // Формируем улучшенный summary
        const enhancedSummary = `Booking confirmed for ${customerName}, ${serviceRequested}, ${bookingDate}${bookingTime ? ', ' + bookingTime : ''}`;

    // Сохраняем в Supabase
    const { data: savedCall, error: callError } = await supabase
      .from('calls')
      .insert({
        business_id: business.id,
        vapi_call_id: call.id,
        customer_name: customerName,
        phone: call.customer?.number || '',
        duration: duration,
        status: 'completed',
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
    return NextResponse.json({ success: true, call_id: savedCall.id });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}