import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TIMEZONE = 'Europe/Madrid';

interface CalendarEvent {
  service_name: string;
  customer_name: string;
  booking_phone: string;
  customer_phone: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM
  duration: number; // minutes
}

// Authenticate with Google Calendar API
function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  return google.calendar({ version: 'v3', auth });
}

// Create calendar event
export async function createCalendarEvent(
  eventData: CalendarEvent
): Promise<string | null> {
  try {
    const calendar = getCalendarClient();

    // Combine date and time into ISO format
    const startDateTime = `${eventData.booking_date}T${eventData.booking_time}:00`;
    
    // Calculate end time
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + eventData.duration * 60000);
    const endDateTime = endDate.toISOString().slice(0, 19);

    const event = {
      summary: `${eventData.service_name} - ${eventData.customer_name}`,
      description: `📞 Booking Phone: ${eventData.booking_phone}\n📱 Customer Called From: ${eventData.customer_phone}`,
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

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      requestBody: event,
    });

    console.log('✅ Calendar event created:', response.data.id);
    return response.data.id || null;
  } catch (error) {
    console.error('❌ Calendar sync failed:', error);
    return null;
  }
}

// Update calendar event (for future use)
export async function updateCalendarEvent(
  eventId: string,
  eventData: Partial<CalendarEvent>
): Promise<boolean> {
  try {
    const calendar = getCalendarClient();

    // Build update object based on provided fields
    const updateData: any = {};

    if (eventData.service_name || eventData.customer_name) {
      updateData.summary = `${eventData.service_name} - ${eventData.customer_name}`;
    }

    if (eventData.booking_phone || eventData.customer_phone) {
      updateData.description = `📞 Booking Phone: ${eventData.booking_phone}\n📱 Customer Called From: ${eventData.customer_phone}`;
    }

    if (eventData.booking_date && eventData.booking_time && eventData.duration) {
      const startDateTime = `${eventData.booking_date}T${eventData.booking_time}:00`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + eventData.duration * 60000);
      
      updateData.start = {
        dateTime: startDateTime,
        timeZone: TIMEZONE,
      };
      updateData.end = {
        dateTime: endDate.toISOString().slice(0, 19),
        timeZone: TIMEZONE,
      };
    }

    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId: eventId,
      requestBody: updateData,
    });

    console.log('✅ Calendar event updated:', eventId);
    return true;
  } catch (error) {
    console.error('❌ Calendar update failed:', error);
    return false;
  }
}

// Delete calendar event (for future use)
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const calendar = getCalendarClient();

    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID!,
      eventId: eventId,
    });

    console.log('✅ Calendar event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('❌ Calendar delete failed:', error);
    return false;
  }
}