import { NavLink, Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#fdf6f0]">

    
      <aside className="w-72 bg-[#5a2d0c] text-white shadow-2xl flex flex-col">

     
        <div className="p-6 border-b border-[#6d4c41]">
          <h1 className="text-2xl font-bold">Xotic Admin</h1>
        </div>
        <div className="flex-1 min-h-0 px-4 py-4 overflow-y-auto">

          <nav className="space-y-2 text-sm font-medium">

            <SidebarLink to="/admin" label="Dashboard" />
            <SidebarLink to="/admin/users" label="Users" />
            <SidebarLink to="/admin/products" label="Products" />
            <SidebarLink to="/admin/categories" label="Categories" />
            <SidebarLink to="/admin/kitchens" label="Kitchens" />
            <SidebarLink to="/admin/orders" label="Orders" />
            <SidebarLink to="/admin/kitchen-dashboard" label="Kitchen Dashboard" />

            
            <SidebarLink to="/admin/coupons" label="Coupons" />
            <SidebarLink to="/admin/pincodes" label="Pincodes" />
            <SidebarLink to="/admin/payments" label="Payments" />
            <SidebarLink to="/admin/refunds" label="Refunds" />

          </nav>

        </div>
      </aside>
      <main className="flex-1 p-10 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
};
const SidebarLink = ({
  to,
  label,
}: {
  to: string;
  label: string;
}) => (
  <NavLink
    to={to}
    end={to === "/admin"}
    className={({ isActive }) =>
      `block px-4 py-2 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-[#6d4c41] text-white shadow-md"
          : "text-white hover:bg-[#6d4c41]/80"
      }`
    }
  >
    {label}
  </NavLink>
);

export default AdminLayout;