import { useEffect, useState } from "react";
import { getProducts, Product } from "../services/productService";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function ProductList() {

  const { user } = useAuthContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {

    let isMounted = true;

    try {

      setLoading(true);
      setError(null);

      const data = await getProducts("page=1");

      if (!isMounted) return;

      if (data?.results && Array.isArray(data.results)) {
        setProducts(data.results);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.warn(" Unexpected product response:", data);
        setProducts([]);
      }

    } catch (err) {

      console.error(" Product fetch error:", err);

      if (isMounted) {
        setError("Failed to load products");
        setProducts([]);
      }

    } finally {

      if (isMounted) {
        setLoading(false);
      }

    }

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    if (user !== undefined) {
      loadProducts();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-xl font-semibold text-[#5d4037]">
          Loading delicious food...
        </h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-xl font-semibold text-red-600">
          {error}
        </h2>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-[#f3e5d8] py-6 px-2 sm:px-4 md:px-6">

      {/* ✅ FIXED CONTAINER (FULL WIDTH MOBILE) */}
      <div className="w-full max-w-full mx-0 md:max-w-7xl md:mx-auto">

        <h1 className="mb-6 text-2xl sm:text-3xl md:text-4xl font-bold text-[#4e342e]">
          Explore Delicious Food 🍽️
        </h1>

        {products.length === 0 ? (

          <div className="text-lg text-center text-[#6d4c41]">
            No products available
          </div>

        ) : (

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">

            {products.map((product) => (

              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="overflow-hidden transition duration-300 bg-white shadow-md group rounded-2xl sm:rounded-3xl hover:shadow-xl"
              >

                <div className="overflow-hidden">

                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/300x200?text=No+Image";
                      }}
                      className="object-cover w-full h-40 transition duration-300 sm:h-52 md:h-56 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-40 sm:h-52 md:h-56 bg-[#efebe9] text-[#8d6e63]">
                      No Image
                    </div>
                  )}

                </div>

                <div className="p-3 sm:p-4 md:p-5">

                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[#3e2723] line-clamp-1">
                    {product.name}
                  </h2>

                  <p className="mt-1 text-xs sm:text-sm text-[#8d6e63] line-clamp-1">
                    {product.category_name || "Category"}
                  </p>

                  <div className="flex items-center justify-between mt-3 sm:mt-4">

                    <p className="text-sm sm:text-base md:text-lg font-bold text-[#6d4c41]">
                      ₹ {Number(product.price) || 0}
                    </p>

                    <span className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-white transition bg-[#6d4c41] rounded-full group-hover:bg-[#5d4037]">
                      View
                    </span>

                  </div>

                </div>

              </Link>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}