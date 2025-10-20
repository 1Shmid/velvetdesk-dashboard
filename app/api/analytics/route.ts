import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = session.user.businessId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Calls timeline
  const { data: calls } = await supabase
    .from('calls')
    .select('created_at, status, duration')
    .eq('business_id', businessId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Bookings timeline
  const { data: bookings } = await supabase
    .from('bookings')
    .select('created_at, status')
    .eq('business_id', businessId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Aggregate calls by date
  const callsMap = new Map();
  calls?.forEach(call => {
    const date = call.created_at.split('T')[0];
    if (!callsMap.has(date)) {
      callsMap.set(date, { date, total: 0, completed: 0, missed: 0 });
    }
    const entry = callsMap.get(date);
    entry.total++;
    if (call.status === 'completed') entry.completed++;
    if (call.status === 'missed') entry.missed++;
  });

  // Aggregate bookings by date
  const bookingsMap = new Map();
  bookings?.forEach(booking => {
    const date = booking.created_at.split('T')[0];
    if (!bookingsMap.has(date)) {
      bookingsMap.set(date, { date, total: 0, confirmed: 0, pending: 0, cancelled: 0 });
    }
    const entry = bookingsMap.get(date);
    entry.total++;
    if (booking.status === 'confirmed') entry.confirmed++;
    if (booking.status === 'pending') entry.pending++;
    if (booking.status === 'cancelled') entry.cancelled++;
  });

  // Peak hours
  const hoursMap = new Map();
  calls?.forEach(call => {
    const hour = new Date(call.created_at).getHours();
    hoursMap.set(hour, (hoursMap.get(hour) || 0) + 1);
  });
  const peakHours = Array.from(hoursMap.entries())
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => b.count - a.count);

  // Summary
  const totalCalls = calls?.length || 0;
  const completedCalls = calls?.filter(c => c.status === 'completed').length || 0;
  const totalBookings = bookings?.length || 0;
  const avgDuration = totalCalls > 0 
  ? (calls ?? []).reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls 
  : 0;

  return NextResponse.json({
    callsTimeline: Array.from(callsMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    bookingsTimeline: Array.from(bookingsMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    peakHours: peakHours.slice(0, 5),
    summary: {
      totalCalls,
      completedCalls,
      missedCalls: totalCalls - completedCalls,
      totalBookings,
      avgDuration: Math.round(avgDuration),
      conversionRate: totalCalls > 0 ? Math.round((totalBookings / totalCalls) * 100) : 0
    }
  });
}