 const API_BASE = "http://127.0.0.1:8000/api";

export const getDeliveryOrders = async () => {
  const token = localStorage.getItem("access");

  const res = await fetch(`${API_BASE}/orders/delivery/orders/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
};

export const updateDeliveryStatus = async (
  orderId: number,
  action: string
) => {
  const token = localStorage.getItem("access");

  await fetch(
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
};