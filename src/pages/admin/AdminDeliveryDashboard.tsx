import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* ================= TYPES ================= */

type RangeType = "weekly" | "monthly" | "4months" | "yearly";

interface DashboardData {
  today: {
    deliveries: number;
    completed: number;
    earnings: number;
  };
  total_deliveries: number;
  active_deliveries: number;
  cancelled_deliveries: number;
  total_earnings: number;
  weekly_earnings: number;
  monthly_earnings: number;
  four_months_earnings: number;
  yearly_earnings: number;
}

/* ================= MAIN ================= */

export default function AdminDeliveryDashboard() {

  const { getToken } = useAuth(); // ✅ CLERK

  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<RangeType>("weekly");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= AUTH FETCH (CLERK) ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    const token = await getToken();
    if (!token) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`, // ✅ FIXED
      },
    });

    return res;

  }, [getToken]);

  /* ================= FETCH ================= */

  const fetchDashboard = useCallback(async () => {

    try {

      setError(null);

      const res = await authFetch(
        `${API_BASE}/api/orders/admin/delivery-dashboard/`
      );

      if (!res || !res.ok) throw new Error();

      const result: DashboardData = await res.json();

      setData(result);

    } catch {

      setError("Failed to load dashboard");

    } finally {

      setLoading(false);

    }

  }, [authFetch]);

  /* ================= EFFECTS ================= */

  useEffect(() => {
    fetchDashboard(); // ✅ removed auth.access dependency
  }, [fetchDashboard]);

  useEffect(() => {

    const interval = setInterval(fetchDashboard, 20000);
    return () => clearInterval(interval);

  }, [fetchDashboard]);

  /* ================= HELPERS ================= */

  const getRangeEarnings = () => {

    if (!data) return 0;

    switch (range) {
      case "monthly": return data.monthly_earnings;
      case "4months": return data.four_months_earnings;
      case "yearly": return data.yearly_earnings;
      default: return data.weekly_earnings;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value || 0);

  /* ================= STATES ================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10">
        No data available
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#e8d5c4] p-10">

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#4e342e]">
          Admin Delivery Dashboard 🚚
        </h1>
        <p className="text-[#6d4c41] mt-1">
          Track system performance & earnings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
        <StatCard title="Today's Deliveries" value={data.today?.deliveries ?? 0} />
        <StatCard title="Today's Completed" value={data.today?.completed ?? 0} />
        <StatCard title="Today's Earnings" value={formatCurrency(data.today?.earnings ?? 0)} />
      </div>

      <div className="flex gap-3 mb-6">
        <RangeButton label="WEEKLY" value="weekly" range={range} setRange={setRange} />
        <RangeButton label="MONTHLY" value="monthly" range={range} setRange={setRange} />
        <RangeButton label="4 MONTHS" value="4months" range={range} setRange={setRange} />
        <RangeButton label="YEARLY" value="yearly" range={range} setRange={setRange} />
      </div>

      <div className="bg-gradient-to-r from-[#6d4c41] to-[#4e342e] text-white p-10 rounded-3xl shadow-xl mb-10">
        <p className="text-sm opacity-80">
          Total Earnings ({range})
        </p>
        <h2 className="mt-3 text-4xl font-bold">
          {formatCurrency(getRangeEarnings())}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard title="Total Deliveries" value={data.total_deliveries} />
        <StatCard title="Active Deliveries" value={data.active_deliveries} />
        <StatCard title="Cancelled Deliveries" value={data.cancelled_deliveries} />
        <StatCard
          title="Avg Earnings / Delivery"
          value={data.total_deliveries > 0
            ? formatCurrency(data.total_earnings / data.total_deliveries)
            : formatCurrency(0)}
        />
      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value }: { title: string; value: any }) => (
  <div className="p-6 bg-white shadow-md rounded-3xl">
    <p className="text-sm text-[#6d4c41]">{title}</p>
    <h3 className="text-3xl font-bold text-[#4e342e] mt-3">
      {value}
    </h3>
  </div>
);

const RangeButton = ({
  label,
  value,
  range,
  setRange,
}: {
  label: string;
  value: RangeType;
  range: RangeType;
  setRange: (val: RangeType) => void;
}) => (
  <button
    onClick={() => setRange(value)}
    className={`px-5 py-2 rounded-xl font-semibold transition ${
      range === value
        ? "bg-green-600 text-white"
        : "bg-gray-200 text-[#4e342e]"
    }`}
  >
    {label}
  </button>
);