
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TIMEZONE = 'Europe/Madrid';

// Google Calendar client
function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    },
    scopes: SCOPES,
  });

  return google.calendar({ version: 'v3', auth });
}

async function main() {
  console.log('🧹 Starting cleanup...\n');

  // 1. Get all bookings with calendar_event_id
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, calendar_event_id')
    .not('calendar_event_id', 'is', null);

  console.log(`📅 Found ${bookings?.length || 0} bookings with calendar events`);

  // 2. Delete calendar events
  if (bookings && bookings.length > 0) {
    const calendar = getCalendarClient();
    
    for (const booking of bookings) {
      try {
        await calendar.events.delete({
          calendarId: process.env.GOOGLE_CALENDAR_ID!,
          eventId: booking.calendar_event_id!,
        });
        console.log(`✅ Deleted calendar event: ${booking.calendar_event_id}`);
      } catch (error) {
        console.log(`⚠️ Calendar event not found: ${booking.calendar_event_id}`);
      }
    }
  }

  // 3. Delete all bookings
  const { error: bookingsError } = await supabase
    .from('bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (bookingsError) {
    console.error('❌ Failed to delete bookings:', bookingsError);
  } else {
    console.log('✅ All bookings deleted');
  }

  // 4. Delete all calls
  const { error: callsError } = await supabase
    .from('calls')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (callsError) {
    console.error('❌ Failed to delete calls:', callsError);
  } else {
    console.log('✅ All calls deleted');
  }

  console.log('\n🌱 Starting seed...\n');

  // 5. Get business and services
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .limit(1)
    .single();

  if (!business) {
    console.error('❌ No business found');
    return;
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration')
    .eq('business_id', business.id);

  if (!services || services.length === 0) {
    console.error('❌ No services found');
    return;
  }

  console.log(`🏢 Business ID: ${business.id}`);
  console.log(`💅 Found ${services.length} services`);

  // 6. Generate test data
  const calendar = getCalendarClient();
  const testCustomers = [
    { name: 'Manolo Garcia', phone: '+34622880246' }, // Твой номер - booking 1
    { name: 'Manolo Garcia', phone: '+34622880246' }, // Твой номер - booking 2
    { name: 'María López', phone: '+34611222333' },
    { name: 'Laura Sánchez', phone: '+34633666777' },
    { name: 'Carmen Rodríguez', phone: '+34644888999' },
    ];

  // Get next week dates (Mon-Fri)
  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));

  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(nextMonday);
    date.setDate(nextMonday.getDate() + i);
    dates.push(date);
  }

  // Random times: 10:00, 12:00, 14:00, 16:00, 18:00
  const times = ['10:00', '12:00', '14:00', '16:00', '18:00'];

  for (let i = 0; i < 5; i++) {
  const customer = testCustomers[i];
  
  // Для первых двух записей (Manolo Garcia) - РАЗНЫЕ сервисы
  let service;
  if (i === 0) {
    service = services[0]; // Первый сервис
  } else if (i === 1) {
    service = services[1] || services[0]; // Второй сервис (или первый если нет второго)
  } else {
    service = services[Math.floor(Math.random() * services.length)]; // Остальные - случайно
  }
  
  const date = dates[i];
  const time = times[Math.floor(Math.random() * times.length)];

    const bookingDate = date.toISOString().split('T')[0];
    const bookingTime = time;

    console.log(`\n📞 Creating booking ${i + 1}:`);
    console.log(`   Customer: ${customer.name}`);
    console.log(`   Service: ${service.name}`);
    console.log(`   Date: ${bookingDate} ${bookingTime}`);

    // Create booking in Supabase
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        business_id: business.id,
        service_id: service.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        booking_phone: customer.phone,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      console.error(`   ❌ Failed to create booking:`, bookingError);
      continue;
    }

    console.log(`   ✅ Booking created: ${booking.id}`);

    // Create calendar event
    const startDateTime = `${bookingDate}T${bookingTime}:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + service.duration * 60000);
    const endDateTime = endDate.toISOString().slice(0, 19);

    const event = {
      summary: `${service.name} - ${customer.name}`,
      description: `📞 Booking Phone: ${customer.phone}\n📱 Customer Called From: ${customer.phone}`,
      start: {
        dateTime: startDateTime,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIMEZONE,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        requestBody: event,
      });

      console.log(`   ✅ Calendar event created: ${response.data.id}`);

      // Update booking with calendar_event_id
      await supabase
        .from('bookings')
        .update({
          calendar_event_id: response.data.id,
          calendar_synced_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      console.log(`   ✅ Booking updated with calendar_event_id`);
    } catch (error) {
      console.error(`   ❌ Calendar sync failed:`, error);
    }
  }

  console.log('\n✅ Done! 5 test bookings created with calendar sync');
}

main();