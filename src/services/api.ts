import { useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

export function useApi() {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();

  const apiRequest = async <T>(
    endpoint: string,
    method: string = "GET",
    body?: any,
    useIdempotency: boolean = false,
    customHeaders: Record<string, string> = {}
  ): Promise<T> => {
    try {
      // ==============================
      // 🔐 AUTH CHECK
      // ==============================
      if (!isLoaded) {
        throw {
          message: "Authentication is still loading",
          status: 503,
        } as ApiError;
      }

      if (!isSignedIn) {
        throw {
          message: "User not authenticated",
          status: 401,
        } as ApiError;
      }

      // ==============================
      // 🔑 TOKEN (WITH RETRY)
      // ==============================
      let token: string | null = null;

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
        throw {
          message: "Failed to retrieve auth token",
          status: 401,
        } as ApiError;
      }

      // ==============================
      // 📦 HEADERS
      // ==============================
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...customHeaders,
      };

      if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      if (useIdempotency) {
        headers["Idempotency-Key"] = crypto.randomUUID();
      }

      // ==============================
      // 🌐 REQUEST
      // ==============================
      const options: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(15000),
      };

      if (body) {
        options.body =
          body instanceof FormData ? body : JSON.stringify(body);
      }

      const url = `${API_BASE}${
        endpoint.startsWith("/") ? endpoint : `/${endpoint}`
      }`;

      const response = await fetch(url, options);

      // ==============================
      // 🔴 AUTH FAIL
      // ==============================
      if (response.status === 401) {
        console.warn("Session expired");

        await signOut();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        throw {
          message: "Session expired. Please login again.",
          status: 401,
        } as ApiError;
      }

      // ==============================
      // ✅ NO CONTENT
      // ==============================
      if (response.status === 204) {
        return {} as T;
      }

      // ==============================
      // 📥 SAFE PARSE
      // ==============================
      let data: any = null;

      try {
        data = await response.json();
      } catch {
        try {
          const text = await response.text();
          data = text ? { message: text } : null;
        } catch {
          data = null;
        }
      }

      // ==============================
      // 🔴 ERROR HANDLING
      // ==============================
      if (!response.ok) {
        if (response.status >= 500) {
          console.error("Server error:", data);
        }

        if (response.status === 403) {
          console.warn("Permission denied");
        }

        throw {
          message:
            data?.error ||
            data?.detail ||
            data?.message ||
            `Request failed (${response.status})`,
          status: response.status,
          data,
        } as ApiError;
      }

      return data as T;

    } catch (error: any) {
      console.error("API Error:", error);

      // ⏱ timeout
      if (error.name === "TimeoutError") {
        throw {
          message: "Request timeout. Please try again.",
          status: 408,
        } as ApiError;
      }

      // 🌐 network fail
      if (error instanceof TypeError) {
        throw {
          message: "Network error. Backend may be down.",
          status: 0,
        } as ApiError;
      }

      // 🔁 fallback
      throw {
        message: error?.message || "Something went wrong",
        status: error?.status || 500,
        data: error?.data || null,
      } as ApiError;
    }
  };

  return { apiRequest };
}