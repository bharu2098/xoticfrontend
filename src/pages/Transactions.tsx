import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

interface Transaction {
  id: string;
  transaction_type: "CREDIT" | "DEBIT";
  amount: string;
  description: string;
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transaction[];
}

const Transactions = () => {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const fetchTransactions = async (url?: string) => {

    if (!user) return;

    try {
      if (!url) setLoading(true);

      const endpoint = url
        ? url.replace("http://127.0.0.1:8000/api", "")
        : `/users/transactions/history/`;

      const data: PaginatedResponse = await apiRequest(endpoint);

      setTransactions((prev) =>
        url
          ? [...prev, ...(data.results || [])]
          : (data.results || [])
      );

      setNextPage(data.next || null);

    } catch (err) {

      console.error(" Transaction fetch error:", err);
      setError("Failed to load transactions");

    } finally {

      setLoading(false);
      setLoadingMore(false);

    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);
  const loadMore = () => {

    if (!nextPage || loadingMore) return;

    setLoadingMore(true);
    fetchTransactions(nextPage);
  };
  const getTypeStyle = (type: string) => {
    if (type === "CREDIT") return "text-green-600";
    if (type === "DEBIT") return "text-red-600";
    return "text-[#4e342e]";
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-[#6d4c41]">
          Loading transactions...
        </h2>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-red-500">
          {error}
        </h2>
      </div>
    );
  }
  if (!transactions.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f3e5d8]">
        <h2 className="text-lg font-semibold text-[#6d4c41]">
          No transactions found.
        </h2>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f3e5d8] py-12 px-6">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-bold text-[#4e342e] mb-10">
          Transaction History 
        </h1>

        <div className="space-y-5">

          {transactions.map((t) => (

            <div
              key={t.id}
              className="p-6 transition duration-300 bg-white shadow-md rounded-3xl hover:shadow-lg"
            >
              <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">

                <div>
                  <p className={`text-lg font-semibold ${getTypeStyle(t.transaction_type)}`}>
                    {t.transaction_type}
                  </p>

                  <p className="text-[#6d4c41] mt-1">
                    {t.description || "Transaction"}
                  </p>

                  <p className="text-sm text-[#8d6e63] mt-1">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className={`text-xl font-bold ${getTypeStyle(t.transaction_type)}`}>
                    ₹ {t.amount}
                  </p>
                </div>

              </div>
            </div>

          ))}

        </div>

        {nextPage && (
          <div className="flex justify-center mt-10">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`px-6 py-3 text-white rounded-xl shadow-lg ${
                loadingMore
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#6d4c41] hover:bg-[#5d4037]"
              }`}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}

      </div>

    </div>
  );
};

export default Transactions;