// client/src/pages/api.js
import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4002";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (import.meta.env.MODE === "development") {
      config.headers["x-user-id"] = 1;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.resolve();
    }

    console.error(
      "API Error:",
      error.response?.data || error.message || "Unknown API error"
    );

    return Promise.reject(error);
  }
);

// // client/src/pages/api.js

// // client/src/pages/api.js
// import axios from "axios";

// // ✅ Adjust this to your backend URL
// const API_BASE_URL =
//   import.meta.env.VITE_API_BASE_URL || "http://localhost:4002";

// export const api = axios.create({
//   baseURL: API_BASE_URL,
//   withCredentials: true, // set true if using cookies/sessions later
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // ✅ Add interceptors for auth token & dev fallback
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");

//     if (token) {
//       // Send actual token
//       config.headers.Authorization = `Bearer ${token}`;
//     } else if (import.meta.env.MODE === "development") {
//       // DEV fallback: simulate admin user
//       config.headers["x-user-id"] = 1;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // ✅ Centralized response handler — CANCELED REQUESTS IGNORED
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // ⭐ Ignore cancellation errors (very common during UI re-renders)
//     if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
//       return Promise.resolve(); // Stop logging canceled requests
//     }

//     console.error(
//       "API Error:",
//       error.response?.data || error.message || "Unknown API error"
//     );

//     return Promise.reject(error);
//   }
// );
