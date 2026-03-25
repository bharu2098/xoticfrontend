import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react"; // ✅ ADDED

/* ================= AUTH TYPE FIX ================= */

interface AuthContextType {
  access: string | null;
  refreshAccessToken: () => Promise<string | null>;
  user?: {
    id?: number;
    username?: string;
    email?: string;
  };
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

/* ================= TYPES ================= */

interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  is_staff: boolean;
  is_superuser?: boolean;
  is_active: boolean;
  is_kitchen_staff: boolean;
  is_delivery_partner: boolean;
}

export default function AdminUsers() {

  const auth = useContext(AuthContext) as AuthContextType | null;
  const { getToken } = useAuth(); // ✅ CLERK

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ================= AUTH FETCH (CLERK) ================= */

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    const token = await getToken();

    if (!token) return null;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    return res;

  }, [getToken]);

  /* ================= FETCH USERS ================= */

  const fetchUsers = useCallback(async (pageUrl?: string) => {

    try {

      setLoading(true);
      setError(null);

      const url = pageUrl || `${API_BASE}/api/users/admin/users/`;

      const res = await authFetch(url);

      if (!res) throw new Error("Server unreachable");

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();

      setUsers(data?.results || data || []);
      setNextPage(data?.next || null);
      setPrevPage(data?.previous || null);

    } catch (err: any) {

      console.error(err);
      setError(err.message || "Failed to load users");

    } finally {

      setLoading(false);

    }

  }, [authFetch]);

  useEffect(() => {
    fetchUsers(); // ✅ FIXED
  }, [fetchUsers]);

  /* ================= SAFE JSON ================= */

  const safeJson = async (res: Response) => {

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }

  };

  /* ================= TOGGLE ROLE ================= */

  const toggle = async (id: number, action: string) => {

    try {

      setUpdatingId(id);
      setError(null);

      const res = await authFetch(
        `${API_BASE}/api/users/admin/users/${id}/${action}/`,
        { method: "PATCH" }
      );

      if (!res) throw new Error("Server unreachable");

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data?.error || "Update failed");
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;

          switch (action) {
            case "toggle_active":
              return { ...u, is_active: !u.is_active };
            case "toggle_kitchen":
              return { ...u, is_kitchen_staff: !u.is_kitchen_staff };
            case "toggle_delivery":
              return { ...u, is_delivery_partner: !u.is_delivery_partner };
            default:
              return u;
          }
        })
      );

    } catch (err: any) {

      console.error(err);
      setError(err.message);

    } finally {

      setUpdatingId(null);

    }

  };

  /* ================= SEARCH ================= */

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (

    <div className="p-10">

      <h2 className="text-3xl font-bold text-[#5a2d0c] mb-6">
        User Management
      </h2>

      {error && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 mb-6 border rounded-xl focus:ring-2 focus:ring-[#6d4c41]"
      />

      {loading ? (

        <p className="text-[#6d4c41] font-medium">
          Loading users...
        </p>

      ) : (

        <div className="overflow-x-auto bg-white border shadow-xl rounded-3xl">

          <table className="w-full">

            <thead className="bg-[#f3e5d8] text-[#5a2d0c]">

              <tr>
                <th className="p-4 text-left">User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Roles</th>
                <th className="text-center">Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredUsers.map((user) => {

                const isSelf = user.id === auth?.user?.id;

                return (

                  <tr key={user.id} className="border-t hover:bg-[#faf6f1]">

                    <td className="p-4 font-semibold">
                      {user.username}
                      {isSelf && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </td>

                    <td>{user.email}</td>

                    <td>
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          user.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>

                    <td className="space-x-2">
                      {user.is_superuser && (
                        <RoleBadge color="purple" label="Admin" />
                      )}
                      {user.is_kitchen_staff && (
                        <RoleBadge color="yellow" label="Kitchen" />
                      )}
                      {user.is_delivery_partner && (
                        <RoleBadge color="blue" label="Delivery" />
                      )}
                    </td>

                    <td className="text-center">

                      <div className="flex justify-center gap-2">

                        {!isSelf && !user.is_superuser && (

                          <>
                            <ActionButton
                              updating={updatingId === user.id}
                              label={user.is_active ? "Block" : "Unblock"}
                              color="bg-red-600"
                              onClick={() => toggle(user.id, "toggle_active")}
                            />

                            <ActionButton
                              updating={updatingId === user.id}
                              label="Kitchen"
                              color="bg-yellow-600"
                              onClick={() => toggle(user.id, "toggle_kitchen")}
                            />

                            <ActionButton
                              updating={updatingId === user.id}
                              label="Delivery"
                              color="bg-blue-600"
                              onClick={() => toggle(user.id, "toggle_delivery")}
                            />
                          </>

                        )}

                      </div>

                    </td>

                  </tr>

                );
              })}

            </tbody>

          </table>

          <div className="flex justify-between p-4">

            <button
              disabled={!prevPage}
              onClick={() => fetchUsers(prevPage || undefined)}
              className="px-4 py-2 bg-[#6d4c41] text-white rounded-lg disabled:opacity-50"
            >
              Previous
            </button>

            <button
              disabled={!nextPage}
              onClick={() => fetchUsers(nextPage || undefined)}
              className="px-4 py-2 bg-[#6d4c41] text-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

/* ================= BUTTON ================= */

const ActionButton = ({
  updating,
  onClick,
  label,
  color,
}: {
  updating: boolean;
  onClick: () => void;
  label: string;
  color: string;
}) => (
  <button
    disabled={updating}
    onClick={onClick}
    className={`w-[90px] px-3 py-1 text-sm text-white rounded-lg transition hover:opacity-90 disabled:opacity-50 ${color}`}
  >
    {updating ? "..." : label}
  </button>
);

/* ================= ROLE BADGE ================= */

const RoleBadge = ({
  color,
  label,
}: {
  color: string;
  label: string;
}) => {

  const colors: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700",
    yellow: "bg-yellow-100 text-yellow-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[color]}`}>
      {label}
    </span>
  );
};