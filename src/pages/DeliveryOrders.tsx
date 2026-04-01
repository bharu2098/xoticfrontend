import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface DeliveryOrder {
  order_id: number;
  delivery_status: string;
  order_status: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_fee: string;
  assigned_at: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export default function DeliveryOrders() {

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  // ==============================
  // 🔐 AUTH FETCH (FIXED ONLY)
  // ==============================
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {

      if (!isLoaded || !isSignedIn) return null;

      let token: string | null = null;

      // ✅ retry for Clerk stability
      for (let i = 0; i < 3; i++) {
        try {
          token = await getToken({ template: "default" });
          if (token) break;
        } catch (err) {
          console.warn("Token retry...");
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (!token) {
        console.warn("No token available");
        return null;
      }

      try {

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
        console.error(" Auth fetch failed:", err);
        return null;
      }
    },
    [getToken, isLoaded, isSignedIn]
  );

  // ==============================
  // 📦 FETCH ORDERS
  // ==============================
  const fetchOrders = useCallback(async () => {

    try {

      const res = await authFetch(
        `${API_BASE}/api/orders/delivery/orders/`
      );

      if (!res) return;

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }

      setError(null);

    } catch (err) {

      console.error("Delivery fetch error:", err);
      setError("Failed to load deliveries");

    } finally {

      setLoading(false);

    }

  }, [authFetch]);

  // ==============================
  // 🔄 INITIAL LOAD
  // ==============================
  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    fetchOrders();

  }, [isLoaded, isSignedIn, fetchOrders]);

  // ==============================
  // 🔁 AUTO REFRESH
  // ==============================
  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(fetchOrders, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

  }, [isLoaded, isSignedIn, fetchOrders]);

  // ==============================
  // ⚙️ ACTION HANDLER
  // ==============================
  const handleAction = async (
    orderId: number,
    endpoint: string,
    errorMsg: string
  ) => {

    if (processingId !== null) return;

    try {

      setProcessingId(orderId);

      const res = await authFetch(
        `${API_BASE}/api/orders/delivery/orders/${orderId}/${endpoint}/`,
        { method: "POST" }
      );

      if (!res || !res.ok) throw new Error(errorMsg);

      await fetchOrders();

    } catch (err) {

      console.error(err);
      alert(errorMsg);

    } finally {

      setProcessingId(null);

    }

  };

  const handlePickup = (id: number) =>
    handleAction(id, "pickup", "Pickup failed");

  const handleDelivered = (id: number) =>
    handleAction(id, "delivered", "Delivery failed");

  // ==============================
  // 🎨 STATUS COLOR
  // ==============================
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-yellow-500";
      case "PICKED_UP":
        return "bg-blue-600";
      case "IN_TRANSIT":
        return "bg-purple-600";
      case "DELIVERED":
        return "bg-green-600";
      default:
        return "bg-gray-500";
    }
  };

  // ==============================
  // ⏳ LOADING
  // ==============================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <p className="text-lg font-semibold text-[#4e342e]">
          Loading deliveries...
        </p>
      </div>
    );
  }

  // ==============================
  // 🧱 UI
  // ==============================
  return (

    <div className="min-h-screen bg-[#f3e5d8] py-12 px-4 md:px-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-2xl md:text-3xl font-bold text-[#4e342e] mb-6 md:mb-8">
          Active Deliveries 🚚
        </h1>

        {error && (
          <div className="mb-6 text-center text-red-600">
            {error}
          </div>
        )}

        {orders.length === 0 ? (

          <div className="p-6 text-center bg-white shadow md:p-8 rounded-2xl">
            No active deliveries
          </div>

        ) : (

          <div className="space-y-4 md:space-y-6">

            {orders.map((order) => (

              <div
                key={order.order_id}
                className="p-4 bg-white shadow md:p-6 rounded-2xl"
              >

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                  <h2 className="text-lg font-bold">
                    Order #{order.order_id}
                  </h2>

                  <span
                    className={`px-3 py-1 text-xs text-white rounded-full w-fit ${getStatusColor(
                      order.delivery_status
                    )}`}
                  >
                    {order.delivery_status.replace(/_/g, " ")}
                  </span>

                </div>

                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <p><b>Customer:</b> {order.customer_name}</p>
                  <p><b>Phone:</b> {order.phone}</p>
                  <p><b>Address:</b> {order.address}</p>
                  <p><b>Delivery Fee:</b> ₹ {order.delivery_fee}</p>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">

                  {order.delivery_status === "ASSIGNED" && (
                    <button
                      onClick={() => handlePickup(order.order_id)}
                      disabled={processingId === order.order_id}
                      className="px-4 py-2 bg-[#6d4c41] text-white rounded-lg hover:bg-[#5d4037] disabled:opacity-50"
                    >
                      {processingId === order.order_id
                        ? "Processing..."
                        : "Mark as Picked Up"}
                    </button>
                  )}

                  {(order.delivery_status === "PICKED_UP" ||
                    order.delivery_status === "IN_TRANSIT") && (
                    <button
                      onClick={() => handleDelivered(order.order_id)}
                      disabled={processingId === order.order_id}
                      className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processingId === order.order_id
                        ? "Processing..."
                        : "Mark as Delivered"}
                    </button>
                  )}

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>

  );
}