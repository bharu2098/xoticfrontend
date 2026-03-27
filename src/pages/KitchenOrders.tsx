import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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

  // 🔥 NEW STATES
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

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
      console.error("Kitchen orders error:", err);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }

  }, [status, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadOrders();
  }, [isLoaded, isSignedIn, loadOrders]);

  // 🔥 WEBSOCKET (UNCHANGED)
  const connectSocket = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

      const token = await getToken();
      if (!token) return;

      const socket = new WebSocket(
        `${API_WS}/ws/kitchen/?token=${token}`
      );

      socketRef.current = socket;

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (
          data.type === "kitchen_notification" ||
          data.type === "order_status"
        ) {
          loadOrders();
        }
      };

      socket.onclose = () => {
        reconnectTimer.current = window.setTimeout(() => {
          connectSocket();
        }, 5000);
      };

    } catch (err) {
      console.error(err);
    }

  }, [getToken, loadOrders, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    connectSocket();

    return () => {
      socketRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

  }, [connectSocket, isLoaded, isSignedIn]);

  // 🔍 FILTER
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const text = search.toLowerCase();
      return (
        String(o.id).toLowerCase().includes(text) ||
        String(o.user?.username || "").toLowerCase().includes(text)
      );
    });
  }, [orders, search]);

  // 📄 PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / itemsPerPage)
  );

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (

    <div className="min-h-screen bg-[#f3e5d8] p-8">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">

          <h1 className="text-3xl font-bold text-[#4e342e]">
            Kitchen Orders
          </h1>

          <select
            className="px-4 py-2 border border-[#c8b6a6] rounded-lg bg-white text-[#4e342e]"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Orders</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="COMPLETED">Completed</option>
          </select>

        </div>

        {/* 🔥 SEARCH */}
        <input
          type="text"
          placeholder="Search Order ID / User"
          className="w-full p-3 mb-6 border rounded-lg"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        {loading && (
          <div className="text-center text-[#6d4c41]">
            Loading orders...
          </div>
        )}

        {error && !loading && (
          <div className="font-semibold text-center text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="p-10 text-center bg-[#faf6f1] border shadow rounded-2xl">
            <h3 className="text-lg font-semibold text-[#4e342e]">
              No orders found
            </h3>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  refresh={loadOrders}
                />
              ))}
            </div>

            {/* 🔥 PAGINATION */}
            <div className="flex items-center justify-center gap-2 mt-6">
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
          </>
        )}

      </div>

    </div>
  );
};

export default KitchenOrders;