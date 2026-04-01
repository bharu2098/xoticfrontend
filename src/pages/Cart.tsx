import { useEffect, useState, useContext, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { AuthContext } from "../context/AuthContext";

interface AuthContextType {
  access: string | null;
  refreshAccessToken: () => Promise<string | null>;
  user?: {
    id?: number;
    username?: string;
    email?: string;
    phone?: string;
  };
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

interface CartItem {
  id: number;
  product_name: string;
  price: string;
  quantity: number;
}

interface CartData {
  items: CartItem[];
  total_amount: string;
  delivery_fee?: number;
}

interface Address {
  id: number;
  full_name: string;
  city: string;
  pincode: string;
}

export default function Cart() {

  const auth = useContext(AuthContext) as AuthContextType | null;
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [cart, setCart] = useState<CartData>({
    items: [],
    total_amount: "0.00",
    delivery_fee: 0,
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);

  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [finalTotal, setFinalTotal] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState("ONLINE");

  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ==============================
  // 🔐 AUTH FETCH (FIXED ONLY HERE)
  // ==============================
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    if (!isLoaded || !isSignedIn) return null;

    let token: string | null = null;

    // ✅ retry for Clerk stability
    for (let i = 0; i < 3; i++) {
      try {
        token = await getToken({ template: "default" });
        if (token) break;
      } catch (err) {
        console.warn("Token retry...");
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (!token) {
      console.warn("No Clerk token found");
      return null;
    }

    try {

      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

      return res;

    } catch (err) {

      console.error(" Auth fetch failed:", err);
      return null;

    }

  }, [getToken, isLoaded, isSignedIn]);

  // ==============================
  // 📦 FETCH CART
  // ==============================
  const fetchCart = useCallback(async () => {

    try {

      const res = await authFetch(`${API_BASE}/cart/`);
      if (!res) {
        setPageLoading(false);
        return;
      }

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) throw new Error("Cart fetch failed");

      setCart({
        items: Array.isArray(data?.items) ? data.items : [],
        total_amount: data?.total_amount || "0.00",
        delivery_fee: data?.delivery_fee ?? 0,
      });

      setDeliveryFee(data?.delivery_fee ?? 0);

    } catch (err) {

      console.error(" Cart fetch failed", err);

    } finally {

      setPageLoading(false);

    }

  }, [authFetch]);

  // ==============================
  // 📍 FETCH ADDRESSES
  // ==============================
  const fetchAddresses = useCallback(async () => {

    try {

      const res = await authFetch(`${API_BASE}/orders/addresses/`);
      if (!res) return;

      const data = await res.json();
      const list = data?.results || data?.addresses || data || [];

      setAddresses(list);

      if (list.length > 0) {
        setSelectedAddress(list[0].id);
      }

    } catch (err) {

      console.error(" Address fetch failed", err);

    }

  }, [authFetch]);

  // ==============================
  // 🎟 APPLY COUPON
  // ==============================
  const applyCoupon = async () => {

    if (!coupon.trim()) {
      alert("Enter coupon code");
      return;
    }

    try {

      setCouponLoading(true);

      const res = await authFetch(`${API_BASE}/orders/coupons/apply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupon_code: coupon.trim(),
          cart_total: Number(cart.total_amount),
          address_id: selectedAddress,
        }),
      });

      if (!res) {
        alert("Authentication error");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Invalid coupon");
        return;
      }

      setDiscount(data?.discount_amount ?? 0);
      setDeliveryFee(data?.delivery_fee ?? deliveryFee);
      setFinalTotal(data?.final_total ?? null);

      alert("Coupon applied!");

    } catch (err) {

      console.error(" Coupon error:", err);
      alert("Coupon apply failed");

    } finally {

      setCouponLoading(false);

    }

  };

  // ==============================
  // ❌ REMOVE ITEM
  // ==============================
  const removeItem = async (id: number) => {

    try {

      const res = await authFetch(`${API_BASE}/cart/items/${id}/`, {
        method: "DELETE",
      });

      if (!res || !res.ok) {
        alert("Failed to remove item");
        return;
      }

      fetchCart();

    } catch (err) {

      console.error(" Remove item error:", err);
      alert("Error removing item");

    }

  };

  // ==============================
  // 🔄 UPDATE QUANTITY
  // ==============================
  const updateQuantity = async (id: number, quantity: number) => {

    if (quantity < 1) return;

    try {

      const res = await authFetch(`${API_BASE}/cart/items/${id}/update/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      if (!res || !res.ok) {
        alert("Failed to update quantity");
        return;
      }

      fetchCart();

    } catch (err) {

      console.error(" Update quantity error:", err);
      alert("Error updating quantity");

    }

  };

  // ==============================
  // 💳 CHECKOUT
  // ==============================
  const handleCheckout = async () => {

    if (!selectedAddress) {
      alert("Select address");
      return;
    }

    if (loading) return;

    try {

      setLoading(true);

      const res = await authFetch(`${API_BASE}/orders/checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address_id: selectedAddress,
          coupon_code: coupon || null,
          payment_method: paymentMethod,
        }),
      });

      if (!res) {
        alert("Authentication error");
        return;
      }

      const data = await res.json();
      console.log("CHECKOUT RESPONSE:", data);

      if (!res.ok) {
        alert(data?.error || "Checkout failed");
        return;
      }

      if (data.payment_type === "ONLINE") {

        const rzp = new (window as any).Razorpay({
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          order_id: data.razorpay_order_id,

          name: "Xotic",
          description: "Order Payment",

          handler: async (response: any) => {

            await authFetch(`${API_BASE}/orders/payment/verify/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: data.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            alert("Payment successful!");
            window.location.href = "/orders";
          },

          modal: {
            ondismiss: () => alert("Payment cancelled"),
          },
        });

        rzp.open();

      } else {

        alert("Order placed successfully!");
        window.location.href = "/orders";

      }

    } catch (err) {

      console.error(" Checkout error:", err);
      alert("Checkout failed");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    if (!isLoaded || !isSignedIn) return;

    fetchCart();
    fetchAddresses();

  }, [isLoaded, isSignedIn, fetchCart, fetchAddresses]);

  const calculatedTotal =
    finalTotal !== null
      ? finalTotal
      : Number(cart.total_amount) + deliveryFee - discount;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        Loading cart...
      </div>
    );
  }
