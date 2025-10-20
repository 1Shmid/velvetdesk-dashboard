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

    // Получаем данные бизнеса
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("business_name, contact_name, phone")
      .eq("id", businessId)
      .single();

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }

    // Получаем email из users
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email")
      .eq("business_id", businessId)
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({
      business_name: business.business_name,
      contact_name: business.contact_name,
      phone: business.phone,
      email: user.email
    });

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
    const { business_name, contact_name, phone } = await request.json();

    // Обновляем данные бизнеса
    const { error } = await supabase
      .from("businesses")
      .update({
        business_name,
        contact_name,
        phone
      })
      .eq("id", businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}