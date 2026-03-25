import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* ================= TYPES ================= */

interface Analytics {
  orders: any;
  revenue: any;
  users: any;
  products: any;
  last_7_days_revenue: any[];
}

const AdminDashboard = () => {

  const { getToken } = useAuth();

  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {

    const loadDashboard = async () => {

      try {

        const token = await getToken();

        if (!token) {
          setLoading(false);
          return;
        }

        /* ================= FETCH ANALYTICS DIRECTLY ================= */
        // ❌ removed profile check (it was blocking data)
        // backend already handles permission

        const statsRes = await fetch(
          `${API_BASE}/api/orders/admin/analytics/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!statsRes.ok) {
          throw new Error("Analytics fetch failed");
        }

        const data = await statsRes.json();

        console.log("📊 ANALYTICS DATA:", data); // ✅ DEBUG

        setStats(data);

      } catch (error) {

        console.error("Dashboard load error:", error);

      } finally {

        setLoading(false);

      }

    };

    loadDashboard();

  }, [getToken]);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <p className="text-[#5a2d0c] font-medium">
        Loading dashboard...
      </p>
    );
  }

  /* ================= SAFE VALUES ================= */

  const totalUsers = stats?.users?.total_users ?? 0;
  const totalOrders = stats?.orders?.total_orders ?? 0;
  const deliveredOrders = stats?.orders?.delivered_orders ?? 0;
  const cancelledOrders = stats?.orders?.cancelled_orders ?? 0;

  const pendingOrders =
    totalOrders - deliveredOrders - cancelledOrders;

  const totalRevenue = stats?.revenue?.total_revenue ?? 0;
  const todayRevenue = stats?.revenue?.today_revenue ?? 0;
  const avgOrderValue = stats?.revenue?.average_order_value ?? 0;

  const completionRate =
    stats?.orders?.completion_rate_percent ?? 0;

  const cancellationRate =
    stats?.orders?.cancellation_rate_percent ?? 0;

  /* ================= UI ================= */

  return (
    <>
      <h2 className="text-3xl font-bold text-[#5a2d0c] mb-8">
        Dashboard Overview
      </h2>

      <div className="grid grid-cols-1 gap-6 mb-10 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Users" value={totalUsers} />
        <StatCard title="Total Orders" value={totalOrders} />
        <StatCard title="Total Revenue" value={`₹ ${totalRevenue}`} />
        <StatCard title="Delivered Orders" value={deliveredOrders} />
        <StatCard title="Pending Orders" value={pendingOrders} />
        <StatCard title="Cancelled Orders" value={cancelledOrders} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today Revenue" value={`₹ ${todayRevenue}`} />
        <StatCard title="Average Order Value" value={`₹ ${avgOrderValue}`} />
        <StatCard title="Completion Rate" value={`${completionRate}%`} />
        <StatCard title="Cancellation Rate" value={`${cancellationRate}%`} />
      </div>
    </>
  );
};

/* ================= CARD ================= */

const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: any;
}) => (
  <div className="bg-white p-6 rounded-3xl shadow-xl border border-[#f0e0d6] hover:shadow-2xl transition">
    <p className="text-sm text-[#8d6e63] uppercase tracking-wide">
      {title}
    </p>
    <h3 className="text-3xl font-bold text-[#5a2d0c] mt-3">
      {value}
    </h3>
  </div>
);

export default AdminDashboard;