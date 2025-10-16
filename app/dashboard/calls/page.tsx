"use client";

import { useState, useMemo } from "react";
import { Phone, Clock, FileText, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Типы данных
type CallStatus = "completed" | "missed" | "in-progress";
type DateFilter = "today" | "week" | "month" | "all";
type StatusFilter = "all" | "completed" | "missed";

interface Call {
  id: string;
  customerName: string;
  phoneNumber: string;
  duration: string;
  status: CallStatus;
  timestamp: string;
  date: Date;
  hasTranscript: boolean;
}

// Моковые данные
const mockCalls: Call[] = [
  {
    id: "1",
    customerName: "María García",
    phoneNumber: "+34 612 345 678",
    duration: "5:32",
    status: "completed",
    timestamp: "2025-10-15 14:30",
    date: new Date("2025-10-15T14:30:00"),
    hasTranscript: true,
  },
  {
    id: "2",
    customerName: "John Smith",
    phoneNumber: "+34 623 456 789",
    duration: "2:15",
    status: "completed",
    timestamp: "2025-10-15 12:15",
    date: new Date("2025-10-15T12:15:00"),
    hasTranscript: true,
  },
  {
    id: "3",
    customerName: "Ana López",
    phoneNumber: "+34 634 567 890",
    duration: "0:00",
    status: "missed",
    timestamp: "2025-10-15 10:45",
    date: new Date("2025-10-15T10:45:00"),
    hasTranscript: false,
  },
  {
    id: "4",
    customerName: "Carlos Rodríguez",
    phoneNumber: "+34 645 678 901",
    duration: "8:45",
    status: "completed",
    timestamp: "2025-10-14 16:20",
    date: new Date("2025-10-14T16:20:00"),
    hasTranscript: true,
  },
  {
    id: "5",
    customerName: "Laura Martínez",
    phoneNumber: "+34 656 789 012",
    duration: "3:20",
    status: "completed",
    timestamp: "2025-10-10 09:15",
    date: new Date("2025-10-10T09:15:00"),
    hasTranscript: true,
  },
  {
    id: "6",
    customerName: "Pedro Sánchez",
    phoneNumber: "+34 667 890 123",
    duration: "0:00",
    status: "missed",
    timestamp: "2025-10-08 18:45",
    date: new Date("2025-10-08T18:45:00"),
    hasTranscript: false,
  },
];

// Компонент статуса
const StatusBadge = ({ status }: { status: CallStatus }) => {
  const variants = {
    completed: { label: "Completed", className: "bg-green-100 text-green-800" },
    missed: { label: "Missed", className: "bg-red-100 text-red-800" },
    "in-progress": { label: "In Progress", className: "bg-blue-100 text-blue-800" },
  };

  const { label, className } = variants[status];

  return <Badge className={className}>{label}</Badge>;
};

// Компонент карточки звонка (для мобильных)
const CallCard = ({ call, onViewTranscript }: { call: Call; onViewTranscript: (id: string) => void }) => {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewTranscript(call.id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base">{call.customerName}</h3>
            <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
          </div>
          <StatusBadge status={call.status} />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{call.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{call.timestamp}</span>
          </div>
        </div>

        {call.hasTranscript && (
          <Button variant="ghost" size="sm" className="w-full mt-3">
            View Transcript
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default function CallsPage() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const router = useRouter();

  const handleViewTranscript = (callId: string) => {
  router.push(`/dashboard/calls/${callId}`);

  };

  // Фильтрация по дате
  const dateFilteredCalls = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (dateFilter) {
      case "today":
        return mockCalls.filter(call => call.date >= today);
      case "week":
        return mockCalls.filter(call => call.date >= weekAgo);
      case "month":
        return mockCalls.filter(call => call.date >= monthAgo);
      case "all":
      default:
        return mockCalls;
    }
  }, [dateFilter]);

  // Фильтрация по статусу
  const filteredCalls = useMemo(() => {
    if (statusFilter === "all") {
      return dateFilteredCalls;
    }
    return dateFilteredCalls.filter(call => call.status === statusFilter);
  }, [dateFilteredCalls, statusFilter]);

  // Статистика (всегда считается от dateFilteredCalls, не от statusFilter)
  const stats = {
    total: dateFilteredCalls.length,
    completed: dateFilteredCalls.filter(c => c.status === "completed").length,
    missed: dateFilteredCalls.filter(c => c.status === "missed").length,
  };

  // Текст периода
  const periodText = {
    today: "Today",
    week: "Last 7 days",
    month: "Last 30 days",
    all: "All time",
  };

  // Текст активного фильтра
  const getFilterStatusText = () => {
    if (statusFilter === "completed") return "Showing completed calls";
    if (statusFilter === "missed") return "Showing missed calls";
    return "Showing all calls";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calls</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all your AI receptionist calls
        </p>
      </div>

      {/* Date Filter Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Period:</span>
              <span className="text-sm text-primary font-semibold">{periodText[dateFilter]}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {stats.total} {stats.total === 1 ? "call" : "calls"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant={dateFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("today")}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant={dateFilter === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("week")}
              className="text-xs"
            >
              Week
            </Button>
            <Button
              variant={dateFilter === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("month")}
              className="text-xs"
            >
              Month
            </Button>
            <Button
              variant={dateFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("all")}
              className="text-xs"
            >
              All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - теперь кликабельные */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodText[dateFilter]}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "completed" ? "ring-2 ring-green-600" : "hover:shadow-md"}`}
          onClick={() => setStatusFilter("completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Phone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${statusFilter === "missed" ? "ring-2 ring-red-600" : "hover:shadow-md"}`}
          onClick={() => setStatusFilter("missed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed</CardTitle>
            <Phone className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.missed / stats.total) * 100) : 0}% missed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Индикатор активного фильтра */}
      {statusFilter !== "all" && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">{getFilterStatusText()}</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Calls List - Mobile View (Cards) */}
      <div className="lg:hidden space-y-3">
        {filteredCalls.length > 0 ? (
          filteredCalls.map((call) => (
            <CallCard key={call.id} call={call} onViewTranscript={handleViewTranscript} />
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No calls found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                No {statusFilter !== "all" ? statusFilter : ""} calls for {periodText[dateFilter].toLowerCase()}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Calls List - Desktop View (Table) */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCalls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCalls.map((call) => (
                  <TableRow 
                  key={call.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewTranscript(call.id)}
                  >
                    <TableCell className="font-medium">{call.customerName}</TableCell>
                    <TableCell>{call.phoneNumber}</TableCell>
                    <TableCell>{call.duration}</TableCell>
                    <TableCell>
                      <StatusBadge status={call.status} />
                    </TableCell>
                    <TableCell>{call.timestamp}</TableCell>
                    <TableCell>
                      {call.hasTranscript && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewTranscript(call.id);}}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Transcript
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No calls found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                No {statusFilter !== "all" ? statusFilter : ""} calls for {periodText[dateFilter].toLowerCase()}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}