import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
} from "react-router-dom";

import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

import Navbar from "./components/Navbar";
import { useAuthContext } from "./context/AuthContext";
import { setClerkTokenGetter } from "./services/kitchenService";

/* ================= PAGES ================= */

import Home from "./pages/Home";
import Login from "./pages/Login";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";

import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Transactions from "./pages/Transactions";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";

import KitchenDashboard from "./pages/KitchenDashboard";
import KitchenOrders from "./pages/KitchenOrders";

import DeliveryDashboard from "./pages/DeliveryDashboard";
import DeliveryOrders from "./pages/DeliveryOrders";

/* ================= ADMIN ================= */

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminKitchens from "./pages/admin/AdminKitchens";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminPincodes from "./pages/admin/AdminPincodes";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminRefunds from "./pages/admin/AdminRefunds";
import AdminKitchenDashboard from "./pages/admin/AdminKitchenDashboard";

/* ================= LOADING ================= */

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-lg font-semibold">Loading...</div>
  </div>
);

/* ================= AUTH GUARDS ================= */

const RequireAuth = () => {
  const { user, loading } = useAuthContext();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RequireKitchen = () => {
  const { user, role, loading } = useAuthContext();
  if (loading || role === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().trim();
  if (r !== "kitchenstaff" && r !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/* 🔥 ADMIN ONLY FOR KITCHEN DASHBOARD */
const RequireKitchenAdmin = () => {
  const { user, role, loading } = useAuthContext();
  if (loading || role === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().trim();
  if (r !== "admin") {
    return <Navigate to="/kitchen/orders" replace />;
  }

  return <Outlet />;
};

const RequireDelivery = () => {
  const { user, role, loading } = useAuthContext();
  if (loading || role === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().trim();
  if (r !== "delivery" && r !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const RequireAdmin = () => {
  const { user, role, loading } = useAuthContext();
  if (loading || role === null) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().replace(/\s/g, "");
  if (r !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

/* ================= LAYOUT ================= */

const MainLayout = () => (
  <>
    <Navbar />
    <Outlet />
  </>
);

/* ================= ADMIN LAYOUT ================= */

const AdminLayout = () => (
  <div className="flex h-screen overflow-hidden bg-[#fdf6f0]">
    <aside className="w-72 bg-[#5a2d0c] text-white flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Xotic Admin</h2>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <nav className="space-y-3 text-sm font-medium">
          <AdminLink to="/admin" label="Dashboard" />
          <AdminLink to="/admin/users" label="Users" />

          <Section label="Catalog" />
          <AdminLink to="/admin/products" label="Products" />
          <AdminLink to="/admin/categories" label="Categories" />
          <AdminLink to="/admin/kitchens" label="Kitchens" />

          <Section label="Orders" />
          <AdminLink to="/admin/orders" label="Orders" />

          <Section label="Operations" />
          <AdminLink to="/admin/kitchen-dashboard" label="Kitchen Dashboard" />
          <AdminLink to="/admin/delivery-dashboard" label="Delivery Dashboard" />
          <AdminLink to="/admin/refunds" label="Refunds" />

          <Section label="System" />
          <AdminLink to="/admin/coupons" label="Coupons" />
          <AdminLink to="/admin/pincodes" label="Pincodes" />
          <AdminLink to="/admin/payments" label="Payments" />
        </nav>
      </div>
    </aside>

    <main className="flex-1 p-8 overflow-y-auto">
      <Outlet />
    </main>
  </div>
);

const Section = ({ label }: { label: string }) => (
  <div className="pt-4 text-xs text-orange-200 uppercase">{label}</div>
);

const AdminLink = ({ to, label }: { to: string; label: string }) => (
  <NavLink
    to={to}
    end={to === "/admin"}
    className={({ isActive }) =>
      `block px-3 py-2 rounded ${
        isActive ? "bg-[#6d4c41]" : "hover:bg-[#6d4c41]"
      }`
    }
  >
    {label}
  </NavLink>
);

/* ================= APP ================= */

export default function App() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    setClerkTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken, isLoaded]);

  if (!isLoaded) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>

        {/* MAIN */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          <Route path="/products" element={<ProductList />} />
          <Route path="/products/:id" element={<ProductDetail />} />

          <Route element={<RequireAuth />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/transactions" element={<Transactions />} />
          </Route>

          {/* ================= KITCHEN ================= */}

          <Route element={<RequireKitchen />}>
            <Route path="/kitchen">
              <Route index element={<Navigate to="orders" />} />
              <Route path="orders" element={<KitchenOrders />} />
            </Route>
          </Route>

          {/* 🔥 ADMIN ONLY */}
          <Route element={<RequireKitchenAdmin />}>
            <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
          </Route>

          {/* ================= DELIVERY ================= */}

          <Route element={<RequireDelivery />}>
            <Route path="/delivery">
              <Route index element={<Navigate to="orders" />} />
              <Route path="orders" element={<DeliveryOrders />} />
              <Route path="dashboard" element={<DeliveryDashboard />} />
            </Route>
          </Route>

        </Route>

        {/* ================= ADMIN ================= */}

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="kitchens" element={<AdminKitchens />} />
            <Route path="kitchen-dashboard" element={<AdminKitchenDashboard />} />
            <Route path="delivery-dashboard" element={<DeliveryDashboard />} />
            <Route path="refunds" element={<AdminRefunds />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="pincodes" element={<AdminPincodes />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}