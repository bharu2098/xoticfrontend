import http from "k6/http";
import { sleep, check } from "k6";

// =====================================
// LOAD TEST CONFIG
// =====================================
export const options = {
  vus: 5, // ⚠️ keep low since you only have 1–2 users
  duration: "30s",

  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.05"],
  },
};

// =====================================
// ⚠️ USE ONLY NORMAL USER TOKENS
// (Admin may fail checkout)
// =====================================
const TOKENS = [
  "USER_TOKEN_NORMAL_1",
  // "USER_TOKEN_NORMAL_2" (optional if you have)
];

// =====================================
// TOKEN PICKER (SAFE RANDOM)
// =====================================
function getToken() {
  return TOKENS[Math.floor(Math.random() * TOKENS.length)];
}

// =====================================
// MAIN FLOW
// =====================================
export default function () {
  const token = getToken();

  if (!token) {
    console.log("❌ No token found");
    sleep(1);
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // =====================================
  // STEP 1: ADD TO CART
  // =====================================
  const addRes = http.post(
    "http://127.0.0.1:8000/api/cart/items/",
    JSON.stringify({
      product_id: 2,
      quantity: 1,
    }),
    {
      headers,
      tags: { name: "AddToCart" },
    }
  );

  const addSuccess = check(addRes, {
    "add to cart success": (r) =>
      r.status === 200 || r.status === 201,
  });

  if (!addSuccess) {
    console.log(
      "❌ ADD TO CART FAILED:",
      addRes.status,
      addRes.body
    );
    sleep(1);
    return; // 🚨 stop this iteration
  }

  // small realistic delay
  sleep(Math.random() * 0.5 + 0.2);

  // =====================================
  // STEP 2: CHECKOUT
  // =====================================
  const checkoutRes = http.post(
    "http://127.0.0.1:8000/api/orders/checkout/",
    JSON.stringify({
      address_id: 4, // ⚠️ must belong to THIS user
    }),
    {
      headers,
      tags: { name: "Checkout" },
    }
  );

  const checkoutSuccess = check(checkoutRes, {
    "checkout success": (r) =>
      r.status === 200 || r.status === 201,
  });

  if (!checkoutSuccess) {
    console.log(
      "❌ CHECKOUT FAILED:",
      checkoutRes.status,
      checkoutRes.body
    );
  }

  // =====================================
  // FINAL THINK TIME
  // =====================================
  sleep(Math.random() * 1 + 0.5);
}