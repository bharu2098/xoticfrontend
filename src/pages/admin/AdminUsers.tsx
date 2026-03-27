import { useEffect, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "@clerk/clerk-react";
interface AuthContextType {
  user?: {
    id?: number;
  };
}

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

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export default function AdminUsers() {

  const auth = useContext(AuthContext) as AuthContextType | null;
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [prevPage, setPrevPage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {

    if (!isLoaded || !isSignedIn) return null;

    try {

      const token = await getToken();

      if (!token) return null;

      return await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });

    } catch (err) {

      console.error("Auth fetch error:", err);
      return null;

    }

  }, [getToken, isLoaded, isSignedIn]);
  const fetchUsers = useCallback(async (pageUrl?: string) => {

    try {

      setLoading(true);
      setError(null);

      const url = pageUrl || `${API_BASE}/api/users/admin/users/`;

      const res = await authFetch(url);

      if (!res) throw new Error("Server unreachable");

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch users");
      }

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
    fetchUsers();
  }, [fetchUsers]);
  const safeJson = async (res: Response) => {

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }

  };
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
        className="w-full p-3 mb-6 border rounded-xl"
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
                    </td>

                    <td className="text-center">

                      {!isSelf && !user.is_superuser && (

                        <div className="flex justify-center gap-2">

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

                        </div>

                      )}

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
    className={`w-[90px] px-3 py-1 text-sm text-white rounded-lg ${color}`}
  >
    {updating ? "..." : label}
  </button>
);
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
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${colors[color]}`}>
      {label}
    </span>
  );
};