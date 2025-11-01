"use client";

import { useState, useMemo, useEffect } from "react";
import { Phone, Calendar, Search, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSession } from "next-auth/react";

const parseBookingPhone = (transcript: string): string | null => {
  const phonePatterns = [/n[úu]mero/i, /number/i, /номер/i];
  const lines = transcript.split('\n');
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    for (const pattern of phonePatterns) {
      if (pattern.test(line)) {
        const afterKeyword = line.split(pattern)[1] || '';
        const digits = afterKeyword.replace(/\D/g, '');
        if (digits.length >= 9) {
          return digits.slice(0, 9);
        }
      }
    }
  }
  
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const digits = lines[i].replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 12) {
      return digits.slice(0, 9);
    }
  }
  
  return null;
};

type Call = {
  id: string;
  customer_name: string;
  phone: string;
  duration: number;
  status: string;
  call_date: string;
  summary: string | null;
  transcript: string | null;
};

export default function CallsPage() {
  const { data: session } = useSession();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    try {
      const response = await fetch("/api/calls");
      
      if (!response.ok) {
        console.error("API error:", response.status);
        return;
      }
      
      const data = await response.json();
      setCalls(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = useMemo(() => {
    let filtered = calls;

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const cutoff = new Date();

      if (timeFilter === "today") {
        cutoff.setHours(0, 0, 0, 0);
      } else if (timeFilter === "week") {
        cutoff.setDate(now.getDate() - 7);
      } else if (timeFilter === "month") {
        cutoff.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(
        (call) => new Date(call.call_date) >= cutoff
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((call) => call.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (call) =>
          call.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          call.phone?.includes(searchQuery)
      );
    }

    return filtered;
  }, [calls, timeFilter, statusFilter, searchQuery]);

  const stats = {
    total: calls.length,
    completed: calls.filter((c) => c.status === "completed").length,
    missed: calls.filter((c) => c.status === "missed").length,
  };

  const successRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all your AI receptionist calls
        </p>
      </div>

      {/* Time Filters */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Period:</span>
        <div className="flex gap-2">
          {["today", "week", "month", "all"].map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filteredCalls.length} calls
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={`cursor-pointer transition-colors ${
            statusFilter === "all" ? "border-primary" : ""
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            statusFilter === "completed" ? "border-primary" : ""
          }`}
          onClick={() => setStatusFilter("completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Phone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <p className="text-xs text-muted-foreground">
              {successRate}% success rate
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            statusFilter === "missed" ? "border-primary" : ""
          }`}
          onClick={() => setStatusFilter("missed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed</CardTitle>
            <Phone className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.missed}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.missed / stats.total) * 100) : 0}% missed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Phone Number</th>
                  <th className="text-left py-3 px-4">Booking Phone</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((call) => (
                  <tr 
                    key={call.id} 
                    className="border-b hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/calls/${call.id}`)}
                  >
                    <td className="py-4 px-4 font-medium">
                      {call.customer_name || "Unknown"}
                    </td>
                    <td className="py-4 px-4">{call.phone}</td>
                    <td className="py-4 px-4 text-muted-foreground">
  {call.transcript ? (parseBookingPhone(call.transcript) || call.phone) : call.phone}
</td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={
                          call.status === "completed"
                            ? "default"
                            : call.status === "missed"
                            ? "destructive"
                            : "secondary"
                        }
                        className={
                          call.status === "completed"
                            ? "bg-green-500 hover:bg-green-600"
                            : ""
                        }
                      >
                        {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {formatDate(call.call_date)}
                    </td>                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredCalls.map((call) => (
                <Card 
                  key={call.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/dashboard/calls/${call.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{call.customer_name || "Unknown"}</h3>
                        <p className="text-sm text-muted-foreground">{call.phone}</p>
                      </div>
                      <Badge
                        variant={call.status === "completed" ? "default" : "destructive"}
                        className={call.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
                      >
                        {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(call.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(call.call_date).split(',')[0]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

          {filteredCalls.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No calls found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}