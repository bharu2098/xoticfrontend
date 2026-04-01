import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

interface DashboardData {
  total_deliveries: number;
  today_deliveries: number;
  active_deliveries: number;
  total_earnings: number;
  today_earnings: number;
  average_earnings: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
}

interface CardProps {
  title: string;
  value: string | number;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function DeliveryDashboard() {

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  // ==============================
  // 🔐 AUTH FETCH (FIXED ONLY)
  // ==============================
  const authFetch = useCallback(async (url: string) => {

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      return res;

    } catch (err) {
      console.error(" Auth fetch failed:", err);
      return null;
    }

  }, [getToken, isLoaded, isSignedIn]);

  // ==============================
  // 📊 FETCH DASHBOARD
  // ==============================
  const fetchDashboard = useCallback(async () => {

    try {

      const res = await authFetch(
        `${API_BASE}/api/orders/delivery/dashboard/`
      );

      if (!res) {
        setError("Authentication issue. Please login again.");
        return;
      }

      if (!res.ok) {

        const text = await res.text();
        console.error("Dashboard API error:", text);

        throw new Error("Failed to fetch dashboard");
      }

      const result: DashboardData = await res.json();

      setData(result);
      setError(null);

    } catch (err: any) {

      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard");

    } finally {

      setLoading(false);

    }

  }, [authFetch]);

  // ==============================
  // 🔄 INITIAL LOAD
  // ==============================
  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    fetchDashboard();

  }, [isLoaded, isSignedIn, fetchDashboard]);

  // ==============================
  // 🔁 AUTO REFRESH
  // ==============================
  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(fetchDashboard, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

  }, [isLoaded, isSignedIn, fetchDashboard]);

  // ==============================
  // 🧱 UI STATES
  // ==============================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="font-semibold text-[#6d4c41]">
          Loading dashboard...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="font-semibold text-red-600">
          {error}
        </h2>
      </div>
    );
  }

  if (!data) return null;

  return (

    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-6 mb-10 md:flex-row md:justify-between md:items-center">

          <div>

            <h1 className="text-3xl font-bold text-[#4e342e]">
              Delivery Dashboard 🚚
            </h1>

            <p className="mt-2 text-[#6d4c41]">
              Track your delivery performance & earnings
            </p>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-3">

          <Card title="Today's Deliveries" value={data.today_deliveries ?? 0} />

          <Card title="Completed Today" value={data.completed_deliveries ?? 0} />

          <Card title="Today's Earnings" value={`₹ ${data.today_earnings ?? 0}`} />

        </div>

        <div className="bg-gradient-to-r from-[#6d4c41] to-[#4e342e] text-white p-8 rounded-3xl shadow-lg mb-10">

          <p className="text-sm opacity-80">Total Earnings</p>

          <h2 className="mt-2 text-4xl font-bold break-words">
            ₹ {Number(data.total_earnings || 0).toLocaleString()}
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <Card title="Total Deliveries" value={data.total_deliveries ?? 0} />

          <Card title="Active Deliveries" value={data.active_deliveries ?? 0} />

          <Card title="Cancelled Deliveries" value={data.cancelled_deliveries ?? 0} />

          <Card
            title="Avg Earnings / Order"
            value={`₹ ${Number(data.average_earnings || 0).toFixed(2)}`}
          />

        </div>

      </div>

    </div>

  );
}

const Card = ({ title, value }: CardProps) => (
  <div className="p-6 transition bg-white shadow-md rounded-3xl hover:shadow-lg">
    <h3 className="text-sm text-[#6d4c41]">{title}</h3>
    <p className="mt-3 text-2xl md:text-3xl font-bold text-[#4e342e] break-words">
      {value}
    </p>
  </div>
);