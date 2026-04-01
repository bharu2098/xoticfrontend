import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

interface Withdrawal {
  id: number;
  amount: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

interface WithdrawalResponse {
  available_balance: string;
  withdrawals: Withdrawal[];
}

// ✅ DevTunnel-safe base
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export default function Withdrawal() {

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [amount, setAmount] = useState<string>("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState<string>("0");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // ==============================
  // 🔐 TOKEN HELPER (ADDED)
  // ==============================
  const getClerkToken = async () => {

    let token: string | null = null;

    for (let i = 0; i < 3; i++) {
      try {
        token = await getToken({ template: "default" });
        if (token) break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return token;
  };

  // ==============================
  // 📦 FETCH WITHDRAWALS (SAFE)
  // ==============================
  const fetchWithdrawals = async () => {

    if (!isLoaded || !isSignedIn) return;

    try {

      setLoading(true);

      const token = await getClerkToken();

      if (!token) {
        console.error(" No token");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/orders/delivery/my-withdrawals/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      let data: WithdrawalResponse;

      try {
        data = text
          ? JSON.parse(text)
          : { available_balance: "0", withdrawals: [] };
      } catch {
        data = { available_balance: "0", withdrawals: [] };
      }

      if (!res.ok) {
        console.error(" Fetch failed:", data);
        return;
      }

      setWithdrawals(Array.isArray(data.withdrawals) ? data.withdrawals : []);
      setBalance(data.available_balance || "0");

    } catch (err) {

      console.error(" Withdrawal fetch error:", err);

    } finally {

      setLoading(false);

    }
  };

  // ==============================
  // 🔄 EFFECT
  // ==============================
  useEffect(() => {

    if (isLoaded && isSignedIn) {
      fetchWithdrawals();
    }

  }, [isLoaded, isSignedIn]);

  // ==============================
  // 💸 REQUEST WITHDRAW
  // ==============================
  const requestWithdraw = async () => {

    const numAmount = Number(amount);

    if (processing) return;

    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      console.error("Invalid amount");
      return;
    }

    if (numAmount > Number(balance)) {
      console.error("Amount exceeds balance");
      return;
    }

    try {

      setProcessing(true);

      const token = await getClerkToken();

      if (!token) {
        console.error(" No token");
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/orders/delivery/request-withdrawal/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: numAmount }),
        }
      );

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        console.error(" Withdraw failed:", data);
        return;
      }

      setAmount("");

      await fetchWithdrawals();

    } catch (err) {

      console.error(" Withdraw request error:", err);

    } finally {

      setProcessing(false);

    }
  };

  // ==============================
  // ⏳ LOADING
  // ==============================
  if (!isLoaded || loading) {
    return (
      <div className="p-8 text-lg font-semibold">
        Loading withdrawals...
      </div>
    );
  }

  // ==============================
  // 🧱 UI
  // ==============================
  return (

    <div className="p-8 space-y-6">

      <h1 className="text-2xl font-bold">Withdraw Earnings</h1>

      <div className="p-6 space-y-4 bg-white rounded shadow">

        <p>Available Balance: ₹{Number(balance) || 0}</p>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-2 border rounded"
        />

        <button
          onClick={requestWithdraw}
          disabled={processing || Number(amount) <= 0}
          className={`px-4 py-2 text-white rounded ${
            processing
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {processing ? "Processing..." : "Request Withdrawal"}
        </button>

      </div>

      <div className="p-6 bg-white rounded shadow">

        <h2 className="mb-4 font-semibold">Withdrawal History</h2>

        {withdrawals.length > 0 ? (

          withdrawals.map((w) => (

            <div
              key={w.id}
              className="flex justify-between py-2 border-b"
            >

              <span>₹{Number(w.amount) || 0}</span>

              <span>{w.status}</span>

            </div>

          ))

        ) : (

          <p className="text-gray-500">No withdrawals yet</p>

        )}

      </div>

    </div>
  );
}