import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from "react-leaflet";

import L, { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

/* ================= LEAFLET FIX ================= */

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ================= TYPES ================= */

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

/* ================= MAP ================= */

function LocationMarker({
  setCoords,
}: {
  setCoords: (data: Partial<AddressForm>) => void;
}) {
  const map = useMap();
  const [position, setPosition] = useState<LatLngTuple | null>(null);

  useMapEvents({
    async click(e) {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      const newPos: LatLngTuple = [lat, lng];
      setPosition(newPos);
      map.flyTo(newPos, 16);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );

        const data = await res.json();
        const addr = data.address || {};

        setCoords({
          latitude: lat,
          longitude: lng,
          address_line:
            addr.road ||
            addr.neighbourhood ||
            addr.suburb ||
            addr.village ||
            "",
          landmark: addr.landmark || addr.suburb || "",
          city:
            addr.city ||
            addr.town ||
            addr.village ||
            addr.county ||
            "",
          pincode: addr.postcode || "",
        });
      } catch {
        setCoords({ latitude: lat, longitude: lng });
      }
    },
  });

  return position ? <Marker position={position} /> : null;
}

/* ================= COMPONENT ================= */

const Profile = () => {
  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newAddress, setNewAddress] = useState<AddressForm>({
    full_name: "",
    phone_number: "",
    address_line: "",
    landmark: "",
    city: "",
    pincode: "",
  });

  /* ================= FETCH ================= */

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [profileData, addressData]: any = await Promise.all([
        apiRequest(`/users/profile/`),
        apiRequest(`/orders/addresses/`),
      ]);

      setProfile(profileData || null);
      setAddresses(addressData?.results || addressData || []);

    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  /* ================= ADD ADDRESS ================= */

  const handleAddAddress = async () => {

    if (
      !newAddress.full_name ||
      !newAddress.phone_number ||
      !newAddress.address_line ||
      !newAddress.city ||
      !newAddress.pincode
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

      await apiRequest(`/orders/addresses/`, "POST", newAddress);

      setShowForm(false);

      setNewAddress({
        full_name: "",
        phone_number: "",
        address_line: "",
        landmark: "",
        city: "",
        pincode: "",
      });

      fetchData();

    } catch {
      alert("Failed to add address");
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete address?")) return;

    await apiRequest(`/orders/addresses/${id}/`, "DELETE");
    fetchData();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#f3e5d8] py-10 px-6">

      <div className="max-w-4xl mx-auto space-y-10">

        {/* PROFILE */}
        <div className="p-8 text-center bg-white shadow-xl rounded-3xl">
          <div className="w-24 h-24 mx-auto bg-[#d7ccc8] rounded-full flex items-center justify-center text-3xl font-bold">
            {profile?.username?.charAt(0) || "U"}
          </div>

          <h1 className="mt-4 text-2xl font-bold">{profile?.username}</h1>
          <p>{profile?.email}</p>
          <p className="mt-2 text-gray-600">{profile?.phone}</p>
        </div>

        {/* ADDRESSES */}
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

              <button
                onClick={() => handleDelete(a.id)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          ))}

          {/* FORM */}
          {showForm && (
            <div className="mt-6 space-y-3">

              <input className="w-full p-2 border rounded"
                placeholder="Full Name"
                value={newAddress.full_name}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, full_name: e.target.value })
                }
              />

              <input className="w-full p-2 border rounded"
                placeholder="Phone"
                value={newAddress.phone_number}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, phone_number: e.target.value })
                }
              />

              <input className="w-full p-2 border rounded"
                placeholder="Address Line"
                value={newAddress.address_line}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, address_line: e.target.value })
                }
              />

              <input className="w-full p-2 border rounded"
                placeholder="Landmark"
                value={newAddress.landmark}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, landmark: e.target.value })
                }
              />

              <input className="w-full p-2 border rounded"
                placeholder="City"
                value={newAddress.city}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, city: e.target.value })
                }
              />

              <input className="w-full p-2 border rounded"
                placeholder="Pincode"
                value={newAddress.pincode}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, pincode: e.target.value })
                }
              />

              <MapContainer center={[17.7, 83.3]} zoom={13} style={{ height: 300 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker
                  setCoords={(c) =>
                    setNewAddress((prev) => ({ ...prev, ...c }))
                  }
                />
              </MapContainer>

              <button
                onClick={handleAddAddress}
                disabled={saving}
                className={`w-full py-2 text-white rounded ${
                  saving ? "bg-gray-400" : "bg-black"
                }`}
              >
                {saving ? "Saving..." : "Save Address"}
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default Profile;