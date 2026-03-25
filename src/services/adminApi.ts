 const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const adminApi = (endpoint: string, access: string, options?: RequestInit) => {
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access}`,
      ...(options?.headers || {}),
    },
  }).then(async (res) => {
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || "Request failed");
    }

    return data;
  });
};