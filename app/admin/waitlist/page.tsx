import { createClient } from "@supabase/supabase-js";
import { CheckCircle, XCircle } from "lucide-react";
import { WaitlistActions } from "./actions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function WaitlistPage() {
  const { data: waitlist } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  const pending = waitlist?.filter((w) => w.status === "email_verified") || [];
  const approved = waitlist?.filter((w) => w.status === "approved") || [];
  const rejected = waitlist?.filter((w) => w.status === "rejected") || [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Waitlist</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600">{pending.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Approved</p>
          <p className="text-3xl font-bold text-green-600">{approved.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Rejected</p>
          <p className="text-3xl font-bold text-red-600">{rejected.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Verified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {waitlist?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.business_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.business_type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contact_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                    {item.email_verified === "true" || item.email_verified === true ? (
                    <CheckCircle className="inline text-green-600" size={20} />
                    ) : (
                    <XCircle className="inline text-red-600" size={20} />
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.status === "email_verified" ? "bg-yellow-100 text-yellow-800" :
                    item.status === "approved" ? "bg-green-100 text-green-800" :
                    "bg-red-100 text-red-800"
                    }`}>
                    {item.status === "email_verified" ? "Pending" : item.status}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                {item.status === "email_verified" && (
                    <WaitlistActions waitlistId={item.id} />
                )}
                </td>
                </tr>
            ))}
            </tbody>
        </table>

        {!waitlist || waitlist.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No waitlist entries yet
          </div>
        ) : null}
      </div>
    </div>
  );
}