return (
  <div className="min-h-screen bg-[#f3e5d8] py-6 px-3 sm:px-6">
    
    {/* ✅ FIXED CONTAINER */}
    <div className="flex flex-col gap-6 mx-auto max-w-7xl md:grid md:grid-cols-3 md:gap-10">

      {/* ================= LEFT SIDE ================= */}
      <div className="space-y-4 md:col-span-2">

        <h1 className="text-2xl sm:text-3xl font-bold text-[#4e342e]">
          Your Cart 🛒
        </h1>

        {cart.items.length === 0 ? (
          <div className="p-4 bg-white shadow sm:p-6 rounded-xl">
            Cart is empty
          </div>
        ) : (
          cart.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 p-4 bg-white shadow sm:flex-row sm:justify-between sm:items-center sm:p-6 rounded-xl"
            >
              {/* LEFT */}
              <div>
                <h3 className="text-sm font-semibold sm:text-base">
                  {item.product_name}
                </h3>
                <p className="text-sm">₹ {item.price}</p>
              </div>

              {/* RIGHT */}
              <div className="flex flex-wrap items-center gap-3">

                <button
                  onClick={() =>
                    updateQuantity(item.id, item.quantity - 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  -
                </button>

                <span className="min-w-[20px] text-center">
                  {item.quantity}
                </span>

                <button
                  onClick={() =>
                    updateQuantity(item.id, item.quantity + 1)
                  }
                  className="px-2 py-1 bg-gray-200 rounded"
                >
                  +
                </button>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600"
                >
                  Remove
                </button>

              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div className="w-full p-5 bg-white shadow-lg sm:p-8 rounded-2xl">

        <h2 className="mb-4 text-lg font-bold sm:text-xl">
          Order Summary
        </h2>

        <p>Items Total: ₹ {cart.total_amount}</p>
        <p>Delivery Fee: ₹ {deliveryFee}</p>

        {discount > 0 && (
          <p className="text-green-600">
            Discount: -₹ {discount}
          </p>
        )}

        <hr className="my-3" />

        <p className="text-base font-bold sm:text-lg">
          Final Total: ₹ {calculatedTotal}
        </p>

        {/* ADDRESS */}
        <select
          value={selectedAddress ?? ""}
          onChange={(e) =>
            setSelectedAddress(Number(e.target.value))
          }
          className="w-full p-2 mt-4 border rounded"
        >
          {addresses.length === 0 ? (
            <option>No address found</option>
          ) : (
            addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name} - {a.city}
              </option>
            ))
          )}
        </select>

        {/* COUPON */}
        <div className="flex flex-col gap-2 mt-4 sm:flex-row">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 p-2 border rounded"
          />

          <button
            onClick={applyCoupon}
            disabled={couponLoading}
            className="px-4 py-2 text-white bg-green-600 rounded disabled:opacity-50"
          >
            {couponLoading ? "Applying..." : "Apply"}
          </button>
        </div>

        {/* PAYMENT */}
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full p-2 mt-4 border rounded"
        >
          <option value="ONLINE">Online Payment</option>
          <option value="COD">Cash On Delivery</option>
          <option value="WALLET">Wallet</option>
        </select>

        {/* BUTTON */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full mt-6 py-3 bg-[#6d4c41] text-white rounded-xl disabled:opacity-50"
        >
          {loading ? "Processing..." : "Checkout"}
        </button>

      </div>

    </div>
  </div>
);
}