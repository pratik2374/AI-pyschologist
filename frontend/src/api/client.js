// In dev we rely on the Vite proxy (`/api` → localhost:4000).
// In production you can set VITE_API_URL to your hosted backend, e.g.
// VITE_API_URL="https://ai-pyschologist-node-server.onrender.com/api/v1"
const BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "/api/v1";

const request = async (path, options = {}) => {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const api = {
  // Auth
  generateOTP: (email) => request("/generateotp", { method: "POST", body: JSON.stringify({ email }) }),
  signup: (body) => request("/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (email, password) => request("/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  resetPasswordLink: (email) =>
    request("/resetPasswordLink", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword, confirmPassword) =>
    request(`/resetPassword/${token}`, {
      method: "POST",
      body: JSON.stringify({ newPassword, confirmPassword }),
    }),

  // Chat (protected)
  getPastChats: () => request("/pastChat"),
  getChatSession: (sessionId) => request(`/chatSession/${encodeURIComponent(sessionId)}`),
  sendMessage: (query, sessionId) =>
    request("/currChat", { method: "POST", body: JSON.stringify({ query, sessionId }) }),
  generateSessionId: () => request("/generateSessionId"),
};
