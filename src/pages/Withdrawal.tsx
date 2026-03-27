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

export default function Withdrawal() {

  const { getToken, isLoaded } = useAuth();

  const [amount, setAmount] = useState<string>("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    try {
      const token = await getToken();

      if (!token) {
        console.error(" No token");
        return;
      }

      const res = await fetch(
        "http://127.0.0.1:8000/api/orders/delivery/my-withdrawals/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await res.text();

      let data: WithdrawalResponse;

      try {
        data = text ? JSON.parse(text) : { available_balance: "0", withdrawals: [] };
      } catch {
        data = { available_balance: "0", withdrawals: [] };
      }

      if (!res.ok) {
        console.error(" Fetch failed:", data);
        return;
      }

      setWithdrawals(data.withdrawals || []);
      setBalance(data.available_balance || "0");

    } catch (err) {
      console.error(" Withdrawal fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchWithdrawals();
    }
  }, [isLoaded]);

  const requestWithdraw = async () => {
    try {
      if (!amount || Number(amount) <= 0) {
        console.error("Invalid amount");
        return;
      }

      if (Number(amount) > Number(balance)) {
        console.error("Amount exceeds balance");
        return;
      }

      const token = await getToken();

      if (!token) {
        console.error(" No token");
        return;
      }

      const res = await fetch(
        "http://127.0.0.1:8000/api/orders/delivery/request-withdrawal/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount }),
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
      fetchWithdrawals();

    } catch (err) {
      console.error(" Withdraw request error:", err);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="p-8 text-lg font-semibold">
        Loading withdrawals...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">

      <h1 className="text-2xl font-bold">Withdraw Earnings</h1>

      <div className="p-6 space-y-4 bg-white rounded shadow">
        <p>Available Balance: ₹{balance}</p>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-2 border rounded"
        />

        <button
          onClick={requestWithdraw}
          className="px-4 py-2 text-white bg-blue-600 rounded"
        >
          Request Withdrawal
        </button>
      </div>

      <div className="p-6 bg-white rounded shadow">
        <h2 className="mb-4 font-semibold">Withdrawal History</h2>

        {withdrawals.length > 0 ? (
          withdrawals.map((w) => (
            <div key={w.id} className="flex justify-between py-2 border-b">
              <span>₹{w.amount}</span>
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