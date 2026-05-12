import {
  useState,
  useRef,
  useEffect,
} from "react";

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

  product_name?: string;
  name?: string;

  quantity: number;

  total_price?: number;
  price?: number;
  unit_price?: number;
}

interface DeliveryPartner {
  name: string;
  phone: string;
}

interface KitchenOrder {
  id: number;

  customer_name?: string;

  user?: {
    username?: string;
  };

  user_name?: string;

  total_amount: string | number;

  order_age_minutes: number;

  created_at?: string;

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

  // 🚫 KEEP BUT DON'T FORCE PAGE REFRESH
  refresh?: () => void;
}

const OrderCard = ({
  order,
}: OrderCardProps) => {

  const [
  loadingAction,
  setLoadingAction
] = useState<string | null>(
  null
);

  // ==============================
  // 🔥 LOCAL STATUS
  // ==============================
  const [localStatus, setLocalStatus] =
    useState<OrderStatus>(
      order.status
    );

  // ==============================
  // 🔥 SYNC WS STATUS
useEffect(() => {

  setLocalStatus(
    order.status
  );

  // =================================
  // 🛑 FREEZE FINAL TIMER
  // =================================
  if (

  order.status ===
    "DELIVERED" ||

  order.status ===
    "COMPLETED" ||

  order.status ===
    "CANCELLED"

) {

  // =================================
  // 🛑 FREEZE ONLY ONCE
  // =================================
  if (
    frozenMinutes.current === 0
  ) {

    frozenMinutes.current =
      minutesAgo;
  }

  return;
}
  

  setMinutesAgo(
    Number(
      order.order_age_minutes || 0
    )
  );

}, [
  order.status,
  order.order_age_minutes
]);
useEffect(() => {

  setLoadingAction(null);

}, [localStatus]);
 // ==============================
// 🔥 LIVE TIMER (FIXED)
// ==============================
// ==============================
// 🔥 LIVE TIMER
// ==============================
const [minutesAgo, setMinutesAgo] =
  useState(
    Number(
      order.order_age_minutes || 0
    )
  );

// ==============================
// 🛑 FREEZE FINAL TIME
// ==============================
const frozenMinutes =
  useRef(0);
// ==============================
// 🔥 UPDATE TIMER
// ==============================
useEffect(() => {

  // =================================
  // 🛑 STOP TIMER
  // =================================
  if (

    localStatus ===
      "DELIVERED" ||

    localStatus ===
      "COMPLETED" ||

    localStatus ===
      "CANCELLED"

  ) {

    return;
  }

  const interval =
    setInterval(() => {

      setMinutesAgo(
        (prev) => prev + 1
      );

    }, 60000);

  return () =>
    clearInterval(interval);

}, [localStatus]);

// ==============================
// 🔥 DISPLAY TIMER

// ==============================
const getDisplayTime = () => {

  // =================================
  // 🛑 FINAL FROZEN TIME
  // =================================
  if (

    localStatus ===
      "DELIVERED" ||

    localStatus ===
      "COMPLETED" ||

    localStatus ===
      "CANCELLED"

  ) {

    return `${frozenMinutes.current} mins`;
  }

  // =================================
  // 🔥 LIVE TIMER
  // =================================
  return `${minutesAgo} mins ago`;
};
  // ==============================
  // 🔥 NEXT STATUS MAP
  // ==============================
  const nextStatusMap: Record<
  string,
  OrderStatus
> = {

  // ✅ ACCEPT = CONFIRMED
  accept: "CONFIRMED",

  // ✅ START PREPARING
  start_preparing:
    "PREPARING",

  reject: "CANCELLED",

  // ✅ READY
  ready: "READY",

  // ✅ DISPATCH
  dispatch:
    "OUT_FOR_DELIVERY",

  // ✅ DELIVERED
  deliver: "DELIVERED",
};

  // ==============================
  // 🔥 HANDLE ACTION
  // ==============================
 const handleAction = async (
  e: React.MouseEvent<HTMLButtonElement>,
  action: string
) => {

  // 🚫 STOP PAGE REFRESH
  e.preventDefault();

  e.stopPropagation();

  // 🚫 STOP MULTIPLE CALLS
if (loadingAction) {
  return;
}
  

  // 🚫 STOP FINAL STATUS ACTIONS
  if (
    localStatus === "DELIVERED" ||
    localStatus === "CANCELLED"
  ) {

    return;
  }

  try {

    setLoadingAction(action);

    console.log(
      "ACTION:",
      action,
      "ORDER:",
      order.id
    );

    // ==============================
    // 🔥 FLOW VALIDATION
    // ==============================

    // ✅ ACCEPT
    if (
      action === "accept" &&
      localStatus !== "PENDING"
    ) {

      alert(
        "Order must be PENDING"
      );

      return;
    }

    // ✅ START PREPARING
    if (
      action === "start_preparing" &&
      localStatus !== "CONFIRMED"
    ) {

      alert(
        "Order must be CONFIRMED"
      );

      return;
    }

    // ✅ READY
    if (
      action === "ready" &&
      localStatus !== "PREPARING"
    ) {

      alert(
        "Order must be PREPARING"
      );

      return;
    }

    // ✅ DISPATCH
    if (
      action === "dispatch" &&
      localStatus !== "READY"
    ) {

      alert(
        "Order must be READY"
      );

      return;
    }

    // ✅ DELIVER
    if (
      action === "deliver" &&
      localStatus !==
        "OUT_FOR_DELIVERY"
    ) {

      alert(
        "Order must be OUT FOR DELIVERY"
      );

      return;
    }

    // ==============================
    // 🔥 API CALL
    // ==============================
    await updateOrderStatus(
      order.id,
      action as any
    );

    // ==============================
    // 🔥 INSTANT UI UPDATE
    // ==============================
    if (
      nextStatusMap[action]
    ) {

      setLocalStatus(
        nextStatusMap[action]
      );

    }

    console.log(
      "SUCCESS:",
      action,
      order.id
    );

  } catch (error: any) {

    console.error(
      "Order action error:",
      error
    );

    alert(

      error?.response?.data
        ?.error ||

      error?.response?.data
        ?.detail ||

      error?.message ||

      "Action failed"
    );

  } finally {

  setTimeout(() => {

    setLoadingAction(null);

  }, 300);

}

};

  // ==============================
  // 🔥 URGENT
  // ==============================
 const isUrgent =
  minutesAgo > 20 &&
  localStatus !== "DELIVERED" &&
  localStatus !== "COMPLETED" &&
  localStatus !== "CANCELLED";
  // ==============================
  // 🎨 STATUS COLORS
  // ==============================
  const statusColor:
    Record<
      OrderStatus,
      string
    > = {

    PENDING:
      "bg-yellow-500",

    CONFIRMED:
      "bg-blue-500",

    PREPARING:
      "bg-orange-500",

    READY:
      "bg-purple-500",

    COMPLETED:
      "bg-green-700",

    OUT_FOR_DELIVERY:
      "bg-indigo-500",

    DELIVERED:
      "bg-green-600",

    CANCELLED:
      "bg-red-500",
  };

  return (

    <div
      className={`p-6 rounded-2xl border shadow-md transition hover:shadow-lg
      ${
        isUrgent
          ? "bg-[#fff3e0] border-[#ffcc80]"
          : "bg-[#faf6f1] border-[#e6d5c3]"
      }`}
    >

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">

        <div>

          <h2 className="text-xl font-bold text-[#4e342e]">

            Order #{order?.id}

          </h2>

          <p className="text-sm text-[#6d4c41]">

            {order?.customer_name ||

              order?.user
                ?.username ||

              order?.user_name ||

              "Customer"}

          </p>

        </div>

        <div className="text-right">

          <p className="text-lg font-semibold text-[#3e2723]">

            ₹
            {Number(
              order?.total_amount || 0
            ).toFixed(2)}

          </p>

         <p
  className={`text-xs ${
    isUrgent
      ? "text-red-600 font-semibold"
      : "text-[#8d6e63]"
  }`}
>

  {getDisplayTime()}

</p>

        </div>

      </div>

      {/* STATUS */}
      <div className="flex flex-wrap gap-2 mb-4">

        <span
          className={`px-3 py-1 text-xs font-medium text-white rounded-full ${statusColor[localStatus]}`}
        >

          {localStatus.replace(
            /_/g,
            " "
          )}

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

          Items (
          {order.items?.length || 0}
          )

        </h4>

        <div className="space-y-1 text-sm text-[#5d4037]">

          {Array.isArray(order.items) &&
            order.items.map(
              (item) => (

                <div
                  key={item.id}
                  className="flex justify-between"
                >

                  <span>

                    {
                      item.product_name ||

                      item.name ||

                      "Item"
                    }

                    {" × "}

                    {item.quantity}

                  </span>

                  <span>

                    ₹
                    {Number(

                      item.total_price ||

                      item.price ||

                      item.unit_price ||

                      0

                    ).toFixed(0)}

                  </span>

                </div>

              )
            )}

        </div>

      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-3 mt-4">

        {/* PENDING */}
        {localStatus === "PENDING" && (

          <>
            <button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "accept"
    )
  }
  className="px-4 py-2 text-white bg-[#5d4037] rounded-lg hover:bg-[#4e342e]"
>

  {loadingAction === "accept"
    ? "Processing..."
    : "Accept"}

</button>

           <button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "reject"
    )
  }
  className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600"
