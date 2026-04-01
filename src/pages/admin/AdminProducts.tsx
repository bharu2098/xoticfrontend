import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000"

interface Product {
  id: number;
  name: string;
  price: number;
  stock_quantity: number;
  is_available: boolean;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

const AdminProducts = () => {

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null)
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    if (!isLoaded || !isSignedIn) return null;

    try {

      const token = await getToken();

      if (!token) return null;

      return await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

    } catch (err) {

      console.error(" Auth fetch error:", err);
      return null;

    }

  }, [getToken, isLoaded, isSignedIn]);

  const safeFetch = useCallback(async (url: string, options?: RequestInit) => {

    const res = await authFetch(url, options);

    if (!res) throw new Error("Server unreachable");

    const text = await res.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error("Invalid server response");
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || "Request failed");
    }

    return data;

  }, [authFetch]);
  const fetchProducts = useCallback(async (url?: string) => {

    try {

      setLoading(true);
      setError(null);

      const endpoint = url || `${API_BASE}/products/admin/products/`;

      const data: PaginatedResponse | Product[] =
        await safeFetch(endpoint);

      if ((data as PaginatedResponse).results) {

        const paginated = data as PaginatedResponse;

        setProducts(paginated.results);
        setNextUrl(paginated.next);
        setPrevUrl(paginated.previous);

      } else {

        setProducts(data as Product[]);
        setNextUrl(null);
        setPrevUrl(null);

      }

    } catch (err: any) {

      console.error(" Fetch error:", err);
      setError(err.message);

    } finally {

      setLoading(false);

    }

  }, [safeFetch]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchProducts();
    }
  }, [fetchProducts, isLoaded, isSignedIn]);
  useEffect(() => {

    if (error || successMsg) {

      const timer = setTimeout(() => {
        setError(null);
        setSuccessMsg(null);
      }, 3000);

      return () => clearTimeout(timer);

    }

  }, [error, successMsg]);

  const updateStock = async (id: number, type: "increase" | "decrease") => {

    try {

      setProcessingId(id);
      setError(null);

      await safeFetch(
        `${API_BASE}/products/admin/products/${id}/${type}_stock/`,
        {
          method: "PATCH",
          body: JSON.stringify({ amount: 1 }),
        }
      );

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                stock_quantity:
                  type === "increase"
                    ? p.stock_quantity + 1
                    : Math.max(p.stock_quantity - 1, 0),
              }
            : p
        )
      );

      setSuccessMsg("Stock updated successfully.");

    } catch (err: any) {

      console.error("Stock update error:", err);
      setError(err.message);
      fetchProducts();

    } finally {

      setProcessingId(null);

    }

  };
  const toggleAvailability = async (id: number) => {

    try {

      setProcessingId(id);
      setError(null);

      await safeFetch(
        `${API_BASE}/products/admin/products/${id}/toggle_availability/`,
        { method: "PATCH" }
      );

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, is_available: !p.is_available }
            : p
        )
      );

      setSuccessMsg("Availability updated.");

    } catch (err: any) {

      console.error(" Toggle error:", err);
      setError(err.message);
      fetchProducts();

    } finally {

      setProcessingId(null);

    }

  };
  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);
  return (
    <div className="relative space-y-6">

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-3xl">
          Loading...
        </div>
      )}

      <div className="flex items-center justify-between">

        <h2 className="text-3xl font-bold text-[#5a2d0c]">
          Product Management
        </h2>

        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-orange-400"
        />

      </div>

      {error && (
        <div className="p-3 text-red-700 bg-red-100 rounded-xl">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-green-700 bg-green-100 rounded-xl">
          {successMsg}
        </div>
      )}

      <div className="overflow-x-auto bg-white border shadow-xl rounded-3xl">

        <table className="w-full min-w-[900px] text-sm">

          <thead className="bg-[#f3e5d8] text-[#5a2d0c]">
            <tr>
              <th className="px-6 py-4 text-left">Name</th>
              <th className="px-6 py-4 text-center">Price</th>
              <th className="px-6 py-4 text-center">Stock</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500">
                  No products found
                </td>
              </tr>
            )}

            {filteredProducts.map((product) => {

              const isLowStock = product.stock_quantity <= 5;

              return (
                <tr key={product.id} className="border-t hover:bg-[#faf6f1]">

                  <td className="px-6 py-4 font-medium">
                    {product.name}
                  </td>

                  <td className="px-6 py-4 text-center">
                    ₹ {product.price}
                  </td>

                  <td className={`px-6 py-4 text-center font-semibold ${isLowStock ? "text-red-600" : ""}`}>
                    {product.stock_quantity}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${product.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {product.is_available ? "Available" : "Disabled"}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">

                      <button
                        disabled={processingId === product.id}
                        onClick={() => updateStock(product.id, "increase")}
                        className="px-3 py-1 text-white bg-green-600 rounded-lg"
                      >
                        +
                      </button>

                      <button
                        disabled={processingId === product.id || product.stock_quantity === 0}
                        onClick={() => updateStock(product.id, "decrease")}
                        className="px-3 py-1 text-white bg-yellow-600 rounded-lg"
                      >
                        -
                      </button>

                      <button
                        disabled={processingId === product.id}
                        onClick={() => toggleAvailability(product.id)}
                        className="px-3 py-1 text-white bg-gray-700 rounded-lg"
                      >
                        Toggle
                      </button>

                    </div>
                  </td>

                </tr>
              );

            })}

          </tbody>

        </table>

        {(prevUrl || nextUrl) && (
          <div className="flex justify-between p-4">
            <button
              disabled={!prevUrl}
              onClick={() => prevUrl && fetchProducts(prevUrl)}
              className="px-4 py-2 bg-gray-300 rounded-lg"
            >
              Previous
            </button>

            <button
              disabled={!nextUrl}
              onClick={() => nextUrl && fetchProducts(nextUrl)}
              className="px-4 py-2 text-white bg-orange-500 rounded-lg"
            >
              Next
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default AdminProducts;