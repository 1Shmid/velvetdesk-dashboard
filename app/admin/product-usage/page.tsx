import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ProductUsagePage() {
  const { count: totalCalls } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true });

  const { data: calls } = await supabase
    .from("calls")
    .select("business_id, duration_seconds, status");

  // Группируем звонки по business_id
  const callsByBusiness: Record<string, { count: number; totalDuration: number }> = {};
  
  calls?.forEach(call => {
    if (!callsByBusiness[call.business_id]) {
      callsByBusiness[call.business_id] = { count: 0, totalDuration: 0 };
    }
    callsByBusiness[call.business_id].count++;
    callsByBusiness[call.business_id].totalDuration += call.duration_seconds || 0;
  });

  // Получаем названия бизнесов
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, business_name");

  const businessMap = businesses?.reduce((acc, b) => {
    acc[b.id] = b.business_name;
    return acc;
  }, {} as Record<string, string>);

  const avgDuration = calls?.length 
    ? Math.round(calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / calls.length)
    : 0;

  const completedCalls = calls?.filter(c => c.status === "completed").length || 0;
  const successRate = calls?.length ? Math.round((completedCalls / calls.length) * 100) : 0;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Product Usage</h1>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Calls</p>
          <p className="text-3xl font-bold">{totalCalls || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Avg Call Duration</p>
          <p className="text-3xl font-bold">{avgDuration}s</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Success Rate</p>
          <p className="text-3xl font-bold text-green-600">{successRate}%</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Active Businesses</p>
          <p className="text-3xl font-bold">{Object.keys(callsByBusiness).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Calls by Customer</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calls</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(callsByBusiness)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([businessId, stats]) => (
                <tr key={businessId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {businessMap?.[businessId] || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stats.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(stats.totalDuration / 60)} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {Math.round(stats.totalDuration / stats.count)}s
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {Object.keys(callsByBusiness).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No calls yet
          </div>
        )}
      </div>
    </div>
  );
}