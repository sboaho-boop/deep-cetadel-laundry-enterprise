/* eslint-disable no-unused-vars, import/no-anonymous-default-export */
// eslint-disable-next-line no-unused-vars
import { db, auth, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, collection, getDoc, sendPasswordResetEmail } from "../firebase";

const USE_API = false;

// ── Local Storage Helpers ─────────────────────────────────────────────
const LS_KEYS = {
  ORDERS: "dcl_orders",
  STAFF: "dcl_staff", 
  SERVICES: "dcl_services",
  META: "dcl_meta"
};

export const loadOrders = () => JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || "[]");
export const saveOrders = (orders) => localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
export const loadStaff = () => JSON.parse(localStorage.getItem(LS_KEYS.STAFF) || "[]");
export const saveStaff = (staff) => localStorage.setItem(LS_KEYS.STAFF, JSON.stringify(staff));
export const loadServices = () => JSON.parse(localStorage.getItem(LS_KEYS.SERVICES) || "[]");
export const saveServices = (services) => localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(services));
export const loadMeta = () => JSON.parse(localStorage.getItem(LS_KEYS.META) || "{}");
export const saveMeta = (meta) => localStorage.setItem(LS_KEYS.META, JSON.stringify(meta));

// ── Setup API ────────────────────────────────────────────────────────
export const setupAPI = {
  // Check if admin exists
  checkAdmin: async () => {
    try {
      const staff = loadStaff();
      const hasOwner = staff.some(s => s.role === "owner");
      return { has_owner: hasOwner };
    } catch (e) {
      return { has_owner: false };
    }
  },

  // Create admin/owner
  createAdmin: async (data) => {
    try {
      await adminAPI.createStaff({
        name: data.username,
        email: data.email,
        password: data.password,
        role: "owner",
        active: true
      });
      return { success: true };
    } catch (e) {
      throw new Error("Failed to create admin");
    }
  },

  // Create staff member
  createStaff: async (staffData) => {
    return adminAPI.createStaff(staffData);
  },

  getServices: async () => {
    try {
      const snapshot = await getDocs(collection(db, "services"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.log("Firebase error:", e);
      return loadServices();
    }
  },

  getOrders: async () => {
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      return loadOrders();
    }
  },

  getStaff: async () => {
    try {
      const snapshot = await getDocs(collection(db, "staff"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      return loadStaff();
    }
  }
};

// ── Admin API ────────────────────────────────────────────────────────
export const adminAPI = {
  login: async (email, password) => {
    // Only use localStorage (no Firebase)
    const staff = loadStaff().find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password && s.active !== false);
    if (staff) return { success: true, user: { email: staff.email, name: staff.name } };
    throw new Error("Invalid credentials");
  },

  createOrder: async (orderData) => {
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        ...orderData,
        createdAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (e) {
      const orders = loadOrders();
      const newOrder = { ...orderData, id: Date.now().toString(), createdAt: new Date().toISOString() };
      orders.push(newOrder);
      saveOrders(orders);
      return { success: true, id: newOrder.id };
    }
  },

  updateOrder: async (orderId, updates) => {
    try {
      await updateDoc(doc(db, "orders", orderId), updates);
      return { success: true };
    } catch (e) {
      const orders = loadOrders().map(o => o.id === orderId ? { ...o, ...updates } : o);
      saveOrders(orders);
      return { success: true };
    }
  },

  createStaff: async (staffData) => {
    try {
      await addDoc(collection(db, "staff"), {
        ...staffData,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      const staff = loadStaff();
      staff.push({ ...staffData, id: Date.now().toString(), createdAt: new Date().toISOString() });
      saveStaff(staff);
      return { success: true };
    }
  },

  signup: async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const staff = loadStaff();
      const newStaff = { name: "Owner", email, password, role: "owner", active: true, id: result.user.id, createdAt: new Date().toISOString() };
      staff.push(newStaff);
      saveStaff(staff);
      await addDoc(collection(db, "staff"), newStaff);
      return { success: true, user: result.user };
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Email already registered");
      }
      throw new Error(error.message);
    }
  },

  updateService: async (serviceId, updates) => {
    try {
      await updateDoc(doc(db, "services", serviceId), updates);
      return { success: true };
    } catch (e) {
      const services = loadServices().map(s => s.id === serviceId ? { ...s, ...updates } : s);
      saveServices(services);
      return { success: true };
    }
  }
};

// ── User API ────────────────────────────────────────────────────────
export const userAPI = {
  trackOrder: async (invoiceNumber) => {
    try {
      const snapshot = await getDocs(query(collection(db, "orders"), where("invoiceNumber", "==", invoiceNumber)));
      if (snapshot.empty) throw new Error("Order not found");
      return { success: true, order: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
    } catch (e) {
      const order = loadOrders().find(o => o.invoiceNumber === invoiceNumber);
      if (!order) throw new Error("Order not found");
      return { success: true, order };
    }
  }
};

export default { setupAPI, adminAPI, userAPI };