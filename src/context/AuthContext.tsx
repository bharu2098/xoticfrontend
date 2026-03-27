import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@clerk/clerk-react";
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";


interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: "admin" | "kitchenstaff" | "delivery" | "customer";
}

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
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {

  const { getToken, signOut, isSignedIn, isLoaded } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {

    try {

      const res = await fetch(`${API_BASE}/api/users/me/`, {
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
        console.error(" Profile fetch failed:", data || res.status);
        setUser(null);
        return;
      }

      if (!data?.user) {
        console.warn(" Invalid profile response");
        setUser(null);
        return;
      }

      console.log(" PROFILE:", data);

      setUser(data.user);

    } catch (err) {

      console.error(" Fetch error:", err);
      setUser(null);

    }

  };

  const waitForToken = async (): Promise<string | null> => {

    try {

      let token: string | null = null;

      for (let i = 0; i < 5; i++) {

        token = await getToken({ template: "default" });

        console.log(` TOKEN TRY ${i + 1}:`, token);

        if (token) return token;

        await new Promise((res) => setTimeout(res, 400));
      }

      return null;

    } catch (err) {

      console.error(" Token error:", err);
      return null;

    }

  };
  useEffect(() => {

    if (!isLoaded) return;

    const loadUser = async () => {

      setLoading(true);

      try {

        if (!isSignedIn) {
          setUser(null);
          return;
        }

        const token = await waitForToken();

        if (!token) {
          console.warn(" No token after retries");
          setUser(null);
          return;
        }

        console.log(" FINAL TOKEN:", token);

        await fetchProfile(token);

      } catch (err) {

        console.error(" Auth load error:", err);
        setUser(null);

      } finally {

        setLoading(false);

      }

    };

    loadUser();

  }, [isLoaded, isSignedIn]);
  const logout = async () => {

    try {

      await signOut();

    } catch (err) {

      console.error(" Logout error:", err);

    } finally {

      setUser(null);

    }

  };
  const isAdmin = user?.role === "admin";
  const isKitchenStaff = user?.role === "kitchenstaff";
  const isDeliveryPartner = user?.role === "delivery";
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

export const useAuthContext = () => {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuthContext must be used inside AuthProvider"
    );
  }

  return context;
};