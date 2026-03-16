import { useState, useEffect } from "react";
import { 
  FaWhatsapp, 
  FaQrcode, 
  FaPlus, 
  FaSearch, 
  FaTimes, 
  FaHistory, 
  FaTruck, 
  FaUser, 
  FaPhoneAlt, 
  FaFileInvoice, 
  FaPrint, 
  FaTrash,
  FaCheckCircle
} from "react-icons/fa";

// ── Configuration & Theme ────────────────────────────────────────────────────
const STATUSES = ["Picked Up", "Washing", "Ironing", "Ready", "Out for Delivery", "Delivered"];
const STORAGE_KEY = "dcl_master_store";

const C = {
  blue: "#0077b6",
  purple: "#7209b7",
  pink: "#f72585",
  dark: "#0a0f2e",
  green: "#10b981",
  red: "#ef4444"
};

// ── Utility: Printing ────────────────────────────────────────────────────────
const printSlip = (order) => {
  const win = window.open("", "PRINT", "height=600,width=400");
  win.document.write(`
    <html><body style="font-family:sans-serif; text-align:center; padding:40px;">
      <h1 style="margin:0;">DEEP CITADEL</h1>
      <p style="letter-spacing:2px;">LAUNDRY SERVICES</p>
      <hr/>
      <p>Order ID: <b>${order.id}</b></p>
      <p>Customer: ${order.customer}</p>
      <div style="background:#000; color:#fff; padding:10px; margin:20px 0;">
        <p style="margin:0; font-size:10px;">TRACKING TOKEN</p>
        <h2 style="margin:0; font-size:30px;">${order.token}</h2>
      </div>
      <p style="font-size:12px;">Visit our site & enter token to track status.</p>
    </body></html>
  `);
  win.document.close();
  win.print();
};

export default function TrackOrders() {
  const [view, setView] = useState("pos"); 
  const [orders, setOrders] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  const [searchToken, setSearchToken] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const handleTrack = () => {
    const found = orders.find(o => o.token === searchToken.toUpperCase());
    setTrackingResult(found || "not_found");
  };

  return (
    <div style={S.wrapper}>
      <style>{`
        @keyframes mesh { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
      `}</style>

      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{fontWeight: 900, letterSpacing: "1px"}}>DEEP CITADEL</div>
        <div style={{display: "flex", gap: "10px"}}>
          <button onClick={() => setView("pos")} style={view === "pos" ? S.navActive : S.navBtn}><FaPlus/> POS</button>
          <button onClick={() => setView("status")} style={view === "status" ? S.navActive : S.navBtn}><FaHistory/> Status</button>
          <button onClick={() => setView("track")} style={view === "track" ? S.navActive : S.navBtn}><FaSearch/> Track</button>
        </div>
      </nav>

      <div style={S.container}>
        
        {/* VIEW: POS */}
        {view === "pos" && (
          <div style={S.splitLayout}>
            <div className="glass" style={{padding: "30px"}}>
              <h3 style={{marginBottom: "20px"}}>Services</h3>
              {["Wash & Fold", "Dry Cleaning", "Ironing", "Duvet"].map(service => (
                <div key={service} style={S.listRow}>
                  <span>{service}</span>
                  <button style={S.iconBtn}><FaPlus/></button>
                </div>
              ))}
            </div>

            <div className="glass" style={{padding: "30px"}}>
              <h3>Customer Info</h3>
              <input id="cName" style={S.input} placeholder="Name" />
              <input id="cPhone" style={S.input} placeholder="Phone" />
              <button style={S.actionBtn} onClick={() => {
                const name = document.getElementById("cName").value;
                if(!name) return alert("Enter Name");
                const token = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newOrder = {
                  token, id: "#"+Math.floor(1000+Math.random()*9000),
                  customer: name, status: "Picked Up",
                  history: [{status: "Picked Up", time: new Date().toLocaleTimeString()}]
                };
                setOrders([newOrder, ...orders]);
                printSlip(newOrder);
              }}>Create Order & Print</button>
            </div>
          </div>
        )}

        {/* VIEW: STATUS MANAGEMENT */}
        {view === "status" && (
          <div className="glass" style={{padding: "30px"}}>
            <h3>Live Status Updates</h3>
            {orders.map(o => (
              <div key={o.token} style={S.listRow}>
                <div>
                  <div style={{fontWeight: 800}}>{o.customer}</div>
                  <div style={{fontSize: "12px", color: C.blue}}>Token: {o.token}</div>
                </div>
                <select 
                  style={S.select} 
                  value={o.status}
                  onChange={(e) => {
                    const next = orders.map(x => x.token === o.token ? 
                      {...x, status: e.target.value, history: [...x.history, {status: e.target.value, time: new Date().toLocaleTimeString()}]} : x);
                    setOrders(next);
                  }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setOrders(orders.filter(x => x.token !== o.token))} style={{color: C.red, border: "none", background: "none"}}><FaTrash/></button>
              </div>
            ))}
          </div>
        )}

        {/* VIEW: CUSTOMER TRACKING */}
        {view === "track" && (
          <div className="glass" style={{padding: "40px", maxWidth: "500px", margin: "0 auto", textAlign: "center"}}>
            <FaTruck size={40} color={C.blue} style={{marginBottom: "20px"}}/>
            <h2>Track Your Order</h2>
            <input 
              style={{...S.input, textAlign: "center", fontSize: "1.2rem"}} 
              placeholder="Enter Token" 
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
            />
            <button style={S.actionBtn} onClick={handleTrack}>Search</button>

            {trackingResult === "not_found" && <p style={{color: C.red, marginTop: "15px"}}>Token not found!</p>}
            {trackingResult && trackingResult !== "not_found" && (
              <div style={{marginTop: "25px", textAlign: "left", padding: "15px", background: "#f8fafc", borderRadius: "12px"}}>
                <div style={{display: "flex", alignItems: "center", gap: "10px", color: C.green, fontWeight: "bold"}}>
                  <FaCheckCircle/> {trackingResult.status}
                </div>
                <div style={{fontSize: "12px", marginTop: "10px"}}>
                  {trackingResult.history.map((h, i) => (
                    <div key={i} style={{borderBottom: "1px solid #eee", padding: "5px 0"}}>
                      {h.status} <span style={{float: "right", color: "#999"}}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", background: "linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)", backgroundSize: "400% 400%", animation: "mesh 15s ease infinite" },
  nav: { padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", color: "#fff" },
  navBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontWeight: "bold" },
  navActive: { background: "#fff", color: "#000", border: "none", padding: "6px 15px", borderRadius: "20px", fontWeight: "bold" },
  container: { maxWidth: "1000px", margin: "0 auto", padding: "30px" },
  splitLayout: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" },
  listRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #eee" },
  iconBtn: { background: C.blue, color: "#fff", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer" },
  input: { width: "100%", padding: "12px", marginBottom: "12px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" },
  actionBtn: { width: "100%", padding: "15px", borderRadius: "12px", border: "none", background: C.dark, color: "#fff", fontWeight: "bold", cursor: "pointer" },
  select: { padding: "8px", borderRadius: "8px", border: "1px solid #ddd", fontWeight: "bold" }
};