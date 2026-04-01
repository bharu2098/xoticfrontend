import http from "k6/http";
import { sleep, check } from "k6";

// =====================================
// CONFIG
// =====================================
export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 5,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "30s", target: 40 },
        { duration: "1m", target: 60 },
        { duration: "30s", target: 0 },
      ],
      exec: "browse",
    },

    checkout: {
      executor: "ramping-vus",
      startVUs: 2,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "30s", target: 10 },
        { duration: "30s", target: 0 },
      ],
      exec: "checkout",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

// =====================================
// GLOBALS
// =====================================
const BASE_URL = "https://xjxxn6wc-8000.inc1.devtunnels.ms";

// 🔥 MULTIPLE TOKENS
const TOKENS = [
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MDYyODA2LCJpYXQiOjE3NzUwNTY4MDYsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6IjhlYWMwN2ZhYjI3MjRjMTAzNGYxIiwibmJmIjoxNzc1MDU2ODAxLCJzdWIiOiJ1c2VyXzNCbDZRYkZyMk93em9VMzk5MXlaYmpqMk0yRSJ9.CY0XJNpvTNHs13fYLCKK-36m0jwy5hnHI-54AJrhgRR9MqFv0x4QhZnSdk0aj9u-kFtpr3pwKhUKt9nDx8os0nC9c37s8XPX8het3ALKLE4BugqZz4lzALGYukhojIpgagQxiXO1Do2_hX4KhbNMG3AmlN3CR90K6_gCbU6qN5yveKKq6fN-YK_jK9AYTIy2_sK2df4ioeGgolSrvqaFIJmFgTnt3TdvX-Ym3DVceB2cLlwD51QaSZe0X_97Yz8mL6pLWVCbbEnV8RMhMgGhwr7Rp3rkAxiJw1hdwlfmuqkDdugtPJ7-LgpWJU9iX3LyNZk9zm6RRyGFQstDUAxPoQ",
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MDYyODQwLCJpYXQiOjE3NzUwNTY4NDAsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6IjliMzljM2VhMDJkYzMyZjMyYzAwIiwibmJmIjoxNzc1MDU2ODM1LCJzdWIiOiJ1c2VyXzNCbDczdWRxNmNuTGhiMEpiQ0pDWWpSZU40aiJ9.A900KJl9wmMfdbLz7u0AnM4SDzc4qsbTwAKKgQgk2kejGEs2eXJ738PxVwx2syyXJt4V1nV8AsX710XYAjrnpWCQSyoVbBpkENht0AmbmtYsI11x3KEKuijw1G5Y2kA2ei-WV2kGH8zO4ii9-zjmVmQY7fsonLp7U6ReY97w3z8o-c521wThbQTj8bGrnWtjwokQ0WXQovgM96gxtlzh7CykE8lDAMAsbH1j8WjYN9T7NnZZh51ulp-rnYMGfa-Ac3pPIp-IhcGee8Xlcu96cQPB5FcBQKRPb9lNAgsF4TGSfFOId3y3iC6LOKk6tEdKLUWKfUGKg70hD6ka_HYEiw",
  "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovL3hqeHhuNndjLTUxNzMuaW5jMS5kZXZ0dW5uZWxzLm1zIiwiZXhwIjoxNzc1MDYyODY3LCJpYXQiOjE3NzUwNTY4NjcsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsImp0aSI6ImZlZjA2ODlmZDc2NzlmNTE5ZjAxIiwibmJmIjoxNzc1MDU2ODYyLCJzdWIiOiJ1c2VyXzNCQnk4S0RWczBES0JyM0hHaEFBWmdGN0oyWCJ9.HQGpglR-_NtoKIGkOFc6-WTBfqxB7cpGdh9xWg6nB7z8Jv0o13Re16mUntxy58J3UGr9IAoW65-FIDm0GOWZdtbO_rSve1clvjx6E-K-AkxMC6CGofTo2fQCaAXnJbjzdVPtBbzTuKbnofbwhcp-vaFJt_toAYZGF5kKqJ8RE_yXeHmaIMimv4yk5Ct9RzHEZgiHBiSxdxEbE-VjHAc11saw95fK0oRaFOnNHTJe7wu0Qnzhc0xbt3BnpcrETIrqOCjtIxk_ihEC7DEhuVSChuY-vfPUWRlodBKxJC77f51eoD-928gQXqdMbCpy9SQEifttbjeJlNP53iBRGS5MmQ",
];

// =====================================
// GET RANDOM TOKEN
// =====================================
function getToken() {
  return TOKENS[Math.floor(Math.random() * TOKENS.length)];
}

// =====================================
// HEADERS
// =====================================
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// =====================================
// BROWSE USERS
// =====================================
export function browse() {
  const headers = getHeaders();

  const res1 = http.get(`${BASE_URL}/api/products/`, { headers });
  const res2 = http.get(`${BASE_URL}/api/products/categories/`, { headers });

  check(res1, {
    "products OK": (r) => r.status === 200,
  });

  check(res2, {
    "categories OK": (r) => r.status === 200,
  });

  if (res1.status !== 200) {
    console.log(`❌ Products failed: ${res1.status}`);
  }

  if (res2.status !== 200) {
    console.log(`❌ Categories failed: ${res2.status}`);
  }

  sleep(Math.random() * 2 + 0.5);
}

// =====================================
// CHECKOUT USERS
// =====================================
export function checkout() {
  const headers = getHeaders();

  const productId = [2,3];


  // 🔥 MULTIPLE ADDRESS IDS (important)
  const addressIds = [10, 11];
  const addressId =
    addressIds[Math.floor(Math.random() * addressIds.length)];

  // =============================
  // STEP 1: ADD TO CART
  // =============================
  const addRes = http.post(
    `${BASE_URL}/api/cart/items/`,
    JSON.stringify({
      product_id: productId,
      quantity: 1,
    }),
    { headers }
  );

  check(addRes, {
    "add to cart success": (r) =>
      r.status === 200 || r.status === 201,
  });

  if (addRes.status !== 200 && addRes.status !== 201) {
    console.log(`❌ Add to cart failed: ${addRes.status}`);
    return;
  }

  sleep(0.8);

  // =============================
  // STEP 2: GET CART
  // =============================
  const cartRes = http.get(`${BASE_URL}/api/cart/`, { headers });

  check(cartRes, {
    "cart fetched": (r) => r.status === 200,
  });

  if (cartRes.status !== 200) {
    console.log(`❌ Cart fetch failed: ${cartRes.status}`);
    return;
  }

  sleep(0.8);

  // =============================
  // STEP 3: CHECKOUT
  // =============================
  const checkoutRes = http.post(
    `${BASE_URL}/api/orders/checkout/`,
    JSON.stringify({
      address_id: addressId,
    }),
    { headers }
  );

  check(checkoutRes, {
    "checkout success": (r) =>
      r.status === 200 || r.status === 201,
  });

  if (checkoutRes.status !== 200 && checkoutRes.status !== 201) {
    console.log(`❌ Checkout failed: ${checkoutRes.status}`);
    console.log(`Response: ${checkoutRes.body}`);
  }

  sleep(1.5);
}