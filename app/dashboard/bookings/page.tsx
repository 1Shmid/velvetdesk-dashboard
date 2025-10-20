'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, ChevronUp, Phone, FileText } from 'lucide-react';

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
  call_id?: string;
  services: {
    name: string;
    price: number;
    duration: number;
  };
}

interface CallData {
  transcript?: string;
  recording_url?: string;
  duration?: number;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [callData, setCallData] = useState<{ [key: string]: CallData }>({});

  useEffect(() => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  const handleBookingClick = async (booking: Booking) => {
    if (expandedId === booking.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(booking.id);

    if (booking.call_id && !callData[booking.id]) {
      const res = await fetch(`/api/calls?id=${booking.call_id}`);
      const data = await res.json();
      console.log('Call data:', data); 
      setCallData(prev => ({ ...prev, [booking.id]: data }));
    }
  };

  const filteredBookings = selectedDate
    ? bookings.filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate.toDateString() === selectedDate.toDateString();
      })
    : bookings;

  const bookingDates = bookings.map(b => new Date(b.booking_date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bookings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ booked: bookingDates }}
              modifiersClassNames={{ booked: 'bg-green-100 text-green-900 font-bold' }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Bookings for ${selectedDate.toLocaleDateString()}` : 'All Bookings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredBookings.length === 0 ? (
                <p className="text-muted-foreground">No bookings found</p>
              ) : (
                filteredBookings.map(booking => {
                  const isExpanded = expandedId === booking.id;
                  const call = callData[booking.id];

                  return (
                    <div key={booking.id} className="border rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 hover:bg-accent cursor-pointer"
                        onClick={() => handleBookingClick(booking)}
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{booking.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
                          <p className="text-sm">{booking.services?.name} - {booking.booking_time}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Service</p>
                              <p className="font-medium">{booking.services?.name}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duration</p>
                              <p className="font-medium">{booking.services?.duration} min</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-medium">€{booking.services?.price}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Date</p>
                              <p className="font-medium">{booking.booking_date}</p>
                            </div>
                          </div>

                          {call?.recording_url && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <Phone className="w-4 h-4" />
                                Call Recording
                              </div>
                              <audio controls className="w-full">
                                <source src={call.recording_url} type="audio/mpeg" />
                              </audio>
                              {call.duration && (
                                <p className="text-xs text-muted-foreground">
                                  Duration: {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                                </p>
                              )}
                            </div>
                          )}

                          {call?.transcript && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <FileText className="w-4 h-4" />
                                Transcript
                              </div>
                              <div className="bg-background border rounded-lg p-3 max-h-48 overflow-y-auto text-sm">
                                <p className="whitespace-pre-wrap">{call.transcript}</p>
                              </div>
                            </div>
                          )}

                          {booking.call_id && !call && (
                            <p className="text-sm text-muted-foreground">Loading call data...</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Bookings</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{bookings.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Confirmed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}