import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

type KitchenStatus = "ONLINE" | "BUSY" | "OFFLINE";

interface DashboardData {
  kitchen_id: number;
  today: {
    orders: number;
    completed: number;
    revenue: number;
  };
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  four_months_revenue: number;
  yearly_revenue: number;
  status: KitchenStatus;
}

interface Product {
  id: number;
  name: string;
  price: any;
  image?: string;
}

export default function AdminKitchenDashboard() {

  const auth = useContext(AuthContext) as any;
  const { getToken } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<KitchenStatus>("OFFLINE");
  const [range, setRange] =
    useState<"weekly"|"monthly"|"4months"|"yearly">("weekly");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // 🔥 ADDED
  const [showAddForm, setShowAddForm] = useState(false);
 const [form, setForm] = useState({
  name: "",
  slug: "",
  description: "",
  price: "",
  image: null as File | null,
  is_available: true,
  is_featured: false,
  stock_quantity: "",
  category: "",
  kitchen: "",
});
const [categories, setCategories] = useState<any[]>([]);
const [kitchens, setKitchens] = useState<any[]>([]);
 /* ================= AUTH FETCH ================= */

const authFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const token = await getToken();

    if (!token) {
      console.log("⚠️ No Clerk token yet");
      return null;
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
      },
    });

    return res;
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
};

