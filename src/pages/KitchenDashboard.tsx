import { useEffect, useState } from "react";
import { getKitchenDashboard, updateKitchenStatus } from "../services/kitchenService";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

interface DashboardData {
  kitchen: string;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "CLOSED";
  is_available: boolean;

  today: {
    orders: number;
    completed: number;
    revenue: number;
  };

  yesterday: {
    orders: number;
    completed: number;
    revenue: number;
  };

  summary: {
    total_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    total_revenue: number;
    average_order_value: number;
    cancellation_rate_percent: number;
  };
}
const KitchenDashboard = () => {
  const { user, isKitchenStaff } = useAuthContext();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState("weekly");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {

    if (!user) return;

    if (!isKitchenStaff) {
      navigate("/", { replace: true });
    }

  }, [user, isKitchenStaff, navigate]);

  if (!user) return null;
  const loadDashboard = async () => {

    try {

      setLoading(true);

      const res = await getKitchenDashboard(range);
      if (!res || typeof res !== "object") {
        throw new Error("Invalid dashboard response");
      }

      setData(res);

    } catch (error) {

      console.error(" Failed to load dashboard:", error);
      setData(null);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    if (user) loadDashboard();
  }, [range, user]);

  const handleStatusChange = async (status: DashboardData["status"]) => {

    if (!data || data.status === status || loadingStatus) return;

    try {

      setLoadingStatus(true);

      const res = await updateKitchenStatus(status);
      if (!res || !res.status) {
        throw new Error("Invalid status response");
      }

      setData((prev) =>
        prev ? { ...prev, status: res.status } : prev
      );

    } catch (error) {

      console.error(" Status update error:", error);
      alert("Failed to update status");

    } finally {

      setLoadingStatus(false);

    }

  };
  const getStatusColor = (status: string) => {

    switch (status) {

      case "ONLINE":
        return "bg-green-600";

      case "OFFLINE":
        return "bg-red-600";

      case "BUSY":
        return "bg-yellow-500";

      case "CLOSED":
        return "bg-gray-500";

      default:
        return "bg-gray-400";
    }

  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-[#6d4c41]">
          Loading dashboard...
        </h2>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Failed to load dashboard
      </div>
    );
  }
  return (

    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-6 mb-10 md:flex-row md:justify-between md:items-center">

          <div>

            <h1 className="text-3xl font-bold text-[#4e342e]">
              {data.kitchen} Dashboard 🍽️
            </h1>

            <p className="text-[#6d4c41] mt-2">
              Track performance & manage operations
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <span
              className={`px-4 py-2 rounded-xl text-white font-semibold ${getStatusColor(
                data.status
              )}`}
            >
              {data.status}
            </span>

            <button
              disabled={loadingStatus || data.status === "ONLINE"}
              onClick={() => handleStatusChange("ONLINE")}
              className="px-4 py-2 text-white bg-green-600 rounded-xl hover:bg-green-700"
            >
              Go Online
            </button>

            <button
              disabled={loadingStatus || data.status === "BUSY"}
              onClick={() => handleStatusChange("BUSY")}
              className="px-4 py-2 text-white bg-yellow-500 rounded-xl hover:bg-yellow-600"
            >
              Busy
            </button>

            <button
              disabled={loadingStatus || data.status === "OFFLINE"}
              onClick={() => handleStatusChange("OFFLINE")}
              className="px-4 py-2 text-white bg-red-600 rounded-xl hover:bg-red-700"
            >
              Go Offline
            </button>

            <Link
              to="/kitchen/products"
              className="px-4 py-2 bg-[#6d4c41] text-white rounded-xl hover:bg-[#5d4037]"
            >
              Manage Products
            </Link>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-3">
          <Card title="Today's Orders" value={data.today.orders} />
          <Card title="Today's Completed" value={data.today.completed} />
          <Card title="Today's Revenue" value={`₹ ${data.today.revenue}`} />
        </div>

        <div className="flex flex-wrap gap-3 mb-8">

          {["weekly", "monthly", "4months", "yearly"].map((r) => (

            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl ${
                range === r
                  ? "bg-green-600 text-white"
                  : "bg-white border text-[#4e342e]"
              }`}
            >
              {r.toUpperCase()}
            </button>

          ))}

        </div>

        <div className="bg-gradient-to-r from-[#6d4c41] to-[#4e342e] text-white p-8 rounded-3xl shadow-lg mb-10">

          <p className="text-sm opacity-80">
            Total Revenue ({range})
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            ₹ {(data.summary?.total_revenue ?? 0).toLocaleString()}
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <Card title="Total Orders" value={data.summary.total_orders} />

          <Card title="Completed Orders" value={data.summary.completed_orders} />

          <Card title="Cancelled Orders" value={data.summary.cancelled_orders} />

          <Card
            title="Avg Order Value"
            value={`₹ ${Number(data.summary?.average_order_value || 0).toFixed(2)}`}
          />

        </div>

      </div>

    </div>

  );

};
const Card = ({ title, value }: any) => (

  <div className="p-6 transition bg-white shadow-md rounded-3xl hover:shadow-lg">

    <h3 className="text-sm text-[#6d4c41]">
      {title}
    </h3>

    <p className="mt-3 text-2xl md:text-3xl font-bold text-[#4e342e]">
      {value}
    </p>

  </div>

);

export default KitchenDashboard;