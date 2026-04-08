const API_BASE = process.env.REACT_APP_API_URL || "https://JoeKelly.pythonanywhere.com/api";

// Helper for fetch calls
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    credentials: "include", // Include cookies
    headers: { "Content-Type": "application/json", ...options.headers },
  };
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, mergedOptions);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    
    if (!response.ok) {
      throw new Error(data.error || data.detail || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ── Setup API ────────────────────────────────────────────────────────
export const setupAPI = {
  // Check if admin exists
  checkAdmin: () =>
    apiFetch("/admin/check/", { method: "POST" }),
  
  // Create first admin user
  createAdmin: (data) =>
    apiFetch("/admin/setup/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ── Admin API ────────────────────────────────────────────────────────
export const adminAPI = {
  login: (username, password) =>
    apiFetch("/admin/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
  
  logout: () =>
    apiFetch("/admin/logout/", { method: "POST" }),
  
  getSession: () =>
    apiFetch("/admin/auth/session/"),
  
  getDashboard: () =>
    apiFetch("/admin/dashboard/"),
  
  // Staff CRUD
  getStaff: () =>
    apiFetch("/admin/staff/"),
  
  createStaff: (data) =>
    apiFetch("/admin/staff/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  updateStaff: (id, data) =>
    apiFetch(`/admin/staff/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  deleteStaff: (id) =>
    apiFetch(`/admin/staff/${id}/`, { method: "DELETE" }),
  
  // Services CRUD
  getServices: () =>
    apiFetch("/admin/services/"),
  
  createService: (data) =>
    apiFetch("/admin/services/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  updateService: (id, data) =>
    apiFetch(`/admin/services/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  deleteService: (id) =>
    apiFetch(`/admin/services/${id}/`, { method: "DELETE" }),
  
  // Orders
  getOrders: (status) =>
    apiFetch(`/admin/orders/${status ? `?status=${status}` : ""}`),
  
  // Settings
  getSettings: () =>
    apiFetch("/admin/settings/"),
  
  updateSettings: (data) =>
    apiFetch("/admin/settings/", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ── User API ────────────────────────────────────────────────────────
export const userAPI = {
  // Customer functions
  placeOrder: (data) =>
    apiFetch("/user/orders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  submitPayment: (invoiceId, data) =>
    apiFetch(`/user/orders/${invoiceId}/pay/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  trackOrder: (invoiceId) =>
    apiFetch(`/user/track/${invoiceId}/`),
  
  // Staff functions
  getStaffOrders: (status) =>
    apiFetch(`/user/staff/orders/${status ? `?status=${status}` : ""}`),
  
  createStaffOrder: (data) =>
    apiFetch("/user/staff/orders/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  getStaffOrder: (invoiceId) =>
    apiFetch(`/user/staff/orders/${invoiceId}/`),
  
  updateStaffOrder: (invoiceId, data) =>
    apiFetch(`/user/staff/orders/${invoiceId}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  
  recordStaffPayment: (invoiceId, data) =>
    apiFetch(`/user/staff/orders/${invoiceId}/pay/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ── Toggle for API vs localStorage ────────────────────────
// Set to true when API is ready and tested
export const USE_API = true;