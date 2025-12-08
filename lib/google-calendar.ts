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

interface AvailabilityResult {
  available: boolean;
  suggestedTimes: string[];
  availableStaff?: Array<{ id: string; name: string }>;
  assignedStaff?: { id: string; name: string };
}

// Authenticate with Google Calendar API
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

// Create calendar event
export async function createCalendarEvent(
  eventData: CalendarEvent,
  staffId?: string
): Promise<string | null> {
  try {
    // Debug logging
    console.log('🔍 Calendar API Debug:', {
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      privateKeyExists: !!process.env.GOOGLE_PRIVATE_KEY,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length,
      privateKeyStart: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50),
    });

    const calendar = getCalendarClient();

    // Determine which calendar to use
    let calendarId = process.env.GOOGLE_CALENDAR_ID!;
    
    if (staffId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: staff } = await supabase
        .from('staff')
        .select('calendar_id')
        .eq('id', staffId)
        .eq('is_active', true)
        .single();
      if (staff?.calendar_id) calendarId = staff.calendar_id;
    }

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
      calendarId: calendarId,
      requestBody: event,
    });

    console.log('✅ Calendar event created:', response.data.id);
    return response.data.id || null;
  } catch (error: any) {
    console.error('❌ Calendar sync failed:', error);
    console.error('📋 Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
      response: error.response?.data,
    });
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

// Delete calendar event
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

// Check time slot availability (universal: single staff or all staff)
  export async function checkAvailability(
    businessId: string,
    bookingDate: string,
    bookingTime: string,
    duration: number,
    staffId?: string
  ): Promise<AvailabilityResult> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const requestedStart = new Date(`${bookingDate}T${bookingTime}:00`);
      const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

      const dayStart = new Date(bookingDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(bookingDate);
      dayEnd.setHours(23, 59, 59, 999);

      // If staff_id specified → check only that staff
      if (staffId) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, name, calendar_id')
          .eq('id', staffId)
          .eq('is_active', true)
          .single();

        if (!staff) {
          return { available: false, suggestedTimes: [] };
        }

        const calendar = getCalendarClient();
        const { data: events } = await calendar.events.list({
          calendarId: staff.calendar_id,
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const bookedSlots = (events.items || []).map((event: any) => ({
          start: new Date(event.start.dateTime || event.start.date),
          end: new Date(event.end.dateTime || event.end.date),
        }));

        console.log(`📅 ${staff.name} has ${bookedSlots.length} events at ${bookingTime}`);

        const hasConflict = bookedSlots.some(slot => {
          return (
            (requestedStart >= slot.start && requestedStart < slot.end) ||
            (requestedEnd > slot.start && requestedEnd <= slot.end) ||
            (requestedStart <= slot.start && requestedEnd >= slot.end)
          );
        });

        if (!hasConflict) {
          return {
            available: true,
            suggestedTimes: [],
            assignedStaff: { id: staff.id, name: staff.name }
          };
        }

        // Find alternative times for this staff
        const suggestedTimes = await findAlternativeTimes(
          staff.calendar_id,
          bookingDate,
          duration,
          bookedSlots
        );

        return { available: false, suggestedTimes };
      }

      // If NO staff_id → check ALL staff calendars
      const { data: allStaff } = await supabase
        .from('staff')
        .select('id, name, calendar_id')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

        console.log('📋 All staff for availability check:', allStaff);

      if (!allStaff || allStaff.length === 0) {
        return { available: false, suggestedTimes: [] };
      }

      const calendar = getCalendarClient();
      const availableStaff: Array<{ id: string; name: string }> = [];

      for (const staff of allStaff) {
        console.log(`🔍 Checking calendar for ${staff.name} (${staff.calendar_id})`);
        const { data: events } = await calendar.events.list({
          calendarId: staff.calendar_id,
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        const bookedSlots = (events.items || []).map((event: any) => ({
          start: new Date(event.start.dateTime || event.start.date),
          end: new Date(event.end.dateTime || event.end.date),
        }));

        console.log(`📅 ${staff.name} has ${bookedSlots.length} events on ${bookingDate} at ${bookingTime}:`,
          bookedSlots.map(s => ({ 
            start: s.start.toISOString(), 
            end: s.end.toISOString() 
          }))
        );

        const hasConflict = bookedSlots.some(slot => {
          return (
            (requestedStart >= slot.start && requestedStart < slot.end) ||
            (requestedEnd > slot.start && requestedEnd <= slot.end) ||
            (requestedStart <= slot.start && requestedEnd >= slot.end)
          );
        });

        if (!hasConflict) {
          availableStaff.push({ id: staff.id, name: staff.name });
        }
      }

      if (availableStaff.length > 0) {
        return {
          available: true,
          suggestedTimes: [],
          availableStaff,
          assignedStaff: availableStaff[0] // First available as default
        };
      }

      // No staff available - find alternative times across all calendars
      const suggestedTimes: string[] = [];
      const workStart = 9;
      const workEnd = 20;

      for (let hour = workStart; hour < workEnd && suggestedTimes.length < 3; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (suggestedTimes.length >= 3) break;
          
          const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(`${bookingDate}T${slotTime}:00`);
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          // Check if ANY staff is available at this time
          for (const staff of allStaff) {

            console.log(`🔍 Checking calendar for ${staff.name} (${staff.calendar_id})`);

            const { data: events } = await calendar.events.list({
              calendarId: staff.calendar_id,
              timeMin: slotStart.toISOString(),
              timeMax: slotEnd.toISOString(),
              singleEvents: true,
            });

            const hasConflict = events.items && events.items.length > 0;

            if (!hasConflict) {
              suggestedTimes.push(slotTime);
              break;
            }
          }
        }
      }

      return { available: false, suggestedTimes };
    } catch (error) {
      console.error('❌ Availability check failed:', error);
      return { available: false, suggestedTimes: [] };
    }
  }

  // Helper function to find alternative times
  async function findAlternativeTimes(
    calendarId: string,
    bookingDate: string,
    duration: number,
    existingSlots: Array<{ start: Date; end: Date }>
  ): Promise<string[]> {
    const suggestedTimes: string[] = [];
    const workStart = 9;
    const workEnd = 20;

    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotStart = new Date(`${bookingDate}T${slotTime}:00`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        const slotConflict = existingSlots.some(slot => {
          return (
            (slotStart >= slot.start && slotStart < slot.end) ||
            (slotEnd > slot.start && slotEnd <= slot.end) ||
            (slotStart <= slot.start && slotEnd >= slot.end)
          );
        });

        if (!slotConflict && suggestedTimes.length < 3) {
          suggestedTimes.push(slotTime);
        }
      }
    }

    return suggestedTimes;
  }