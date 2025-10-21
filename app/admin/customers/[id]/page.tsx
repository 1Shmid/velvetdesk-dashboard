import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .single();

  if (!business) {
    notFound();
  }

  const { count: totalCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("business_id", id);

  const { data: recentCalls } = await supabase
    .from("calls")
    .select("*")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending_payment: "bg-yellow-100 text-yellow-800",
    past_due: "bg-orange-100 text-orange-800",
    suspended: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <div>
      <Link
        href="/admin/customers"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Customers
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{business.business_name}</h1>
            <p className="text-gray-500">{business.email}</p>
          </div>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              statusColors[business.status] || "bg-gray-100 text-gray-800"
            }`}
          >
            {business.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{business.phone || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created</p>
            <p className="font-medium">{new Date(business.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">VAPI Assistant ID</p>
            <p className="font-medium text-xs">{business.vapi_assistant_id || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Calls</p>
            <p className="font-medium">{totalCalls || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Recent Calls</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recentCalls?.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">{call.customer_name || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{call.customer_phone || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{call.duration_seconds}s</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{call.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(call.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!recentCalls || recentCalls.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No calls yet</div>
        ) : null}
      </div>
    </div>
  );
}