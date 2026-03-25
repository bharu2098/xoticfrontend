import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function Login() {

  const navigate = useNavigate();
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const hasRedirected = useRef(false); // ✅ prevent multiple calls

  useEffect(() => {

    const handleRedirect = async () => {

      if (!isLoaded) return;

      if (!isSignedIn) return;

      if (hasRedirected.current) return; // ✅ prevent double run
      hasRedirected.current = true;

      try {

        const token = await getToken({ template: "default" });

        if (!token) {
          console.error("❌ Token missing");
          return;
        }

        const res = await fetch(`${API_BASE}/api/users/profile/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error("❌ Profile API failed");
          return;
        }

        const data = await res.json();
        const user = data.user;

        console.log("✅ USER:", user);

        /* ================= ROLE BASED ROUTING ================= */

        if (user?.is_staff) {
          navigate("/admin"); // ✅ FIXED
        } 
        else if (user?.is_kitchen_staff) {
          navigate("/kitchen/orders");
        } 
        else if (user?.is_delivery_partner) {
          navigate("/delivery/orders");
        } 
        else {
          navigate("/");
        }

      } catch (err) {

        console.error("❌ Redirect error:", err);

      }

    };

    handleRedirect();

  }, [isSignedIn, isLoaded, navigate, getToken]);

  /* ================= LOADING ================= */

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <p className="text-lg font-semibold text-[#5d4037]">
          Loading...
        </p>
      </div>
    );
  }

  /* ================= LOGIN UI ================= */

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
      <SignIn />
    </div>
  );
}