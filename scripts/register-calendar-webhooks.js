require('dotenv').config({ path: '.env.local' });

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return google.calendar({ version: 'v3', auth });
}

async function registerWebhook(calendarId, staffId) {
  const calendar = getCalendarClient();
  const webhookUrl = 'https://velvetdesk-dashboard.vercel.app/api/webhooks/google-calendar';
  
  const channelId = `staff-${staffId}-${Date.now()}`;
  
  try {
    const response = await calendar.events.watch({
      calendarId: calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    console.log('✅ Webhook registered:', {
      channelId: response.data.id,
      resourceId: response.data.resourceId,
      expiration: new Date(parseInt(response.data.expiration)),
    });

    // Update staff with channel info
    await supabase
      .from('staff')
      .update({
        channel_id: response.data.id,
        channel_expires_at: new Date(parseInt(response.data.expiration)).toISOString(),
      })
      .eq('id', staffId);

    return response.data;
  } catch (error) {
    console.error('❌ Failed to register webhook:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting webhook registration...\n');

  // Load all active staff
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, name, calendar_id')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Failed to load staff:', error);
    process.exit(1);
  }

  console.log(`📋 Found ${staff.length} active staff members\n`);

  for (const member of staff) {
    console.log(`📅 Registering webhook for ${member.name}...`);
    try {
      await registerWebhook(member.calendar_id, member.id);
      console.log(`✅ Success for ${member.name}\n`);
    } catch (error) {
      console.error(`❌ Failed for ${member.name}:`, error.message, '\n');
    }
  }

  console.log('✅ Done!');
  process.exit(0);
}

console.log('Debug credentials:', {
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  keyStart: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50),
  keyLength: process.env.GOOGLE_PRIVATE_KEY?.length,
});

main();