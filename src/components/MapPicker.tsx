import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import { useRef } from "react";

const center = { lat: 17.7, lng: 83.3 };

type Coords = {
  latitude: number;
  longitude: number;
  address_line: string;
  city: string;
  pincode: string;
  landmark: string;
};

export default function MapPicker({
  setCoords,
}: {
  setCoords: (data: Partial<Coords>) => void;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!isLoaded) return <div>Loading map...</div>;

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );

      const data = await res.json();
      if (!data.results?.length) return;

      const result = data.results[0];

      let city = "";
      let pincode = "";
      let landmark = "";

      result.address_components.forEach((comp: any) => {
        const types = comp.types;

        // ✅ CITY (handles Indian addresses properly)
        if (
          types.includes("locality") ||
          types.includes("administrative_area_level_2") ||
          types.includes("administrative_area_level_3")
        ) {
          if (!city) city = comp.long_name;
        }

        // ✅ PINCODE
        if (types.includes("postal_code")) {
          pincode = comp.long_name;
        }

        // ✅ LANDMARK (more reliable)
        if (
          types.includes("sublocality") ||
          types.includes("route") ||
          types.includes("neighborhood") ||
          types.includes("point_of_interest") ||
          types.includes("premise")
        ) {
          if (!landmark) landmark = comp.long_name;
        }
      });

      // 🔥 FALLBACKS
      if (!city) city = result.formatted_address;
      if (!landmark) landmark = result.formatted_address;

      console.log("✅ GEOCODE:", {
        address_line: result.formatted_address,
        city,
        pincode,
        landmark,
      });

      setCoords({
        latitude: lat,
        longitude: lng,
        address_line: result.formatted_address,
        city,
        pincode,
        landmark,
      });
    } catch (err) {
      console.error("Geocode error:", err);
    }
  };

  return (
    <div style={{ height: 300, width: "100%", position: "relative" }}>
      <GoogleMap
        zoom={15}
        center={center} // keep static (prevents drag issues)
        mapContainerStyle={{ width: "100%", height: "100%" }}
        onLoad={(map) => {
          mapRef.current = map;

          const c = map.getCenter();
          if (c) fetchAddress(c.lat(), c.lng());
        }}
        onIdle={() => {
          if (!mapRef.current) return;

          const c = mapRef.current.getCenter();
          if (!c) return;

          const lat = c.lat();
          const lng = c.lng();

          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }

          debounceRef.current = setTimeout(() => {
            fetchAddress(lat, lng);
          }, 500);
        }}
        options={{
          gestureHandling: "greedy", // mobile drag fix
          disableDefaultUI: true,
        }}
      />

      {/* 📍 CENTER PIN */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -100%)",
          fontSize: "32px",
          pointerEvents: "none",
        }}
      >
        📍
      </div>
    </div>
  );
}