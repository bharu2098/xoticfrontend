/* ================= BASE ================= */

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

/* ================= GENERIC REQUEST ================= */

const apiRequest = async <T>(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<T> => {

  const token = localStorage.getItem("access"); // 🔥 adjust if needed

  const headers: Record<string, string> = {};

  if (!(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    throw new Error("API Error");
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
};

/* ================= TYPES ================= */

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image: string | null;
  is_available: boolean;
  is_featured: boolean;
  stock_quantity: number;
  in_stock: boolean;
  category: number;
  category_name: string;
  kitchen: number;
  kitchen_name: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ================= API ================= */

/* ✅ GET PRODUCTS */
export const getProducts = async (
  query: string = ""
): Promise<PaginatedResponse<Product>> => {

  try {

    const data = await apiRequest<PaginatedResponse<Product>>(
      `/products/${query ? `?${query}` : ""}`,
      "GET"
    );

    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      };
    }

    return data;

  } catch (err) {

    console.error("getProducts error:", err);

    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };

  }

};

/* ✅ GET PRODUCT DETAIL */
export const getProductDetail = async (
  id: number
): Promise<Product | null> => {

  try {

    const data = await apiRequest<Product>(
      `/products/${id}/`,
      "GET"
    );

    return data;

  } catch (err) {

    console.error("getProductDetail error:", err);
    return null;

  }

};

/* ✅ CREATE PRODUCT */
export const createProduct = async (
  payload: Partial<Product>
): Promise<Product | null> => {

  try {

    return await apiRequest<Product>(
      `/products/`,
      "POST",
      payload
    );

  } catch (err) {

    console.error("createProduct error:", err);
    return null;

  }

};

/* ✅ UPDATE PRODUCT */
export const updateProduct = async (
  id: number,
  payload: Partial<Product>
): Promise<Product | null> => {

  try {

    return await apiRequest<Product>(
      `/products/${id}/`,
      "PUT",
      payload
    );

  } catch (err) {

    console.error("updateProduct error:", err);
    return null;

  }

};

/* ✅ DELETE PRODUCT */
export const deleteProduct = async (
  id: number
): Promise<boolean> => {

  try {

    await apiRequest<void>(
      `/products/${id}/`,
      "DELETE"
    );

    return true;

  } catch (err) {

    console.error("deleteProduct error:", err);
    return false;

  }

};