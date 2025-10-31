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
        let customerName = 'Unknown';

        console.log('🔍 Starting name parsing...');

        const messages = artifact.messages || [];
        console.log('📝 Total messages:', messages.length);

        const excludeWords = ['quién', 'quien', 'correcto', 'perfecto', 'gracias', 'hola', 'vale', 'si', 'sí', 'no', 'claro', 'momentito'];

        for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        console.log(`Message ${i}:`, { role: msg.role, message: msg.message });
        
        if (msg.role === 'user') {
            const text = msg.message?.trim();
            console.log(`  User message: "${text}"`);
            
            if (!text || text.length > 20) {
            console.log(`  Skipped (too long or empty)`);
            continue;
            }
            
            const textLower = text.toLowerCase();
            
            if (excludeWords.includes(textLower)) {
            console.log(`  Skipped (excluded word)`);
            continue;
            }
            
            // Проверяем что это похоже на имя
            if (/^[a-záéíóúñ]+$/i.test(text)) {
            customerName = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
            console.log(`✅ Found name: "${customerName}"`);
            break;
            }
        }
        }

        console.log('🎯 Final customer name:', customerName);
        
        // Парсим услугу и время из transcript для улучшенного summary
        let service = 'Unknown';
        let bookingTime = '';

        // Ищем услугу в AI сообщениях
        const serviceMatch = transcript.match(/(?:corte de pelo|manicura|manicure|pedicura|masaje|tinte|coloración)/i);
        if (serviceMatch) {
        service = serviceMatch[0];
        }

        // Ищем время бронирования
        const timeMatch = transcript.match(/(?:mañana|hoy).*?(?:a las|a)\s+(\d+)/i);
        if (timeMatch) {
        const hour = timeMatch[1];
        const day = transcript.toLowerCase().includes('mañana') ? 'mañana' : 'hoy';
        bookingTime = `, ${day} a las ${hour}`;
        }

        // Формируем улучшенный outcome
        const outcome = `Booking confirmed for ${service}${bookingTime}`;
    

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
        summary: outcome,
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