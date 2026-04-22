import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";
import MapPicker from "../components/MapPicker";


interface ProfileData {
  id: number;
  username: string;
  email: string;
  phone: string;
}

interface Address {
  id: number;
  full_name: string;
  address_line: string;
  city: string;
  pincode: string;
}

interface AddressForm {
  full_name: string;
  phone_number: string;
  address_line: string;
  landmark: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}


// ==============================
// 👤 PROFILE COMPONENT
// ==============================
const Profile = () => {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState<AddressForm>({
  full_name: "",
  phone_number: "",
  address_line: "",
  landmark: "",
  city: "",
  pincode: "",
  latitude: 0,
  longitude: 0,
});

  // ==============================
  // 📦 FETCH DATA (SAFE)
  // ==============================
  const fetchData = async () => {

    if (!user) return;

    let isMounted = true;

    try {

      setLoading(true);

      const [profileData, addressData]: any = await Promise.all([
        apiRequest(`/users/profile/`),
        apiRequest(`/orders/addresses/`),
      ]);

      if (!isMounted) return;

      setProfile(profileData || null);

      if (Array.isArray(addressData?.results)) {
        setAddresses(addressData.results);
      } else if (Array.isArray(addressData)) {
        setAddresses(addressData);
      } else {
        setAddresses([]);
      }

    } catch (err) {

      console.error(" Profile fetch error:", err);

    } finally {

      if (isMounted) setLoading(false);

    }

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // ==============================
  // ➕ ADD ADDRESS
  // ==============================
  const handleAddAddress = async () => {

    if (saving) return;

    if (
      !newAddress.full_name?.trim() ||
      !newAddress.phone_number?.trim() ||
      !newAddress.address_line?.trim() ||
      !newAddress.city?.trim() ||
      !newAddress.pincode?.trim()
    ) {
      alert("Fill all fields");
      return;
    }

    if (!newAddress.latitude || !newAddress.longitude) {
      alert("Select location on map");
      return;
    }

    try {

      setSaving(true);

      if (editingId) {
  await apiRequest(`/orders/addresses/${editingId}/`, "PUT", {
    ...newAddress,
    latitude: Number(newAddress.latitude),
    longitude: Number(newAddress.longitude),
  });
} else {
  await apiRequest(`/orders/addresses/`, "POST", {
    ...newAddress,
    latitude: Number(newAddress.latitude),
    longitude: Number(newAddress.longitude),
  });
}

      setShowForm(false);

     setNewAddress({
  full_name: "",
  phone_number: "",
  address_line: "",
  landmark: "",
  city: "",
  pincode: "",
  latitude: 0,
  longitude: 0,
});

setEditingId(null);

      await fetchData();

     } catch (err: any) {
  console.error(" Add address error:", err);

  const msg =
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    "Failed to add address";

  alert(msg);

} finally {
  setSaving(false);
}
  };

  // ==============================
  // ❌ DELETE ADDRESS
  // ==============================
  const handleDelete = async (id: number) => {

    if (!window.confirm("Delete address?")) return;

    try {

      await apiRequest(`/orders/addresses/${id}/`, "DELETE");

      setAddresses((prev) => prev.filter((a) => a.id !== id));

    } catch (err) {

      console.error(" Delete error:", err);

    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
const handleEdit = (addr: Address) => {
  setEditingId(addr.id);
  setShowForm(true);

  setNewAddress({
    full_name: addr.full_name,
    phone_number: (addr as any).phone_number || "",
    address_line: addr.address_line,
    landmark: "",
    city: addr.city,
    pincode: addr.pincode,
    latitude: (addr as any).latitude || 0,
    longitude: (addr as any).longitude || 0,
  });
};

  return (

    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="max-w-4xl mx-auto space-y-10">

        <div className="p-8 text-center bg-white shadow-xl rounded-3xl">

          <div className="w-24 h-24 mx-auto bg-[#d7ccc8] rounded-full flex items-center justify-center text-3xl font-bold">
            {profile?.username?.charAt(0) || "U"}
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            {profile?.username}
          </h1>

          <p>{profile?.email}</p>
          <p className="mt-2 text-gray-600">{profile?.phone}</p>

        </div>

        <div className="p-8 bg-white shadow-xl rounded-3xl">

          <div className="flex justify-between mb-6">

            <h2 className="text-xl font-bold">My Addresses</h2>

            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-1 text-white bg-[#6d4c41] rounded"
            >
              + Add Address
            </button>

          </div>

          {addresses.length === 0 && (
            <p className="text-gray-500">No addresses added</p>
          )}

          {addresses.map((a) => (

            <div
              key={a.id}
              className="flex justify-between p-4 mb-3 bg-[#efebe9] rounded-xl"
            >

              <div>
                <p className="font-semibold">{a.full_name}</p>
                <p>{a.address_line}</p>
                <p>{a.city} - {a.pincode}</p>
              </div>

              <div className="flex items-center gap-3">
  <button
    onClick={() => handleEdit(a)}
    className="text-blue-600"
  >
    Edit
  </button>

  <button
    onClick={() => handleDelete(a.id)}
    className="text-red-600"
  >
    Delete
  </button>
</div>

            </div>

          ))}
{showForm && (
  <div className="mt-6 space-y-3">

    <input
      className="w-full p-2 border rounded"
      placeholder="Full Name"
      value={newAddress.full_name}
      onChange={(e) =>
        setNewAddress({ ...newAddress, full_name: e.target.value })
      }
    />

    <input
      className="w-full p-2 border rounded"
      placeholder="Phone"
      value={newAddress.phone_number}
      onChange={(e) =>
        setNewAddress({ ...newAddress, phone_number: e.target.value })
      }
    />

    <input
      className="w-full p-2 bg-gray-100 border rounded"
      placeholder="Address Line"
      value={newAddress.address_line || ""}
      readOnly
    />

    <input
      className="w-full p-2 border rounded"
      placeholder="Landmark"
      value={newAddress.landmark || ""}
      onChange={(e) =>
        setNewAddress({ ...newAddress, landmark: e.target.value })
      }
    />

    <input
      className="w-full p-2 bg-gray-100 border rounded"
      placeholder="City"
      value={newAddress.city || ""}
      readOnly
    />

    <input
      className="w-full p-2 bg-gray-100 border rounded"
      placeholder="Pincode"
      value={newAddress.pincode || ""}
      readOnly
    />

    <MapPicker
      setCoords={(c: Partial<AddressForm>) => {
        setNewAddress((prev) => ({
          ...prev,
          ...c,
        }));
      }}
    />

    <button
      onClick={handleAddAddress}
      disabled={saving}
      className={`w-full py-2 text-white rounded ${
        saving ? "bg-gray-400" : "bg-black"
      }`}
    >
      {saving
        ? "Saving..."
        : editingId
        ? "Update Address"
        : "Save Address"}
    </button>

  </div>
)}

            </div>

          

        </div>

      </div>
  );
};

export default Profile;