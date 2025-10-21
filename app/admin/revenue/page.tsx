import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function RevenuePage() {
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*");

  const activeCount = businesses?.filter(b => b.status === "active").length || 0;
  const mrr = activeCount * 350;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Revenue</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">MRR</p>
          <p className="text-3xl font-bold text-green-600">€{mrr.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{activeCount} active subscriptions × €350</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Revenue (Year 1 projection)</p>
          <p className="text-3xl font-bold">€{((activeCount * 50) + (mrr * 12)).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Setup fees + 12 months MRR</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Active Customers</p>
          <p className="text-3xl font-bold">{activeCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Breakdown</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Setup Fees (€50 × {activeCount})</span>
            <span className="font-semibold">€{(activeCount * 50).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Monthly Recurring (€350 × {activeCount})</span>
            <span className="font-semibold">€{mrr.toLocaleString()}/mo</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-gray-900 font-semibold">Annual Recurring Revenue (ARR)</span>
            <span className="text-xl font-bold text-green-600">€{(mrr * 12).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}