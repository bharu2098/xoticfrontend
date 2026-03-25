import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

/* ================= TYPES ================= */

interface OrderItem {
  id: number;
  product_name?: string;
  quantity: number;
  unit_price: string;
}

interface OrderDetailType {
  id: number;
  customer_name: string;
  kitchen_name: string;

  address?: {
    full_name: string;
    address_line: string;
    city: string;
    pincode: string;
    phone_number: string;
  };

  payment_method: string;
  is_paid: boolean;

  total_amount: string;
  discount_amount: string;
  delivery_fee: string;
  final_amount: string;

  created_at: string;
  updated_at: string;
  delivered_at?: string;

  items: OrderItem[];

  payment?: {
    status?: string;
    amount?: string;
    currency?: string;
    refunded_amount?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
  };

  delivery?: {
    status_display?: string;
    rider_name?: string;
    assigned_at?: string;
    picked_at?: string;
    delivered_at?: string;
  };

  status_history?: {
    old_status: string;
    new_status: string;
    changed_by_username?: string;
    created_at: string;
  }[];
}

const API =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function AdminOrderDetail() {

  const { id } = useParams();
  const { getToken, isLoaded } = useAuth(); // ✅ CLERK

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  const fetchOrder = useCallback(async () => {
    try {
      if (!id || !isLoaded) return;

      const token = await getToken();

      if (!token) {
        console.error("❌ No token");
        return;
      }

      const res = await fetch(
        `${API}/api/orders/admin/orders/${id}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Order fetch failed");

      const data = await res.json();
      setOrder(data);

    } catch (err) {
      console.error("Order detail error:", err);
    } finally {
      setLoading(false);
    }
  }, [id, getToken, isLoaded]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* ================= HELPERS ================= */

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  };

  if (!isLoaded || loading) {
    return (
      <div className="p-10 text-lg font-semibold">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 text-lg text-red-600">
        Order not found
      </div>
    );
  }

  return (

    <div className="p-10 space-y-8">

      <h1 className="text-3xl font-bold text-[#7a2e00]">
        Order #{order.id}
      </h1>

      <Section title="User">
        <p>{order.customer_name}</p>
      </Section>

      <Section title="Kitchen">
        <p>{order.kitchen_name}</p>
      </Section>

      <Section title="Address">
        {order.address ? (
          <p>
            {order.address.full_name}<br />
            {order.address.address_line}<br />
            {order.address.city} - {order.address.pincode}<br />
            {order.address.phone_number}
          </p>
        ) : (
          <p>-</p>
        )}
      </Section>

      <Section title="Order Summary">
        <Grid>
          <Detail label="Payment Method" value={order.payment_method} />
          <Detail label="Is Paid" value={order.is_paid ? "Yes" : "No"} />
          <Detail label="Total Amount" value={`₹ ${order.total_amount}`} />
          <Detail label="Discount Amount" value={`₹ ${order.discount_amount}`} />
          <Detail label="Delivery Fee" value={`₹ ${order.delivery_fee}`} />
          <Detail label="Final Amount" value={`₹ ${order.final_amount}`} />
        </Grid>
      </Section>

      <Section title="Order Timing">
        <Grid>
          <Detail label="Delivered At" value={formatDate(order.delivered_at)} />
          <Detail label="Created At" value={formatDate(order.created_at)} />
          <Detail label="Updated At" value={formatDate(order.updated_at)} />
        </Grid>
      </Section>

      <Section title="Order Items">
        <table className="w-full overflow-hidden border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-center">Quantity</th>
              <th className="p-3 text-center">Price</th>
            </tr>
          </thead>

          <tbody>
            {order.items?.length ? (
              order.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.product_name || "-"}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">₹ {item.unit_price}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Payment">
        <Grid>
          <Detail label="Status" value={order.payment?.status} />
          <Detail label="Amount" value={`₹ ${order.payment?.amount}`} />
          <Detail label="Currency" value={order.payment?.currency} />
          <Detail label="Refunded Amount" value={`₹ ${order.payment?.refunded_amount}`} />
          <Detail label="Razorpay Order ID" value={order.payment?.razorpay_order_id} />
          <Detail label="Razorpay Payment ID" value={order.payment?.razorpay_payment_id} />
        </Grid>
      </Section>

      <Section title="Delivery">
        <Grid>
          <Detail label="Status" value={order.delivery?.status_display} />
          <Detail label="Partner" value={order.delivery?.rider_name || "-"} />
          <Detail label="Assigned At" value={formatDate(order.delivery?.assigned_at)} />
          <Detail label="Picked Up At" value={formatDate(order.delivery?.picked_at)} />
          <Detail label="Delivered At" value={formatDate(order.delivery?.delivered_at)} />
        </Grid>
      </Section>

      <Section title="Order Status History">
        <table className="w-full overflow-hidden border rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Old Status</th>
              <th className="p-3 text-left">New Status</th>
              <th className="p-3 text-left">Changed By</th>
              <th className="p-3 text-left">Created At</th>
            </tr>
          </thead>

          <tbody>
            {order.status_history?.length ? (
              order.status_history.map((h, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{h.old_status}</td>
                  <td className="p-3">{h.new_status}</td>
                  <td className="p-3">{h.changed_by_username || "-"}</td>
                  <td className="p-3">{formatDate(h.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No history
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

    </div>

  );
}

/* ================= UI COMPONENTS ================= */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white shadow rounded-xl">
      <h2 className="text-xl font-semibold mb-4 text-[#7a2e00]">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium break-words">{value || "-"}</p>
    </div>
  );
}