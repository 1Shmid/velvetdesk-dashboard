import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Phone, 
  Settings, 
  BarChart3, 
  Bot,
  Calendar,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calls", href: "/dashboard/calls", icon: Phone },
  { name: "AI Agent", href: "/dashboard/agent-setup", icon: Bot },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const businessName = (session.user as any)?.businessName || "Business";
  const userEmail = session.user?.email || "user@example.com";

  async function handleLogout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="h-14 flex items-center border-b px-6">
          <h1 className="text-xl font-bold text-primary">VelvetDesk</h1>
        </div>

        <nav className="flex flex-col gap-1 p-4 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="mb-2">
            <p className="text-sm font-medium">{businessName}</p>
            <p className="text-xs text-gray-500">{userEmail}</p>
          </div>
          <form action={handleLogout}>
            <button type="submit" className="flex items-center gap-2 text-red-600 text-sm">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {children}
      </main>
    </div>
  );
}