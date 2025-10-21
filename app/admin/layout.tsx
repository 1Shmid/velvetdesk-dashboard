import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { LayoutDashboard, Users, Clock, BarChart3, LogOut } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // Получаем данные админа
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
          <Link href="/admin" className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          
          <Link href="/admin/customers" className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800">
            <Users size={20} />
            Customers
          </Link>
          
          <Link href="/admin/waitlist" className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800">
            <Clock size={20} />
            Waitlist
          </Link>
          
          <Link href="/admin/stats" className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800">
            <BarChart3 size={20} />
            Statistics
          </Link>
        </nav>

        <div className="mt-auto">
          <p className="text-sm text-gray-400 mb-2">{admin?.email}</p>
          <form action={handleLogout}>
            <button type="submit" className="flex items-center gap-2 text-red-400 hover:text-red-300">
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