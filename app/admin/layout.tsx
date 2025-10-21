import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { LayoutDashboard, Users, Clock, DollarSign, BarChart3, LogOut } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Waitlist", href: "/admin/waitlist", icon: Clock },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { name: "Product Usage", href: "/admin/product-usage", icon: BarChart3 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_id");

  if (!adminId) {
    redirect("/admin-login");
  }

  const { data: admin } = await supabase
    .from("users")
    .select("email")
    .eq("id", adminId.value)
    .single();

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("admin_id");
    redirect("/admin-login");
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">VelvetDesk Admin</h1>
        
        <nav className="space-y-2 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800 transition-colors"
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-800">
          <p className="text-sm text-gray-400 mb-3">{admin?.email}</p>
          <form action={handleLogout}>
            <button type="submit" className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={16} />
              Logout
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {children}
      </main>
    </div>
  );
}