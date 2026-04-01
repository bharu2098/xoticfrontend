import { useEffect, useState, useMemo, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";
import { useAuth } from "@clerk/clerk-react"; // ✅ ADDED
import { Link } from "react-router-dom";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image: string | null;
  image_url: string | null;
  category_name: string;
}

interface ActiveOrder {
  id: number;
  status: string;
  kitchen: string;
  remaining_delivery_minutes: number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://xjxxn6wc-8000.inc1.devtunnels.ms/api";

const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  "wss://xjxxn6wc-8000.inc1.devtunnels.ms";

const riderIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
  iconSize: [40, 40],
});

export default function Home() {
  const { user } = useAuthContext();
  const { apiRequest } = useApi();
  const { getToken } = useAuth(); // ✅ ADDED

  const [products, setProducts] = useState<Product[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(0);
  const [endTime, setEndTime] = useState<number | null>(null);

  const [riderLocation, setRiderLocation] =
    useState<{ lat: number; lng: number } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // ==============================
  // 📦 PRODUCTS
  // ==============================
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/`);
      const text = await res.text();

      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) throw new Error("Failed to fetch products");

      setProducts(data?.results || data || []);
    } catch (err) {
      console.error(" Product fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // 📦 ACTIVE ORDER
  // ==============================
  const fetchActiveOrder = async () => {
    if (!user) return;

    try {
      const data = await apiRequest<ActiveOrder | null>(
        `/orders/active-order/`
      );

      if (data?.id) {
        setActiveOrder(data);

        const seconds = (data.remaining_delivery_minutes || 0) * 60;

        setTimeLeft(seconds);
        setEndTime(Date.now() + seconds * 1000);
      } else {
        setActiveOrder(null);
        setTimeLeft(0);
        setEndTime(null);
        setRiderLocation(null);
      }
    } catch (err) {
      console.error(" Active order fetch failed", err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchActiveOrder();
  }, [user]);

  // ==============================
  // ⏱ TIMER
  // ==============================
  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        Math.floor((endTime - Date.now()) / 1000),
        0
      );

      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  // ==============================
  // 🔌 WEBSOCKET (FIXED)
  // ==============================
  useEffect(() => {
    if (!activeOrder?.id) return;

    let socket: WebSocket;

    const connectSocket = async () => {
      try {
        const token = await getToken({ template: "default" });

        if (!token) {
          console.warn("No Clerk token for WebSocket");
          return;
        }

        socketRef.current?.close();

        socket = new WebSocket(
          `${WS_BASE}/ws/orders/${activeOrder.id}/?token=${token}`
        );

        socketRef.current = socket;

        socket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "location_update") {
              setRiderLocation({
                lat: data.latitude,
                lng: data.longitude,
              });
            }

            if (data.type === "order_status") {
              const newStatus = data.status;

              setActiveOrder((prev) =>
                prev ? { ...prev, status: newStatus } : prev
              );

              await fetchActiveOrder();

              if (
                newStatus === "DELIVERED" ||
                newStatus === "COMPLETED"
              ) {
                setActiveOrder(null);
                setTimeLeft(0);
                setEndTime(null);
                setRiderLocation(null);
                socket.close();
              }
            }
          } catch (err) {
            console.error(" Websocket parse error", err);
          }
        };
      } catch (err) {
        console.error(" WebSocket connection failed", err);
      }
    };

    connectSocket();

    return () => {
      socketRef.current?.close();
    };
  }, [activeOrder?.id]);

  // ==============================
  // 🔍 FILTER
  // ==============================
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");

    const secs = (seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        Loading delicious food...
      </div>
    );
  }
return (
  <div className="min-h-screen bg-[#f3e5d8] py-6 px-2 sm:px-4 md:px-6">
    
    {/* ✅ FIX: FULL WIDTH ON MOBILE */}
    <div className="w-full max-w-full mx-auto md:max-w-7xl">

      {activeOrder && (
        <div className="p-4 mb-6 bg-white shadow-md sm:p-6 sm:mb-10 rounded-2xl">

          <h2 className="text-lg font-bold sm:text-xl">
            Track your order 🚴
          </h2>

          <p>{activeOrder.kitchen}</p>

          <p>
            Status: <b>{activeOrder.status.replace(/_/g, " ")}</b>
          </p>

          {activeOrder.status === "OUT_FOR_DELIVERY" && (
            <p className="font-semibold text-green-600">
              {formatTime(timeLeft)}
            </p>
          )}

          {activeOrder.status === "READY" && (
            <p className="font-semibold text-yellow-600">
              Your order is ready 🚀
            </p>
          )}

          {activeOrder.status === "OUT_FOR_DELIVERY" && (
            <MapContainer
              center={
                riderLocation
                  ? [riderLocation.lat, riderLocation.lng]
                  : [17.385044, 78.486671]
              }
              zoom={13}
              style={{ height: "300px", width: "100%" }} // ✅ FIX
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {riderLocation && (
                <Marker
                  position={[riderLocation.lat, riderLocation.lng]}
                  icon={riderIcon}
                >
                  <Popup>Delivery Partner</Popup>
                </Marker>
              )}
            </MapContainer>
          )}

        </div>
      )}

      {/* ✅ FIX: HEADER RESPONSIVE */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center sm:mb-10">

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#4e342e]">
          Discover Food 🍕
        </h1>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-4 py-2 border sm:w-64 rounded-xl"
        />
      </div>

      {/* ✅ MAIN FIX: GRID RESPONSIVE */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">

        {filteredProducts.map((product) => (
          <div key={product.id} className="p-3 bg-white sm:p-4 rounded-xl">

            <img
              src={
                product.image_url ||
                "https://via.placeholder.com/300x200"
              }
              className="object-cover w-full rounded h-36 sm:h-40 md:h-44"
            />

            <h3 className="mt-2 text-sm font-semibold sm:text-base">
              {product.name}
            </h3>

            <p className="mt-1 text-sm sm:text-base">
              ₹ {product.price}
            </p>

            <Link
              to={`/products/${product.id}`}
              className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 mt-2 sm:mt-3 text-xs sm:text-sm font-semibold text-white bg-[#6d4c41] rounded-lg hover:bg-[#5d4037] transition"
            >
              View
            </Link>

          </div>
        ))}

      </div>

    </div>
  </div>
);
}