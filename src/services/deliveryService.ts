const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

// ✅ Clerk token getter (same pattern as kitchenService)
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export const setDeliveryTokenGetter = (
  getter: () => Promise<string | null>
) => {
  clerkTokenGetter = getter;
};

// ==============================
// 🚚 GET DELIVERY ORDERS
// ==============================
export const getDeliveryOrders = async () => {
  try {
    // ✅ FIXED: use Clerk token
    let token: string | null = null;

    if (clerkTokenGetter) {
      try {
        token = await clerkTokenGetter();
      } catch (err) {
        console.error("Token fetch error:", err);
      }
    }

    const res = await fetch(`${API_BASE}/orders/delivery/orders/`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.error(" Unauthorized (delivery)");
      }

      throw new Error(
        data?.error || data?.message || "Failed to fetch delivery orders"
      );
    }

    return data;

  } catch (err: any) {
    console.error(" getDeliveryOrders error:", err);
    throw err;
  }
};

// ==============================
// 🚚 UPDATE DELIVERY STATUS
// ==============================
export const updateDeliveryStatus = async (
  orderId: number,
  action: string
) => {
  try {
    // ✅ FIXED: use Clerk token
    let token: string | null = null;

    if (clerkTokenGetter) {
      try {
        token = await clerkTokenGetter();
      } catch (err) {
        console.error("Token fetch error:", err);
      }
    }

    const res = await fetch(
      `${API_BASE}/orders/${orderId}/delivery-action/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ action }),
      }
    );

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.error(" Unauthorized (update delivery)");
      }

      throw new Error(
        data?.error || data?.message || "Failed to update order status"
      );
    }

    return data;

  } catch (err: any) {
    console.error(" updateDeliveryStatus error:", err);
    throw err;
  }
};