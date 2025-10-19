import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;
    const { hours } = await request.json();

    // Удаляем старые записи
    await supabase
      .from("working_hours")
      .delete()
      .eq("business_id", businessId);

    // Вставляем новые
    const hoursToInsert = hours.map((hour: any) => ({
      business_id: businessId,
      day: hour.day,
      is_closed: hour.is_closed,
      open_time: hour.is_closed ? null : hour.open_time,
      close_time: hour.is_closed ? null : hour.close_time
    }));

    const { error } = await supabase
      .from("working_hours")
      .insert(hoursToInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}