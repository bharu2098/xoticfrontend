import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const API_ROOT =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const ADMIN_ORDERS_API = `${API_ROOT}/orders/admin/orders`;

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
  final_amount: string;
  created_at: string;
  items: OrderItem[];
}

interface PaginatedResponse {
  results: Order[];
  count: number;
}

export default function AdminOrders() {

  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(0);

  const pageSize = 10;

  /* ================= AUTH FETCH (FIXED) ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    try {
const token = await getToken();

      if (!token) {
        console.warn("No token");
        return null;
      }

      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      return res;

    } catch (err) {

      console.error("Auth fetch error:", err);
      return null;

    }

  }, [getToken]);

  /* ================= FETCH ================= */

  const fetchOrders = useCallback(async () => {

    try {

      setLoading(true);

      const res = await authFetch(
        `${ADMIN_ORDERS_API}/?page=${page}&search=${search}`
      );

      if (!res) return;

      const text = await res.text();

      let data: PaginatedResponse | null = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        console.error("API error:", data);
        return;
      }

      setOrders(data?.results || []);
      setCount(data?.count || 0);

    } catch (err) {

      console.error("Fetch error:", err);

    } finally {

      setLoading(false);

    }

  }, [authFetch, page, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ================= UPDATE ================= */

  const updateStatus = async (id: number, action: string) => {

    if (processingId) return;

    try {

      setProcessingId(id);

      const res = await authFetch(
        `${API_ROOT}/kitchen/orders/${id}/${action}/`,
        { method: "POST" }
      );

      if (!res || !res.ok) {
        alert("Action failed");
        return;
      }

      await fetchOrders();

    } catch (err) {

      console.error("Update error:", err);
      alert("Error updating order");

    } finally {

      setProcessingId(null);

    }

  };

  /* ================= BADGE ================= */

  const badge = (status: string | null) => {

    const base = "px-3 py-1 text-xs font-semibold rounded-full";

    switch (status) {

      case "COMPLETED":
      case "DELIVERED":
        return `${base} bg-green-700 text-white`;

      case "READY":
        return `${base} bg-indigo-200 text-indigo-900`;

      case "PREPARING":
        return `${base} bg-purple-200 text-purple-900`;

      case "CONFIRMED":
        return `${base} bg-blue-200 text-blue-900`;

      case "PENDING":
        return `${base} bg-yellow-200 text-yellow-900`;

      case "CANCELLED":
        return `${base} bg-red-200 text-red-900`;

      default:
        return `${base} bg-gray-200`;

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

      {/* ✅ FIXED: overflow-x-auto */}
      <div className="overflow-x-auto bg-[#f4e6dc] rounded-3xl shadow-md">

        {/* ✅ FIXED: min width */}
        <table className="w-full min-w-[1000px] text-left">

          <thead className="bg-[#e8d2c3] text-[#7a2e00]">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Kitchen</th>
              <th className="px-6 py-4">Items</th>
              <th className="px-6 py-4">Status</th>
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

                <td className="px-6 py-4 font-semibold text-right">
                  ₹ {order.final_amount}
                </td>

                {/* ✅ FIXED ACTION COLUMN */}
                <td className="flex flex-wrap justify-center gap-2 px-6 py-4 text-center whitespace-nowrap">

  {/* ✅ ACCEPT */}
  {order.status === "PENDING" && (
    <ActionBtn
      label="Accept"
      color="bg-blue-600"
      onClick={() => updateStatus(order.id, "accept")}
      processing={processingId === order.id}
    />
  )}

  {/* ✅ REJECT */}
  {order.status === "PENDING" && (
    <ActionBtn
      label="Reject"
      color="bg-red-600"
      onClick={() => updateStatus(order.id, "reject")}
      processing={processingId === order.id}
    />
  )}

  {/* ✅ PREPARING / CONFIRMED → READY */}
  {(order.status === "CONFIRMED" || order.status === "PREPARING") && (
    <ActionBtn
      label="Mark Ready"
      color="bg-purple-600"
      onClick={() => updateStatus(order.id, "ready")}
      processing={processingId === order.id}
    />
  )}

  {/* ✅ READY → DISPATCH */}
  {order.status === "READY" && (
    <ActionBtn
      label="Dispatch"
      color="bg-indigo-600"
      onClick={() => updateStatus(order.id, "dispatch")}
      processing={processingId === order.id}
    />
  )}

  {/* ✅ DISPATCHED → DELIVERED */}
  {order.status === "OUT_FOR_DELIVERY" && (
    <ActionBtn
      label="Delivered"
      color="bg-green-700"
      onClick={() => updateStatus(order.id, "deliver")}
      processing={processingId === order.id}
    />
  )}

  {/* ✅ ALWAYS VIEW */}
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

function ActionBtn({
  label,
  color,
  onClick,
  processing,
}: {
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