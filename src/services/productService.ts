import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

// ✅ NEW: helper to get token outside component
let getTokenFn: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (fn: () => Promise<string | null>) => {
  getTokenFn = fn;
};

const apiRequest = async <T>(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<T> => {
  try {
    // ✅ FIXED: Clerk token instead of localStorage
    let token: string | null = null;

    if (getTokenFn) {
      try {
        token = await getTokenFn();
      } catch (err) {
        console.error("Token fetch failed:", err);
      }
    }

    const headers: Record<string, string> = {};

    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No token found");
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

    const text = await res.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.error(" Unauthorized");
      }

      if (res.status === 403) {
        console.error(" Forbidden");
      }

      if (res.status >= 500) {
        console.error(" Server error");
      }

      throw new Error(
        data?.error ||
          data?.detail ||
          data?.message ||
          `API Error (${res.status})`
      );
    }

    if (res.status === 204) {
      return {} as T;
    }

    return data as T;

  } catch (err: any) {
    console.error(" apiRequest error:", err);

    throw new Error(err.message || "Network error");
  }
};

// ==============================
// TYPES (UNCHANGED)
// ==============================
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

// ==============================
// API FUNCTIONS (UNCHANGED)
// ==============================
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
    console.error(" getProducts error:", err);

    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    };
  }
};

export const getProductDetail = async (
  id: number
): Promise<Product | null> => {
  try {
    return await apiRequest<Product>(
      `/products/${id}/`,
      "GET"
    );
  } catch (err) {
    console.error(" getProductDetail error:", err);
    return null;
  }
};

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
    console.error(" createProduct error:", err);
    return null;
  }
};

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
    console.error(" updateProduct error:", err);
    return null;
  }
};

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
    console.error(" deleteProduct error:", err);
    return false;
  }
};