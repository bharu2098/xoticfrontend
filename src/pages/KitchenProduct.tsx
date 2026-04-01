import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface Product {
  id: number;
  name: string;
  price: string;
  image: string | null;
  is_available: boolean;
}

export default function KitchenProducts() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ==============================
  // 🔐 TOKEN HELPER (ADDED)
  // ==============================
  const getClerkToken = async () => {

    if (!isLoaded || !isSignedIn) return null;

    let token: string | null = null;

    for (let i = 0; i < 3; i++) {
      try {
        token = await getToken({ template: "default" });
        if (token) break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return token;
  };

  // ==============================
  // 📦 FETCH PRODUCTS
  // ==============================
  const fetchProducts = async () => {

    try {

      setLoading(true);
      setError(null);

      const token = await getClerkToken();

      if (!token) {
        setError("Authentication required");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/products/kitchen/manage/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        console.error(" API ERROR:", data);
        setError("Failed to load products");
        return;
      }

      if (Array.isArray(data)) {
        setProducts(data);
      } else if (Array.isArray(data?.results)) {
        setProducts(data.results);
      } else {
        setProducts([]);
      }

    } catch (err) {

      console.error(" Fetch error:", err);
      setError("Server error while loading products");

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchProducts();
  }, [isLoaded, isSignedIn]);

  // ==============================
  // ❌ DELETE PRODUCT
  // ==============================
  const deleteProduct = async (id: number) => {

    if (!confirm("Delete this product?")) return;

    try {

      setDeletingId(id);

      const token = await getClerkToken();

      if (!token) {
        alert("Authentication required");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/products/kitchen/manage/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        console.error(" Delete error:", data);
        alert("Failed to delete product");
        return;
      }

      setProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );

    } catch (err) {

      console.error(" Delete exception:", err);
      alert("Error deleting product");

    } finally {

      setDeletingId(null);

    }

  };

  // ==============================
  // ⏳ LOADING
  // ==============================
  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <p className="text-lg font-semibold">Loading products...</p>
      </div>
    );
  }

  // ==============================
  // ❌ ERROR
  // ==============================
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <p className="text-lg font-semibold text-red-600">
          {error}
        </p>
      </div>
    );
  }

  // ==============================
  // 🧱 UI
  // ==============================
  return (
    <div className="min-h-screen bg-[#f3e5d8] p-10">

      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">

          <h1 className="text-3xl font-bold text-[#4e342e]">
            My Products
          </h1>

          <Link
            to="/kitchen/products/add"
            className="px-5 py-2 text-white bg-green-600 rounded-xl hover:bg-green-700"
          >
            + Add Product
          </Link>

        </div>

        {products.length === 0 ? (

          <div className="p-10 text-center bg-white shadow-md rounded-2xl">
            <p className="text-lg text-gray-600">
              No products found. Start by adding one.
            </p>
          </div>

        ) : (

          <div className="grid gap-6 md:grid-cols-2">

            {products.map((product) => (

              <div
                key={product.id}
                className="p-6 transition bg-white shadow-md rounded-2xl hover:shadow-lg"
              >

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        "https://via.placeholder.com/300x200?text=No+Image";
                    }}
                    className="object-cover w-full h-40 mb-4 rounded-lg"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-40 mb-4 text-gray-500 bg-gray-200 rounded-lg">
                    No Image
                  </div>
                )}

                <h2 className="text-lg font-semibold">
                  {product.name}
                </h2>

                <p className="text-[#6d4c41] font-bold mt-1">
                  ₹ {product.price}
                </p>

                <div className="flex gap-3 mt-4">

                  <button
                    onClick={() => deleteProduct(product.id)}
                    disabled={deletingId === product.id}
                    className="px-4 py-1 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    {deletingId === product.id ? "Deleting..." : "Delete"}
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}