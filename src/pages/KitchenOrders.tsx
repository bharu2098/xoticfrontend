import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

import {
  getKitchenOrders,
  KitchenOrder
} from "../services/kitchenService";

import OrderCard from "../components/OrderCard";

const API_WS =
  import.meta.env.VITE_WS_BASE || "ws://127.0.0.1:8000";

const KitchenOrders = () => {

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  /* =========================================
     LOAD ORDERS
  ========================================= */

  const loadOrders = useCallback(async () => {

    if (!isSignedIn) return;

    try {

      setLoading(true);

      const data = await getKitchenOrders(status);

      const safeData = Array.isArray(data) ? data : [];

      const formattedOrders = safeData.map((order: any) => ({
        ...order,
        total_amount: Number(order.total_amount)
      }));

      setOrders(formattedOrders);
      setError(null);

    } catch (err: any) {

      console.error("❌ Kitchen orders error:", err);
      setError(err?.message || "Failed to load orders");

    } finally {

      setLoading(false);

    }

  }, [status, isSignedIn]);

  /* =========================================
     INITIAL LOAD (ONLY ONCE)
  ========================================= */

  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    loadOrders();

  }, [isLoaded, isSignedIn, loadOrders]);

  /* =========================================
     WEBSOCKET
  ========================================= */

  const connectSocket = useCallback(async () => {

    if (!isLoaded || !isSignedIn) return;

    try {

      // ❌ Prevent multiple sockets
      if (socketRef.current) {
        socketRef.current.close();
      }

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      const token = await getToken();

      if (!token) {
        console.warn("❌ No websocket token");
        return;
      }

      const socket = new WebSocket(
        `${API_WS}/ws/kitchen/?token=${token}`
      );

      socketRef.current = socket;

      socket.onopen = () => {
        console.log("✅ Kitchen websocket connected");
      };

      socket.onmessage = (event) => {

        try {

          const data = JSON.parse(event.data);

          console.log("📡 Kitchen WS:", data);

          if (
            data.type === "kitchen_notification" ||
            data.type === "order_status"
          ) {
            loadOrders();
          }

        } catch (err) {
          console.error("❌ WS parse error", err);
        }

      };

      socket.onerror = (err) => {
        console.error("❌ Kitchen websocket error:", err);
      };

      socket.onclose = () => {

        console.log("🔌 Kitchen websocket closed");

        reconnectTimer.current = window.setTimeout(() => {
          connectSocket();
        }, 5000);

      };

    } catch (err) {
      console.error("❌ WS connection error:", err);
    }

  }, [getToken, loadOrders, isLoaded, isSignedIn]);

  /* =========================================
     START WEBSOCKET
  ========================================= */

  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    connectSocket();

    return () => {

      socketRef.current?.close();

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

    };

  }, [connectSocket, isLoaded, isSignedIn]);

  /* =========================================
     UI
  ========================================= */

  return (

    <div className="min-h-screen bg-[#f3e5d8] p-8">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-10 md:flex-row md:items-center md:justify-between">

          <h1 className="text-3xl font-bold text-[#4e342e]">
            Kitchen Orders
          </h1>

          <select
            className="px-4 py-2 border border-[#c8b6a6] rounded-lg bg-white text-[#4e342e]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">
              Out for Delivery
            </option>
          </select>

        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center text-[#6d4c41]">
            Loading orders...
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="font-semibold text-center text-red-600">
            {error}
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && orders.length === 0 && (
          <div className="p-10 text-center bg-[#faf6f1] border shadow rounded-2xl">
            <h3 className="text-lg font-semibold text-[#4e342e]">
              No orders found
            </h3>
          </div>
        )}

        {/* ORDERS */}
        {!loading && !error && orders.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                refresh={loadOrders}
              />
            ))}
          </div>
        )}

      </div>

    </div>
  );
};

export default KitchenOrders;