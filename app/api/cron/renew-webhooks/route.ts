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
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting webhook renewal...");

    // Find staff with expiring webhooks (10 days buffer)
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    const { data: staff } = await supabase
      .from("staff")
      .select("id, name, calendar_id")
      .eq("is_active", true)
      .or(`channel_expires_at.is.null,channel_expires_at.lt.${tenDaysFromNow.toISOString()}`);

    if (!staff || staff.length === 0) {
      console.log("✅ No webhooks need renewal");
      return NextResponse.json({ renewed: 0 });
    }

    console.log(`📋 Renewing ${staff.length} webhooks`);

    const calendar = getCalendarClient();
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`;
    let renewed = 0;

    for (const member of staff) {
      try {
        const channelId = `staff-${member.id}-${Date.now()}`;
        const response = await calendar.events.watch({
        calendarId: member.calendar_id,
        requestBody: {
            id: channelId,
            type: "web_hook",
            address: webhookUrl,
            expiration: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        },
        });

        await supabase
          .from("staff")
          .update({
            channel_id: response.data.id,
            channel_expires_at: new Date(parseInt(response.data.expiration!)).toISOString(),
          })
          .eq("id", member.id);

        console.log(`✅ Renewed webhook for ${member.name}`);
        renewed++;
      } catch (error: any) {
        console.error(`❌ Failed to renew webhook for ${member.name}:`, error.message);
      }
    }

    return NextResponse.json({ renewed, total: staff.length });
  } catch (error: any) {
    console.error("❌ Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}