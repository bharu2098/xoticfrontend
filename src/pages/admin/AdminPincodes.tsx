import { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react"; // ✅ ADDED

/* ================= AUTH TYPE FIX ================= */

interface AuthContextType {
  access: string | null;
  refreshAccessToken: () => Promise<string | null>;
  isAdmin?: boolean;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

interface Pincode {
  id: number;
  pincode: string;
  area_name: string;
  city: string;
  delivery_charge: number;
  minimum_order_amount: number;
  free_delivery_above: number | null;
  estimated_delivery_time: number;
  max_orders_per_hour: number | null;
  is_active: boolean;
}

export default function AdminPincodes() {

  const auth = useContext(AuthContext) as AuthContextType | null;
  const { getToken } = useAuth(); // ✅ ADDED

  if (!auth) return null;

  const { isAdmin } = auth;

  const [pincodes, setPincodes] = useState<Pincode[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null); // ✅ ADDED

  const [form, setForm] = useState({
    pincode: "",
    area_name: "",
    city: "",
    delivery_charge: "",
    minimum_order_amount: "",
    free_delivery_above: "",
    estimated_delivery_time: "",
    max_orders_per_hour: "",
    is_active: true,
  });

  /* ================= AUTH FETCH ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    const token = await getToken(); // ✅ CLERK TOKEN
    if (!token) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    return res;

  }, [getToken]);

  /* ================= FETCH PINCODES ================= */

  const fetchPincodes = useCallback(async () => {

    try {

      const res = await authFetch(`${API_BASE}/orders/admin/pincodes/`);
      if (!res) return;

      const data = await res.json();
      setPincodes(data.results || data);

    } catch (err) {
      console.error(err);
    }

  }, [authFetch]);

  useEffect(() => {
    fetchPincodes();
  }, [fetchPincodes]);

  /* ================= SAVE / UPDATE ================= */

  const handleSubmit = async () => {

    try {

      const payload = {
        pincode: form.pincode,
        area_name: form.area_name,
        city: form.city,
        delivery_charge: Number(form.delivery_charge),
        minimum_order_amount: Number(form.minimum_order_amount),
        free_delivery_above: form.free_delivery_above
          ? Number(form.free_delivery_above)
          : null,
        estimated_delivery_time: Number(form.estimated_delivery_time),
        max_orders_per_hour: form.max_orders_per_hour
          ? Number(form.max_orders_per_hour)
          : null,
        is_active: form.is_active,
      };

      // ✅ UPDATED
      const url = editingId
        ? `${API_BASE}/orders/admin/pincodes/${editingId}/`
        : `${API_BASE}/orders/admin/pincodes/`;

      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res || !res.ok) {
        setMessage("Error saving pincode");
        return;
      }

      setMessage("Pincode saved successfully ✅");

      setEditingId(null); // ✅ ADDED

      setForm({
        pincode: "",
        area_name: "",
        city: "",
        delivery_charge: "",
        minimum_order_amount: "",
        free_delivery_above: "",
        estimated_delivery_time: "",
        max_orders_per_hour: "",
        is_active: true,
      });

      fetchPincodes();

    } catch {
      setMessage("Error saving pincode");
    }

  };

  /* ================= TOGGLE ================= */

  const toggleActive = async (id: number, currentStatus: boolean) => {

    try {

      await authFetch(`${API_BASE}/orders/admin/pincodes/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      fetchPincodes();

    } catch (err) {
      console.error(err);
    }

  };

  if (!isAdmin) return <p>Access Denied</p>;

  return (
    <div style={container}>

      <h2 style={title}>Serviceable Pincodes</h2>

      <div style={card}>

        <FormRow label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
        <FormRow label="Area Name" value={form.area_name} onChange={(v) => setForm({ ...form, area_name: v })} />
        <FormRow label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <FormRow label="Delivery Charge" type="number" value={form.delivery_charge} onChange={(v) => setForm({ ...form, delivery_charge: v })} />
        <FormRow label="Minimum Order Amount" type="number" value={form.minimum_order_amount} onChange={(v) => setForm({ ...form, minimum_order_amount: v })} />
        <FormRow label="Free Delivery Above" type="number" value={form.free_delivery_above} onChange={(v) => setForm({ ...form, free_delivery_above: v })} />
        <FormRow label="Estimated Delivery Time" type="number" value={form.estimated_delivery_time} onChange={(v) => setForm({ ...form, estimated_delivery_time: v })} />
        <FormRow label="Max Orders Per Hour" type="number" value={form.max_orders_per_hour} onChange={(v) => setForm({ ...form, max_orders_per_hour: v })} />

        <div style={{ marginBottom: 15 }}>
          <label style={{ fontWeight: 600, color: "#5c2d00" }}>
            Active
          </label>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({
                ...form,
                is_active: e.target.checked,
              })
            }
            style={{ marginLeft: 10 }}
          />
        </div>

        <button style={button} onClick={handleSubmit}>
          {editingId ? "Update Pincode" : "Save Pincode"}
        </button>

        {message && <p style={msg}>{message}</p>}

      </div>

      <div style={card}>

        <table style={table}>

          <thead style={thead}>
            <tr>
              <th>Pincode</th>
              <th>Area</th>
              <th>City</th>
              <th>Charge</th>
              <th>Min Order</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {pincodes.map((p) => (
              <tr key={p.id}>
                <td>{p.pincode}</td>
                <td>{p.area_name}</td>
                <td>{p.city}</td>
                <td>₹{p.delivery_charge}</td>
                <td>₹{p.minimum_order_amount}</td>
                <td style={{ color: p.is_active ? "green" : "red", fontWeight: 600 }}>
                  {p.is_active ? "Active" : "Inactive"}
                </td>

                <td style={{ display: "flex", gap: 8 }}>

                  <button
                    style={{ ...smallBtn, background: p.is_active ? "#c0392b" : "#27ae60" }}
                    onClick={() => toggleActive(p.id, p.is_active)}
                  >
                    {p.is_active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    style={{ ...smallBtn, background: "#2980b9" }}
                    onClick={() => {
                      setEditingId(p.id); // ✅ ADDED
                      setForm({
                        pincode: p.pincode,
                        area_name: p.area_name,
                        city: p.city,
                        delivery_charge: p.delivery_charge.toString(),
                        minimum_order_amount: p.minimum_order_amount.toString(),
                        free_delivery_above: p.free_delivery_above?.toString() || "",
                        estimated_delivery_time: p.estimated_delivery_time.toString(),
                        max_orders_per_hour: p.max_orders_per_hour?.toString() || "",
                        is_active: p.is_active,
                      });
                    }}
                  >
                    Edit
                  </button>

                  <button
                    style={{ ...smallBtn, background: "black" }}
                    onClick={async () => {
                      if (!confirm("Delete this pincode?")) return;

                      await authFetch(`${API_BASE}/orders/admin/pincodes/${p.id}/`, {
                        method: "DELETE",
                      });

                      fetchPincodes();
                    }}
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

/* ============= FORM ROW ============= */

function FormRow({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string; }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{ fontWeight: 600, color: "#5c2d00" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #ddd", marginTop: 5 }}
      />
    </div>
  );
}

/* ============= STYLES ============= */

const container = { padding: 40 };
const title = { color: "#5c2d00", marginBottom: 20 };
const card = { background: "#fff", padding: 30, borderRadius: 12, marginBottom: 30, boxShadow: "0 5px 15px rgba(0,0,0,0.05)" };
const button = { background: "#5c2d00", color: "#fff", padding: "10px 20px", border: "none", borderRadius: 6, cursor: "pointer" };
const smallBtn = { color: "#fff", padding: "5px 10px", border: "none", borderRadius: 6, cursor: "pointer" };
const table = { width: "100%", borderCollapse: "collapse" } as React.CSSProperties;
const thead = { background: "#5c2d00", color: "#fff" };
const msg = { marginTop: 10, color: "#5c2d00" };