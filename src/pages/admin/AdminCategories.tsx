import { useEffect, useState } from "react";
import { useApi } from "../../services/api"; // ✅ FIX

interface Kitchen {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  kitchen: number;
}

export default function AdminCategories() {

  const { apiRequest } = useApi(); // ✅ VERY IMPORTANT FIX

  const [categories, setCategories] = useState<Category[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    is_active: true,
    kitchen: ""
  });

  const pageSize = 10;

  // ================= FETCH =================

  const fetchData = async () => {
    try {

      setLoading(true); // ✅ FIX

      const [catRes, kitchenRes]: any = await Promise.all([
        apiRequest(`/kitchen/admin/categories/?page=${page}&search=${search}`),
        apiRequest(`/kitchen/admin/kitchens/`)
      ]);

      setCategories(catRes?.results || []);
      setCount(catRes?.count || 0);
      setKitchens(kitchenRes?.results || kitchenRes || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ================= CREATE =================

  const createCategory = async () => {

    if (!formData.name || !formData.kitchen) {
      alert("Name and Kitchen required");
      return;
    }

    await apiRequest("/kitchen/admin/categories/", "POST", {
      ...formData,
      kitchen: Number(formData.kitchen)
    });

    resetForm();
    fetchData();
  };

  // ================= UPDATE =================

  const updateCategory = async () => {

    if (!editingId) return;

    await apiRequest(
      `/kitchen/admin/categories/${editingId}/`,
      "PATCH",
      {
        ...formData,
        kitchen: Number(formData.kitchen)
      }
    );

    resetForm();
    fetchData();
  };

  // ================= DELETE =================

  const deleteCategory = async (id: number) => {

    if (!window.confirm("Delete this category?")) return;

    await apiRequest(`/kitchen/admin/categories/${id}/`, "DELETE");

    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // ================= TOGGLE =================

  const toggleActive = async (cat: Category) => {

    if (togglingId) return;

    const newStatus = !cat.is_active;

    setCategories(prev =>
      prev.map(c =>
        c.id === cat.id ? { ...c, is_active: newStatus } : c
      )
    );

    try {
      setTogglingId(cat.id);

      await apiRequest(
        `/kitchen/admin/categories/${cat.id}/`,
        "PATCH",
        { is_active: newStatus }
      );

    } catch {
      setCategories(prev =>
        prev.map(c =>
          c.id === cat.id ? { ...c, is_active: !newStatus } : c
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  // ================= EDIT =================

  const editCategory = (cat: Category) => {

    setEditingId(cat.id);

    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      is_active: cat.is_active,
      kitchen: String(cat.kitchen)
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ================= RESET =================

  const resetForm = () => {
    setEditingId(null);

    setFormData({
      name: "",
      slug: "",
      description: "",
      is_active: true,
      kitchen: ""
    });
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold text-[#6B2E0F]">
        Categories
      </h1>

      {/* FORM */}
      <div className="p-6 mb-6 bg-white shadow rounded-xl">

        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "Edit Category" : "Add Category"}
        </h2>

        <div className="grid grid-cols-2 gap-4">

          <select
            value={formData.kitchen}
            onChange={(e)=>setFormData({...formData,kitchen:e.target.value})}
            className="p-2 border rounded"
          >
            <option value="">Select Kitchen</option>
            {kitchens.map((k)=>(
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Name"
            value={formData.name}
            onChange={(e)=>{
              const name = e.target.value;
              setFormData({
                ...formData,
                name,
                slug: name.toLowerCase().replace(/\s+/g, "-")
              });
            }}
            className="p-2 border rounded"
          />

          <input
            placeholder="Slug"
            value={formData.slug}
            onChange={(e)=>setFormData({...formData,slug:e.target.value})}
            className="p-2 border rounded"
          />

          <div className="flex items-center gap-3">
            <label>Active</label>

            <div
              onClick={()=>setFormData({
                ...formData,
                is_active: !formData.is_active
              })}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer ${
                formData.is_active ? "bg-green-500" : "bg-gray-400"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full transform ${
                  formData.is_active ? "translate-x-6" : ""
                }`}
              />
            </div>

            <span className="text-sm">
              {formData.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e)=>setFormData({...formData,description:e.target.value})}
            className="col-span-2 p-2 border rounded"
          />

        </div>

        <button
          onClick={editingId ? updateCategory : createCategory}
          className="px-4 py-2 mt-4 text-white bg-[#6B2E0F] rounded"
        >
          {editingId ? "Update Category" : "Save Category"}
        </button>

      </div>

      <input
        type="text"
        placeholder="Search categories..."
        value={search}
        onChange={(e)=>{
          setPage(1);
          setSearch(e.target.value);
        }}
        className="w-full p-2 mb-4 border rounded"
      />

      <div className="overflow-x-auto bg-white shadow rounded-xl">

        <table className="w-full">

          <thead className="text-white bg-[#6B2E0F]">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Kitchen</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>

            {categories.map((cat)=>{

              const kitchen = kitchens.find(
                (k)=>k.id === cat.kitchen
              );

              return (

                <tr key={cat.id} className="border-t">

                  <td className="p-3">{cat.name}</td>
                  <td className="p-3">{cat.slug}</td>

                  <td className="p-3">
                    {kitchen?.name || cat.kitchen}
                  </td>

                  <td className="p-3">
                    <span className={`px-2 py-1 rounded ${
                      cat.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="flex gap-2 p-3">

                    <button
                      onClick={()=>editCategory(cat)}
                      className="px-3 py-1 text-white bg-blue-600 rounded"
                    >
                      Edit
                    </button>

                    <button
                      disabled={togglingId === cat.id}
                      onClick={()=>toggleActive(cat)}
                      className="px-3 py-1 text-white bg-yellow-500 rounded"
                    >
                      {togglingId === cat.id ? "..." : "Toggle"}
                    </button>

                    <button
                      onClick={()=>deleteCategory(cat.id)}
                      className="px-3 py-1 text-white bg-red-500 rounded"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>

      <div className="flex justify-center gap-4 mt-6">

        <button
          disabled={page === 1}
          onClick={()=>setPage(page-1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Prev
        </button>

        <span>
          Page {page} / {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={()=>setPage(page+1)}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Next
        </button>

      </div>

    </div>
  );
}