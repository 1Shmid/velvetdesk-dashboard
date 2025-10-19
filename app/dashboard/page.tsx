import { Phone, Calendar, TrendingUp, Users, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const businessId = (session.user as any).businessId;
  const businessName = (session.user as any).businessName;

  // Загружаем статистику
  const [callsData, bookingsData] = await Promise.all([
    supabase
      .from("calls")
      .select("*")
      .eq("business_id", businessId),
    supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
  ]);

  const totalCalls = callsData.data?.length || 0;
  const completedCalls = callsData.data?.filter(c => c.status === "completed").length || 0;
  const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  const totalBookings = bookingsData.data?.length || 0;

  const stats = [
    {
      name: "Total Calls",
      value: totalCalls.toString(),
      icon: Phone,
      change: "+0%",
    },
    {
      name: "Bookings",
      value: totalBookings.toString(),
      icon: Calendar,
      change: "+0%",
    },
    {
      name: "Success Rate",
      value: `${successRate}%`,
      icon: TrendingUp,
      change: "+0%",
    },
    {
      name: "Active Clients",
      value: "1",
      icon: Users,
      change: "+0%",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to {businessName}</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your AI receptionist today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Phone className="h-6 w-6" />
              <span>View Recent Calls</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Settings className="h-6 w-6" />
              <span>Configure Agent</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span>Manage Bookings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}