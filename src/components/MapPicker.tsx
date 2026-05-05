import {
  GoogleMap,
  useLoadScript,
  Autocomplete,
} from "@react-google-maps/api";
import { useRef, useCallback, useEffect } from "react";

const LIBRARIES: ("places")[] = ["places"];

const defaultCenter = { lat: 17.7, lng: 83.3 };

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
  latitude,
  longitude,
}: {
  setCoords: (data: Partial<Coords>) => void;
  latitude?: number;
  longitude?: number;
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ CENTER
  const mapCenter =
    latitude && longitude
      ? { lat: Number(latitude), lng: Number(longitude) }
      : defaultCenter;

  // ✅ EDIT SYNC
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      const center = {
        lat: Number(latitude),
        lng: Number(longitude),
      };

      mapRef.current.panTo(center);
      mapRef.current.setZoom(17);
    }
  }, [latitude, longitude]);

  // ✅ GEOCODE
  const fetchAddress = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        );

        const data = await res.json();
        if (data.status !== "OK" || !data.results?.length) return;

        const result = data.results[0];

        let city = "";
        let pincode = "";
        let landmark = "";

        result.address_components.forEach((comp: any) => {
          const types = comp.types;

          if (types.includes("postal_code")) {
            pincode = comp.long_name;
          }

          if (
            types.includes("locality") ||
            types.includes("postal_town") ||
            types.includes("administrative_area_level_2")
          ) {
            if (!city) city = comp.long_name;
          }

          if (
            types.includes("sublocality") ||
            types.includes("sublocality_level_1") ||
            types.includes("route") ||
            types.includes("neighborhood") ||
            types.includes("point_of_interest")
          ) {
            if (!landmark) landmark = comp.long_name;
          }
        });

        if (!city) city = result.formatted_address;
        if (!landmark) landmark = result.formatted_address;

        setCoords({
          latitude: Number(lat.toFixed(8)),
          longitude: Number(lng.toFixed(8)),
          address_line: result.formatted_address,
          city: city.trim(),
          pincode: (pincode || "").trim(),
          landmark: landmark.trim(),
        });
      } catch (err) {
        console.error("Geocode error:", err);
      }
    },
    [setCoords]
  );

  // ✅ SEARCH
  const handlePlaceSelect = () => {
    if (!autoRef.current) return;

    const place = autoRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const center = { lat, lng };

    mapRef.current?.panTo(center);
    mapRef.current?.setZoom(17);

    fetchAddress(lat, lng);
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div style={{ width: "100%" }}>
      {/* SEARCH */}
      <Autocomplete
        onLoad={(ref) => (autoRef.current = ref)}
        onPlaceChanged={handlePlaceSelect}
      >
        <input
          placeholder="Search address..."
          className="w-full p-2 mb-2 border rounded"
        />
      </Autocomplete>

      {/* MAP */}
      <div style={{ height: 300, position: "relative" }}>
        <GoogleMap
          zoom={15}
          center={mapCenter}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          options={{
            gestureHandling: "greedy",
            disableDefaultUI: true,
            zoomControl: true,
          }}
          onLoad={(map) => {
            mapRef.current = map;

            if (!latitude || !longitude) {
              const c = map.getCenter();
              if (c) fetchAddress(c.lat(), c.lng());
            }
          }}

          // 🔥🔥 FINAL FIX HERE 🔥🔥
          onDragEnd={() => {
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
            }, 300);
          }}
        />

        {/* PIN */}
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
    </div>
  );
}