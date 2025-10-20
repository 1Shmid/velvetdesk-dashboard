import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('id');

  // Single call by ID
  if (callId) {
    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('business_id', session.user.businessId)
      .single(); // ← это должно вернуть один объект

    if (error) {
      console.error('Call fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(call); // ← возвращаем объект, не массив
  }

  // All calls (массив)
  const { data: calls, error } = await supabase
    .from('calls')
    .select('*')
    .eq('business_id', session.user.businessId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(calls);
}
