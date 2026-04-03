import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../services/kitchenService";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Kitchen {
  id: number;
  owner: number;
  name: string;
  city: string;
  address: string;
  phone_number: string;
  pincode: string; // ✅ ADDED
  latitude: string;
  longitude: string;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "CLOSED";
  is_active: boolean;
  auto_accept_orders: boolean;
  opening_time: string;
  closing_time: string;
}

interface KitchenForm {
  owner: string;
  name: string;
  city: string;
  address: string;
  phone_number: string;
  pincode: string; // ✅ ADDED
  latitude: string;
  longitude: string;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "CLOSED";
  is_active: boolean;
  auto_accept_orders: boolean;
  opening_time: string;
  closing_time: string;
}

const MapPicker = ({
  formData,
  setFormData,
}: {
  formData: KitchenForm;
  setFormData: React.Dispatch<React.SetStateAction<KitchenForm>>;
}) => {
  const lat = Number(formData.latitude) || 17.385;
  const lng = Number(formData.longitude) || 78.486;

  const position: [number, number] = [lat, lng];

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        setFormData((prev) => ({
          ...prev,
          latitude: e.latlng.lat.toFixed(6),
          longitude: e.latlng.lng.toFixed(6),
        }));
      },
    });
    return null;
  };

  return (
    <MapContainer
      key={`${formData.latitude}-${formData.longitude}`}
      center={position}
      zoom={12}
      style={{ height: 250 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={position} />
      <MapClickHandler />
    </MapContainer>
  );
};

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

const Input = ({ label, value, onChange, type = "text" }: InputProps) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded"
    />
  </div>
);

export default function AdminKitchens() {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<KitchenForm>({
    owner: "",
    name: "",
    city: "",
    address: "",
    phone_number: "",
    pincode: "", // ✅ ADDED
    latitude: "",
    longitude: "",
    status: "OFFLINE",
    is_active: true,
    auto_accept_orders: false,
    opening_time: "",
    closing_time: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const fetchKitchens = useCallback(async () => {
    try {
      setLoading(true);

      const data: any = await apiRequest(
        "/kitchen/admin/kitchens/?page_size=1000"
      );

      if (Array.isArray(data)) {
        setKitchens(data);
      } else if (data?.results) {
        setKitchens(data.results);
      } else {
        setKitchens([]);
      }
    } catch (err: any) {
      console.error("Fetch kitchens error:", err);
      alert(err?.message || "Failed to load kitchens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKitchens();
  }, [fetchKitchens]);

  const filteredKitchens = kitchens.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.city.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredKitchens.length / pageSize);

  const paginatedKitchens = filteredKitchens.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const toggleActive = async (k: Kitchen) => {
    const newValue = !k.is_active;

    setKitchens((prev) =>
      prev.map((item) =>
        item.id === k.id ? { ...item, is_active: newValue } : item
      )
    );

    try {
      await apiRequest(`/kitchen/admin/kitchens/${k.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newValue }),
      });
    } catch (err) {
      console.error("Toggle error:", err);
      fetchKitchens();
    }
  };

  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      alert("Please select location on map");
      return;
    }

    if (!formData.pincode) {
      alert("Pincode is required"); // ✅ FIX
      return;
    }

    const payload = {
      ...formData,
      owner: Number(formData.owner),
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    try {
      if (editingId) {
        await apiRequest(`/kitchen/admin/kitchens/${editingId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/kitchen/admin/kitchens/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      fetchKitchens();
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err?.message || "Failed to save kitchen");
    }
  };

  const deleteKitchen = async (id: number) => {
    if (!confirm("Delete kitchen?")) return;

    try {
      await apiRequest(`/kitchen/admin/kitchens/${id}/`, {
        method: "DELETE",
      });

      fetchKitchens();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err?.message || "Delete failed");
    }
  };

  const editKitchen = (k: Kitchen) => {
    setEditingId(k.id);
    setShowForm(true);

    setFormData({
      ...k,
      owner: String(k.owner),
      pincode: k.pincode || "", // ✅ FIX
      latitude: k.latitude ? String(k.latitude) : "",
      longitude: k.longitude ? String(k.longitude) : "",
      opening_time: k.opening_time?.slice(0, 5),
      closing_time: k.closing_time?.slice(0, 5),
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);

    setFormData({
      owner: "",
      name: "",
      city: "",
      address: "",
      phone_number: "",
      pincode: "", // ✅ FIX
      latitude: "",
      longitude: "",
      status: "OFFLINE",
      is_active: true,
      auto_accept_orders: false,
      opening_time: "",
      closing_time: "",
    });
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-6xl p-6 mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-[#6B2E0F]">Kitchens</h1>

      <div className="flex justify-between mb-4">
        <input
          placeholder="Search kitchen..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 p-2 border rounded"
        />

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#6B2E0F] text-white rounded"
        >
          {showForm ? "Close" : "Add Kitchen"}
        </button>
      </div>

      {showForm && (
        <div className="p-6 mb-8 space-y-4 bg-white rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Owner ID" value={formData.owner} onChange={(v)=>setFormData({...formData, owner:v})} />
            <Input label="Name" value={formData.name} onChange={(v)=>setFormData({...formData, name:v})} />
            <Input label="City" value={formData.city} onChange={(v)=>setFormData({...formData, city:v})} />
            <Input label="Phone" value={formData.phone_number} onChange={(v)=>setFormData({...formData, phone_number:v})} />
            <Input label="Pincode" value={formData.pincode} onChange={(v)=>setFormData({...formData, pincode:v})} /> {/* ✅ FIX */}
            <Input label="Opening Time" type="time" value={formData.opening_time} onChange={(v)=>setFormData({...formData, opening_time:v})} />
            <Input label="Closing Time" type="time" value={formData.closing_time} onChange={(v)=>setFormData({...formData, closing_time:v})} />
          </div>

          <select
            value={formData.status}
            onChange={(e)=>setFormData({...formData, status:e.target.value as any})}
            className="w-full p-2 border rounded"
          >
            <option>ONLINE</option>
            <option>OFFLINE</option>
            <option>BUSY</option>
            <option>CLOSED</option>
          </select>

          <textarea
            placeholder="Address"
            value={formData.address}
            onChange={(e)=>setFormData({...formData, address:e.target.value})}
            className="w-full p-2 border rounded"
          />

          <MapPicker formData={formData} setFormData={setFormData} />

          <div className="p-2 text-sm text-gray-600">
            Latitude: {formData.latitude || "Not selected"} <br />
            Longitude: {formData.longitude || "Not selected"}
          </div>

          <button onClick={handleSubmit} className="px-6 py-2 text-white bg-green-600 rounded">
            Save
          </button>
        </div>
      )}

      <div className="overflow-hidden bg-white rounded-lg shadow">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-[#6B2E0F] text-white">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">City</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Active</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedKitchens.map((k) => (
              <tr key={k.id} className="border-t">
                <td className="p-4">{k.name}</td>
                <td className="p-4">{k.city}</td>
                <td className="p-4">{k.status}</td>
                <td className="p-4">{k.is_active ? "Active" : "Inactive"}</td>

                <td className="p-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={()=>editKitchen(k)} className="px-3 py-1 text-white bg-blue-500 rounded">Edit</button>
                    <button onClick={()=>toggleActive(k)} className="px-3 py-1 text-white bg-yellow-500 rounded">Toggle</button>
                    <button onClick={()=>deleteKitchen(k.id)} className="px-3 py-1 text-white bg-red-500 rounded">Delete</button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>{page} / {totalPages || 1}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

    </div>
  );
}