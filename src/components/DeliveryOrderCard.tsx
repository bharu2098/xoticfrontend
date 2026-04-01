import { useState } from "react";
import { updateDeliveryStatus } from "../services/deliveryService";

interface Props {
  order: any;
  refresh: () => void;
}

const DeliveryOrderCard = ({ order, refresh }: Props) => {

  const [processing, setProcessing] = useState<string | null>(null);

  // ==============================
  // ⚙️ HANDLE ACTION (SAFE)
  // ==============================
  const handleAction = async (action: string) => {

    if (!order?.id) {
      console.error("Invalid order");
      return;
    }

    if (processing) return;

    try {

      if (!updateDeliveryStatus) {
        console.warn(" Delivery service disabled");
        return;
      }

      setProcessing(action);

      await updateDeliveryStatus(order.id, action);

      refresh();

    } catch (err) {

      console.error(" Delivery action error:", err);
      alert("Action failed");

    } finally {

      setProcessing(null);

    }

  };

  return (

    <div className="bg-white p-6 rounded-3xl shadow-md hover:shadow-lg transition border border-[#e6d5c3]">

      <div className="flex justify-between mb-4">

        <div>

          <h2 className="text-lg font-bold text-[#4e342e]">
            Order #{order?.id}
          </h2>

          <p className="text-sm text-[#6d4c41]">
            {order?.customer_name || "Customer"}
          </p>

        </div>

        <div className="text-right">

          <p className="font-semibold text-[#3e2723]">
            ₹ {Number(order?.total_amount) || 0}
          </p>

        </div>

      </div>

      <div className="bg-[#f3e5d8] p-4 rounded-xl mb-4 text-sm text-[#5d4037]">

        📍 {order?.address?.address_line || "-"}, {order?.address?.city || "-"}

        <br />

        📞 {order?.address?.phone_number || "-"}

      </div>

      <div className="mb-4">

        <span className="px-3 py-1 text-xs font-medium text-white bg-[#6d4c41] rounded-full">
          {order?.status || "UNKNOWN"}
        </span>

      </div>

      <div className="flex gap-3">

        {order?.status === "READY" && (

          <button
            onClick={() => handleAction("pickup")}
            disabled={processing !== null}
            className={`px-4 py-2 text-white rounded-lg ${
              processing === "pickup"
                ? "bg-gray-400"
                : "bg-[#6d4c41] hover:bg-[#4e342e]"
            }`}
          >
            {processing === "pickup" ? "Processing..." : "Pickup"}
          </button>

        )}

        {order?.status === "OUT_FOR_DELIVERY" && (

          <button
            onClick={() => handleAction("deliver")}
            disabled={processing !== null}
            className={`px-4 py-2 text-white rounded-lg ${
              processing === "deliver"
                ? "bg-gray-400"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {processing === "deliver"
              ? "Processing..."
              : "Mark Delivered"}
          </button>

        )}

        {order?.status === "READY" && (

          <button
            onClick={() => handleAction("complete")}
            disabled={processing !== null}
            className={`px-4 py-2 text-white rounded-lg ${
              processing === "complete"
                ? "bg-gray-400"
                : "bg-green-700 hover:bg-green-800"
            }`}
          >
            {processing === "complete"
              ? "Processing..."
              : "Mark Completed"}
          </button>

        )}

      </div>

    </div>
  );
};

export default DeliveryOrderCard;