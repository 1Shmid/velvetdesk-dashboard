import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function POST(request: Request) {
  try {
    const headers = request.headers;
    const channelId = headers.get("x-goog-channel-id");
    const resourceState = headers.get("x-goog-resource-state");

    console.log("📅 Google Calendar Webhook:", {
      channelId,
      resourceState,
    });

    // Ignore sync messages
    if (resourceState === "sync") {
      return NextResponse.json({ received: true });
    }

    // Find staff by channel_id
    const { data: staff } = await supabase
      .from("staff")
      .select("id, business_id, name, calendar_id")
      .eq("channel_id", channelId)
      .single();

    if (!staff) {
      console.log("⚠️ Staff not found for channel:", channelId);
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    console.log("✅ Staff found:", staff.name);

    // Fetch recent events from this calendar
    const calendar = getCalendarClient();
    const now = new Date();
    const timeMin = now.toISOString();

    const { data: events } = await calendar.events.list({
      calendarId: staff.calendar_id,
      timeMin,
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    console.log(`📋 Found ${events.items?.length || 0} upcoming events`);

    // Process each event
    for (const event of events.items || []) {
      if (!event.start?.dateTime || !event.id) continue;

      const startDateTime = new Date(event.start.dateTime);
      const endDateTime = event.end?.dateTime ? new Date(event.end.dateTime) : startDateTime;
      const duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000);

      const bookingDate = startDateTime.toISOString().split("T")[0];
      const bookingTime = startDateTime.toTimeString().slice(0, 5);

      // Parse event summary
      const summary = event.summary || "Manual Entry";
      let customerName = summary;
      let serviceId = null;

      // Try to extract service name
      const { data: services } = await supabase
        .from("services")
        .select("id, name")
        .eq("business_id", staff.business_id);

      if (services) {
        for (const service of services) {
          if (summary.toLowerCase().includes(service.name.toLowerCase())) {
            serviceId = service.id;
            customerName = summary.replace(new RegExp(service.name, "gi"), "").replace(/[-–—]/g, "").trim();
            break;
          }
        }
      }

      if (!customerName) customerName = "Manual Entry";

      // Check if booking already exists
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("calendar_event_id", event.id)
        .single();

      if (existingBooking) {
        console.log("⏭️ Booking already exists:", event.id);
        continue;
      }

      // Create booking
      const { error } = await supabase.from("bookings").insert({
        business_id: staff.business_id,
        staff_id: staff.id,
        customer_name: customerName,
        service_id: serviceId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        duration,
        status: "confirmed",
        booking_source: "owner",
        calendar_event_id: event.id,
        calendar_synced_at: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ Failed to create booking:", error);
      } else {
        console.log("✅ Booking created from calendar event:", event.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle verification requests
export async function GET(request: Request) {
  return NextResponse.json({ status: "ok" });
}