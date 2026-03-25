import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user, role, loading, logout } = useAuthContext();

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Normalize role
  const normalizedRole = role?.toLowerCase().trim();

  console.log("NAVBAR:", { user, role, normalizedRole, loading });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isActive = (path: string) =>
    location.pathname === path ||
    location.pathname.startsWith(path + "/");

  const hideNavbarRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (hideNavbarRoutes.includes(location.pathname)) return null;

  return (
    <nav style={styles.nav}>
      {/* LOGO */}
      <div style={styles.logo}>
        <span
          style={styles.logoText}
          onClick={() => navigate("/")}
        >
          Xotic
        </span>
      </div>

      <div style={styles.menu}>
        {/* ================= LOADING ================= */}
        {loading && <span style={{ color: "#ccc" }}>Loading...</span>}

        {/* ================= NOT LOGGED IN ================= */}
        {!loading && !user && (
          <>
            <NavItem to="/login" label="Login" active={isActive} />
            <NavItem to="/register" label="Register" active={isActive} />
          </>
        )}

        {/* ================= ADMIN ================= */}
        {!loading && normalizedRole === "admin" && (
          <>
            <NavItem to="/admin" label="Admin Panel" active={isActive} />
            <NavItem to="/delivery/dashboard" label="Delivery Dashboard" active={isActive} />
            <NavItem to="/delivery/orders" label="Delivery Orders" active={isActive} />
          </>
        )}

        {/* ================= KITCHEN ================= */}
        {!loading && normalizedRole === "kitchenstaff" && (
          <>
            <NavItem to="/kitchen/dashboard" label="Kitchen Dashboard" active={isActive} />
            <NavItem to="/kitchen/orders" label="Kitchen Orders" active={isActive} />
          </>
        )}

        {/* ================= DELIVERY ================= */}
        {!loading && normalizedRole === "delivery" && (
          <>
            <NavItem to="/delivery/dashboard" label="Delivery Dashboard" active={isActive} />
            <NavItem to="/delivery/orders" label="Delivery Orders" active={isActive} />
          </>
        )}

        {/* ================= CUSTOMER ================= */}
        {!loading && normalizedRole === "customer" && (
          <>
            <NavItem to="/" label="Home" active={isActive} />
            <NavItem to="/products" label="Products" active={isActive} />
            <NavItem to="/orders" label="My Orders" active={isActive} />
            <NavItem to="/wallet" label="Wallet" active={isActive} />
            <NavItem to="/transactions" label="Transactions" active={isActive} />
            <NavItem to="/cart" label="Cart" active={isActive} />
            <NavItem to="/profile" label="Profile" active={isActive} />
          </>
        )}

        {/* ================= UNKNOWN ROLE ================= */}
        {!loading && user && !normalizedRole && (
          <span style={{ color: "orange" }}>Role not loaded</span>
        )}

        {/* ================= LOGOUT ================= */}
        {!loading && user && (
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

/* ================= NAV ITEM ================= */

type NavItemProps = {
  to: string;
  label: string;
  active: (path: string) => boolean;
};

const NavItem = ({ to, label, active }: NavItemProps) => {
  const navigate = useNavigate();

  return (
    <span
      onClick={() => {
        console.log("🚀 NAVIGATE:", to);
        navigate(to);
      }}
      style={{
        ...(active(to) ? styles.activeLink : styles.link),
        cursor: "pointer",
      }}
    >
      {label}
    </span>
  );
};

/* ================= STYLES ================= */

const styles: any = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    backgroundColor: "#111",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  logo: {
    fontSize: "22px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  logoText: {
    color: "#fff",
  },
  menu: {
    display: "flex",
    gap: "18px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  link: {
    color: "#ccc",
    fontSize: "14px",
  },
  activeLink: {
    color: "#4da6ff",
    fontWeight: "bold",
    borderBottom: "2px solid #4da6ff",
    paddingBottom: "3px",
  },
  logoutBtn: {
    backgroundColor: "#e50914",
    color: "#fff",
    border: "none",
    padding: "6px 14px",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
  },
};