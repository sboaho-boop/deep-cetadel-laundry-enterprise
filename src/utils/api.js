/* eslint-disable no-unused-vars, import/no-anonymous-default-export */
import { db, auth, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, collection, getDoc, sendPasswordResetEmail } from "../firebase";

// ── Local Storage Helpers (fallback) ─────────────────────────────────
const LS_KEYS = {
  ORDERS: "dcl_orders",
  STAFF: "dcl_staff", 
  SERVICES: "dcl_services",
  META: "dcl_meta"
};

// Load orders - try Firebase first, fallback to localStorage
export const loadOrders = () => JSON.parse(localStorage.getItem(LS_KEYS.ORDERS) || "[]");
export const saveOrders = async (orders) => {
  localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
  // Also save to Firebase
  try {
    const batch = orders.map(o => addDoc(collection(db, "orders"), { ...o, updatedAt: new Date().toISOString() }));
    await Promise.all(batch);
  } catch (e) {
    console.log("Firebase orders sync error:", e);
  }
};

export const loadStaff = () => {
  const stored = localStorage.getItem(LS_KEYS.STAFF);
  if (stored) {
    const staff = JSON.parse(stored);
    // Ensure owner exists with correct credentials
    if (!staff.some(s => s.email === "owner@deepcitadel.com")) {
      staff.push({ id: "owner1", name: "Owner", email: "owner@deepcitadel.com", password: "owner123", role: "owner", active: true, createdAt: new Date().toISOString() });
      localStorage.setItem(LS_KEYS.STAFF, JSON.stringify(staff));
    }
    return staff;
  }
  const defaultStaff = [{ id: "owner1", name: "Owner", email: "owner@deepcitadel.com", password: "owner123", role: "owner", active: true, createdAt: new Date().toISOString() }];
  localStorage.setItem(LS_KEYS.STAFF, JSON.stringify(defaultStaff));
  return defaultStaff;
};
export const saveStaff = async (staff) => {
  localStorage.setItem(LS_KEYS.STAFF, JSON.stringify(staff));
  // Save to Firebase
  try {
    // Clear and re-add
    const existing = await getDocs(collection(db, "staff"));
    const deletePromises = existing.docs.map(d => deleteDoc(doc(db, "staff", d.id)));
    await Promise.all(deletePromises);
    const addPromises = staff.map(s => addDoc(collection(db, "staff"), s));
    await Promise.all(addPromises);
  } catch (e) {
    console.log("Firebase staff sync error:", e);
  }
};
export const loadServices = () => JSON.parse(localStorage.getItem(LS_KEYS.SERVICES) || "[]");
export const saveServices = (services) => localStorage.setItem(LS_KEYS.SERVICES, JSON.stringify(services));
export const loadMeta = () => JSON.parse(localStorage.getItem(LS_KEYS.META) || "{}");
export const saveMeta = (meta) => localStorage.setItem(LS_KEYS.META, JSON.stringify(meta));

// ── Setup API ────────────────────────────────────────────────────────
export const setupAPI = {
  checkAdmin: async () => {
    try {
      const snapshot = await getDocs(collection(db, "staff"));
      const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const hasOwner = staff.some(s => s.role === "owner");
      return { has_owner: hasOwner };
    } catch (e) {
      const localStaff = loadStaff();
      const hasOwner = localStaff.some(s => s.role === "owner");
      return { has_owner: hasOwner };
    }
  },

  createAdmin: async (data) => {
    try {
      await addDoc(collection(db, "staff"), {
        name: data.username,
        email: data.email,
        password: data.password,
        role: "owner",
        active: true,
        createdAt: new Date().toISOString()
      });
      return { success: true };
    } catch (e) {
      throw new Error("Failed to create admin");
    }
  },

  getServices: async () => {
    try {
      const snapshot = await getDocs(collection(db, "services"));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
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
    // Check Firebase Auth first
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: { email: result.user.email, name: result.user.displayName || "Owner" } };
    } catch (authError) {
      // Fallback to localStorage for demo accounts
      const staff = loadStaff().find(s => s.email.toLowerCase() === email.toLowerCase() && s.password === password && s.active !== false);
      if (staff) return { success: true, user: { email: staff.email, name: staff.name } };
      throw new Error("Invalid credentials");
    }
  },

  signup: async (email, password, name) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, "staff"), {
        email,
        name: name || "Owner",
        role: "owner",
        active: true,
        createdAt: new Date().toISOString()
      });
      return { success: true, user: result.user };
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Email already registered");
      }
      throw new Error(error.message);
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.log("Logout error:", e);
    }
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