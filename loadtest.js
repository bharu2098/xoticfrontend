import http from "k6/http";
import { sleep, check } from "k6";

// =====================================
// 🔥 CONFIG
// =====================================
export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "1m", target: 100 },
        { duration: "2m", target: 300 },
        { duration: "2m", target: 600 },
        { duration: "2m", target: 1000 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
      exec: "browse",
    },

    checkout: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "2m", target: 150 },
        { duration: "2m", target: 300 },
        { duration: "2m", target: 500 },
        { duration: "2m", target: 500 },
        { duration: "1m", target: 0 },
      ],
      exec: "checkout",
    },

    admin: {
      executor: "constant-vus",
      vus: 2,
      duration: "10m",
      exec: "adminFlow",
    },
  },

  thresholds: {
    checks: ["rate>0.9"],
    http_req_failed: ["rate<0.1"],        // 🔥 FIXED (was 0.5)
    http_req_duration: ["p(95)<1500"],    // 🔥 tighter SLA
  },
};

// =====================================
// 🔥 BASE URL
// =====================================
const BASE_URL = "http://127.0.0.1:8000";

// =====================================
// 🔥 TOKENS (EXPANDED SUPPORT)
// =====================================

// ✅ KEEP YOUR TOKENS (UNCHANGED)
const TOKENS = [
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ...",
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ...",
];

// 🔥 AUTO SCALE USERS (NO REMOVAL)
const USER_DATA = TOKENS.map((t) => ({ token: t }));

const USER_MAP = {};

// 🔥 FIXED USER DISTRIBUTION
function getUser(isAdmin = false) {
  if (isAdmin) return USER_DATA[1];

  if (!USER_MAP[__VU]) {
    USER_MAP[__VU] = USER_DATA[__VU % USER_DATA.length];
  }

  return USER_MAP[__VU];
}

function getHeaders(user) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${user.token}`,
  };
}

// =====================================
// 🔥 GLOBAL CACHES (NEW - NO REMOVAL)
// =====================================
let cachedProducts = null;
const ADDRESS_CACHE = {};

// =====================================
// 🔥 HELPERS
// =====================================
function safeJSON(res) {
  try {
    return res.json();
  } catch {
    console.log("❌ JSON parse failed:", res.body);
    return null;
  }
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================
// 🔥 PRODUCT CACHE (NEW)
// =====================================
function getProducts(headers) {
  if (!cachedProducts) {
    const res = http.get(`${BASE_URL}/api/products/`, { headers });
    const data = safeJSON(res);
    cachedProducts = data?.results || data;
  }
  return cachedProducts;
}

// =====================================
// 🔥 CLEAR CART (OPTIMIZED)
// =====================================
function clearCart(headers) {
  // 🔥 reduce DB pressure
  if (__ITER % 5 === 0) {
    http.del(`${BASE_URL}/api/cart/`, null, { headers });
  }
}

// =====================================
// 🔥 ADDRESS (OPTIMIZED)
// =====================================
function getUserAddress(headers) {
  const userKey = __VU;

  if (ADDRESS_CACHE[userKey]) return ADDRESS_CACHE[userKey];

  const res = http.get(`${BASE_URL}/api/orders/addresses/`, { headers });

  if (res.status !== 200) {
    console.log("❌ Address fetch failed:", res.status);
    return null;
  }

  const data = safeJSON(res);
  if (!data) return null;

  let addresses = [];

  if (Array.isArray(data)) addresses = data;
  else if (data.results) addresses = data.results;
  else if (data.data) addresses = data.data;

  if (!addresses.length) {
    console.log("❌ No valid address in DB");
    return null;
  }

  ADDRESS_CACHE[userKey] = addresses[0].id;
  return addresses[0].id;
}

// =====================================
// 🔥 BROWSE FLOW
// =====================================
export function browse() {
  const user = getUser();
  const headers = getHeaders(user);

  http.get(`${BASE_URL}/api/products/`, { headers });
  http.get(`${BASE_URL}/api/products/categories/`, { headers });

  sleep(Math.random() * 2);
}

// =====================================
// 🔥 CHECKOUT FLOW (OPTIMIZED)
// =====================================
export function checkout() {
  const user = getUser();
  const headers = getHeaders(user);

  console.log(`🧪 USER ${__VU}`);

  // 🔥 USE CACHE
  const products = getProducts(headers);
  if (!products?.length) return;

  const product = randomItem(products);

  clearCart(headers);
  sleep(0.5);

  http.post(
    `${BASE_URL}/api/cart/items/`,
    JSON.stringify({
      product_id: product.id,
      quantity: 1,
    }),
    { headers }
  );

  sleep(1);

  const cartRes = http.get(`${BASE_URL}/api/cart/`, { headers });
  const cartData = safeJSON(cartRes);

  if (!cartData?.items?.length) return;

  const addressId = getUserAddress(headers);

  if (!addressId) {
    console.log("❌ No usable address");
    return;
  }

  let checkoutRes;

  // 🔥 CONTROLLED RETRY (NEW)
  for (let i = 0; i < 2; i++) {
    checkoutRes = http.post(
      `${BASE_URL}/api/orders/checkout/`,
      JSON.stringify({
        address_id: addressId,
        payment_method: "COD",
      }),
      { headers }
    );

    if (
      checkoutRes.status === 400 &&
      checkoutRes.body.includes("Cart recreated")
    ) {
      sleep(0.5);
      continue;
    }

    break;
  }

  // ✅ CHECK
  check(checkoutRes, {
    "checkout success or acceptable": (r) =>
      [200, 201].includes(r.status) ||
      r.body.includes("Delivery not available") ||
      r.body.includes("Cart recreated"),
  });

  const success =
    [200, 201].includes(checkoutRes.status) ||
    checkoutRes.body.includes("Delivery not available") ||
    checkoutRes.body.includes("Cart recreated");

  if (success) {
    console.log(`✅ OK USER ${__VU}`);
  } else {
    console.log("❌ STATUS:", checkoutRes.status);
    console.log("❌ RESPONSE:", checkoutRes.body.substring(0, 300));
  }

  sleep(1);
}

// =====================================
// 🔥 ADMIN FLOW
// =====================================
export function adminFlow() {
  const user = getUser(true);
  const headers = getHeaders(user);

  http.get(`${BASE_URL}/api/orders/admin/kitchen-dashboard/`, { headers });
  http.get(`${BASE_URL}/api/orders/admin/analytics/`, { headers });
  http.get(`${BASE_URL}/api/orders/admin/refunds/`, { headers });

  sleep(1);
}