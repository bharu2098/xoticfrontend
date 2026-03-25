import { useAuth } from "@clerk/clerk-react";

// ✅ Base URL (NO trailing slash)
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

/* =====================================================
   ERROR TYPE
===================================================== */

export interface ApiError {
  message: string;
  status: number;
  data?: any;
}

/* =====================================================
   API HOOK (FINAL STABLE VERSION)
===================================================== */

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
      /* ===============================
         1. AUTH CHECK
      =============================== */

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

      /* ===============================
         2. GET TOKEN (FORCE FRESH)
      =============================== */

      const token = await getToken({ template: "default" });

      if (!token) {
        throw {
          message: "Failed to retrieve auth token",
          status: 401,
        } as ApiError;
      }

      /* ===============================
         3. HEADERS
      =============================== */

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

      /* ===============================
         4. REQUEST OPTIONS
      =============================== */

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body =
          body instanceof FormData ? body : JSON.stringify(body);
      }

      /* ===============================
         5. SAFE URL JOIN (NO DOUBLE /)
      =============================== */

      const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

      const response = await fetch(url, options);

      /* ===============================
         6. HANDLE 401 (SESSION EXPIRED)
      =============================== */

      if (response.status === 401) {
        await signOut();
        window.location.href = "/login";

        throw {
          message: "Session expired. Please login again.",
          status: 401,
        } as ApiError;
      }

      /* ===============================
         7. NO CONTENT
      =============================== */

      if (response.status === 204) {
        return {} as T;
      }

      /* ===============================
         8. PARSE RESPONSE
      =============================== */

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      /* ===============================
         9. ERROR HANDLING
      =============================== */

      if (!response.ok) {
        throw {
          message:
            data?.error ||
            data?.detail ||
            `Request failed (${response.status})`,
          status: response.status,
          data,
        } as ApiError;
      }

      /* ===============================
         10. SUCCESS
      =============================== */

      return data as T;

    } catch (error: any) {
      console.error("🔥 API Error:", error);

      throw {
        message: error?.message || "Something went wrong",
        status: error?.status || 500,
        data: error?.data || null,
      } as ApiError;
    }
  };

  return { apiRequest };
}