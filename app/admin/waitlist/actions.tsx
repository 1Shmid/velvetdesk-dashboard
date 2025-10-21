"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WaitlistActions({ waitlistId }: { waitlistId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(action: "approve" | "reject") {
    if (!confirm(`Are you sure you want to ${action} this application?`)) return;

    setLoading(true);

    const response = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, waitlistId }),
    });

    if (response.ok) {
      router.refresh();
    } else {
      alert("Error: " + (await response.text()));
    }

    setLoading(false);
  }

  return (
    <div className="flex gap-3 justify-end">
      <button
        onClick={() => handleAction("approve")}
        disabled={loading}
        className="text-green-600 hover:text-green-900 font-medium disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={() => handleAction("reject")}
        disabled={loading}
        className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}