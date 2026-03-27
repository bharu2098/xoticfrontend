import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface Payment {
  id: number | string;
  order: number | null;
  amount: number | null;
  status: string;
  payment_method?: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  created_at?: string | null;
  refunded_amount?: number;
  failure_reason?: string | null;
  refunded_at?: string | null;
  currency?: string;
}

const AdminPayments = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  // 🔥 NEW STATES
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchPayments = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/orders/admin/payments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(data?.payments || data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchPayments();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <div className="p-6">Loading...</div>;

  const getMethod = (p: Payment) => {
    return p.payment_method || (p.razorpay_payment_id ? "ONLINE" : "COD");
  };

  const getStatus = (p: Payment) => {
    if (p.payment_method === "COD") return "COD";
    if (p.razorpay_payment_id) return "SUCCESS";
    return "CREATED";
  };

  const getStatusStyle = (status: string) => {
    if (status === "SUCCESS") return "bg-green-500 text-white";
    if (status === "COD") return "bg-purple-500 text-white";
    return "bg-yellow-500 text-white";
  };

  // 🔍 FILTERED DATA
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const text = search.toLowerCase();
      return (
        String(p.id).toLowerCase().includes(text) ||
        String(p.order).toLowerCase().includes(text) ||
        getMethod(p).toLowerCase().includes(text)
      );
    });
  }, [payments, search]);

  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Payments</h1>

      {/* 🔥 SEARCH BAR */}
      <input
        type="text"
        placeholder="Search Order ID / Payment ID / Method"
        className="w-full p-3 border rounded-lg"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
      />

      {/* 🔥 GRID CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {paginatedPayments.map((p) => {
          const status = getStatus(p);

          return (
            <div
              key={p.id}
              className="relative p-6 bg-white border shadow-sm rounded-2xl"
            >
              <div
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm ${getStatusStyle(
                  status
                )}`}
              >
                {status}
              </div>

              <div className="space-y-2">
                <div className="font-medium">Order #{p.order}</div>
                <div className="text-sm text-gray-500">
                  Payment ID: {p.id}
                </div>

                <div className="mt-3 text-2xl font-bold">
                  ₹{p.amount}
                </div>

                <div className="text-sm">
                  <b>Currency:</b> {p.currency || "INR"}
                </div>

                <div className="text-sm">
                  <b>Method:</b> {getMethod(p)}
                </div>

                <div className="text-sm">
                  <b>Refunded:</b> ₹{p.refunded_amount ?? 0}
                </div>

                <div className="text-sm">
                  <b>Date:</b>{" "}
                  {p.created_at
                    ? new Date(p.created_at).toLocaleString()
                    : "-"}
                </div>

                <button
                  onClick={() => setSelectedPayment(p)}
                  className="mt-4 px-4 py-2 bg-[#5a2d0c] text-white rounded-lg"
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔥 PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-[#5a2d0c] text-white"
                  : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* 🔥 MODAL (UNCHANGED) */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[600px] max-h-[80vh] overflow-y-auto rounded-xl p-6 space-y-4">

            <h2 className="text-xl font-bold">Payment Details</h2>

            <div><b>Payment ID:</b> {selectedPayment.id}</div>
            <div><b>Order:</b> #{selectedPayment.order}</div>
            <div><b>Amount:</b> ₹{selectedPayment.amount ?? "-"}</div>
            <div><b>Status:</b> {getStatus(selectedPayment)}</div>
            <div><b>Method:</b> {getMethod(selectedPayment)}</div>
            <div>
              <b>Created At:</b>{" "}
              {selectedPayment.created_at
                ? new Date(selectedPayment.created_at).toLocaleString()
                : "-"}
            </div>

            <hr />

            <h3 className="font-semibold">Razorpay Details</h3>
            <div><b>Order ID:</b> {selectedPayment.razorpay_order_id ?? "-"}</div>
            <div><b>Payment ID:</b> {selectedPayment.razorpay_payment_id ?? "-"}</div>
            <div className="break-all">
              <b>Signature:</b> {selectedPayment.razorpay_signature ?? "-"}
            </div>

            <hr />

            <h3 className="font-semibold">Refund Details</h3>
            <div><b>Refunded Amount:</b> ₹{selectedPayment.refunded_amount ?? 0}</div>
            <div><b>Reason:</b> {selectedPayment.failure_reason ?? "-"}</div>
            <div><b>Refunded At:</b> {selectedPayment.refunded_at ?? "-"}</div>

            <input
              type="number"
              placeholder="Refund Amount"
              className="w-full p-2 border rounded"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />

            <div className="flex gap-3">
              <button className="bg-[#5a2d0c] text-white px-4 py-2 rounded">
                Update Refund
              </button>

              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;