import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react";

/* ================= CONFIG ================= */

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";

/* ================= TYPES ================= */

type DiscountType = "FLAT" | "PERCENT";

interface Coupon {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: string;
  minimum_order_amount: string;
  max_discount_amount: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  expiry_date: string;
}

/* ================= COMPONENT ================= */

export default function AdminCoupons() {
  const auth = useContext(AuthContext);
  const { getToken } = useAuth();

  if (!auth) return null;

  const isAdmin =
    auth.isAdmin ||
    auth.user?.role === "admin";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: "",
    discount_type: "FLAT" as DiscountType,
    discount_value: "",
    minimum_order_amount: "",
    max_discount_amount: "",
    usage_limit: "",
    expiry_date: "",
  });

  /* ================= TOKEN FIX ================= */

  const waitForToken = async (): Promise<string | null> => {
    for (let i = 0; i < 5; i++) {
      const token = await getToken();
      if (token) return token;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  };

  /* ================= FETCH ================= */

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = await waitForToken();

      if (!token) {
        setError("Authentication failed");
        return;
      }

      const res = await fetch(
        `${API_BASE}/orders/admin/coupons/?search=${search}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        setError(`API Error: ${res.status}`);
        setCoupons([]);
        return;
      }

      const data = await res.json();

      if (Array.isArray(data)) setCoupons(data);
      else if (data?.results) setCoupons(data.results);
      else setCoupons([]);

    } catch (err) {
      console.error(err);
      setError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [getToken, search, page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  /* ================= CREATE ================= */

  const handleSubmit = async () => {
    try {
      const token = await waitForToken();
      if (!token) return;

      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        minimum_order_amount: Number(form.minimum_order_amount),
        max_discount_amount: form.max_discount_amount
          ? Number(form.max_discount_amount)
          : null,
        usage_limit: form.usage_limit
          ? Number(form.usage_limit)
          : null,
      };

      const url = editingId
        ? `${API_BASE}/orders/admin/coupons/${editingId}/`
        : `${API_BASE}/orders/admin/coupons/`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert("Save failed");
        return;
      }

      setEditingId(null);

      setForm({
        code: "",
        discount_type: "FLAT",
        discount_value: "",
        minimum_order_amount: "",
        max_discount_amount: "",
        usage_limit: "",
        expiry_date: "",
      });

      fetchCoupons();

    } catch (err) {
      console.error(err);
    }
  };

  /* ================= TOGGLE ================= */

  const toggleStatus = async (id: number) => {
    const token = await waitForToken();
    if (!token) return;

    await fetch(
      `${API_BASE}/orders/admin/coupons/${id}/toggle_status/`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    fetchCoupons();
  };

  /* ================= DELETE ================= */

  const deleteCoupon = async (id: number) => {
    if (!confirm("Delete this coupon?")) return;

    const token = await waitForToken();
    if (!token) return;

    await fetch(
      `${API_BASE}/orders/admin/coupons/${id}/`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    fetchCoupons();
  };

  if (!isAdmin) {
    return <p style={{ padding: 30 }}>Access Denied</p>;
  }

  return (
    <div style={container}>
      <h2 style={title}>🎟 Admin Coupons</h2>

      {error && (
        <p style={{ color: "red", marginBottom: 20 }}>{error}</p>
      )}

      <div style={card}>
        <h3 style={sectionTitle}>➕ Add New Coupon</h3>

        <div style={formGrid}>
          <FormInput label="Coupon Code" value={form.code} onChange={(v: string) => setForm({ ...form, code: v })} />
          <FormSelect label="Discount Type" value={form.discount_type} onChange={(v: DiscountType) => setForm({ ...form, discount_type: v })} />
          <FormInput label="Discount Value" type="number" value={form.discount_value} onChange={(v: string) => setForm({ ...form, discount_value: v })} />
          <FormInput label="Minimum Order Amount" type="number" value={form.minimum_order_amount} onChange={(v: string) => setForm({ ...form, minimum_order_amount: v })} />
          <FormInput label="Max Discount Amount" type="number" value={form.max_discount_amount} onChange={(v: string) => setForm({ ...form, max_discount_amount: v })} />
          <FormInput label="Usage Limit" type="number" value={form.usage_limit} onChange={(v: string) => setForm({ ...form, usage_limit: v })} />
          <FormInput label="Expiry Date" type="datetime-local" value={form.expiry_date} onChange={(v: string) => setForm({ ...form, expiry_date: v })} />
        </div>

        <div style={{ marginTop: 30 }}>
          <button style={primaryButton} onClick={handleSubmit}>
            {editingId ? "Update Coupon" : "Add Coupon"}
          </button>
        </div>
      </div>

      <div style={card}>

        {/* SEARCH */}
        <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
          <input
            placeholder="Search coupon..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ padding: 10, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button style={primaryButton} onClick={fetchCoupons}>
            Search
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <table style={table}>
              <thead style={thead}>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Min Order</th>
                  <th>Max Discount</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 20 }}>
                      No coupons found
                    </td>
                  </tr>
                ) : (
                  coupons.map((c: Coupon) => (
                    <tr key={c.id} style={row}>
                      <td>{c.code}</td>
                      <td>{c.discount_type}</td>
                      <td>₹{c.discount_value}</td>
                      <td>₹{c.minimum_order_amount}</td>
                      <td>₹{c.max_discount_amount ?? "—"}</td>
                      <td>{c.used_count}</td>
                      <td>
                        <span style={{ color: c.is_active ? "green" : "red", fontWeight: 600 }}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ACTION FIXED */}
                      <td style={actionCell}>
                        <button
                          style={c.is_active ? deactivateBtn : activateBtn}
                          onClick={() => toggleStatus(c.id)}
                        >
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          style={editBtn}
                          onClick={() => {
                            setEditingId(c.id);
                            setForm({
                              code: c.code,
                              discount_type: c.discount_type,
                              discount_value: c.discount_value,
                              minimum_order_amount: c.minimum_order_amount,
                              max_discount_amount: c.max_discount_amount || "",
                              usage_limit: c.usage_limit?.toString() || "",
                              expiry_date: c.expiry_date,
                            });
                          }}
                        >
                          Edit
                        </button>

                        <button
                          style={deleteBtn}
                          onClick={() => deleteCoupon(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                style={primaryButton}
              >
                Prev
              </button>

              <span style={{ alignSelf: "center" }}>Page {page}</span>

              <button
                onClick={() => setPage((p) => p + 1)}
                style={primaryButton}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================= REUSABLE ================= */

function FormInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={inputWrapper}>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DiscountType;
  onChange: (value: DiscountType) => void;
}) {
  return (
    <div style={inputWrapper}>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as DiscountType)
        }
        style={input}
      >
        <option value="FLAT">Flat</option>
        <option value="PERCENT">Percent</option>
      </select>
    </div>
  );
}

/* ================= STYLES ================= */

const container: React.CSSProperties = { padding: 30 };
const title: React.CSSProperties = { color: "#5c2d00", marginBottom: 25 };
const card: React.CSSProperties = {
  background: "#fff",
  padding: 35,
  borderRadius: 14,
  boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
  marginBottom: 40,
};
const sectionTitle: React.CSSProperties = {
  marginBottom: 30,
  color: "#5c2d00",
};
const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "30px 50px",
};
const inputWrapper: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};
const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 6,
};
const input: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};
const primaryButton: React.CSSProperties = {
  background: "#5c2d00",
  color: "#fff",
  padding: "12px 30px",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};
const thead: React.CSSProperties = {
  background: "#5c2d00",
  color: "#fff",
};
const row: React.CSSProperties = {
  borderBottom: "1px solid #eee",
};
const activateBtn: React.CSSProperties = {
  background: "green",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
};
const deactivateBtn: React.CSSProperties = {
  background: "red",
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
};

const actionCell: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  alignItems: "center",
};

const editBtn: React.CSSProperties = {
  background: "#007bff",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  background: "black",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
};