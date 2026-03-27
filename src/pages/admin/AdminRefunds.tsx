import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_ROOT =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const REFUND_API = `${API_ROOT}/api/orders/admin/refunds`;

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

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 10;

  /* ================= AUTH FETCH ================= */

  const authFetch = async (url: string, options: RequestInit = {}) => {
    if (!isLoaded || !isSignedIn) return null;

    try {
      const token = await getToken(); // ✅ FIXED (no template)

      if (!token) return null;

      return await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

    } catch (err) {
      console.error("Auth fetch error:", err);
      return null;
    }
  };

  /* ================= FETCH ================= */

  const fetchRefunds = async () => {

    try {
      setLoading(true);
      setError(null);

      const res = await authFetch(
        `${REFUND_API}/?page=${page}&search=${search}`
      );

      if (!res) throw new Error("Server unreachable");

      const text = await res.text();

      let data: PaginatedResponse<Refund> | null = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok) {
        throw new Error("Failed to load refunds");
      }

      setRefunds(data?.results || []);
      setCount(data?.count || 0);

    } catch (err: any) {
      console.error("Refund fetch error:", err);
      setError(err.message || "Failed to load refunds");
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchRefunds();
    }
  }, [page, search, isLoaded, isSignedIn]);

  /* ================= ACTION ================= */

  const handleAction = async (id: number, type: "approve" | "reject") => {

    try {
      setProcessingId(id);
      setError(null);

      const res = await authFetch(
        `${REFUND_API}/${id}/${type}/`,
        { method: "PATCH" }
      );

      if (!res) throw new Error("Server unreachable");

      if (!res.ok) {
        throw new Error(`${type} failed`);
      }

      fetchRefunds();

    } catch (err: any) {
      console.error(`${type} error:`, err);
      alert(err.message || `${type} failed`);
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= STATUS ================= */

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "text-yellow-600";
      case "APPROVED":
        return "text-green-600";
      case "REJECTED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const totalPages = Math.ceil(count / pageSize);

  if (!isLoaded || loading) {
    return <div className="p-6">Loading refunds...</div>;
  }

  return (

    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold text-[#6B2E0F]">
        Refund Requests
      </h1>

      {error && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

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

                <td className="p-3">
                  {refund.proof ? (
                    <a
                      href={refund.proof}
                      target="_blank"
                      rel="noreferrer"
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
                        onClick={() => handleAction(refund.id, "approve")}
                        disabled={processingId === refund.id}
                        className="px-3 py-1 text-white bg-green-600 rounded"
                      >
                        {processingId === refund.id ? "..." : "Approve"}
                      </button>

                      <button
                        onClick={() => handleAction(refund.id, "reject")}
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