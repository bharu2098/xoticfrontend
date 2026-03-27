import http from "k6/http";
import { sleep, check } from "k6";

// =====================================
// LOAD TEST CONFIG (500 USERS)
// =====================================
export const options = {
  scenarios: {
    browse: {
      executor: "constant-vus",
      vus: 450,
      duration: "1m",
      exec: "browse", // 🔥 FIX
    },

    checkout: {
      executor: "constant-vus",
      vus: 50,
      duration: "1m",
      exec: "checkout", // 🔥 FIX
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const BASE_URL = "http://127.0.0.1:8000";
const TOKEN = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18zQjk5bkhaTHoxaEx4eW1DNWRteDlwdGcxMjQiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjUxNzMiLCJleHAiOjE3NzQ0NDcyMDQsImZ2YSI6Wzc1NDAsLTFdLCJpYXQiOjE3NzQ0NDcxNDQsImlzcyI6Imh0dHBzOi8vaW1wcm92ZWQtb3Jpb2xlLTg0LmNsZXJrLmFjY291bnRzLmRldiIsIm5iZiI6MTc3NDQ0NzEzNCwic2lkIjoic2Vzc18zQkNZblFsUEJKNTJwcklRajR2d1JCaWxldkYiLCJzdHMiOiJhY3RpdmUiLCJzdWIiOiJ1c2VyXzNCQ0I4QW9JeHRLSGYyY2FyWE1tV1BqMWIydiIsInYiOjJ9.o3c4RcMM9f-L5vGOyDvQIAIfJlvA9OyZbefHpRek5p9uB5z8Yo1I_-jxUkIe_hzjsUl2D-9ov7gG0BnoE-iSNvfRtB0Ji-wDJy8pfU0pQUIKjQUojJtXqHfNDDflmUoXRtNp0sgtvvcIJX28CdSBDxlai0fz94Ur5NH6EUJ4xzx9D4hJSspFfgidBakfY-ARb-NiwZgPB8JCR2zXM0bVO_GH7WF3n6auhvGSWyqV12P_5IgO1MZEfqySpZRTPDAc5PSNQe9Cx7YWTkr1SNl78G40Nx_B9I-LvUIgag2UoirgOYh4e-xEECaW9nLPLcQHNRdcJ3BMfwRLniIVRSHGJw";

// =====================================
// HEADERS
// =====================================
function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };
}

// =====================================
// BROWSE FUNCTION (450 USERS)
// =====================================
export function browse() {
  const res1 = http.get(`${BASE_URL}/api/products/`);
  const res2 = http.get(`${BASE_URL}/api/categories/`);

  check(res1, { "products 200": (r) => r.status === 200 });
  check(res2, { "categories 200": (r) => r.status === 200 });

  sleep(Math.random() * 2);
}

// =====================================
// CHECKOUT FUNCTION (50 USERS)
// =====================================
export function checkout() {
  const headers = getHeaders();

  const addRes = http.post(
    `${BASE_URL}/api/cart/items/`,
    JSON.stringify({
      product_id: 2,
      quantity: 1,
    }),
    { headers }
  );

  check(addRes, {
    "add success": (r) => r.status === 200 || r.status === 201,
  });

  sleep(1);

  const cartRes = http.get(`${BASE_URL}/api/cart/`, { headers });

  if (cartRes.status !== 200) return;

  sleep(1);

  const checkoutRes = http.post(
    `${BASE_URL}/api/orders/checkout/`,
    JSON.stringify({
      address_id: 4,
    }),
    { headers }
  );

  check(checkoutRes, {
    "checkout success": (r) =>
      r.status === 200 || r.status === 201,
  });

  sleep(2);
}