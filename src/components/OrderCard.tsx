import { useState, useRef } from "react";
import { updateOrderStatus } from "../services/kitchenService";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  total_price: number;
}

interface DeliveryPartner {
  name: string;
  phone: string;
}

interface KitchenOrder {
  id: number;
  customer_name: string;
  total_amount: string;
  order_age_minutes: number;
  status: OrderStatus;
  payment_status?: string;
  total_items: number;
  items: OrderItem[];
  delivery_partner?: DeliveryPartner | null;
  pidge_order_id?: string | null;
  tracking_url?: string | null;
}

interface OrderCardProps {
  order: KitchenOrder;
  refresh: () => void;
}

const OrderCard = ({ order, refresh }: OrderCardProps) => {

  const [loading, setLoading] = useState(false);

  // 🔥 NEW: Freeze time when order reaches final state
  const frozenTime = useRef(order.order_age_minutes);

  const getDisplayTime = () => {
    const isFinal =
      order.status === "DELIVERED" ||
      order.status === "COMPLETED" ||
      order.status === "CANCELLED";

    if (isFinal) {
      return frozenTime.current;
    }

    return order.order_age_minutes;
  };

  const handleAction = async (action: string) => {

    if (loading) return;

    try {
      setLoading(true);

      console.log("ACTION:", action, "ORDER:", order.id);

      await updateOrderStatus(order.id, action as any);

      refresh();

    } catch (error: any) {
      console.error("Order action error:", error);
      alert(error?.message || "Action failed");
    } finally {
      setLoading(false);
    }

  };

  const isUrgent = order.order_age_minutes > 20;

  const statusColor: Record<OrderStatus, string> = {
    PENDING: "bg-yellow-500",
    CONFIRMED: "bg-blue-500",
    PREPARING: "bg-orange-500",
    READY: "bg-purple-500",
    COMPLETED: "bg-green-700",
    OUT_FOR_DELIVERY: "bg-indigo-500",
    DELIVERED: "bg-green-600",
    CANCELLED: "bg-red-500"
  };

  return (

    <div
      className={`p-6 rounded-2xl border shadow-md transition hover:shadow-lg
      ${isUrgent
        ? "bg-[#fff3e0] border-[#ffcc80]"
        : "bg-[#faf6f1] border-[#e6d5c3]"
      }`}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#4e342e]">
            Order #{order.id}
          </h2>

          <p className="text-sm text-[#6d4c41]">
            {order.customer_name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-[#3e2723]">
            ₹ {Number(order.total_amount).toFixed(2)}
          </p>

          <p
            className={`text-xs ${
              isUrgent
                ? "text-red-600 font-semibold"
                : "text-[#8d6e63]"
            }`}
          >
            {getDisplayTime()} mins ago
          </p>
        </div>
      </div>

      {/* STATUS */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span
          className={`px-3 py-1 text-xs font-medium text-white rounded-full ${statusColor[order.status]}`}
        >
          {order.status.replace(/_/g, " ")}
        </span>

        {order.payment_status && (
          <span className="px-3 py-1 text-xs font-medium text-[#4e342e] bg-[#d7ccc8] rounded-full">
            {order.payment_status}
          </span>
        )}
      </div>

      {/* ITEMS */}
      <div className="pt-4 mb-4 border-t border-[#e6d5c3]">
        <h4 className="mb-2 font-semibold text-[#4e342e]">
          Items ({order.total_items})
        </h4>

        <div className="space-y-1 text-sm text-[#5d4037]">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <span>₹ {item.total_price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DELIVERY */}
      {order.pidge_order_id && (
        <div className="mb-4 text-sm text-[#6d4c41] bg-[#efebe9] p-3 rounded-lg">
          🚚 Pidge Delivery
          {order.tracking_url && (
            <div className="mt-1">
              <a
                href={order.tracking_url}
                target="_blank"
                className="text-blue-600 underline"
              >
                Track Order
              </a>
            </div>
          )}
        </div>
      )}

      {!order.pidge_order_id && order.delivery_partner && (
        <div className="mb-4 text-sm text-[#6d4c41] bg-[#efebe9] p-3 rounded-lg">
          🚚 {order.delivery_partner.name} | 📞 {order.delivery_partner.phone}
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3 mt-4">

        {(order.status === "PENDING" || order.status === "CONFIRMED") && (
          <>
            <button
              disabled={loading}
              onClick={() => handleAction("accept")}
              className="px-4 py-2 text-white bg-[#5d4037] rounded-lg hover:bg-[#4e342e]"
            >
              Accept
            </button>

            <button
              disabled={loading}
              onClick={() => handleAction("reject")}
              className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              Reject
            </button>
          </>
        )}

        {order.status === "CONFIRMED" && (
          <button
            disabled={loading}
            onClick={() => handleAction("preparing")}
            className="px-4 py-2 text-white bg-[#6d4c41] rounded-lg hover:bg-[#5d4037]"
          >
            Start Preparing
          </button>
        )}

        {order.status === "PREPARING" && (
          <button
            disabled={loading}
            onClick={() => handleAction("ready")}
            className="px-4 py-2 text-white bg-[#8d6e63] rounded-lg hover:bg-[#6d4c41]"
          >
            Mark Ready
          </button>
        )}

        {order.status === "READY" && (
          <button
            disabled={loading}
            onClick={() => handleAction("dispatch")}
            className="px-4 py-2 text-white bg-green-700 rounded-lg hover:bg-green-800"
          >
            Dispatch Order
          </button>
        )}

        {order.status === "OUT_FOR_DELIVERY" && (
          <button
            disabled={loading}
            onClick={() => handleAction("deliver")}
            className="px-4 py-2 text-white bg-black rounded-lg hover:bg-gray-800"
          >
            Delivered
          </button>
        )}

      </div>

    </div>
  );
};

export default OrderCard;