import { useNavigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, role, loading, logout } = useAuthContext();

  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ EXISTING (UNCHANGED)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🔥 NEW: prevent background scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "auto";
  }, [menuOpen]);

  const normalizedRole = role?.toLowerCase().trim();

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

  const handleNavigate = (path: string) => {
    if (location.pathname === path) return;
    navigate(path);
    setMenuOpen(false); // ✅ CLOSE MENU AFTER NAV
  };

  return (
    <nav style={styles.nav}>
      
      {/* LOGO */}
      <div style={styles.logo}>
        <span onClick={() => handleNavigate("/")}>Xotic</span>
      </div>

      {/* HAMBURGER */}
      {isMobile && (
        <div
          style={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </div>
      )}

      {/* MENU */}
      <div
        style={{
          ...styles.menu,
          ...(isMobile
            ? (menuOpen ? styles.menuOpen : {})
            : styles.menuDesktop),
        }}
      >
        {loading && <span style={{ color: "#ccc" }}>Loading...</span>}

        {!loading && !user && (
          <>
            <NavItem to="/login" label="Login" active={isActive} onNav={handleNavigate} />
            <NavItem to="/register" label="Register" active={isActive} onNav={handleNavigate} />
          </>
        )}

        {!loading && normalizedRole === "admin" && (
          <>
            <NavItem to="/admin" label="Admin" active={isActive} onNav={handleNavigate} />
            <NavItem to="/delivery/dashboard" label="Delivery" active={isActive} onNav={handleNavigate} />
          </>
        )}

        {!loading && normalizedRole === "kitchenstaff" && (
          <>
            <NavItem to="/kitchen/dashboard" label="Dashboard" active={isActive} onNav={handleNavigate} />
            <NavItem to="/kitchen/orders" label="Orders" active={isActive} onNav={handleNavigate} />
          </>
        )}

        {!loading && normalizedRole === "delivery" && (
          <>
            <NavItem to="/delivery/dashboard" label="Dashboard" active={isActive} onNav={handleNavigate} />
            <NavItem to="/delivery/orders" label="Orders" active={isActive} onNav={handleNavigate} />
          </>
        )}

        {!loading && normalizedRole === "customer" && (
          <>
            <NavItem to="/" label="Home" active={isActive} onNav={handleNavigate} />
            <NavItem to="/products" label="Products" active={isActive} onNav={handleNavigate} />
            <NavItem to="/orders" label="Orders" active={isActive} onNav={handleNavigate} />
            <NavItem to="/wallet" label="Wallet" active={isActive} onNav={handleNavigate} />
            <NavItem to="/transactions" label="Transactions" active={isActive} onNav={handleNavigate} />
            <NavItem to="/cart" label="Cart" active={isActive} onNav={handleNavigate} />
            <NavItem to="/profile" label="Profile" active={isActive} onNav={handleNavigate} />
          </>
        )}

        {!loading && user && (
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        )}
      </div>

    </nav>
  );
}

const NavItem = ({ to, label, active, onNav }: any) => {
  return (
    <span
      onClick={() => onNav(to)}
      style={{
        ...(active(to) ? styles.activeLink : styles.link),
        cursor: "pointer",
      }}
    >
      {label}
    </span>
  );
};

const styles: any = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#111",
    color: "#fff",
    position: "relative",
    width: "100%",
    zIndex: 1000,
  },

  logo: {
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  hamburger: {
    display: "block",
    fontSize: "22px",
    cursor: "pointer",
  },

  menu: {
    display: "none",
    flexDirection: "column",
    gap: "14px",
    alignItems: "flex-start",
  },

  menuDesktop: {
    display: "flex",
    flexDirection: "row",
    gap: "20px",
    alignItems: "center",
  },

  // 🔥 FIXED MOBILE MENU
  menuOpen: {
    display: "flex",
    position: "fixed",   // ✅ changed
    top: "0",            // ✅ full screen
    left: "0",
    width: "100%",
    height: "100vh",     // ✅ full height
    background: "#111",
    padding: "20px",
    zIndex: 9999,        // ✅ above everything
    flexDirection: "column",
    gap: "20px",
  },

  link: {
    color: "#ccc",
    fontSize: "14px",
  },

  activeLink: {
    color: "#4da6ff",
    fontWeight: "bold",
  },

  logoutBtn: {
    backgroundColor: "#e50914",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};