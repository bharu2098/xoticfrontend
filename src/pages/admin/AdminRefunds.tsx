import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE = "http://127.0.0.1:8000/api/orders/admin/refunds";

interface Refund {
  id: number;
  order: number;
  user: string;
  amount: string;
  reason: string;
  description?: string;
  proof?: string;
  status: string;
  requested_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export default function AdminRefunds() {

  const { getToken, isLoaded } = useAuth();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const pageSize = 10;

  /* ================= FETCH ================= */

  const fetchRefunds = async () => {

    try {

      setLoading(true);

      const token = await getToken();

      const res = await fetch(
        `${API_BASE}/?page=${page}&search=${search}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to load refunds");

      const data: PaginatedResponse<Refund> = await res.json();

      setRefunds(data.results || []);
      setCount(data.count || 0);

    } catch (err) {

      console.error("Refund fetch error:", err);
      setRefunds([]);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    if (isLoaded) fetchRefunds();
  }, [page, search, isLoaded]);

  /* ================= ACTIONS ================= */

  const approveRefund = async (id: number) => {

    try {

      setProcessingId(id);

      const token = await getToken();

      const res = await fetch(`${API_BASE}/${id}/approve/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      fetchRefunds();

    } catch {

      alert("Approve failed");

    } finally {

      setProcessingId(null);

    }
  };

  const rejectRefund = async (id: number) => {

    try {

      setProcessingId(id);

      const token = await getToken();

      const res = await fetch(`${API_BASE}/${id}/reject/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();

      fetchRefunds();

    } catch {

      alert("Reject failed");

    } finally {

      setProcessingId(null);

    }
  };

  /* ================= HELPERS ================= */

  const getStatusStyle = (status: string) => {
    if (status === "REQUESTED") return "text-yellow-600";
    if (status === "APPROVED") return "text-green-600";
    if (status === "REJECTED") return "text-red-600";
    return "text-gray-600";
  };

  const totalPages = Math.ceil(count / pageSize);

  /* ================= UI ================= */

  if (!isLoaded || loading) {
    return <div className="p-6">Loading refunds...</div>;
  }

  return (

    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold text-[#6B2E0F]">
        Refund Requests
      </h1>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search order id..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="w-full p-3 mb-5 border rounded-lg"
      />

      {/* TABLE */}
      <div className="overflow-hidden bg-white shadow rounded-xl">

        <table className="w-full">

          <thead className="bg-[#6B2E0F] text-white">
            <tr>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Proof</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>

            {refunds.map((refund) => (

              <tr key={refund.id} className="border-t">

                <td className="p-3">#{refund.order}</td>

                <td className="p-3">{refund.user}</td>

                <td className="p-3 font-semibold">
                  ₹{refund.amount}
                </td>

                <td className="p-3">
                  {refund.reason}
                  {refund.description && (
                    <p className="text-xs text-gray-500">
                      {refund.description}
                    </p>
                  )}
                </td>

                {/* 🔥 PROOF */}
                <td className="p-3">
                  {refund.proof ? (
                    <a
                      href={refund.proof}
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      View
                    </a>
                  ) : "-"}
                </td>

                <td className={`p-3 font-medium ${getStatusStyle(refund.status)}`}>
                  {refund.status}
                </td>

                <td className="flex gap-2 p-3">

                  {refund.status === "REQUESTED" && (
                    <>
                      <button
                        onClick={() => approveRefund(refund.id)}
                        disabled={processingId === refund.id}
                        className="px-3 py-1 text-white bg-green-600 rounded"
                      >
                        {processingId === refund.id ? "..." : "Approve"}
                      </button>

                      <button
                        onClick={() => rejectRefund(refund.id)}
                        disabled={processingId === refund.id}
                        className="px-3 py-1 text-white bg-red-600 rounded"
                      >
                        {processingId === refund.id ? "..." : "Reject"}
                      </button>
                    </>
                  )}

                </td>

              </tr>

            ))}

            {refunds.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No refund requests
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

      {/* PAGINATION */}
      <div className="flex justify-center gap-4 mt-6">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Prev
        </button>

        <span>
          Page {page} / {totalPages || 1}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Next
        </button>

      </div>

    </div>

  );
}