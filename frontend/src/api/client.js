const BASE = "/api/v1";

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
