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

    // VAPI отправляет status-update с ended
    const isCallEnded = 
    payload.message?.type === 'end-of-call-report' ||
    (payload.message?.type === 'status-update' && payload.message?.status === 'ended');

    if (!isCallEnded) {
      return NextResponse.json({ received: true });
    }

    const call = payload.message?.call;
    const artifact = payload.message?.artifact;
    
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

    // Парсим имя из transcript (ищем после "Sofía" или другое имя)
    let customerName = 'Unknown';
    const messages = artifact?.messages || [];
    for (const msg of messages) {
    if (msg.role === 'user' && msg.message) {
        // Простая проверка: если сообщение короткое и начинается с заглавной - это имя
        const trimmed = msg.message.trim();
        if (trimmed.length < 20 && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed) && !trimmed.includes(' ')) {
        customerName = trimmed.replace(/[.,;]$/, '');
        break;
        }
    }
    }
        
    

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
        summary: summary,
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