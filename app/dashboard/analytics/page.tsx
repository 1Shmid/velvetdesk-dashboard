'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  callsTimeline: any[];
  bookingsTimeline: any[];
  peakHours: any[];
  summary: {
    totalCalls: number;
    completedCalls: number;
    missedCalls: number;
    totalBookings: number;
    avgDuration: number;
    conversionRate: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Calls</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.summary.totalCalls}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bookings</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.summary.totalBookings}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avg Duration</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.summary.avgDuration}s</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Conversion</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.summary.conversionRate}%</p></CardContent>
        </Card>
      </div>

      {/* Calls Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Calls Timeline</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.callsTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
              <Line type="monotone" dataKey="missed" stroke="#ef4444" name="Missed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bookings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.bookingsTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="confirmed" stroke="#10b981" />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader><CardTitle>Peak Hours</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}