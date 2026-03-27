const API_BASE = "http://127.0.0.1:8000/api";
export const getDeliveryOrders = async () => {
  try {
    const token = localStorage.getItem("access");

    const res = await fetch(`${API_BASE}/orders/delivery/orders/`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
export const updateDeliveryStatus = async (
  orderId: number,
  action: string
) => {
  try {
    const token = localStorage.getItem("access");

    const res = await fetch(
      `${API_BASE}/orders/${orderId}/delivery-action/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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