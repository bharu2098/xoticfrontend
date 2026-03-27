import { useEffect, useState, useMemo, useRef } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";
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
  category_name: string;
}

interface ActiveOrder {
  id: number;
  status: string;
  kitchen: string;
  remaining_delivery_minutes: number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const WS_BASE =
  import.meta.env.VITE_WS_BASE || "ws://127.0.0.1:8000";

const riderIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
  iconSize: [40, 40],
});

export default function Home() {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState(0);
  const [endTime, setEndTime] = useState<number | null>(null);

  const [riderLocation, setRiderLocation] =
    useState<{ lat: number; lng: number } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

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

  useEffect(() => {
    if (!activeOrder?.id) return;

    const token = localStorage.getItem("access");
    if (!token) return;

    socketRef.current?.close();

    const socket = new WebSocket(
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

    return () => {
      socket.close();
    };
  }, [activeOrder?.id]);

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
    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">
      <div className="mx-auto max-w-7xl">

        {activeOrder && (
          <div className="p-6 mb-10 bg-white shadow-md rounded-2xl">

            <h2 className="text-xl font-bold">
              Track your order 🚴
            </h2>

            <p>{activeOrder.kitchen}</p>

            <p>
              Status: <b>{activeOrder.status.replace(/_/g, " ")}</b>
            </p>

            {/* ✅ FIXED: ONLY SHOW TIMER FOR OUT_FOR_DELIVERY */}
            {activeOrder.status === "OUT_FOR_DELIVERY" && (
              <p className="font-semibold text-green-600">
                {formatTime(timeLeft)}
              </p>
            )}

            {/* OPTIONAL UX */}
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
                style={{ height: "350px" }}
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

        <div className="flex justify-between mb-10">
          <h1 className="text-4xl font-bold text-[#4e342e]">
            Discover Food 🍕
          </h1>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="px-4 py-2 border rounded-xl"
          />
        </div>

        <div className="grid grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="p-4 bg-white rounded-xl">

              <img
                src={product.image || "https://via.placeholder.com/300x200"}
                className="object-cover w-full h-40 rounded"
              />

              <h3 className="mt-2 font-semibold">{product.name}</h3>

              <p className="mt-1">₹ {product.price}</p>

              <Link
                to={`/products/${product.id}`}
                className="inline-block px-4 py-2 mt-3 text-sm font-semibold text-white bg-[#6d4c41] rounded-lg hover:bg-[#5d4037] transition"
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