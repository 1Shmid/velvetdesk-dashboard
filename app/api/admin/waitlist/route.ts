import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Проверка admin cookie
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_id");
  
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, waitlistId } = await request.json();

  if (action === "approve") {
    // Обновляем статус в waitlist
    const { error } = await supabase
      .from("waitlist")
      .update({ status: "approved" })
      .eq("id", waitlistId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Создать запись в businesses
    // TODO: Отправить payment invite email

    return NextResponse.json({ success: true, message: "Approved" });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("waitlist")
      .update({ status: "rejected" })
      .eq("id", waitlistId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rejected" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}