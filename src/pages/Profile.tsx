import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";
import MapPicker from "../components/MapPicker";
type AddressForm = {
  full_name: string;
  phone_number: string;
  address_line: string;
  landmark: string;
  city: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
};

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  profile_pic?: string;
}

interface Address {
  id: number;
  full_name: string;
  address_line: string;
  city: string;
  pincode: string;
}

interface Address {
  id: number;
  full_name: string;
  phone_number: string;
  address_line: string;
  landmark?: string;      // ✅ ADD THIS
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

    let isMounted = true;

    try {

      setLoading(true);

      const [profileData, addressData]: any = await Promise.all([
        apiRequest(`/users/profile/`),
        apiRequest(`/orders/addresses/`),
      ]);
       
console.log("PROFILE DATA:", profileData);
      if (!isMounted) return;

      const user = profileData.user;

setProfile({
  id: user.id,
  full_name: user.username || "",
  email: user.email,
  phone: user.phone || "",
});

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
  fetchData();
}, []);

  // ==============================
  // ➕ ADD ADDRESS
  // ==============================
 const handleAddAddress = async () => {
  if (saving) return;

  // ✅ REQUIRED FIELD VALIDATION
  if (
    !newAddress.full_name?.trim() ||
    !newAddress.phone_number?.trim() ||
    !newAddress.address_line?.trim() ||
    !newAddress.city?.trim() ||
    !String(newAddress.pincode)?.trim()
  ) {
    alert("Fill all fields");
    return;
  }

  // ✅ CLEAN PHONE NUMBER
  const cleanedPhone = newAddress.phone_number.replace(/\D/g, "");

  if (!/^\d{10,15}$/.test(cleanedPhone)) {
    alert("Enter valid phone number (10–15 digits)");
    return;
  }

  // 🔥 SAFE LAT/LNG NORMALIZATION
  const latRaw = newAddress.latitude;
  const lngRaw = newAddress.longitude;

  let latitude = Array.isArray(latRaw)
    ? Number(latRaw[0])
    : Number(latRaw);

  let longitude = Array.isArray(lngRaw)
    ? Number(lngRaw[0])
    : Number(lngRaw);

  // ❗ STRICT CHECK
  if (
    latitude === undefined ||
    longitude === undefined ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    alert("Invalid location selected");
    return;
  }

  // 🔥🔥 FINAL FIX (IMPORTANT — THIS SOLVES YOUR ERROR)
  latitude = Number(latitude.toFixed(8));
  longitude = Number(longitude.toFixed(8));

  try {
    setSaving(true);

    const payload = {
      full_name: newAddress.full_name.trim(),
      phone_number: cleanedPhone,
      address_line: newAddress.address_line.trim(),
      landmark: newAddress.landmark?.trim() || "",
      city: newAddress.city.trim(),

      // ✅ KEEP STRING
      pincode: String(newAddress.pincode).trim(),

      // 🔥 FIXED VALUES
      latitude,
      longitude,
    };

    // 🔍 DEBUG
    console.log("FINAL PAYLOAD:", payload);
    console.log("LAT:", latitude);
    console.log("LNG:", longitude);

    if (editingId) {
      await apiRequest(`/orders/addresses/${editingId}/`, "PUT", payload);
    } else {
      await apiRequest(`/orders/addresses/`, "POST", payload);
    }

    // ✅ RESET FORM
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
    console.error("FULL ERROR:", err);
    console.error("BACKEND ERROR DATA:", err?.response?.data);

    const msg =
      typeof err?.response?.data === "object"
        ? JSON.stringify(err.response.data, null, 2)
        : err?.response?.data ||
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

  // 🔥 ADD THIS LINE
  setShowForm(true);

  setNewAddress({
    full_name: addr.full_name,
    phone_number: (addr as any).phone_number || "",
    address_line: addr.address_line,
    landmark: (addr as any).landmark || "",
    city: addr.city,
    pincode: addr.pincode,

    latitude: Number((addr as any).latitude),
    longitude: Number((addr as any).longitude),
  });
};
  return (

    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="max-w-4xl mx-auto space-y-10">

        <div className="p-8 text-center bg-white shadow-xl rounded-3xl">

          <div className="w-24 h-24 mx-auto bg-[#d7ccc8] rounded-full flex items-center justify-center text-3xl font-bold">
            {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
          </div>

          <h1 className="mt-4 text-2xl font-bold">
           {profile?.full_name 
  ? profile.full_name 
  : profile?.email 
    ? profile.email.split("@")[0] 
    : "User"}
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
  className="w-full p-2 border rounded"
  placeholder="Address Line"
  value={newAddress.address_line || ""}
  onChange={(e) =>
    setNewAddress({ ...newAddress, address_line: e.target.value })
  }
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
  className="w-full p-2 border rounded"
  placeholder="City"
  value={newAddress.city || ""}
  onChange={(e) =>
    setNewAddress({ ...newAddress, city: e.target.value })
  }
/>

<input
  className="w-full p-2 border rounded"
  placeholder="Pincode"
  value={newAddress.pincode || ""}
  onChange={(e) =>
    setNewAddress({ ...newAddress, pincode: e.target.value })
  }
/>

   <MapPicker
  latitude={newAddress.latitude}
  longitude={newAddress.longitude}
  setCoords={(c: Partial<AddressForm>) => {
    setNewAddress((prev: AddressForm) => ({
      ...prev,
      latitude: c.latitude ?? prev.latitude,
      longitude: c.longitude ?? prev.longitude,

      // 🔥 FIXED (use ?? not ||)
      address_line: c.address_line ?? prev.address_line,
      city: c.city ?? prev.city,
      pincode: c.pincode ?? prev.pincode,

      // 🔥 THIS WAS MISSING
      landmark: c.landmark ?? prev.landmark,
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