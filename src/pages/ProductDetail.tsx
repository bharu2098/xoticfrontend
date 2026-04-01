import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductDetail, Product } from "../services/productService";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

export default function ProductDetail() {

  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==============================
  // 📦 LOAD PRODUCT (SAFE)
  // ==============================
  useEffect(() => {

    let isMounted = true;

    const loadProduct = async () => {

      if (!id) {
        setError("Invalid product ID");
        setLoading(false);
        return;
      }

      const numericId = Number(id);

      if (isNaN(numericId)) {
        setError("Invalid product ID");
        setLoading(false);
        return;
      }

      try {

        setLoading(true);
        setError(null);

        const data = await getProductDetail(numericId);

        if (!isMounted) return;

        if (!data) {
          setError("Product not found");
          setProduct(null);
          return;
        }

        setProduct(data);

      } catch (err) {

        console.error(" Product fetch error:", err);

        if (isMounted) {
          setError("Failed to load product");
        }

      } finally {

        if (isMounted) {
          setLoading(false);
        }

      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };

  }, [id]);

  // ==============================
  // ⏳ LOADING
  // ==============================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <div className="text-lg font-semibold text-[#6d4c41]">
          Loading product...
        </div>
      </div>
    );
  }

  // ==============================
  // ❌ ERROR
  // ==============================
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f3e5d8] gap-4">
        <div className="text-lg font-semibold text-red-600">
          {error || "Product not found"}
        </div>

        <button
          onClick={() => navigate("/products")}
          className="px-6 py-2 bg-[#6d4c41] text-white rounded-xl"
        >
          Back to Products
        </button>
      </div>
    );
  }

  // ==============================
  // 💰 PRICE SAFE
  // ==============================
  const price = Number(product.price) || 0;
  const safeQuantity = Math.max(1, Math.min(99, quantity));
  const totalPrice = price * safeQuantity;

  // ==============================
  // 🛒 ADD TO CART
  // ==============================
  const addToCart = async () => {

    if (!user) {
      navigate("/login");
      return;
    }

    if (safeQuantity <= 0) {
      alert("Invalid quantity");
      return;
    }

    try {

      setAdding(true);

      await apiRequest(`/cart/items/`, "POST", {
        product_id: product.id,
        quantity: safeQuantity,
      });

      alert("Item added to cart");
      navigate("/cart");

    } catch (err: any) {

      console.error(" Cart error:", err);
      alert(err?.message || "Failed to add to cart");

    } finally {

      setAdding(false);

    }
  };

  return (

    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">

      <div className="max-w-6xl mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-sm font-semibold text-[#6d4c41] hover:underline"
        >
          ← Back
        </button>

        <div className="grid gap-10 p-8 bg-white shadow-xl rounded-3xl md:grid-cols-2">

          <div className="flex items-center justify-center">

            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://via.placeholder.com/400x300?text=No+Image";
                }}
                className="w-full h-[420px] object-cover rounded-2xl shadow-md"
              />
            ) : (
              <div className="w-full h-[420px] bg-[#efebe9] rounded-2xl flex items-center justify-center text-[#8d6e63]">
                No Image
              </div>
            )}

          </div>

          <div className="flex flex-col justify-between">

            <div>

              <h1 className="text-4xl font-bold text-[#4e342e]">
                {product.name}
              </h1>

              <p className="mt-2 text-sm text-[#8d6e63]">
                {product.category_name || "Category"}
              </p>

              <p className="mt-6 text-[#5d4037]">
                {product.description || "No description available"}
              </p>

              <div className="flex items-center gap-4 mt-8">
                <span className="text-3xl font-bold">
                  ₹ {price}
                </span>
              </div>

              <div className="flex items-center gap-6 mt-8">

                <span className="font-semibold">Quantity:</span>

                <div className="flex border rounded-xl">

                  <button
                    onClick={() =>
                      setQuantity((prev) => Math.max(1, prev - 1))
                    }
                    className="px-4 py-2 bg-[#efebe9]"
                  >
                    -
                  </button>

                  <span className="px-6 py-2 font-semibold">
                    {safeQuantity}
                  </span>

                  <button
                    onClick={() =>
                      setQuantity((prev) => Math.min(99, prev + 1))
                    }
                    className="px-4 py-2 bg-[#efebe9]"
                  >
                    +
                  </button>

                </div>

              </div>

              <div className="mt-6 text-lg font-bold">
                Total: ₹ {totalPrice}
              </div>

            </div>

            <button
              onClick={addToCart}
              disabled={adding || safeQuantity <= 0}
              className={`mt-10 py-4 w-full text-white rounded-2xl ${
                adding
                  ? "bg-gray-400"
                  : "bg-[#6d4c41] hover:bg-[#5d4037]"
              }`}
            >
              {adding
                ? "Adding..."
                : `Add ${safeQuantity} to Cart • ₹ ${totalPrice}`}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}