>

  {loadingAction === "reject"
    ? "Processing..."
    : "Reject"}

</button>
          </>

        )}

        {/* CONFIRMED */}
        {localStatus ===
          "CONFIRMED" && (

          <button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "start_preparing"
    )
  }
  className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600"
>

  {loadingAction === "start_preparing"
    ? "Processing..."
    : "Start Preparing"}

</button>

        )}

        {/* PREPARING */}
        {localStatus ===
          "PREPARING" && (

          <button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "ready"
    )
  }
  className="px-4 py-2 text-white bg-[#8d6e63] rounded-lg hover:bg-[#6d4c41]"
>

  {loadingAction === "ready"
    ? "Processing..."
    : "Mark Ready"}

</button>
        )}

        {/* READY */}
        {localStatus ===
          "READY" && (

          <button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "dispatch"
    )
  }
  className="px-4 py-2 text-white bg-green-700 rounded-lg hover:bg-green-800"
>

  {loadingAction === "dispatch"
    ? "Processing..."
    : "Dispatch Order"}

</button>

        )}

        {/* OUT FOR DELIVERY */}
        {localStatus ===
          "OUT_FOR_DELIVERY" && (
<button
  type="button"
  disabled={!!loadingAction}
  onClick={(e) =>
    handleAction(
      e,
      "deliver"
    )
  }
  className="px-4 py-2 text-white bg-black rounded-lg hover:bg-gray-800"
>

  {loadingAction === "deliver"
    ? "Processing..."
    : "Delivered"}

</button>

        )}

      </div>

    </div>

  );

};

export default OrderCard;