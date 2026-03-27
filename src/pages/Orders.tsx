import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

interface Order {
  id: number;
  total_amount: string;
  status: string;
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

const Orders = () => {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [orders, setOrders] = useState<Order[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      PREPARING: "bg-orange-500",
      READY: "bg-gray-500",
      COMPLETED: "bg-green-600", 
      OUT_FOR_DELIVERY: "bg-purple-600", 
      DELIVERED: "bg-green-600",
      CANCELLED: "bg-red-600",
      REFUND_REQUESTED: "bg-orange-600",
      REFUNDED: "bg-black",
      REFUND_REJECTED: "bg-gray-700",
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${
          styles[status] || "bg-gray-500"
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };
  const fetchOrders = async (url?: string) => {

    if (!user) return;

    try {

      url ? setLoadingMore(true) : setLoading(true);
      setError(null);

      const endpoint = url
        ? url.replace("http://127.0.0.1:8000/api", "")
        : `/orders/history/`;

      const data: PaginatedResponse = await apiRequest(endpoint);

      setOrders((prev) =>
        url
          ? [...prev, ...(data.results || [])]
          : (data.results || [])
      );

      setNextPage(data.next || null);
      setTotalCount(data.count || 0);

    } catch (err) {

      console.error(" Orders fetch error:", err);
      setError("Failed to fetch orders");

    } finally {

      setLoading(false);
      setLoadingMore(false);

    }
  };

  useEffect(() => {
    if (user !== undefined) {
      fetchOrders();
    }
  }, [user]);
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-[#6d4c41]">
          Loading orders...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-red-600">
          {error}
        </h2>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-[#6d4c41]">
          No orders found.
        </h2>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold text-[#4e342e] mb-2">
          Your Orders 📦
        </h1>

        <p className="text-sm text-[#6d4c41] mb-8">
          Total Orders: {totalCount}
        </p>

        <div className="space-y-6">

          {orders.map((order) => (

            <div
              key={order.id}
              className="p-6 transition bg-white shadow-md rounded-3xl hover:shadow-lg"
            >

              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">

                <div>
                  <h3 className="text-xl font-bold text-[#4e342e]">
                    Order #{order.id}
                  </h3>

                  <p className="text-sm text-[#8d6e63] mt-1">
                    {new Date(order.created_at).toLocaleString()}
                  </p>

                  <p className="mt-2 text-lg font-semibold text-[#3e2723]">
                    ₹ {order.total_amount}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">

                  {getStatusBadge(order.status)}

                  <Link to={`/orders/${order.id}`}>
                    <button className="px-5 py-2 bg-[#6d4c41] text-white rounded-xl hover:bg-[#5d4037] font-semibold transition">
                      View Details
                    </button>
                  </Link>

                  {order.status === "REFUND_REQUESTED" && (
                    <p className="text-sm font-semibold text-orange-600">
                      Refund Pending Approval
                    </p>
                  )}

                  {order.status === "REFUNDED" && (
                    <p className="text-sm font-semibold text-green-600">
                      Refunded Successfully
                    </p>
                  )}

                </div>

              </div>

            </div>

          ))}

        </div>

        {nextPage && (
          <div className="mt-10 text-center">
            <button
              onClick={() => fetchOrders(nextPage)}
              disabled={loadingMore}
              className={`px-6 py-3 font-semibold text-white rounded-xl ${
                loadingMore
                  ? "bg-gray-400"
                  : "bg-[#6d4c41] hover:bg-[#5d4037]"
              }`}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default Orders;