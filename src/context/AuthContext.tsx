import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-react";

/* =====================================================
   API BASE
===================================================== */

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* =====================================================
   USER TYPE
===================================================== */

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: "admin" | "kitchenstaff" | "delivery" | "customer";
}

/* =====================================================
   CONTEXT TYPE
===================================================== */

interface AuthContextType {
  user: UserProfile | null;
  userId: number | null;
  role: UserProfile["role"] | null;
  isAdmin: boolean;
  isKitchenStaff: boolean;
  isDeliveryPartner: boolean;
  loading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/* =====================================================
   PROVIDER
===================================================== */

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { getToken, signOut, isSignedIn, isLoaded } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* =====================================================
     FETCH PROFILE
  ===================================================== */

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/me/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ Profile fetch failed:", res.status);
        setUser(null);
        return;
      }

      const data = await res.json();

      console.log("✅ PROFILE:", data);

      setUser(data.user);

    } catch (err) {
      console.error("❌ Fetch error:", err);
      setUser(null);
    }
  };

  /* =====================================================
     🔥 STRONG TOKEN WAIT (FINAL FIX)
  ===================================================== */

  const waitForToken = async (): Promise<string | null> => {
    try {
      let token: string | null = null;

      // 🔁 Retry up to 5 times (handles Clerk delay)
      for (let i = 0; i < 5; i++) {
        token = await getToken();

        console.log(`🔥 TOKEN TRY ${i + 1}:`, token);

        if (token) return token;

        await new Promise((res) => setTimeout(res, 400));
      }

      return null;

    } catch (err) {
      console.error("❌ Token error:", err);
      return null;
    }
  };

  /* =====================================================
     LOAD USER (FIXED FLOW)
  ===================================================== */

  useEffect(() => {
    if (!isLoaded) return;

    const loadUser = async () => {
      setLoading(true);

      try {
        if (!isSignedIn) {
          setUser(null);
          return;
        }

        // 🔥 WAIT UNTIL TOKEN EXISTS
        const token = await waitForToken();

        if (!token) {
          console.warn("❌ No token after retries");
          setUser(null);
          return;
        }

        console.log("✅ FINAL TOKEN:", token);

        // ✅ ONLY CALL API AFTER TOKEN EXISTS
        await fetchProfile(token);

      } catch (err) {
        console.error("❌ Auth load error:", err);
        setUser(null);
      }

      setLoading(false);
    };

    loadUser();

  }, [isLoaded, isSignedIn]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  /* =====================================================
     ROLE FLAGS
  ===================================================== */

  const isAdmin = user?.role === "admin";
  const isKitchenStaff = user?.role === "kitchenstaff";
  const isDeliveryPartner = user?.role === "delivery";

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id || null,
        role: user?.role || null,
        isAdmin,
        isKitchenStaff,
        isDeliveryPartner,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =====================================================
   HOOK
===================================================== */

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );
  }

  return context;
};