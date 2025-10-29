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

    // VAPI отправляет end-of-call-report
    if (payload.message?.type !== 'end-of-call-report') {
      return NextResponse.json({ received: true });
    }

    const call = payload.message?.call;
    if (!call) {
      return NextResponse.json({ error: 'No call data' }, { status: 400 });
    }

    // Находим business_id по vapi_assistant_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', call.assistantId)
      .single();

    if (businessError || !business) {
      console.error('Business not found for assistant:', call.assistantId);
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Вычисляем длительность звонка
    const startedAt = new Date(call.startedAt);
    const endedAt = new Date(call.endedAt);
    const duration = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Сохраняем звонок в таблицу calls
    const { data: savedCall, error: callError } = await supabase
      .from('calls')
      .insert({
        business_id: business.id,
        vapi_call_id: call.id,
        customer_name: call.customer?.name || 'Unknown',
        phone: call.customer?.number || '',
        duration: duration,
        status: call.status === 'ended' ? 'completed' : call.status,
        transcript: call.transcript || '',
        recording_url: call.recordingUrl || '',
        started_at: call.startedAt,
        ended_at: call.endedAt
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