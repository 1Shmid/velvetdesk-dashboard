import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;

    // Загружаем все данные параллельно
    const [businessData, settingsData, servicesData, hoursData, instructionsData] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).single(),
      supabase.from("agent_settings").select("*").eq("business_id", businessId).single(),
      supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true),
      supabase.from("working_hours").select("*").eq("business_id", businessId),
      supabase.from("agent_instructions").select("*").eq("business_id", businessId).order("order_index")
    ]);

    // Проверяем ошибки
    if (businessData.error) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      business: businessData.data,
      settings: settingsData.data || {},
      services: servicesData.data || [],
      hours: hoursData.data || [],
      instructions: instructionsData.data || []
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;
    const data = await request.json();

    // Обновляем бизнес информацию
    if (data.business) {
      await supabase
        .from("businesses")
        .update({
          business_name: data.business.business_name,
          phone: data.business.phone,
          email: data.business.email,
          website: data.business.website,
          address: data.business.address
        })
        .eq("id", businessId);
    }

    // Обновляем настройки агента
    if (data.settings) {
      const { error } = await supabase
        .from("agent_settings")
        .upsert({
          business_id: businessId,
          agent_name: data.settings.agent_name,
          sex: data.settings.sex,
          tone: data.settings.tone,
          language: data.settings.language,
          updated_at: new Date().toISOString()
        });
      
      if (error) console.error("Settings update error:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}