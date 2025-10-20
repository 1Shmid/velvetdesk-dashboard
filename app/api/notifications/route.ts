import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
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
    const { 
        email_new_call, 
        email_booking_confirmed, 
        email_booking_cancelled,
        email_agent_settings_changed,
        email_billing_updates,
        email_marketing_news,
        sms_enabled 
        } = await request.json();

    const { error } = await supabase
        .from("notification_settings")
        .update({
            email_new_call,
            email_booking_confirmed,
            email_booking_cancelled,
            email_agent_settings_changed,
            email_billing_updates,
            email_marketing_news,
            sms_enabled,
            updated_at: new Date().toISOString()
        })
      .eq("business_id", businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}