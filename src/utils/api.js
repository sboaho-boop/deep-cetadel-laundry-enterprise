import { supabaseFetch } from "../supabase";

const LS_KEYS = { ORDERS: "dcl_orders", STAFF: "dcl_staff", SERVICES: "dcl_services", META: "dcl_meta" };
const get = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return []; } };
const set = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const loadOrders = () => get(LS_KEYS.ORDERS);
export const saveOrders = async (orders) => {
  set(LS_KEYS.ORDERS, orders);
  try {
    try { await supabaseFetch("orders", "DELETE"); } catch(e) {}
    for (const o of orders) await supabaseFetch("orders", "POST", o);
  } catch (e) { console.log("Supabase save error:", e); }
};

export const loadStaff = () => { const s = get(LS_KEYS.STAFF); return s.length ? s : [{ id: "1", name: "Owner", email: "owner@deepcitadel.com", password: "owner123", role: "owner", active: true }]; };
export const saveStaff = async (staff) => {
  set(LS_KEYS.STAFF, staff);
  try {
    try { await supabaseFetch("staff", "DELETE"); } catch(e) {}
    for (const s of staff) await supabaseFetch("staff", "POST", s);
  } catch (e) { console.log("Supabase save error:", e); }
};

export const loadServices = () => get(LS_KEYS.SERVICES);
export const saveServices = (services) => set(LS_KEYS.SERVICES, services);
export const loadMeta = () => get(LS_KEYS.META);
export const saveMeta = (meta) => set(LS_KEYS.META, meta);

export const setupAPI = {
  checkAdmin: async () => {
    try {
      const staff = await supabaseFetch("staff");
      return { has_owner: staff.some(s => s.role === "owner") };
    } catch (e) {
      return { has_owner: loadStaff().some(s => s.role === "owner") };
    }
  },
  createAdmin: async (data) => {
    try {
      await supabaseFetch("staff", "POST", { ...data, role: "owner", active: true });
      return { success: true };
    } catch (e) {
      throw new Error("Failed to create admin");
    }
  },
  getServices: async () => {
    try { return await supabaseFetch("services"); } catch (e) { return loadServices(); }
  },
  getOrders: async () => {
    try { return await supabaseFetch("orders"); } catch (e) { return loadOrders(); }
  },
  getStaff: async () => {
    try { return await supabaseFetch("staff"); } catch (e) { return loadStaff(); }
  }
};

export const adminAPI = {
  login: async (email, password) => {
    try {
      const staff = await supabaseFetch("staff");
      const found = staff.find(s => s.email === email && s.password === password && s.active);
      if (found) return { success: true, user: { email: found.email, name: found.name } };
    } catch (e) { console.log(e); }
    const local = loadStaff().find(s => s.email === email && s.password === password && s.active);
    if (local) return { success: true, user: { email: local.email, name: local.name } };
    throw new Error("Invalid credentials");
  },
  createOrder: async (orderData) => {
    try { return await supabaseFetch("orders", "POST", orderData); } catch (e) {
      const o = { ...orderData, id: Date.now().toString() };
      const orders = [...loadOrders(), o];
      await saveOrders(orders);
      return { success: true, id: o.id };
    }
  },
  updateOrder: async (id, updates) => {
    try { return await supabaseFetch("orders?id=eq." + id, "PATCH", updates); } catch (e) {
      const orders = loadOrders().map(o => o.id === id ? { ...o, ...updates } : o);
      await saveOrders(orders);
      return { success: true };
    }
  },
  createStaff: async (staffData) => {
    try { return await supabaseFetch("staff", "POST", staffData); } catch (e) {
      const s = [...loadStaff(), { ...staffData, id: Date.now().toString() }];
      await saveStaff(s);
      return { success: true };
    }
  },
  updateStaff: async (id, updates) => {
    try { return await supabaseFetch("staff?id=eq." + id, "PATCH", updates); } catch (e) {
      const staff = loadStaff().map(s => s.id === id ? { ...s, ...updates } : s);
      await saveStaff(staff);
      return { success: true };
    }
  }
};

export const userAPI = {
  trackOrder: async (invoiceNumber) => {
    try {
      const orders = await supabaseFetch("orders?invoiceNumber=eq." + invoiceNumber);
      if (orders.length) return { success: true, order: orders[0] };
    } catch (e) { console.log(e); }
    const o = loadOrders().find(w => w.invoiceNumber === invoiceNumber);
    if (o) return { success: true, order: o };
    throw new Error("Order not found");
  },
  submitPayment: async (invoice, data) => {
    try {
      await adminAPI.updateOrder(invoice, { payment: data, paymentStatus: "confirmed" });
      return { success: true };
    } catch (e) {
      throw new Error("Payment failed");
    }
  }
};