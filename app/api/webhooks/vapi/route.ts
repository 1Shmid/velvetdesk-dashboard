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

    // Ищем имя в transcript после фраз "A nombre de" или "Mi nombre es"
    const namePatterns = [
    /nombre\s+(?:de\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
    /llamo\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
    /soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i
    ];

    // Исключаем служебные слова
    const excludeWords = ['correcto', 'perfecto', 'gracias', 'hola', 'vale', 'si', 'no'];

    for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
        const name = match[1].toLowerCase();
        if (!excludeWords.includes(name)) {
        customerName = match[1];
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