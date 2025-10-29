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
      payload.message?.type === 'status-update' && 
      payload.message?.status === 'ended';

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

    // Собираем transcript из messages
    const messages = artifact.messages || [];
    const transcriptParts = messages
      .filter((m: any) => m.role === 'bot' || m.role === 'user')
      .map((m: any) => {
        const speaker = m.role === 'bot' ? 'AI' : 'Customer';
        return `${speaker}: ${m.message}`;
      });
    const transcript = transcriptParts.join('\n\n');

    // Вычисляем duration из первого и последнего сообщения
    const firstMsg = messages.find((m: any) => m.time);
    const lastMsg = [...messages].reverse().find((m: any) => m.time);
    const duration = firstMsg && lastMsg 
      ? Math.round((lastMsg.time - firstMsg.time) / 1000) 
      : 0;

    // Пытаемся найти имя клиента в transcript
    let customerName = 'Unknown';
    const namePatterns = [
      /nombre.*?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /llamo\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /soy\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i
    ];
    
    for (const pattern of namePatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        customerName = match[1];
        break;
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
        transcript: transcript,
        recording_url: '', // TODO: VAPI может отправить позже
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