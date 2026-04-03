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
        { duration: "30s", target: 50 },
        { duration: "1m", target: 150 },
        { duration: "2m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      exec: "browse",
    },

    checkout: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "1m", target: 80 },
        { duration: "30s", target: 0 },
      ],
      exec: "checkout",
    },

    admin: {
      executor: "constant-vus",
      vus: 5,
      duration: "2m",
      exec: "adminFlow",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

// =====================================
// 🔥 BASE URL
// =====================================
const BASE_URL = "https://xjxxn6wc-8000.inc1.devtunnels.ms";

// =====================================
// 🔥 CLERK TOKENS (PUT REAL TOKENS)
// =====================================
const TOKENS = [
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MjAwNjUxLCJpYXQiOjE3NzUxOTQ2NTEsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6ImZlZmVmYTlmNzY0Y2FmNzhhM2IyIiwibmJmIjoxNzc1MTk0NjQ2LCJzdWIiOiJ1c2VyXzNCbDZRYkZyMk93em9VMzk5MXlaYmpqMk0yRSJ9.X0b6eU7rKZ3nMeySAq7N2HzKwZSnPbp47bZd7UZhsdlj8oXzAjAR4SM1y01NRKugRZov1REhQHQaGdWBykAdOX9wPuaUNAwGJDhtvnIMKrQaFUScqPDYcgxI7IiTRbWntHsNq7hpXIXKEs38SMoP7VGRdZnQaORqXj4beOmmF1DLOmMRnTrZIt_rfCsiHVe5e0tQX5WeWFT_zYkMB72Spc2AE7XcuRFqii98FPSQ129K0ayspPI9-0odNljgPildWj-WsCeLv9xHPE5_FcWTSttQO_tipN7lBOl94RHkZExbTDVGE2ayHMTHydDoffJnaGjx4-ql5MZVjKTbsu0b8Q",
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MjAwNjgxLCJpYXQiOjE3NzUxOTQ2ODEsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6ImQ0OWU1YmRiZTBjZGVmZTRhMGY4IiwibmJmIjoxNzc1MTk0Njc2LCJzdWIiOiJ1c2VyXzNCbDczdWRxNmNuTGhiMEpiQ0pDWWpSZU40aiJ9.Fqx5oYapFGG-Se0k94OGy8T7BZc2Kz0w--IaFl7U_thKMwM59l51eS8IHMVe8EV6JA4aw1vbN3tuHlHgbEBzxANIFqIzqbi9F3_C2Oz7UxJGkIgx8FuAmj0z8RmTrFqaDVMt4RN6HTzc4RIZGXEFsJkoyc-zuE5MaMG-kVFCLWoVLbo-Mnq3z0ZEKPoZI-T8zLg92Ao65YSQ6mCgx6wi3miSLzDiUPhKkP0ymWyUzChS48BCiYy2n2610X7c0Z6FIQvE7VTSTrvFTkH9vma_jNHbHZcjIqGEQOFRA78CIsGoqBO6XLGGOx5kg9Zk_JBs7l_clzsOxv9iPgIGKRjKyQ",
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MjAwNzE4LCJpYXQiOjE3NzUxOTQ3MTgsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6IjhiZGU0MGMwNTVlNGUyNzYzNzdmIiwibmJmIjoxNzc1MTk0NzEzLCJzdWIiOiJ1c2VyXzNCQnk4S0RWczBES0JyM0hHaEFBWmdGN0oyWCJ9.jP_-4Dkm5qDkXZX-y1qyt2GgDMyqEavFI8AHjzefhD7RqThRvw-X91Kxb2x8bTU8tEkaoKzYkmKk_Mue5DpOPc6oGRyi51h7p7IRhJilPfg8XOc5syODA0qUCzUGz_VjALZWG3By20Ty1cRpWdCnkrMYQ-bTxlO1y4UlUB9FeIrO2T8p2xQ-miJfSn64kwW29eEHQGaXOJpXuL0ldbOO1bBqVfa6CzQZUZAN0qXFdx11OkdTyu1Oae5zcQOSwlO3W7WvoZwHfDuNua-8NgCgXLuVAFnlqZwBIQ01omMXSiV3t3grIC3hgA7RvB-WqbztG109UZ1LOUrpl042v-LWpA",
];

// =====================================
// 🔥 HEADERS
// =====================================
function getHeaders(isAdmin = false) {
  const token = isAdmin
    ? TOKENS[2]
    : TOKENS[__VU % 2]; // rotate between 2 customers

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================
// 🔥 BROWSE FLOW
// =====================================
export function browse() {
  const headers = getHeaders();

  const res1 = http.get(`${BASE_URL}/api/products/`, { headers });
  const res2 = http.get(`${BASE_URL}/api/products/categories/`, {
    headers,
  });

  check(res1, {
    "products OK": (r) => r.status === 200,
  });

  check(res2, {
    "categories OK": (r) => r.status === 200,
  });

  sleep(Math.random() * 2);
}

// =====================================
// 🔥 CHECKOUT FLOW
// =====================================
export function checkout() {
  const headers = getHeaders();

  // 1️⃣ Get products
  const productRes = http.get(`${BASE_URL}/api/products/`, { headers });

  if (productRes.status !== 200) return;

  const data = productRes.json();
  const products = data.results;

  if (!products || products.length === 0) return;

  const product = randomItem(products);

  // 2️⃣ Add to cart
  const addRes = http.post(
    `${BASE_URL}/api/cart/items/`,
    JSON.stringify({
      product_id: product.id,
      quantity: 1,
    }),
    { headers }
  );

  check(addRes, {
    "add to cart OK": (r) => r.status === 200 || r.status === 201,
  });

  if (addRes.status !== 200 && addRes.status !== 201) return;

  sleep(0.3);

  // 3️⃣ Get cart
  const cartRes = http.get(`${BASE_URL}/api/cart/`, { headers });

  check(cartRes, {
    "cart OK": (r) => r.status === 200,
  });

  if (cartRes.status !== 200) return;

  sleep(0.3);

  // 4️⃣ Checkout
  const checkoutRes = http.post(
    `${BASE_URL}/api/orders/checkout/`,
    JSON.stringify({
      address_id: 1, // ⚠️ ensure exists
    }),
    { headers }
  );

  check(checkoutRes, {
    "checkout OK": (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);
}

// =====================================
// 🔥 ADMIN FLOW
// =====================================
export function adminFlow() {
  const headers = getHeaders(true);

  const dash = http.get(
    `${BASE_URL}/api/orders/admin/kitchen-dashboard/`,
    { headers }
  );

  const analytics = http.get(
    `${BASE_URL}/api/orders/admin/analytics/`,
    { headers }
  );

  const refunds = http.get(
    `${BASE_URL}/api/orders/admin/refunds/`,
    { headers }
  );

  check(dash, {
    "dashboard OK": (r) => r.status === 200,
  });

  check(analytics, {
    "analytics OK": (r) => r.status === 200,
  });

  check(refunds, {
    "refunds OK": (r) => r.status === 200,
  });

  sleep(1);
}