/* ================= DASHBOARD ================= */
const fetchDashboard = useCallback(async () => {

  try {
    setError(null);

    const token = await getToken();

    if (!token) {
      console.log("⏳ Waiting for Clerk...");
      return;
    }

    const res = await fetch(
      `${API_BASE}/api/orders/admin/kitchen-dashboard/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ API ERROR:", err);
      setError(err);
      return;
    }

    const result = await res.json();

    console.log("✅ Dashboard data:", result);

    setData(result);
    setStatus(result.status);

  } catch (err) {
    console.error(err);
    setError("Failed to load dashboard");
  } finally {
    setLoading(false);
  }

}, []);
/* 🔥 MAIN LOAD */

useEffect(() => {
  fetchDashboard();
  fetchCategories();
  fetchKitchens();
}, [fetchDashboard]);

/* 🔥 AUTO REFRESH */

useEffect(() => {
  const interval = setInterval(fetchDashboard, 15000);
  return () => clearInterval(interval);
}, [fetchDashboard]);

/* ================= PRODUCTS ================= */

const fetchProducts = async () => {
  try {
    const res = await authFetch(`${API_BASE}/api/products/`);

    if (!res) {
      console.log("❌ Products API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Products API error:", err);
      throw new Error();
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      setProducts(data);
    } else if (Array.isArray(data.results)) {
      setProducts(data.results);
    } else if (Array.isArray(data.data)) {
      setProducts(data.data);
    } else {
      setProducts([]);
    }

  } catch (err) {
    console.error("Products error:", err);
    setProducts([]);
  }
};

/* ================= CATEGORY ================= */

const fetchCategories = async () => {
  try {
    const res = await authFetch(`${API_BASE}/api/kitchen/admin/categories/`);

    if (!res) {
      console.log("❌ Categories API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Categories API error:", err);
      throw new Error();
    }

    const data = await res.json();
    setCategories(data.results || data || []);

  } catch (err) {
    console.error("Categories error:", err);
    setCategories([]);
  }
};
/* ================= KITCHENS ================= */

const fetchKitchens = async () => {
  try {
    const res = await authFetch(`${API_BASE}/api/kitchen/admin/kitchens/`);

    if (!res) {
      console.log("❌ Kitchens API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Kitchens API error:", err);
      throw new Error();
    }

    const data = await res.json();
    setKitchens(data.results || data || []);

  } catch (err) {
    console.error("Kitchens error:", err);
    setKitchens([]);
  }
};

/* ================= DELETE PRODUCT ================= */

const deleteProduct = async (id: number) => {
  if (!confirm("Delete this product?")) return;

  try {
    const res = await authFetch(
      `${API_BASE}/api/products/${id}/`,
      { method: "DELETE" }
    );

    if (!res) {
      console.log("❌ Delete API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Delete error:", err);
      throw new Error();
    }

    console.log("✅ Product deleted:", id);

    setProducts((prev) => prev.filter((p) => p.id !== id));

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Delete failed");
  }
};

/* ================= CREATE PRODUCT ================= */

const createProduct = async () => {

  if (!form.name) {
    alert("Name required");
    return;
  }

  if (!form.price) {
    alert("Price required");
    return;
  }

  try {
    const fd = new FormData();

    fd.append("name", form.name);
    fd.append(
      "slug",
      form.slug || form.name.toLowerCase().replace(/\s+/g, "-")
    );
    fd.append("price", form.price);

    fd.append("description", form.description || "");
    fd.append("stock_quantity", form.stock_quantity || "0");
    fd.append("is_available", String(form.is_available));
    fd.append("is_featured", String(form.is_featured));

    if (form.category) fd.append("category", form.category);
    if (form.kitchen) fd.append("kitchen", form.kitchen);

    if (form.image) {
      fd.append("image", form.image);
    }

    const res = await authFetch(`${API_BASE}/api/products/`, {
      method: "POST",
      body: fd,
    });

    if (!res) {
      console.log("❌ Create API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Create error:", err);
      throw new Error();
    }

    console.log("✅ Product created");

    alert("✅ Product Added");

    setForm({
      name: "",
      slug: "",
      description: "",
      price: "",
      image: null,
      is_available: true,
      is_featured: false,
      stock_quantity: "",
      category: "",
      kitchen: "",
    });

    setShowAddForm(false);
    fetchProducts();

  } catch (e) {
    console.error("Create failed:", e);
    alert("❌ Add product failed");
  }
};

/* ================= STATUS ================= */

const updateStatus = async (newStatus: KitchenStatus) => {

  if (status === newStatus) return;

  try {
    setUpdating(true);

    const res = await authFetch(
      `${API_BASE}/api/orders/admin/kitchen-status-toggle/`,
      {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      }
    );

    if (!res) {
      console.log("❌ Status API no response");
      return;
    }

    if (!res.ok) {
      const err = await res.text();
      console.log("❌ Status error:", err);
      throw new Error();
    }

    const result = await res.json();

    console.log("✅ Status updated:", result.status);

    setStatus(result.status);

    await fetchDashboard();

  } catch (err) {
    console.error("Status update failed:", err);
    alert("Status update failed");
  } finally {
    setUpdating(false);
  }
};

/* ================= HELPERS ================= */

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value || 0);

const getRevenue = () => {
  if (!data) return 0;

  switch (range) {
    case "monthly": return data.monthly_revenue;
    case "4months": return data.four_months_revenue;
    case "yearly": return data.yearly_revenue;
    default: return data.weekly_revenue;
  }
};

/* ================= LOADING ================= */

if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      Loading dashboard...
    </div>
  );
}

if (error) {
  return (
    <div className="flex items-center justify-center min-h-screen text-red-600">
      {error}
    </div>
  );
}

if (!data) return null; // ✅ THIS FIXES EVERYTHING

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#d9c6b8] p-10">

      {showProducts ? (
        <div>

          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-[#4e342e]">
              My Products
            </h2>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProducts(false)}
                className="px-5 py-2 bg-[#6d4c41] text-white rounded-xl"
              >
                Back
              </button>

              {/* 🔥 FIXED BUTTON */}
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 text-white bg-green-600 rounded-xl"
              >
                Add Product
              </button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">

            {Array.isArray(products) && products.map((p) => (
              <div key={p.id} className="p-4 bg-white shadow rounded-3xl">

                <img
                  src={p.image || "https://via.placeholder.com/300"}
                  className="object-cover w-full h-40 mb-4 rounded-xl"
                />

                <h3 className="text-lg font-semibold text-[#4e342e]">
                  {p.name}
                </h3>

                <p className="text-[#6d4c41]">
                  ₹ {Number(p.price || 0).toFixed(2)}
                </p>

                <button
                  onClick={() => deleteProduct(p.id)}
                  className="px-4 py-1 mt-3 text-white bg-red-600 rounded-lg"
                >
                  Delete
                </button>

              </div>
            ))}

          </div>
         
          {/* 🔥 ADD PRODUCT MODAL (PUT HERE ONLY) */}
{showAddForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-40">

    <div className="bg-white p-6 rounded-2xl w-[500px] max-h-[90vh] overflow-y-auto">

      <h2 className="mb-4 text-xl font-bold">Add Product</h2>

      <input
        placeholder="Product Name"
        className="w-full p-2 mb-3 border"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
      />

      <input
        placeholder="Slug"
        className="w-full p-2 mb-3 border"
        value={form.slug}
        onChange={(e) =>
          setForm({ ...form, slug: e.target.value })
        }
      />

      <textarea
        placeholder="Description"
        className="w-full p-2 mb-3 border"
        value={form.description}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
      />

      {/* 🔥 CATEGORY */}
      <select
        className="w-full p-2 mb-3 border"
        value={form.category}
        onChange={(e) =>
          setForm({ ...form, category: e.target.value })
        }
      >
        <option value="">Select Category</option>
        {Array.isArray(categories) && categories.map((c: any) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* 🔥 KITCHEN */}
      <select
        className="w-full p-2 mb-3 border"
        value={form.kitchen}
        onChange={(e) =>
          setForm({ ...form, kitchen: e.target.value })
        }
      >
        <option value="">Select Kitchen</option>
        {Array.isArray(kitchens) && kitchens.map((k: any) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Price"
        className="w-full p-2 mb-3 border"
        value={form.price}
        onChange={(e) =>
          setForm({ ...form, price: e.target.value })
        }
      />

      <input
        type="number"
        placeholder="Stock Quantity"
        className="w-full p-2 mb-3 border"
        value={form.stock_quantity}
        onChange={(e) =>
          setForm({ ...form, stock_quantity: e.target.value })
        }
      />

      <input
        type="file"
        className="mb-3"
        onChange={(e) =>
          setForm({
            ...form,
            image: e.target.files?.[0] || null,
          })
        }
      />

      <label className="block mb-2">
        <input
          type="checkbox"
          checked={form.is_available}
          onChange={(e) =>
            setForm({ ...form, is_available: e.target.checked })
          }
        /> Is Available
      </label>

      <label className="block mb-3">
        <input
          type="checkbox"
          checked={form.is_featured}
          onChange={(e) =>
            setForm({ ...form, is_featured: e.target.checked })
          }
        /> Is Featured
      </label>

      <div className="flex gap-2">

        <button
          onClick={createProduct}
          className="px-4 py-2 text-white bg-green-600 rounded"
        >
          Save
        </button>

        <button
          onClick={() => setShowAddForm(false)}
          className="px-4 py-2 text-white bg-gray-500 rounded"
        >
          Cancel
        </button>

      </div>

    </div>

  </div>
)}

  </div>
) : (
        <>
          {/* YOUR DASHBOARD (UNCHANGED) */}
          <div className="flex items-center justify-between mb-10">

            <div>
              <h1 className="text-3xl font-bold text-[#4e342e]">
                Admin Kitchen Dashboard
              </h1>
              <p className="text-[#6d4c41]">
                Monitor kitchen performance
              </p>
            </div>

            <div className="flex gap-3">

              <StatusBadge status={status} />

              <button
                onClick={() => updateStatus("ONLINE")}
                className="px-4 py-2 text-white bg-green-600 rounded-xl"
              >
                Go Online
              </button>

              <button
                onClick={() => updateStatus("BUSY")}
                className="px-4 py-2 text-white bg-yellow-500 rounded-xl"
              >
                Busy
              </button>

              <button
                onClick={() => updateStatus("OFFLINE")}
                className="px-4 py-2 text-white bg-red-600 rounded-xl"
              >
                Go Offline
              </button>

              <button
                onClick={async () => {
                  setShowProducts(true);
                  await fetchProducts();
                }}
                className="px-5 py-2 text-white bg-[#6d4c41] rounded-xl"
              >
                Manage Products
              </button>

            </div>

          </div>

          <div className="grid gap-6 mb-10 md:grid-cols-3">
            <Stat title="Today's Orders" value={data.today.orders} />
            <Stat title="Today's Completed" value={data.today.completed} />
            <Stat title="Today's Revenue" value={currency(data.today.revenue)} />
          </div>

          <div className="flex gap-4 mb-6">
            {["weekly","monthly","4months","yearly"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r as any)}
                className={`px-5 py-2 rounded-xl ${
                  range === r ? "bg-green-600 text-white" : "bg-gray-200"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[#6d4c41] to-[#4e342e] text-white p-10 rounded-3xl mb-10">
            <p>Total Revenue ({range})</p>
            <h2 className="text-4xl font-bold">
              {currency(getRevenue())}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Stat title="Total Orders" value={data.total_orders} />
            <Stat title="Completed Orders" value={data.completed_orders} />
            <Stat title="Cancelled Orders" value={data.cancelled_orders} />
            <Stat
              title="Avg Order Value"
              value={currency(
                data?.completed_orders
  ? (data.total_revenue || 0) / data.completed_orders
  : 0
              )}
            />
          </div>
        </>
      )}

    </div>
  );
}

/* ================= STATUS BADGE ================= */

const StatusBadge = ({status}:{status:KitchenStatus}) => (
  <div className={`px-5 py-2 rounded-xl text-white font-bold ${
    status==="ONLINE" ? "bg-green-600" :
    status==="BUSY" ? "bg-yellow-500" :
    "bg-red-600"
  }`}>
    {status}
  </div>
);

/* ================= STAT ================= */

const Stat = ({title,value}:{title:string,value:any}) => (
  <div className="p-6 bg-white shadow rounded-3xl">
    <p className="text-[#6d4c41]">{title}</p>
    <h3 className="text-3xl font-bold text-[#4e342e] mt-3">
      {value}
    </h3>
  </div>
);