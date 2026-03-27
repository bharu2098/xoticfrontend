const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

const WS_BASE =
  import.meta.env.VITE_WS_BASE || "ws://127.0.0.1:8000";

export type KitchenStatus =
  | "ONLINE"
  | "OFFLINE"
  | "BUSY"
  | "CLOSED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type KitchenOrderAction =
  | "accept"
  | "preparing"
  | "ready"
  | "complete"
  | "dispatch-order"
  | "deliver";

export interface KitchenDashboardResponse {
  kitchen: string;
  status: KitchenStatus;
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

  chart: {
    period: string;
    revenue: number;
    orders: number;
  }[];
}

export interface KitchenOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  total_price: number;
}

export interface DeliveryPartner {
  name: string;
  phone: string;
}

export interface KitchenOrder {
  id: number;
  customer_name: string;
  total_amount: string;
  order_age_minutes: number;
  status: OrderStatus;
  payment_status?: string;
  total_items: number;
  items: KitchenOrderItem[];
  delivery_partner?: DeliveryPartner | null;
}

interface UpdateStatusResponse {
  status: KitchenStatus;
}

interface UpdateOrderResponse {
  status: OrderStatus;
}

let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export const setClerkTokenGetter = (
  getter: () => Promise<string | null>
) => {
  clerkTokenGetter = getter;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  let token: string | null = null;

  for (let i = 0; i < 5; i++) {
    if (clerkTokenGetter) {
      try {
        token = await clerkTokenGetter();
        if (token) break;
      } catch (err) {
        console.error("Token fetch error:", err);
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    console.warn("No Clerk token available");
  }

  return headers;
};

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE}${endpoint}`;
  const authHeaders = await getAuthHeaders();

  const finalHeaders: Record<string, string> = {
    ...authHeaders,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers: finalHeaders,
  });

  console.log("API:", endpoint, response.status);

  if (response.status === 401) {
    throw new Error("Session expired. Please login again.");
  }

  if (response.status === 403) {
    throw new Error("Permission denied.");
  }

  if (!response.ok) {
    let message = `Server error (${response.status})`;

    try {
      const data = await response.json();
      message =
        data?.detail ||
        data?.error ||
        data?.message ||
        message;
    } catch {}

    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
};

export const createKitchenSocket = async () => {
  if (!clerkTokenGetter) return null;

  const token = await clerkTokenGetter();
  if (!token) return null;

  const ws = new WebSocket(
    `${WS_BASE}/ws/kitchen/?token=${token}`
  );

  ws.onopen = () => console.log("WS connected");
  ws.onerror = (e) => console.error("WS error", e);

  ws.onclose = () => {
    console.log("WS closed - retrying...");
    setTimeout(createKitchenSocket, 3000);
  };

  return ws;
};

export const getKitchenDashboard = (
  range: string = "weekly"
): Promise<KitchenDashboardResponse> => {
  return apiRequest(`/kitchen/dashboard/?range=${range}`);
};

export const updateKitchenStatus = (
  status: KitchenStatus
): Promise<UpdateStatusResponse> => {
  return apiRequest(`/kitchen/status/`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
};

export const getKitchenOrders = async (
  status?: string
): Promise<KitchenOrder[]> => {
  const query = status ? `?status=${status}` : "";

  const data = await apiRequest<any>(`/kitchen/orders/${query}`);

  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.orders)) return data.orders;

  return [];
};

/// ✅🔥 FIXED (PATCH → POST)
export const updateOrderStatus = (
  orderId: number,
  action: KitchenOrderAction
): Promise<UpdateOrderResponse> => {
  return apiRequest(
    `/kitchen/orders/${orderId}/${action}/`,
    { method: "POST" }
  );
};

/// ✅🔥 FIXED
export const completeOrder = (
  orderId: number
): Promise<UpdateOrderResponse> => {
  return apiRequest(
    `/kitchen/orders/${orderId}/complete/`,
    { method: "POST" }
  );
};

/// ✅🔥 FIXED
export const simulateDeliveryComplete = (
  orderId: number
): Promise<UpdateOrderResponse> => {
  return apiRequest(
    `/kitchen/orders/${orderId}/deliver/`,
    { method: "POST" }
  );
};