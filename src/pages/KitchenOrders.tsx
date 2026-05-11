import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo
} from "react";

import { useAuth } from "@clerk/clerk-react";

import {
  getKitchenOrders,
  KitchenOrder
} from "../services/kitchenService";

import OrderCard from "../components/OrderCard";

// ======================================
// 🔥 WS BASE
// ======================================
const API_WS =
  import.meta.env.VITE_WS_BASE;

const KitchenOrders = () => {

  const {
    getToken,
    isLoaded,
    isSignedIn
  } = useAuth();

  // ======================================
  // 📦 STATE
  // ======================================
  const [orders, setOrders] =
    useState<KitchenOrder[]>([]);

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const itemsPerPage = 6;

  // ======================================
  // 🔌 SOCKET REFS
  // ======================================
  const socketRef =
    useRef<WebSocket | null>(null);

  const reconnectTimeoutRef =
    useRef<number | null>(null);

  const manuallyClosedRef =
    useRef(false);

  const ordersRef =
    useRef<KitchenOrder[]>([]);

  const statusRef =
    useRef(status);

  // ======================================
  // 🔄 UPDATE REFS
  // ======================================
  useEffect(() => {

    ordersRef.current =
      orders;

  }, [orders]);

  useEffect(() => {

    statusRef.current =
      status;

  }, [status]);

  // ======================================
  // 📦 LOAD ORDERS
  // ======================================
  const loadOrders = useCallback(

    async () => {

      if (!isSignedIn) return;

      try {

        if (
          ordersRef.current.length === 0
        ) {

          setLoading(true);
        }

        const data =
          await getKitchenOrders(
            statusRef.current
          );

        const safeData =
          Array.isArray(data)
            ? data
            : [];

        const formattedOrders =
          safeData.map((order: any) => ({

            ...order,

            id: Number(order.id),

            total_amount: Number(
              order.total_amount || 0
            ),

            items: Array.isArray(
              order.items
            )
              ? order.items
              : [],
          }));

        formattedOrders.sort(
          (a, b) =>
            Number(b.id) -
            Number(a.id)
        );

        setOrders(
          formattedOrders
        );

        setError(null);

      } catch (err: any) {

        console.error(
          "❌ LOAD ORDERS ERROR:",
          err
        );

        setError(
          err?.message ||
          "Failed to load orders"
        );

      } finally {

        setLoading(false);
      }
    },

    [isSignedIn]
  );

  // ======================================
  // 🚀 INITIAL LOAD
  // ======================================
  useEffect(() => {

    if (
      !isLoaded ||
      !isSignedIn
    ) {

      return;
    }

    loadOrders();

  }, [
    isLoaded,
    isSignedIn,
    loadOrders
  ]);

  // ======================================
  // 🔌 CONNECT SOCKET
  // ======================================
  const connectSocket = useCallback(

    async () => {

      try {

        if (
          !isLoaded ||
          !isSignedIn
        ) {

          return;
        }

        // ======================================
        // ❌ PREVENT DUPLICATES
        // ======================================
        if (

          socketRef.current &&

          (
            socketRef.current.readyState === WebSocket.OPEN ||

            socketRef.current.readyState === WebSocket.CONNECTING
          )

        ) {

          console.log(
            "⚠️ WS already connected"
          );

          return;
        }

        // ======================================
        // 🔥 CLEAR OLD TIMER
        // ======================================
        if (
          reconnectTimeoutRef.current
        ) {

          clearTimeout(
            reconnectTimeoutRef.current
          );
        }

        // ======================================
        // 🔐 GET TOKEN
        // ======================================
        let token: string | null =
          null;

        for (let i = 0; i < 5; i++) {

          try {

            token =
              await getToken({
                template: "default",
              });

            if (token) break;

          } catch {

            await new Promise((r) =>
              setTimeout(r, 300)
            );
          }
        }

        if (!token) {

          console.log(
            "❌ TOKEN NOT FOUND"
          );

          return;
        }

        // ======================================
        // 🔥 SOCKET URL
        // ======================================
        const socketUrl =

          `${API_WS}/ws/kitchen/?token=${encodeURIComponent(token)}`;

        console.log(
          "🔥 CONNECTING WS:",
          socketUrl
        );

        // ======================================
        // 🔌 CREATE SOCKET
        // ======================================
        const ws =
          new WebSocket(
            socketUrl
          );

        socketRef.current =
          ws;

        // ======================================
        // ✅ OPEN
        // ======================================
        ws.onopen = () => {

          console.log(
            "✅ KITCHEN WS CONNECTED"
          );
        };

        // ======================================
        // 📩 MESSAGE
        // ======================================
        ws.onmessage = (
          event
        ) => {

          try {

            console.log(
              "🔥 RAW WS:",
              event.data
            );

            const payload =
              JSON.parse(
                event.data
              );

            console.log(
              "🔥 PARSED WS:",
              payload
            );

            // ======================================
            // ❌ IGNORE CONNECTION
            // ======================================
            if (
              payload.type === "connection"
            ) {

              return;
            }

            // ======================================
            // 🔥 EXTRACT ORDER
            // ======================================
            let incomingOrder = null;

            // ✅ DIRECT ORDER
if (payload?.order?.id) {

  incomingOrder =
    payload.order;
}

// ✅ DATA IS ORDER
else if (
  payload?.data?.id
) {

  incomingOrder =
    payload.data;
}

// ✅ NESTED ORDER
else if (
  payload?.data?.order?.id
) {

  incomingOrder =
    payload.data.order;
}

            // ❌ INVALID
            if (
              !incomingOrder
            ) {

              console.log(
                "❌ INVALID ORDER PAYLOAD:",
                payload
              );

              return;
            }

            // ======================================
            // 🔥 NORMALIZE
            // ======================================
            const normalizedOrder = {

              ...incomingOrder,

              id: Number(
                incomingOrder.id
              ),

              total_amount: Number(
                incomingOrder.total_amount || 0
              ),

              items: Array.isArray(
                incomingOrder.items
              )

                ? incomingOrder.items

                : [],
            };

            console.log(
              "🆕 REALTIME ORDER:",
              normalizedOrder
            );

            // ======================================
            // 🔥 UPDATE ORDERS
            // ======================================
            setOrders((prev) => {

              const exists =
                prev.some(
                  (o) =>

                    Number(o.id) ===
                    Number(normalizedOrder.id)
                );

              let updatedOrders;

              if (exists) {

                updatedOrders =

                  prev.map((o) =>

                    Number(o.id) ===
                    Number(normalizedOrder.id)

                      ? normalizedOrder

                      : o
                  );

              } else {

                updatedOrders = [

                  normalizedOrder,

                  ...prev
                ];
              }

              updatedOrders.sort(
                (a, b) =>
                  Number(b.id) -
                  Number(a.id)
              );

              return JSON.parse(
  JSON.stringify(
    updatedOrders
  )
);
            });

            console.log(
              "✅ REALTIME UPDATED"
            );

            setCurrentPage(1);

          } catch (err) {

            console.log(
              "❌ WS MESSAGE ERROR:",
              err
            );
          }
        };

        // ======================================
        // ❌ ERROR
        // ======================================
        ws.onerror = (
          error
        ) => {

          console.log(
            "❌ WS ERROR:",
            error
          );
        };

        // ======================================
        // 🔌 CLOSE
        // ======================================
        ws.onclose = (
          event
        ) => {

          console.log(
            "❌ WS CLOSED:",
            event.code,
            event.reason
          );

          socketRef.current =
            null;

          // ======================================
          // 🔄 AUTO RECONNECT
          // ======================================
          if (
            !manuallyClosedRef.current
          ) {

            reconnectTimeoutRef.current =

              window.setTimeout(() => {

                console.log(
                  "🔄 RECONNECTING WS..."
                );

                connectSocket();

              }, 3000);
          }
        };

      } catch (err) {

        console.log(
          "❌ SOCKET ERROR:",
          err
        );
      }
    },

    [
      getToken,
      isLoaded,
      isSignedIn
    ]
  );

  // ======================================
  // 🚀 START SOCKET
  // ======================================
  useEffect(() => {

    if (
      !isLoaded ||
      !isSignedIn
    ) {

      return;
    }

    manuallyClosedRef.current =
      false;

    connectSocket();

    return () => {

      manuallyClosedRef.current =
        true;

      if (
        socketRef.current
      ) {

        socketRef.current.close();
      }

      if (
        reconnectTimeoutRef.current
      ) {

        clearTimeout(
          reconnectTimeoutRef.current
        );
      }
    };

  }, [
    connectSocket,
    isLoaded,
    isSignedIn
  ]);

  // ======================================
  // 🔍 FILTER
  // ======================================
  const filteredOrders =
    useMemo(() => {

      return orders.filter(
        (o: any) => {

          const text =
            search.toLowerCase();

          const matchesSearch = (

            String(o.id)
              .toLowerCase()
              .includes(text) ||

            String(
              o.user?.username || ""
            )
              .toLowerCase()
              .includes(text)

          );

          const matchesStatus =

            !status ||

            String(
              o.status || ""
            ).toUpperCase() ===
            status.toUpperCase();

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );

    }, [
      orders,
      search,
      status
    ]);

  // ======================================
  // 📄 PAGINATION
  // ======================================
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
        itemsPerPage
      )
    );

  const paginatedOrders =
    filteredOrders.slice(
      (currentPage - 1) *
      itemsPerPage,
      currentPage *
      itemsPerPage
    );

  // ======================================
  // 🎨 UI
  // ======================================
  return (

    <div className="min-h-screen bg-[#f3e5d8] p-8">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">

          <h1 className="text-3xl font-bold text-[#4e342e]">
            Kitchen Orders
          </h1>

          <select
            className="px-4 py-2 border border-[#c8b6a6] rounded-lg bg-white text-[#4e342e]"
            value={status}
            onChange={(e) => {

              setStatus(
                e.target.value
              );

              setCurrentPage(1);

            }}
          >

            <option value="">
              All Orders
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="CONFIRMED">
              Confirmed
            </option>

            <option value="PREPARING">
              Preparing
            </option>

            <option value="READY">
              Ready
            </option>

            <option value="OUT_FOR_DELIVERY">
              Out for Delivery
            </option>

            <option value="COMPLETED">
              Completed
            </option>

          </select>

        </div>

        <input
          type="text"
          placeholder="Search Order ID / User"
          className="w-full p-3 mb-6 border rounded-lg"
          value={search}
          onChange={(e) => {

            setSearch(
              e.target.value
            );

            setCurrentPage(1);

          }}
        />

        {loading && (

          <div className="text-center text-[#6d4c41]">
            Loading orders...
          </div>

        )}

        {error && !loading && (

          <div className="font-semibold text-center text-red-600">
            {error}
          </div>

        )}

        {!loading &&
          !error &&
          filteredOrders.length === 0 && (

            <div className="p-10 text-center bg-[#faf6f1] border shadow rounded-2xl">

              <h3 className="text-lg font-semibold text-[#4e342e]">
                No orders found
              </h3>

            </div>

          )}

        {!loading &&
          !error &&
          filteredOrders.length > 0 && (

            <>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

                {paginatedOrders.map(
                  (order) => (

                    <OrderCard
                      key={order.id}
                      order={order}
                    />

                  )
                )}

              </div>

              <div className="flex items-center justify-center gap-2 mt-6">

                <button
                  type="button"
                  disabled={
                    currentPage === 1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (p) => p - 1
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Prev
                </button>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, i) => (

                    <button
                      type="button"
                      key={i}
                      onClick={() =>
                        setCurrentPage(
                          i + 1
                        )
                      }
                      className={`px-3 py-1 rounded ${
                        currentPage === i + 1
                          ? "bg-[#5a2d0c] text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      {i + 1}
                    </button>

                  )
                )}

                <button
                  type="button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (p) => p + 1
                    )
                  }
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>

              </div>

            </>

          )}

      </div>

    </div>
  );
};

export default KitchenOrders;