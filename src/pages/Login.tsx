import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/clerk-react";

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function Login() {

  const navigate = useNavigate();
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const hasRedirected = useRef(false);

  useEffect(() => {

    const handleRedirect = async () => {

      if (!isLoaded) return;
      if (!isSignedIn) return;

      if (hasRedirected.current) return;
      hasRedirected.current = true;

      try {

        const token = await getToken({ template: "default" });

        if (!token) {
          console.error(" Token missing");
          return;
        }

        const res = await fetch(`${API_BASE}/api/users/profile/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text();

        let data: any;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          console.error(" Profile API failed:", data);
          return;
        }

        const user = data?.user;

        console.log(" USER:", user);

        if (user?.is_staff) {
          navigate("/admin");
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

        console.error(" Redirect error:", err);

      }

    };

    handleRedirect();

  }, [isSignedIn, isLoaded, navigate, getToken]);
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <p className="text-lg font-semibold text-[#5d4037]">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
      <SignIn />
    </div>
  );
}