const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const adminApi = async (
  endpoint: string,
  access: string,
  options?: RequestInit
) => {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${access}`,
      ...(options?.headers as Record<string, string>),
    };
    if (!(options?.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

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
    if (!res.ok) {
      if (res.status === 401) {
        console.error(" Unauthorized (token expired or invalid)");
      }

      if (res.status === 403) {
        console.error(" Forbidden (no permission)");
      }

      if (res.status >= 500) {
        console.error(" Server error");
      }

      throw new Error(
        data?.error ||
        data?.message ||
        `Request failed (${res.status})`
      );
    }

    return data;
  } catch (err: any) {
    console.error(" Network error:", err);

    throw new Error(err.message || "Network error");
  }
};