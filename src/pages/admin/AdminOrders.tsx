import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

/* ================= CONFIG ================= */

const API_ROOT =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const ADMIN_ORDERS_API = `${API_ROOT}/api/orders/admin/orders`;

/* ================= TYPES ================= */

interface OrderItem {
  id?: number;
  quantity: number;
  product_name?: string;
  name?: string;
  product?: {
    id: number;
    name: string;
  };
}

interface Order {
  id: number;
  customer_name: string;
  kitchen_name: string;
  status: string;
  delivery: { status_display: string } | null;
  delivery_partner: string | null;
  final_amount: string;
  created_at: string;
  items: OrderItem[];
}

interface PaginatedResponse {
  results: Order[];
  count: number;
}

export default function AdminOrders() {

  const { getToken } = useAuth(); // ✅ CLERK
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(0);

  const pageSize = 10;

  /* ================= AUTH FETCH (CLERK) ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    const token = await getToken();
    if (!token) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`, // ✅ FIXED
      },
    });

    return res;

  }, [getToken]);

  /* ================= FETCH ================= */

  const fetchOrders = useCallback(async () => {

    try {
      setLoading(true);

      const res = await authFetch(
        `${ADMIN_ORDERS_API}/?page=${page}&search=${search}`
      );

      if (!res || !res.ok) return;

      const data: PaginatedResponse = await res.json();

      setOrders(data.results || []);
      setCount(data.count || 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }

  }, [authFetch, page, search]);

  useEffect(() => {
    fetchOrders(); // ✅ removed auth.access dependency
  }, [fetchOrders]);

  /* ================= ACTION ================= */

  const updateStatus = async (id: number, action: string) => {

    if (processingId) return;

    try {

      setProcessingId(id);

      const res = await authFetch(
        `${API_ROOT}/api/kitchen/orders/${id}/${action}/`,
        { method: "POST" }
      );

      if (!res || !res.ok) {
        alert("Action failed");
        return;
      }

      await fetchOrders();

    } catch {
      alert("Error updating order");
    } finally {
      setProcessingId(null);
    }

  };

  /* ================= BADGE ================= */

  const badge = (status: string | null) => {
    const base = "px-3 py-1 text-xs font-semibold rounded-full";

    switch (status) {
      case "DELIVERED": return `${base} bg-green-100 text-green-800`;
      case "OUT_FOR_DELIVERY": return `${base} bg-orange-200 text-orange-900`;
      case "READY": return `${base} bg-indigo-200 text-indigo-900`;
      case "PREPARING": return `${base} bg-purple-200 text-purple-900`;
      case "CONFIRMED": return `${base} bg-blue-200 text-blue-900`;
      case "PENDING": return `${base} bg-yellow-200 text-yellow-900`;
      case "CANCELLED": return `${base} bg-red-200 text-red-900`;
      default: return `${base} bg-gray-200`;
    }
  };

  const totalPages = Math.ceil(count / pageSize);

  return (

    <div className="px-12 py-10">

      <h1 className="text-3xl font-bold mb-8 text-[#7a2e00]">
        Admin Order Control Panel
      </h1>

      <input
        placeholder="Search orders..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="w-full p-3 mb-6 border rounded-xl"
      />

      <div className="overflow-hidden bg-[#f4e6dc] rounded-3xl shadow-md">

        <table className="w-full text-left">

          <thead className="bg-[#e8d2c3] text-[#7a2e00]">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Kitchen</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Delivery</th>
              <th className="px-6 py-4">Partner</th>
              <th className="px-6 py-4 text-right">Final</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>

            {orders.map((order) => (

              <tr key={order.id} className="border-t">

                <td className="px-6 py-4 font-semibold">#{order.id}</td>
                <td className="px-6 py-4">{order.customer_name}</td>
                <td className="px-6 py-4">{order.kitchen_name}</td>

                <td className="px-6 py-4">
                  {order.items?.length > 0 ? (
                    <div className="space-y-1">
                      {order.items.map((item, i) => {

                        const name =
                          item.product_name ||
                          item.product?.name ||
                          item.name ||
                          "Unknown";

                        return (
                          <div key={i} className="px-2 py-1 text-xs bg-white rounded shadow-sm">
                            {name} × {item.quantity}
                          </div>
                        );
                      })}
                    </div>
                  ) : "-"}
                </td>

                <td className="px-6 py-4">
                  <span className={badge(order.status)}>
                    {order.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {order.delivery ? (
                    <span className={badge(order.delivery.status_display)}>
                      {order.delivery.status_display}
                    </span>
                  ) : "-"}
                </td>

                <td className="px-6 py-4">
                  {order.delivery_partner || "-"}
                </td>

                <td className="px-6 py-4 font-semibold text-right">
                  ₹ {order.final_amount}
                </td>

                <td className="px-6 py-4 space-x-2 text-center">

                  {order.status === "OUT_FOR_DELIVERY" && (
                    <ActionBtn
                      label="Deliver"
                      color="bg-green-700"
                      onClick={() => updateStatus(order.id, "deliver")}
                      processing={processingId === order.id}
                    />
                  )}

                  <button
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="px-3 py-2 text-xs text-white bg-[#7a2e00] rounded-lg"
                  >
                    View
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div className="flex justify-center gap-4 mt-6">

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Prev
        </button>

        <span>
          Page {page} / {Math.max(totalPages, 1)}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Next
        </button>

      </div>

    </div>
  );
}

/* ================= BUTTON ================= */

function ActionBtn({ label, color, onClick, processing }: {
  label: string;
  color: string;
  onClick: () => void;
  processing: boolean;
}) {
  return (
    <button
      disabled={processing}
      onClick={onClick}
      className={`px-3 py-2 text-xs text-white rounded-lg ${color}`}
    >
      {processing ? "Processing..." : label}
    </button>
  );
}