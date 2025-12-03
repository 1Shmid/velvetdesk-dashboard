import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('\n🔧 ===== getStaff called =====');

    const toolCallId = body.message?.toolCallList?.[0]?.id;
    const assistantId = body.message?.call?.assistantId || 'db9394fa-ad57-4be0-b693-13e43a8a6aa2';

    // Find business
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!business) {
      console.error('❌ Business not found');
      return NextResponse.json({
        results: [{
          toolCallId: toolCallId,
          result: JSON.stringify({ staff: [], error: 'Business not found' })
        }]
      }, { headers: corsHeaders });
    }

    // Get active staff with their services
    const { data: staff } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        service_staff(
          service:services(id, name)
        )
      `)
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name');

    const staffList = staff?.map((s: any) => ({
      id: s.id,
      name: s.name,
      services: s.service_staff?.map((ss: any) => ss.service?.name).filter(Boolean) || []
    })) || [];

    console.log('✅ Staff list:', staffList.length);
    console.log('===== getStaff END =====\n');

    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({ staff: staffList })
      }]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('❌ getStaff error:', error);
    const body = await request.json().catch(() => ({}));
    const toolCallId = body.message?.toolCallList?.[0]?.id;
    
    return NextResponse.json({
      results: [{
        toolCallId: toolCallId,
        result: JSON.stringify({ staff: [], error: 'Internal error' })
      }]
    }, { headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}