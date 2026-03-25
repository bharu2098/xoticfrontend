import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react"; // ✅ ADDED

/* ================= AUTH TYPE FIX ================= */

interface AuthContextType {
  access: string | null;
  refreshAccessToken: () => Promise<string | null>;
  isAdmin?: boolean;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface Payment {
  id: number | string;
  order: number | { id: number };

  amount: number;
  currency: string;

  status: string;
  payment_method?: string;

  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;

  refunded_amount: number;
  refund_reason?: string;

  failure_reason?: string;

  created_at?: string;
  refunded_at?: string;
}

export default function AdminPayments() {

  const auth = useContext(AuthContext) as AuthContextType | null;
  const { getToken } = useAuth(); // ✅ CLERK

  if (!auth) return null;

  const { isAdmin } = auth;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filtered, setFiltered] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<Payment | null>(null);

  const [refundAmount, setRefundAmount] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [error, setError] = useState<string | null>(null);

  /* ================= AUTH FETCH (CLERK) ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    const token = await getToken();
    if (!token) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    return res;

  }, [getToken]);

  /* ================= FETCH PAYMENTS ================= */

  const fetchPayments = useCallback(async () => {

    try {

      const res = await authFetch(`${API_BASE}/api/orders/admin/payments/`);
      if (!res) throw new Error("Server unreachable");

      const data = await res.json();
      const list = data.results || data;

      setPayments(list);
      setFiltered(list);
      setError(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }

  }, [authFetch]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  /* ================= SEARCH ================= */

  useEffect(() => {

    const lower = search.toLowerCase();

    const filteredList = payments.filter((p) => {
      const orderId = typeof p.order === "object" ? p.order.id : p.order;

      return (
        String(orderId).includes(lower) ||
        String(p.id).includes(lower) ||
        (p.payment_method || "").toLowerCase().includes(lower)
      );
    });

    setFiltered(filteredList);
    setPage(1);

  }, [search, payments]);

  /* ================= PAGINATION ================= */

  const totalPages = Math.ceil(filtered.length / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const currentPayments = filtered.slice(start, end);

  /* ================= REFUND ================= */

  const handleRefund = async () => {

    if (!selected) return;

    try {

      const res = await authFetch(
        `${API_BASE}/api/orders/admin/payments/${selected.id}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refunded_amount: Number(refundAmount) }),
        }
      );

      if (!res || !res.ok) throw new Error("Refund failed");

      setSelected(null);
      setRefundAmount("");
      fetchPayments();

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }

  };

  /* ================= HELPERS ================= */

  const getOrderId = (p: Payment) => {
    return typeof p.order === "object" ? p.order.id : p.order;
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  if (!isAdmin) return <p>Access Denied</p>;

  return (
    <div style={container}>

      <h2 style={title}>Payments</h2>

      {error && (
        <p style={{ color: "red", marginBottom: 10 }}>{error}</p>
      )}

      <input
        placeholder="Search Order / Payment / Method"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchInput}
      />

      <div style={grid}>

        {currentPayments.map((p) => (

          <div key={String(p.id)} style={card}>

            <div style={cardHeader}>

              <div>
                <h4 style={{ margin: 0 }}>Order #{getOrderId(p)}</h4>
                <small>Payment ID: {p.id}</small>
              </div>

              <span
                style={{
                  ...statusBadge,
                  background:
                    p.status === "SUCCESS"
                      ? "#27ae60"
                      : p.payment_method === "COD"
                      ? "#8e44ad"
                      : "#c0392b",
                }}
              >
                {p.payment_method === "COD" ? "COD" : p.status}
              </span>

            </div>

            <div style={amountSection}>₹{Number(p.amount).toFixed(2)}</div>

            <div style={details}>
              <p><strong>Currency:</strong> {p.currency}</p>
              <p><strong>Method:</strong> {p.payment_method || "ONLINE"}</p>
              <p><strong>Refunded:</strong> ₹{p.refunded_amount}</p>
              <p><strong>Date:</strong> {formatDate(p.created_at)}</p>
            </div>

            <button style={actionBtn} onClick={() => setSelected(p)}>
              View Details
            </button>

          </div>

        ))}

      </div>

      <div style={pagination}>

        <button disabled={page === 1} onClick={() => setPage(page - 1)} style={pageBtn}>
          Previous
        </button>

        <span>Page {page} / {totalPages || 1}</span>

        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} style={pageBtn}>
          Next
        </button>

      </div>

      {selected && (
        <div style={overlay}>

          <div style={modal}>

            <h2 style={modalTitle}>Payment Details</h2>

            <p><b>ID:</b> {selected.id}</p>
            <p><b>Order:</b> #{getOrderId(selected)}</p>
            <p><b>Amount:</b> ₹{selected.amount}</p>
            <p><b>Status:</b> {selected.status}</p>

            <input
              type="number"
              placeholder="Refund Amount"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              style={input}
            />

            <div style={actions}>

              <button style={primaryBtn} onClick={handleRefund}>
                Update Refund
              </button>

              <button style={closeBtn} onClick={() => setSelected(null)}>
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

/* ================= STYLES ================= */

const container: React.CSSProperties = { padding: 40 };
const title: React.CSSProperties = { color: "#5c2d00", marginBottom: 25 };
const searchInput: React.CSSProperties = { width: "100%", padding: 10, marginBottom: 20, borderRadius: 8, border: "1px solid #ddd" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 };
const card: React.CSSProperties = { background: "#fff", padding: 20, borderRadius: 16, boxShadow: "0 6px 20px rgba(0,0,0,0.05)" };
const cardHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between" };
const amountSection: React.CSSProperties = { fontSize: 28, fontWeight: 700, margin: "15px 0" };
const details: React.CSSProperties = { fontSize: 14, lineHeight: 1.6 };
const statusBadge: React.CSSProperties = { padding: "5px 10px", borderRadius: 20, color: "#fff", fontSize: 12 };
const actionBtn: React.CSSProperties = { marginTop: 15, background: "#5c2d00", color: "#fff", padding: 8, borderRadius: 8, border: "none" };
const pagination: React.CSSProperties = { marginTop: 30, display: "flex", justifyContent: "center", gap: 20 };
const pageBtn: React.CSSProperties = { padding: "8px 16px", background: "#5c2d00", color: "#fff", border: "none", borderRadius: 6 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center" };
const modal: React.CSSProperties = { background: "#fff", padding: 30, borderRadius: 16, width: 400 };
const modalTitle: React.CSSProperties = { marginBottom: 20, color: "#5c2d00" };
const input: React.CSSProperties = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd", marginTop: 10 };
const actions: React.CSSProperties = { display: "flex", gap: 10, marginTop: 10 };
const primaryBtn: React.CSSProperties = { background: "#5c2d00", color: "#fff", padding: "8px 16px", border: "none", borderRadius: 6 };
const closeBtn: React.CSSProperties = { background: "#ccc", padding: "8px 16px", border: "none", borderRadius: 6 };