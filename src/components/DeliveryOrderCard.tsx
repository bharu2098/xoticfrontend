 import { updateDeliveryStatus } from "../services/deliveryService";

interface Props {
  order: any;
  refresh: () => void;
}

const DeliveryOrderCard = ({ order, refresh }: Props) => {

  const handleAction = async (action: string) => {
    await updateDeliveryStatus(order.id, action);
    refresh();
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-md hover:shadow-lg transition border border-[#e6d5c3]">

      {/* Header */}
      <div className="flex justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#4e342e]">
            Order #{order.id}
          </h2>
          <p className="text-sm text-[#6d4c41]">
            {order.customer_name}
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-[#3e2723]">
            ₹ {order.total_amount}
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="bg-[#f3e5d8] p-4 rounded-xl mb-4 text-sm text-[#5d4037]">
        📍 {order.address?.address_line}, {order.address?.city}
        <br />
        📞 {order.address?.phone_number}
      </div>

      {/* Status */}
      <div className="mb-4">
        <span className="px-3 py-1 text-xs font-medium text-white bg-[#6d4c41] rounded-full">
          {order.status}
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">

        {order.status === "READY" && (
          <button
            onClick={() => handleAction("pickup")}
            className="px-4 py-2 text-white bg-[#6d4c41] rounded-lg hover:bg-[#4e342e]"
          >
            Pickup
          </button>
        )}

        {order.status === "OUT_FOR_DELIVERY" && (
          <button
            onClick={() => handleAction("deliver")}
            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Mark Delivered
          </button>
        )}

      </div>

    </div>
  );
};

export default DeliveryOrderCard;