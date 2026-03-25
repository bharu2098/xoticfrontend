import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useApi } from "../services/api";

interface WalletData {
  username: string;
  balance: number;
  total_credit: number;
  total_debit: number;
}

const Wallet = () => {

  const { user } = useAuthContext();
  const { apiRequest } = useApi();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  /* =============================
     FETCH WALLET
  ============================= */

  const fetchWallet = async () => {

    if (!user) return;

    try {

      const data: WalletData = await apiRequest(`/users/wallet/`);
      setWallet(data || null);

    } catch (error) {

      console.error("Wallet fetch error:", error);
      setWallet(null);

    } finally {

      setLoading(false);

    }
  };

  /* =============================
     ADD MONEY
  ============================= */

  const addMoney = async () => {

    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) return;

    try {

      setProcessing(true);

      await apiRequest(
        `/users/wallet/add_money/`,
        "POST",
        { amount: numAmount }
      );

      setAmount("");
      fetchWallet();

    } catch (error) {

      console.error("Add money error:", error);

    } finally {

      setProcessing(false);

    }
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  /* =============================
     LOADING
  ============================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf6f0]">
        <p className="text-[#5a2d0c] text-lg font-semibold">
          Loading Wallet...
        </p>
      </div>
    );
  }

  /* =============================
     UI
  ============================= */

  return (
    <div className="min-h-screen bg-[#fdf6f0] flex items-center justify-center px-4">

      <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-3xl">

        {/* TITLE */}
        <h1 className="text-3xl font-bold text-center text-[#5a2d0c] mb-8">
          My Wallet
        </h1>

        {/* BALANCE */}
        <div className="bg-gradient-to-r from-[#5a2d0c] to-[#7a3a10] text-white rounded-2xl p-6 mb-8 shadow-xl">
          <p className="text-sm opacity-80">Available Balance</p>
          <h2 className="mt-2 text-4xl font-bold">
            ₹ {wallet?.balance ?? 0}
          </h2>
        </div>

        {/* QUICK BUTTONS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[100, 200, 500].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="py-2 bg-[#f3e4d7] text-[#5a2d0c] rounded-xl font-semibold hover:bg-[#e6d3c3] transition"
            >
              ₹ {val}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter custom amount"
          className="w-full p-3 mb-4 border border-[#e5d5c5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7a3a10]"
        />

        {/* BUTTON */}
        <button
          onClick={addMoney}
          disabled={processing || Number(amount) <= 0}
          className={`w-full py-3 font-semibold text-white rounded-xl transition duration-300 shadow-lg ${
            processing || Number(amount) <= 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#5a2d0c] hover:bg-[#4a240a]"
          }`}
        >
          {processing ? "Processing..." : "Add Money"}
        </button>

        {/* SUMMARY */}
        <div className="mt-6 text-sm text-[#5a2d0c] space-y-1">
          <p>Total Credit: ₹ {wallet?.total_credit ?? 0}</p>
          <p>Total Debit: ₹ {wallet?.total_debit ?? 0}</p>
        </div>

      </div>
    </div>
  );
};

export default Wallet;