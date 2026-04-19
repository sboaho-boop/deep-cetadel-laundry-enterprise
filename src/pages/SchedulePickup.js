import { useState, useEffect } from "react";
import { 
  FaTrash, FaCheck, 
  FaFileInvoice, FaHistory, FaUser, FaPhoneAlt, FaMapMarkerAlt, FaTruck 
} from "react-icons/fa";
import { userAPI } from "../utils/api";
const fmt = n => `₵${Number(n).toFixed(2)}`;
const uid = () => "INV-" + Date.now().toString().slice(-6);
const ORDERS_KEY = "dcl_orders";

const C = {
  blue: "#0077b6",
  cyan: "#00d4ff",
  purple: "#7209b7",
  pink: "#f72585",
  dark: "#0a0f2e",
  green: "#10b981",
  red: "#ef4444",
};

// ── Main App ────────────────────────────────────────────────────────────────
export default function LaundryPOS() {
  const [activeTab, setActiveTab] = useState("pos");
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem("dcl_orders") || "[]"));
  const [selections, setSelections] = useState({});
  const [customer, setCustomer] = useState({ name: "", phone: "", pickupFrom: "", deliverTo: "" });
  const [orderType, setOrderType] = useState("walkin");

  const services = [
    { name: "Wash & Fold", price: 50, color: "#4cc9f0" },
    { name: "Dry Cleaning", price: 100, color: "#4895ef" },
    { name: "Ironing Only", price: 20, color: "#4361ee" },
    { name: "Duvet/Large", price: 150, color: "#3f37c9" },
  ];

  useEffect(() => { localStorage.setItem("dcl_orders", JSON.stringify(orders)); }, [orders]);

  const deliveryFee = (orderType === "pickup" && customer.pickupFrom.trim().length > 2) ? 30 : 0;
  const subtotal = services.reduce((acc, s) => acc + (selections[s.name] || 0) * s.price, 0);
  const total = subtotal + deliveryFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customer.name || subtotal === 0) return alert("Details missing!");
    
    const invoiceNumber = uid();
    const newOrder = {
      id: invoiceNumber,
      invoiceNumber: invoiceNumber,
      customer: { name: customer.name.trim(), phone: customer.phone.trim() },
      items: services.filter(s => selections[s.name] > 0).map(s => ({ name: s.name, qty: selections[s.name], unitPrice: s.price, subtotal: selections[s.name] * s.price })),
      total: total,
      deliveryFee: deliveryFee,
      orderType: orderType,
      pickupFrom: customer.pickupFrom,
      deliverTo: customer.deliverTo,
      stage: orderType === "pickup" ? "PICKUP_SCHEDULED" : "RECEIVED",
      paymentStatus: "pending",
      paid: false,
      createdAt: new Date().toISOString(),
      createdBy: "Customer Portal"
    };
    
    // Save to localStorage (same format as Home.js)
    const updated = [newOrder, ...orders];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);
    
    // Also save to Supabase
    try {
      console.log("💾 Saving to Supabase:", newOrder.invoiceNumber);
      const result = await userAPI.createOrder(newOrder);
      console.log("✅ Saved to Supabase:", result);
    } catch (err) {
      console.log("❌ Supabase save failed:", err);
    }
    
    // Broadcast to open owner dashboards
    try {
      const bc = new BroadcastChannel("dcl_orders");
      bc.postMessage({type:"new_order", order: newOrder});
      bc.close();
    } catch(e) {}
    
    setSelections({}); setCustomer({ name: "", phone: "", pickupFrom: "", deliverTo: "" });
    setOrderType("walkin"); setActiveTab("history");
  };

  return (
    <div style={UI.mainWrapper}>
      <style>{`
        @keyframes mesh {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); }
        input::placeholder { color: #999; }
      `}</style>

      {/* Navigation */}
      <nav style={UI.nav}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "800", letterSpacing: "-1px" }}>DEEP CITADEL</h2>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setActiveTab("pos")} style={activeTab === "pos" ? UI.navBtnActive : UI.navBtn}><FaFileInvoice /> POS</button>
          <button onClick={() => setActiveTab("history")} style={activeTab === "history" ? UI.navBtnActive : UI.navBtn}><FaHistory /> History</button>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
        {activeTab === "pos" ? (
          <div style={UI.posLayout}>
            
            {/* Left Column */}
            <div>
              <div style={UI.typeSelector}>
                 <button onClick={() => setOrderType("walkin")} style={orderType === "walkin" ? UI.typeBtnActive : UI.typeBtn}>Walk-In</button>
                 <button onClick={() => setOrderType("pickup")} style={orderType === "pickup" ? UI.typeBtnActive : UI.typeBtn}><FaTruck /> Pickup</button>
              </div>

              <div style={UI.serviceGrid}>
                {services.map(s => (
                  <div key={s.name} className="glass" style={{ ...UI.serviceCard, borderLeft: `6px solid ${s.color}` }}>
                    <div style={{ fontWeight: "800", fontSize: "1.1rem" }}>{s.name}</div>
                    <div style={{ color: s.color, fontWeight: "bold", marginBottom: "10px" }}>{fmt(s.price)}</div>
                    <div style={UI.counterGroup}>
                      <button onClick={() => setSelections(p => ({ ...p, [s.name]: Math.max(0, (p[s.name] || 0) - 1) }))} style={UI.counterBtn}>-</button>
                      <span style={{ fontWeight: "800", fontSize: "1.2rem" }}>{selections[s.name] || 0}</span>
                      <button onClick={() => setSelections(p => ({ ...p, [s.name]: (p[s.name] || 0) + 1 }))} style={{ ...UI.counterBtn, background: s.color, color: "#fff" }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Checkout */}
            <div className="glass" style={UI.checkoutCard}>
              <h3 style={{ marginBottom: "20px", color: C.dark }}>Checkout</h3>
              <div style={UI.inputGroup}><FaUser color={C.blue}/><input placeholder="Customer Name" value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} style={UI.input}/></div>
              <div style={UI.inputGroup}><FaPhoneAlt color={C.blue}/><input placeholder="Phone" value={customer.phone} onChange={e => setCustomer({...customer, phone: e.target.value})} style={UI.input}/></div>
              
              {orderType === "pickup" && (
                <div style={{ marginTop: "15px" }}>
                  <div style={UI.inputGroup}><FaMapMarkerAlt color={C.pink}/><input placeholder="Pickup From" value={customer.pickupFrom} onChange={e => setCustomer({...customer, pickupFrom: e.target.value})} style={UI.input}/></div>
                  <div style={UI.inputGroup}><FaTruck color={C.purple}/><input placeholder="Deliver To" value={customer.deliverTo} onChange={e => setCustomer({...customer, deliverTo: e.target.value})} style={UI.input}/></div>
                </div>
              )}

              <div style={UI.totalSection}>
                <div style={UI.summaryLine}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {deliveryFee > 0 && <div style={UI.summaryLine}><span>Pickup Fee</span><span>{fmt(deliveryFee)}</span></div>}
                <div style={UI.grandTotal}><span>Total</span><span>{fmt(total)}</span></div>
                <button onClick={handleCheckout} style={UI.confirmBtn}>Confirm Order</button>
              </div>
            </div>

          </div>
        ) : (
          /* History View */
          <div className="glass" style={UI.historyWrapper}>
            <h3 style={{ marginBottom: "25px" }}>Recent Transactions</h3>
            {orders.map(o => (
              <div key={o.id} style={UI.orderRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "800" }}>{o.customer} {o.deliveryFee > 0 && <FaTruck color={C.blue} size={14}/>}</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>{o.id} • {o.date}</div>
                </div>
                <div style={{ fontWeight: "900", color: C.dark, fontSize: "1.1rem", marginRight: "20px" }}>{fmt(o.total)}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                   <button onClick={() => setOrders(orders.map(x => x.id === o.id ? {...x, paid: !x.paid} : x))} style={{ ...UI.circleBtn, background: o.paid ? C.green : "#eee", color: o.paid ? "#fff" : "#999" }}><FaCheck/></button>
                   <button onClick={() => setOrders(orders.filter(x => x.id !== o.id))} style={{ ...UI.circleBtn, background: "#fee2e2", color: C.red }}><FaTrash/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const UI = {
  mainWrapper: {
    minHeight: "100vh",
    background: `linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)`,
    backgroundSize: "400% 400%",
    animation: "mesh 15s ease infinite",
    paddingBottom: "40px"
  },
  nav: {
    padding: "20px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fff",
    background: "rgba(0,0,0,0.2)",
    marginBottom: "20px"
  },
  navBtn: { background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" },
  navBtnActive: { background: "#fff", border: "none", color: C.dark, padding: "8px 20px", borderRadius: "30px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" },
  posLayout: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "25px" },
  serviceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px" },
  serviceCard: { padding: "20px", borderRadius: "20px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)" },
  counterGroup: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.05)", borderRadius: "12px", padding: "5px" },
  counterBtn: { width: "35px", height: "35px", border: "none", borderRadius: "10px", background: "#fff", cursor: "pointer", fontWeight: "bold" },
  checkoutCard: { padding: "30px", borderRadius: "24px", alignSelf: "start" },
  inputGroup: { display: "flex", alignItems: "center", gap: "12px", background: "#f8f9fa", padding: "12px 18px", borderRadius: "15px", marginBottom: "12px", border: "1px solid #eee" },
  input: { border: "none", background: "transparent", outline: "none", width: "100%", fontWeight: "600" },
  totalSection: { marginTop: "25px", borderTop: "2px dashed #ddd", paddingTop: "20px" },
  summaryLine: { display: "flex", justifyContent: "space-between", color: "#666", marginBottom: "8px", fontWeight: "600" },
  grandTotal: { display: "flex", justifyContent: "space-between", fontSize: "1.6rem", fontWeight: "900", color: C.dark, margin: "15px 0" },
  confirmBtn: { width: "100%", padding: "18px", borderRadius: "18px", border: "none", background: `linear-gradient(to right, ${C.blue}, ${C.purple})`, color: "#fff", fontWeight: "800", fontSize: "1.1rem", cursor: "pointer", boxShadow: "0 10px 20px rgba(114, 9, 183, 0.3)" },
  typeSelector: { display: "flex", gap: "10px", marginBottom: "20px" },
  typeBtn: { flex: 1, padding: "12px", borderRadius: "15px", border: "none", background: "rgba(255,255,255,0.3)", color: "#fff", fontWeight: "bold", cursor: "pointer" },
  typeBtnActive: { flex: 1, padding: "12px", borderRadius: "15px", border: "none", background: "#fff", color: C.dark, fontWeight: "bold", cursor: "pointer" },
  historyWrapper: { padding: "30px", borderRadius: "24px" },
  orderRow: { display: "flex", alignItems: "center", padding: "15px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" },
  circleBtn: { width: "40px", height: "40px", borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
};