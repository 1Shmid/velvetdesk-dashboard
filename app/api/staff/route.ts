import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Load all staff with their services
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;

    const { data: staffData } = await supabase
      .from("staff")
      .select(`
        *,
        service_staff(
          service:services(id, name)
        )
      `)
      .eq("business_id", businessId)
      .order("name");

    if (staffData) {
      const staffWithServices = staffData.map((s: any) => ({
        ...s,
        services: s.service_staff?.map((ss: any) => ss.service).filter(Boolean) || [],
      }));
      return NextResponse.json(staffWithServices);
    }

    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new staff
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = (session.user as any).businessId;
    const { name, email, calendar_id, service_ids } = await request.json();

    const { data: newStaff, error } = await supabase
      .from("staff")
      .insert({
        business_id: businessId,
        name,
        email: email || null,
        calendar_id,
      })
      .select()
      .single();

    if (error) throw error;

    if (service_ids && service_ids.length > 0) {
      await supabase
        .from("service_staff")
        .insert(
          service_ids.map((serviceId: string) => ({
            staff_id: newStaff.id,
            service_id: serviceId,
          }))
        );
    }

    return NextResponse.json({ success: true, id: newStaff.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update existing staff
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, email, calendar_id, service_ids } = await request.json();

    const { error } = await supabase
      .from("staff")
      .update({
        name,
        email: email || null,
        calendar_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    await supabase.from("service_staff").delete().eq("staff_id", id);

    if (service_ids && service_ids.length > 0) {
      await supabase
        .from("service_staff")
        .insert(
          service_ids.map((serviceId: string) => ({
            staff_id: id,
            service_id: serviceId,
          }))
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Toggle active status
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, is_active } = await request.json();

    const { error } = await supabase
      .from("staff")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove staff
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { error } = await supabase.from("staff").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}