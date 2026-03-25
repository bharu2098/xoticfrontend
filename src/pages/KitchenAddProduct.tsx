import { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

const KitchenAddProduct = () => {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");

  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* ================= SLUG ================= */

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  /* ================= IMAGE ================= */

  const handleImageChange = (file: File | null) => {

    setImage(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  // ✅ FIX: cleanup preview (memory leak)
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  /* ================= ERROR HANDLER ================= */

  const extractBackendError = (data: any) => {

    if (!data) return "Something went wrong";

    if (data.message && typeof data.message === "object") {
      return Object.entries(data.message)
        .map(([key, value]: any) =>
          Array.isArray(value)
            ? `${key}: ${value.join(", ")}`
            : `${key}: ${value}`
        )
        .join(" | ");
    }

    if (data.detail) return data.detail;

    return data.message || "Failed to create product";
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (loading) return; // ✅ prevent double click

    if (!user) {
      setError("Unauthorized. Please login again.");
      return;
    }

    if (!category.trim() || !name.trim() || !price) {
      setError("Category, Name and Price are required.");
      return;
    }

    if (Number(price) <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setError(null);
    setSuccess(false);

    try {

      setLoading(true);

      const formData = new FormData();

      formData.append("category", category.trim());
      formData.append("name", name.trim());
      formData.append("slug", slug || generateSlug(name));
      formData.append("description", description.trim());
      formData.append("price", price);
      formData.append("stock_quantity", stockQuantity || "0");
      formData.append("is_available", String(isAvailable));
      formData.append("is_featured", String(isFeatured));

      if (image) {
        formData.append("image", image);
      }

      await apiRequest(
        `/products/kitchen/manage/`,
        "POST",
        formData
      );

      setSuccess(true);

      // RESET FORM
      setCategory("");
      setName("");
      setSlug("");
      setDescription("");
      setPrice("");
      setStockQuantity("");
      setIsAvailable(true);
      setIsFeatured(false);
      setImage(null);
      setPreview(null);

    } catch (err: any) {

      console.error(err);

      setError(
        err?.message
          ? err.message
          : extractBackendError(err)
      );

    } finally {

      setLoading(false);

    }

  };

  /* ================= UI ================= */

  return (

    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">

      <div className="max-w-2xl p-8 mx-auto bg-white shadow-lg rounded-2xl">

        <h2 className="text-2xl font-bold mb-6 text-[#4e342e]">
          Add Product
        </h2>

        {error && (
          <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 mb-4 text-green-700 bg-green-100 rounded-lg">
            ✅ Product created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="text"
            placeholder="Category (e.g. coffee)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full p-3 border rounded-xl"
          />

          <input
            type="text"
            placeholder="Product Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(generateSlug(e.target.value));
            }}
            required
            className="w-full p-3 border rounded-xl"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border rounded-xl"
          />

          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full p-3 border rounded-xl"
          />

          <input
            type="number"
            placeholder="Stock Quantity"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            className="w-full p-3 border rounded-xl"
          />

          <div className="flex gap-6">

            <label>
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={() => setIsAvailable(!isAvailable)}
              />{" "}
              Is Available
            </label>

            <label>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={() => setIsFeatured(!isFeatured)}
              />{" "}
              Is Featured
            </label>

          </div>

          <div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleImageChange(
                  e.target.files ? e.target.files[0] : null
                )
              }
            />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="object-cover h-32 mt-3 rounded-lg"
              />
            )}

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6d4c41] text-white py-3 rounded-xl hover:bg-[#5d4037] transition disabled:bg-gray-400"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>

        </form>

      </div>

    </div>

  );
};

export default KitchenAddProduct;