import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import Navbar from "./components/Navbar";
import { useAuthContext } from "./context/AuthContext";

import { setClerkTokenGetter } from "./services/kitchenService";
import { setDeliveryTokenGetter } from "./services/deliveryService";
import { setAdminTokenGetter } from "./services/adminApi";

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

import KitchenOrders from "./pages/KitchenOrders";

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
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";

// ==============================
// ⏳ LOADING
// ==============================
const LoadingScreen = () => (
  <div className="flex items-center justify-center w-full min-h-screen">
    <div className="text-lg font-semibold">Loading...</div>
  </div>
);

// ==============================
// 🔐 AUTH GUARDS
// ==============================
const RequireAuth = () => {
  const { loading } = useAuthContext();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || loading) return <LoadingScreen />;
  if (!isSignedIn) return <Navigate to="/login" replace />;

  return <Outlet />;
};

const RequireKitchen = () => {
  const { role, loading } = useAuthContext();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || loading || role === null) return <LoadingScreen />;
  if (!isSignedIn) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().trim();
  if (r !== "kitchenstaff" && r !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const RequireAdmin = () => {
  const { role, loading } = useAuthContext();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || loading || role === null) return <LoadingScreen />;
  if (!isSignedIn) return <Navigate to="/login" replace />;

  const r = role?.toLowerCase().replace(/\s/g, "");
  if (r !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
};

// ==============================
// 🧩 MAIN LAYOUT
// ==============================
const MainLayout = () => (
  <div className="w-full min-h-screen">
    <Navbar />

    <div className="w-full px-2 sm:px-4 md:px-6">
      <Outlet />
    </div>
  </div>
);

// ==============================
// 🧩 ADMIN LAYOUT
// ==============================
const Section = ({ label }: { label: string }) => (
  <div className="pt-4 text-xs text-orange-200 uppercase">{label}</div>
);

const AdminLink = ({ to, label }: any) => (
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

const AdminLayout = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#fdf6f0]">

      <button
        className="fixed z-50 p-2 text-white bg-[#5a2d0c] md:hidden top-4 left-4 rounded"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      <aside
        className={`fixed md:relative z-40 w-64 md:w-72 bg-[#5a2d0c] text-white flex flex-col h-full transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
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
            <AdminLink to="/admin/refunds" label="Refunds" />

            <Section label="System" />
            <AdminLink to="/admin/coupons" label="Coupons" />
            <AdminLink to="/admin/pincodes" label="Pincodes" />
            <AdminLink to="/admin/payments" label="Payments" />
          </nav>
        </div>
      </aside>

      {/* 🔥 FIX HERE */}
      <main className="flex-1 w-full p-4 overflow-y-visible md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

// ==============================
// 🚀 APP
// ==============================
export default function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    const getClerkToken = async () => {
      try {
        return await getToken({ template: "default" });
      } catch {
        return null;
      }
    };

    setClerkTokenGetter(getClerkToken);
    setDeliveryTokenGetter(getClerkToken);
    setAdminTokenGetter(getClerkToken);
  }, [getToken, isLoaded]);

  if (!isLoaded) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>

        <Route element={<MainLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
          </Route>

          <Route
            path="/login"
            element={
              isSignedIn ? <Navigate to="/" replace /> : <Login />
            }
          />

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

          <Route element={<RequireKitchen />}>
            <Route path="/kitchen">
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="dashboard" element={<Navigate to="/kitchen/orders" replace />} />
              <Route path="orders" element={<KitchenOrders />} />
            </Route>
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="kitchens" element={<AdminKitchens />} />
            <Route path="kitchen-dashboard" element={<AdminKitchenDashboard />} />
            <Route path="refunds" element={<AdminRefunds />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="pincodes" element={<AdminPincodes />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to={
                window.location.pathname.startsWith("/admin")
                  ? "/admin"
                  : window.location.pathname.startsWith("/kitchen")
                  ? "/kitchen/orders"
                  : "/"
              }
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}