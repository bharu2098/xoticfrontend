import { useEffect, useState } from "react";
import { getProducts, Product } from "../services/productService";
import { Link } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function ProductList() {

  const { user } = useAuthContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* =========================================
     LOAD PRODUCTS
  ========================================= */

  const loadProducts = async () => {
    try {

      setLoading(true);
      setError(null);

      const data = await getProducts("page=1");

      if (data?.results) {
        setProducts(data.results);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        setProducts([]);
      }

    } catch (err) {

      console.error("Product fetch error:", err);
      setError("Failed to load products");
      setProducts([]);

    } finally {

      setLoading(false);

    }
  };

  /* =========================================
     FETCH PRODUCTS
  ========================================= */

  useEffect(() => {
    // only run when user state is ready
    if (user !== undefined) {
      loadProducts();
    }
  }, [user]);

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-xl font-semibold text-[#5d4037]">
          Loading delicious food...
        </h2>
      </div>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-xl font-semibold text-red-600">
          {error}
        </h2>
      </div>
    );
  }

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">

      <div className="mx-auto max-w-7xl">

        <h1 className="mb-10 text-4xl font-bold text-[#4e342e]">
          Explore Delicious Food 🍽️
        </h1>

        {products.length === 0 ? (

          <div className="text-lg text-center text-[#6d4c41]">
            No products available
          </div>

        ) : (

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

            {products.map((product) => (

              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="overflow-hidden transition duration-300 bg-white shadow-md group rounded-3xl hover:shadow-xl"
              >

                {/* IMAGE */}
                <div className="overflow-hidden">

                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/300x200?text=No+Image";
                      }}
                      className="object-cover w-full h-56 transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-56 bg-[#efebe9] text-[#8d6e63]">
                      No Image
                    </div>
                  )}

                </div>

                {/* CONTENT */}
                <div className="p-5">

                  <h2 className="text-lg font-semibold text-[#3e2723]">
                    {product.name}
                  </h2>

                  <p className="mt-1 text-sm text-[#8d6e63]">
                    {product.category_name || "Category"}
                  </p>

                  <div className="flex items-center justify-between mt-4">

                    <p className="text-lg font-bold text-[#6d4c41]">
                      ₹ {product.price}
                    </p>

                    <span className="px-3 py-1 text-xs font-semibold text-white transition bg-[#6d4c41] rounded-full group-hover:bg-[#5d4037]">
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