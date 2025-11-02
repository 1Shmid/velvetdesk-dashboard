import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assistantId = body.message?.call?.assistantId;

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Missing assistant_id' },
        { status: 400 }
      );
    }

    console.log('🔍 Getting services for assistant:', assistantId);

    // Находим business по assistant_id
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (businessError || !business) {
      console.error('❌ Business not found:', businessError);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Получаем услуги
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, price, duration, description')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name');

    if (servicesError) {
      console.error('❌ Services error:', servicesError);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

console.log('✅ Services found:', services?.length || 0);

    // Получаем часы работы
    const { data: hours, error: hoursError } = await supabase
      .from('working_hours')
      .select('day_of_week, open_time, close_time')
      .eq('business_id', business.id)
      .order('day_of_week');

    if (hoursError) {
      console.error('⚠️ Hours error:', hoursError);
    }

    // Форматируем часы для AI
    const workingHours = hours?.reduce((acc, h) => {
      acc[h.day_of_week] = {
        open: h.open_time,
        close: h.close_time
      };
      return acc;
    }, {} as Record<number, { open: string; close: string }>) || {};

    // Форматируем для AI
    const formattedServices = services?.map(s => ({
      name: s.name,
      price: `€${s.price}`,
      duration: `${s.duration} min`,
      description: s.description || ''
    })) || [];

    return NextResponse.json({
      services: formattedServices,
      count: formattedServices.length,
      working_hours: workingHours
    });

  } catch (error) {
    console.error('❌ Get services error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}