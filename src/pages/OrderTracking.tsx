import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const API_BASE = "http://127.0.0.1:8000";
const WS_BASE = "ws://127.0.0.1:8000";

export default function OrderTracking() {

  const { orderId } = useParams();
  const { getToken, isLoaded } = useAuth();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  useEffect(() => {

    const fetchData = async () => {

      if (!orderId || !isLoaded) return;

      try {

        setLoading(true);
        setError(null);

        const token = await getToken();

        if (!token) {
          console.error(" No token");
          return;
        }

        const res = await fetch(
          `${API_BASE}/api/orders/tracking/${orderId}/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const text = await res.text();

        let result: any;

        try {
          result = text ? JSON.parse(text) : null;
        } catch {
          result = null;
        }

        if (!res.ok) {
          throw new Error(result?.message || "Failed to fetch tracking");
        }

        console.log("Initial data:", result);
        setData(result);

      } catch (err) {

        console.error(" Fetch error:", err);
        setError("Failed to load tracking");

      } finally {

        setLoading(false);

      }
    };

    fetchData();

  }, [orderId, getToken, isLoaded]);
  useEffect(() => {

    if (!orderId) return;

    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(`${WS_BASE}/ws/orders/${orderId}/`);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(" WebSocket connected");
      };

      socket.onmessage = (event) => {

        let msg: any;

        try {
          msg = JSON.parse(event.data);
        } catch {
          console.error("Invalid WS message");
          return;
        }

        console.log("Realtime update:", msg);

        setData((prev: any) => {
          if (!prev) return prev;
          if (msg.type === "order_status") {
            return {
              ...prev,
              order_status: msg.status,
            };
          }
          if (msg.type === "location_update") {
            return {
              ...prev,
              latitude: msg.latitude,
              longitude: msg.longitude,
            };
          }

          return prev;
        });
      };

      socket.onerror = (err) => {
        console.error(" WebSocket error:", err);
      };

      socket.onclose = () => {
        console.log("🔌 WebSocket closed, reconnecting...");
        setTimeout(connect, 3000); 
      };
    };

    connect();

    return () => {
      socket?.close();
    };

  }, [orderId]);
  if (!isLoaded || loading) {
    return <p className="p-6">Loading tracking...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="p-6">No tracking data</p>;
  }
  return (

    <div className="p-6 space-y-4">

      <h2 className="text-xl font-bold">
        Order #{data.order_id}
      </h2>

      <div className="space-y-2">

        <p><strong>Order Status:</strong> {data.order_status}</p>

        <p><strong>Delivery Status:</strong> {data.delivery_status || "-"}</p>

        <p><strong>Assigned At:</strong> {data.assigned_at || "-"}</p>
        <p><strong>Picked Up At:</strong> {data.picked_up_at || "-"}</p>

        <p>
          <strong>Delivered At:</strong>{" "}
          {data.delivered_at || "Not delivered yet"}
        </p>

        <p>
          <strong>Delivery Duration:</strong>{" "}
          {data.delivery_duration_minutes ?? "Not completed"}
        </p>

      </div>

      {data.tracking_url && (
        <a
          href={data.tracking_url}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-4 py-2 mt-4 text-white bg-blue-600 rounded"
        >
          Track Live
        </a>
      )}

    </div>
  );
}