import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPage() {
  const { count: totalBusinesses } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true });

  const { count: activeBusinesses } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true });

  const mrr = (activeBusinesses || 0) * 350;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Businesses</p>
          <p className="text-3xl font-bold">{totalBusinesses || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Active Subscriptions</p>
          <p className="text-3xl font-bold text-green-600">{activeBusinesses || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">MRR</p>
          <p className="text-3xl font-bold">€{mrr.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Calls</p>
          <p className="text-3xl font-bold">{totalCalls || 0}</p>
        </div>
      </div>
    </div>
  );
}