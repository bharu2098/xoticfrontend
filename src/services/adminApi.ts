const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// ✅ Clerk token getter (same pattern as others)
let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export const setAdminTokenGetter = (
  getter: () => Promise<string | null>
) => {
  clerkTokenGetter = getter;
};

export const adminApi = async (
  endpoint: string,
  access?: string, // ✅ kept (backward compatibility)
  options?: RequestInit
) => {
  try {
    // ==============================
    // 🔑 TOKEN RESOLUTION
    // ==============================
    let token: string | null = access || null;

    // If no access passed → fallback to Clerk
    if (!token && clerkTokenGetter) {
      try {
        token = await clerkTokenGetter();
      } catch (err) {
        console.error("Token fetch failed:", err);
      }
    }

    if (!token) {
      console.warn("⚠️ No admin token available");
    }

    // ==============================
    // 📦 HEADERS
    // ==============================
    const headers: Record<string, string> = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options?.headers as Record<string, string>),
    };

    if (!(options?.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    // ==============================
    // 🌐 REQUEST
    // ==============================
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    // ==============================
    // 🔴 ERROR HANDLING
    // ==============================
    if (!res.ok) {
      if (res.status === 401) {
        console.error("Unauthorized (token expired or invalid)");
      }

      if (res.status === 403) {
        console.error("Forbidden (no permission)");
      }

      if (res.status >= 500) {
        console.error("Server error");
      }

      throw new Error(
        data?.error ||
          data?.message ||
          `Request failed (${res.status})`
      );
    }

    return data;

  } catch (err: any) {
    console.error("Network error:", err);

    throw new Error(err.message || "Network error");
  }
};