import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaWhatsapp, FaQrcode, FaPlus, FaSearch, FaTimes, FaHistory, FaClock, FaCheckCircle, FaSpinner, FaTshirt, FaTruck, FaBoxOpen, FaMapMarkerAlt, FaCopy } from "react-icons/fa";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ["Picked Up", "Washing", "Ironing", "Ready", "Out for Delivery", "Delivered"];
const WA_NUMBER = "233244639002";
const STORAGE_KEY = "dcl_orders_v2";

const STATUS_META = {
  "Picked Up":        { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <FaMapMarkerAlt size={13}/>,  label: "Picked Up"        },
  "Washing":          { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: <FaSpinner size={13}/>,       label: "Washing"          },
  "Ironing":          { color: "#0077b6", bg: "rgba(0,119,182,0.12)",   icon: <FaTshirt size={13}/>,        label: "Ironing"          },
  "Ready":            { color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: <FaBoxOpen size={13}/>,       label: "Ready"            },
  "Out for Delivery": { color: "#f97316", bg: "rgba(249,115,22,0.12)",  icon: <FaTruck size={13}/>,         label: "Out for Delivery" },
  "Delivered":        { color: "#10b981", bg: "rgba(16,185,129,0.15)",  icon: <FaCheckCircle size={13}/>,   label: "Delivered"        },
};

const SEED_ORDERS = [
  {
    token: "abc123xyz", id: "#001", customer: "John Doe",      phone: "0241234567", service: "Wash & Fold",
    status: "Washing", estimatedHours: 4,
    history: [
      { status: "Picked Up", time: "Feb 23, 2026, 08:00 AM" },
      { status: "Washing",   time: "Feb 23, 2026, 09:30 AM" },
    ],
  },
  {
    token: "def456uvw", id: "#002", customer: "Ama Mensah",    phone: "0551234567", service: "Dry Cleaning",
    status: "Ready", estimatedHours: 0,
    history: [
      { status: "Picked Up", time: "Feb 22, 2026, 09:00 AM" },
      { status: "Washing",   time: "Feb 22, 2026, 10:30 AM" },
      { status: "Ironing",   time: "Feb 22, 2026, 01:00 PM" },
      { status: "Ready",     time: "Feb 22, 2026, 04:00 PM" },
    ],
  },
  {
    token: "ghi789rst", id: "#003", customer: "Kwame Boateng", phone: "0201234567", service: "Express",
    status: "Delivered", estimatedHours: 0,
    history: [
      { status: "Picked Up",        time: "Feb 21, 2026, 08:00 AM" },
      { status: "Washing",          time: "Feb 21, 2026, 09:00 AM" },
      { status: "Ironing",          time: "Feb 21, 2026, 11:00 AM" },
      { status: "Ready",            time: "Feb 21, 2026, 01:00 PM" },
      { status: "Out for Delivery", time: "Feb 21, 2026, 02:30 PM" },
      { status: "Delivered",        time: "Feb 21, 2026, 04:00 PM" },
    ],
  },
];

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ORDERS));
  return SEED_ORDERS;
}
function saveOrders(orders) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); } catch (_) {}
}

// ── QR Modal ──────────────────────────────────────────────────────────────────
function QRModal({ order, onClose }) {
  const url = `${window.location.origin}/track/${order.token}`;
  const qr  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}><FaTimes/></button>
        <h3 style={{...S.modalTitle, marginBottom:4}}>Tracking QR Code</h3>
        <p style={{color:"#64748b",fontSize:13,marginBottom:16}}>Order {order.id} — {order.customer}</p>
        <div style={{position:"relative",display:"inline-block",marginBottom:14}}>
          <img src={qr} alt="QR" style={{width:200,height:200,borderRadius:12,border:"3px solid #e2e8f0",display:"block"}}/>
          <div style={{position:"absolute",inset:-4,borderRadius:16,background:"linear-gradient(135deg,#0077b6,#00d4ff)",zIndex:-1,opacity:0.25}}/>
        </div>
        <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#0077b6",marginBottom:12,wordBreak:"break-all",padding:"8px 12px",background:"#f0f9ff",borderRadius:8}}>{url}</p>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <button style={S.copyBtn} onClick={copy}><FaCopy size={12}/>{copied?" Copied!":" Copy Link"}</button>
          <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Track your laundry order ${order.id} here: ${url}`)}`}
            target="_blank" rel="noopener noreferrer" style={S.waBtn}>
            <FaWhatsapp size={13}/> Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Add Order Modal ───────────────────────────────────────────────────────────
function AddOrderModal({ onSave, onClose }) {
  const [form, setForm] = useState({ customer:"", phone:"", service:"Wash & Fold", estimatedHours:4 });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const SERVICES = ["Wash & Fold","Dry Cleaning","Ironing","Express"];

  const submit = () => {
    if(!form.customer.trim()) return;
    const token = Math.random().toString(36).slice(2,11);
    const id    = `#${String(Math.floor(Math.random()*900)+100)}`;
    onSave({
      ...form, token, id,
      status: "Picked Up",
      estimatedHours: +form.estimatedHours,
      history: [{ status:"Picked Up", time: new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}) }],
    });
  };

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose}><FaTimes/></button>
        <h3 style={S.modalTitle}>Add New Order</h3>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
          {[["Customer Name","customer","text"],["Phone Number","phone","tel"]].map(([lbl,key,type])=>(
            <div key={key}>
              <label style={S.label}>{lbl}</label>
              <input style={S.input} type={type} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={lbl}/>
            </div>
          ))}
          <div>
            <label style={S.label}>Service</label>
            <select style={S.input} value={form.service} onChange={e=>set("service",e.target.value)}>
              {SERVICES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Estimated Hours</label>
            <input style={S.input} type="number" value={form.estimatedHours} onChange={e=>set("estimatedHours",e.target.value)} min="1" max="72"/>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button style={{...S.btn,background:"transparent",color:"#64748b"}} onClick={onClose}>Cancel</button>
          <button style={{...S.btn,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff"}} onClick={submit}>Create Order</button>
        </div>
      </div>
    </div>
  );
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ hours }) {
  const [secs, setSecs] = useState(hours * 3600);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(t);
  }, [secs]);
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
  const pad = n => String(n).padStart(2,"0");
  if (secs <= 0) return <span style={{color:"#10b981",fontWeight:700}}>Ready soon!</span>;
  return (
    <span style={{fontFamily:"'DM Mono',monospace",color:"#0077b6",fontWeight:700,fontSize:18}}>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

// ── Progress Steps ────────────────────────────────────────────────────────────
function ProgressSteps({ status }) {
  const idx = STATUSES.indexOf(status);
  return (
    <div style={{marginTop:20}}>
      {/* Step dots */}
      <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
        {STATUSES.map((s,i) => {
          const done   = i <= idx;
          const active = i === idx;
          const m      = STATUS_META[s];
          return (
            <div key={s} style={{display:"flex",alignItems:"center",flex: i<STATUSES.length-1?1:"none"}}>
              <div title={s} style={{
                width:active?34:26, height:active?34:26,
                borderRadius:"50%",
                background: done ? m.color : "#e2e8f0",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: done?"#fff":"#94a3b8",
                boxShadow: active ? `0 0 0 4px ${m.color}33` : "none",
                transition:"all 0.4s ease",
                flexShrink:0,
                fontSize: active ? 14 : 11,
              }}>
                {done ? m.icon : <span style={{fontSize:10}}>{i+1}</span>}
              </div>
              {i < STATUSES.length-1 && (
                <div style={{flex:1,height:3,margin:"0 4px",borderRadius:2,background: i<idx?"#10b981":"#e2e8f0",transition:"background 0.4s"}}/>
              )}
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div style={{display:"flex",justifyContent:"space-between"}}>
        {STATUSES.map((s,i) => (
          <div key={s} style={{flex:1,textAlign:"center",fontSize:9,color: i<=idx ? STATUS_META[s].color : "#94a3b8",fontWeight: i===idx?700:400,transition:"color 0.3s",lineHeight:1.2}}>
            {s.split(" ").map((w,j)=><div key={j}>{w}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function CustomerTrackOrder() {
  const { token: urlToken } = useParams();
  const [token,    setToken]    = useState(urlToken || "");
  const [order,    setOrder]    = useState(null);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [qrOrder,  setQrOrder]  = useState(null);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => { setTimeout(()=>setLoaded(true),100); }, []);

  const search = useCallback(() => {
    if (!token.trim()) { setError("Please enter a tracking token."); return; }
    setLoading(true); setError(""); setOrder(null);
    setTimeout(() => {
      const orders = loadOrders();
      const found  = orders.find(o => o.token === token.trim());
      if (found) setOrder(found);
      else setError("No order found for this token. Please double-check and try again.");
      setLoading(false);
    }, 600);
  }, [token]);

  useEffect(() => { if (urlToken) search(); }, []); // eslint-disable-line

  const m   = order ? STATUS_META[order.status] : null;
  const eta = order && order.estimatedHours > 0 && order.status !== "Delivered";

  return (
    <>
      <Fonts/> <GlobalStyles/>
      {qrOrder && <QRModal order={qrOrder} onClose={()=>setQrOrder(null)}/>}
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#060d1f 0%,#0d2b5e 60%,#0077b6 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
        <div style={{width:"100%",maxWidth:500,opacity:loaded?1:0,transform:loaded?"translateY(0)":"translateY(20px)",transition:"all 0.6s ease"}}>

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00d4ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 0 30px rgba(0,212,255,0.5)"}}>
              <FaTruck size={28} color="#fff"/>
            </div>
            <h1 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:22,margin:"0 0 6px",letterSpacing:1}}>Track Your Order</h1>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>Deep Citadel Laundry</p>
          </div>

          {/* Token Input */}
          <div style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(12px)",borderRadius:16,padding:"20px",marginBottom:16,border:"1px solid rgba(255,255,255,0.1)"}}>
            <label style={{display:"block",color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Tracking Token</label>
            <div style={{display:"flex",gap:10}}>
              <input
                value={token} onChange={e=>setToken(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&search()}
                placeholder="e.g. abc123xyz"
                style={{flex:1,padding:"12px 14px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none"}}
              />
              <button onClick={search} disabled={loading} style={{padding:"12px 20px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",opacity:loading?0.7:1}}>
                {loading ? "…" : <><FaSearch size={12}/> Track</>}
              </button>
            </div>
            {error && (
              <div style={{marginTop:12,padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",color:"#fca5a5",fontSize:13}}>
                ❌ {error}
              </div>
            )}
          </div>

          {/* Order Result */}
          {order && m && (
            <div style={{background:"#fff",borderRadius:16,padding:"24px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"slideUp 0.4s ease"}}>
              {/* Order header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                <div>
                  <h3 style={{fontFamily:"'Cinzel',serif",color:"#0a0f2e",fontSize:18,margin:"0 0 4px"}}>{order.id}</h3>
                  <p style={{color:"#64748b",fontSize:13,margin:0}}>{order.customer} · {order.service}</p>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,color:m.color,background:m.bg}}>
                    {m.icon}&nbsp;{order.status}
                  </span>
                  <button onClick={()=>setQrOrder(order)} title="View QR" style={{width:32,height:32,borderRadius:8,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#0077b6",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <FaQrcode size={14}/>
                  </button>
                </div>
              </div>

              {/* ETA */}
              {eta && (
                <div style={{padding:"12px 16px",borderRadius:12,background:"#f0f9ff",border:"1px solid #bae6fd",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
                  <FaClock color="#0077b6" size={16}/>
                  <div>
                    <p style={{color:"#64748b",fontSize:11,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:1}}>Estimated Time Remaining</p>
                    <Countdown hours={order.estimatedHours}/>
                  </div>
                </div>
              )}

              {/* Progress */}
              <ProgressSteps status={order.status}/>

              {/* History */}
              <div style={{marginTop:20,borderTop:"1px solid #f1f5f9",paddingTop:16}}>
                <p style={{color:"#64748b",fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><FaHistory size={11}/>History</p>
                {[...order.history].reverse().map((h,i)=>{
                  const hm = STATUS_META[h.status]||STATUS_META["Picked Up"];
                  return (
                    <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:hm.bg,display:"flex",alignItems:"center",justifyContent:"center",color:hm.color,flexShrink:0}}>{hm.icon}</div>
                      <div>
                        <p style={{color:"#1e293b",fontSize:13,fontWeight:600,margin:"0 0 2px"}}>{h.status}</p>
                        <p style={{color:"#94a3b8",fontSize:11,margin:0}}>{h.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WhatsApp */}
              <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! Checking on my laundry order ${order.id} (${order.status}). Token: ${order.token}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:16,padding:"11px",borderRadius:12,background:"#25d366",color:"#fff",textDecoration:"none",fontWeight:600,fontSize:14}}>
                <FaWhatsapp size={16}/> Contact Us on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export function StaffDashboard() {
  const [orders,    setOrders]    = useState(() => loadOrders());
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("All");
  const [qrOrder,   setQrOrder]   = useState(null);
  const [addOpen,   setAddOpen]   = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => { setTimeout(()=>setLoaded(true),100); }, []);

  const persist = (newOrders) => { setOrders(newOrders); saveOrders(newOrders); };

  const updateStatus = (token, newStatus) => {
    const updated = orders.map(o => {
      if (o.token !== token) return o;
      const histEntry = { status: newStatus, time: new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}) };
      const updated   = { ...o, status: newStatus, history: [...o.history, histEntry],
        estimatedHours: newStatus==="Delivered"||newStatus==="Ready"?0:o.estimatedHours };
      // WhatsApp ping
      const msg = encodeURIComponent(`Hello ${o.customer}! Your laundry order ${o.id} status has been updated to: *${newStatus}* 🧺\nTrack here: ${window.location.origin}/track/${o.token}`);
      window.open(`https://wa.me/${o.phone.replace(/\D/g,"")}?text=${msg}`, "_blank", "noopener");
      return updated;
    });
    persist(updated);
  };

  const addOrder = (order) => { const next = [order, ...orders]; persist(next); setAddOpen(false); };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (filter==="All"||o.status===filter) &&
           (!q || o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.token.toLowerCase().includes(q));
  });

  const histOrder = orders.find(o=>o.id===historyId);

  return (
    <>
      <Fonts/> <GlobalStyles/>
      {qrOrder  && <QRModal order={qrOrder} onClose={()=>setQrOrder(null)}/>}
      {addOpen  && <AddOrderModal onSave={addOrder} onClose={()=>setAddOpen(false)}/>}

      {/* History side panel */}
      {histOrder && (
        <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)"}} onClick={()=>setHistoryId(null)}/>
          <div style={{position:"relative",width:320,background:"#fff",height:"100%",overflowY:"auto",padding:"24px 20px",boxShadow:"-4px 0 30px rgba(0,0,0,0.15)",animation:"slideInRight 0.3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"'Cinzel',serif",color:"#0a0f2e",fontSize:16,margin:0}}>Order Log</h3>
              <button onClick={()=>setHistoryId(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18}}><FaTimes/></button>
            </div>
            <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>{histOrder.id} — {histOrder.customer}</p>
            {[...histOrder.history].reverse().map((h,i)=>{
              const hm=STATUS_META[h.status]||STATUS_META["Picked Up"];
              return (
                <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #f1f5f9"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:hm.bg,display:"flex",alignItems:"center",justifyContent:"center",color:hm.color,flexShrink:0}}>{hm.icon}</div>
                  <div>
                    <p style={{color:"#1e293b",fontSize:14,fontWeight:600,margin:"0 0 3px"}}>{h.status}</p>
                    <p style={{color:"#94a3b8",fontSize:12,margin:0}}>{h.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"'DM Sans',sans-serif",opacity:loaded?1:0,transition:"opacity 0.5s"}}>
        {/* Topbar */}
        <div style={{background:"linear-gradient(135deg,#0a0f2e,#0d2b5e)",padding:"18px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:20,margin:"0 0 3px",letterSpacing:1}}>Deep Citadel</h1>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:12,margin:0}}>Staff Order Management</p>
          </div>
          <button onClick={()=>setAddOpen(true)}
            style={{display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 14px rgba(0,119,182,0.4)"}}>
            <FaPlus size={12}/> New Order
          </button>
        </div>

        <div style={{padding:"24px",maxWidth:900,margin:"0 auto"}}>
          {/* Summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:24}}>
            {[["All",null],["Picked Up","#f59e0b"],["Washing","#8b5cf6"],["Ready","#10b981"],["Delivered","#10b981"]].map(([s,c])=>(
              <button key={s} onClick={()=>setFilter(s)}
                style={{padding:"14px 10px",borderRadius:12,border:`2px solid ${filter===s?(c||"#0077b6"):"transparent"}`,
                  background: filter===s ? `${(c||"#0077b6")}18` : "#fff",
                  color: filter===s ? (c||"#0077b6") : "#64748b",
                  fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                  boxShadow:"0 2px 10px rgba(0,0,0,0.05)",transition:"all 0.2s",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:20,fontFamily:"'Cinzel',serif"}}>
                  {s==="All" ? orders.length : orders.filter(o=>o.status===s).length}
                </span>
                <span style={{fontSize:10,letterSpacing:0.5}}>{s}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:12,padding:"10px 14px",marginBottom:20,boxShadow:"0 2px 10px rgba(0,0,0,0.04)"}}>
            <FaSearch size={13} color="#94a3b8"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, order ID, or token…"
              style={{flex:1,border:"none",outline:"none",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:"#1e293b",background:"transparent"}}/>
            {search && <button onClick={()=>setSearch("")} style={{background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8"}}><FaTimes size={12}/></button>}
          </div>

          {/* Order Cards */}
          {filtered.length===0 && (
            <div style={{textAlign:"center",padding:"60px 20px",color:"#94a3b8",fontSize:14}}>No orders match your search.</div>
          )}
          {filtered.map((order,i) => {
            const m = STATUS_META[order.status]||STATUS_META["Picked Up"];
            return (
              <div key={order.token} style={{background:"#fff",borderRadius:16,padding:"20px",marginBottom:14,boxShadow:"0 2px 16px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",animation:"slideUp 0.3s ease",animationDelay:`${i*0.05}s`,opacity:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                      <span style={{fontFamily:"'Cinzel',serif",color:"#0077b6",fontSize:15,fontWeight:700}}>{order.id}</span>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,color:m.color,background:m.bg}}>{m.icon}&nbsp;{order.status}</span>
                    </div>
                    <p style={{color:"#1e293b",fontWeight:600,fontSize:14,margin:"0 0 2px"}}>{order.customer}</p>
                    <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 2px"}}>{order.service} · {order.phone}</p>
                    <p style={{color:"#cbd5e1",fontSize:11,margin:0,fontFamily:"'DM Mono',monospace"}}>🔑 {order.token}</p>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    {/* Status dropdown */}
                    <select value={order.status}
                      onChange={e=>updateStatus(order.token,e.target.value)}
                      style={{padding:"8px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",cursor:"pointer"}}>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <button onClick={()=>setHistoryId(order.id)} title="View history" style={{width:34,height:34,borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <FaHistory size={13}/>
                    </button>
                    <button onClick={()=>setQrOrder(order)} title="QR / Share" style={{width:34,height:34,borderRadius:9,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#0077b6",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <FaQrcode size={13}/>
                    </button>
                    <a href={`https://wa.me/${order.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Hi ${order.customer}! Your order ${order.id} is now: *${order.status}* 🧺`)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{width:34,height:34,borderRadius:9,background:"#25d366",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>
                      <FaWhatsapp size={15}/>
                    </a>
                  </div>
                </div>
                {/* Mini progress */}
                <div style={{marginTop:14}}>
                  <div style={{display:"flex",height:4,borderRadius:2,overflow:"hidden",background:"#f1f5f9",gap:1}}>
                    {STATUSES.map((s,i)=>(
                      <div key={s} style={{flex:1,background: i<=STATUSES.indexOf(order.status) ? m.color : "#f1f5f9",transition:"background 0.4s"}}/>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                    <span style={{fontSize:10,color:"#94a3b8"}}>{STATUSES[0]}</span>
                    <span style={{fontSize:10,color:"#94a3b8"}}>{STATUSES[STATUSES.length-1]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Shared Helpers ────────────────────────────────────────────────────────────
function Fonts() {
  return <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono&display=swap" rel="stylesheet"/>;
}
function GlobalStyles() {
  return (
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
    `}</style>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const S = {
  backdrop: {position:"fixed",inset:0,background:"rgba(10,15,46,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"},
  modal: {background:"#fff",borderRadius:20,padding:"32px 28px",width:"90%",maxWidth:420,position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",textAlign:"center",animation:"slideUp 0.3s ease"},
  closeBtn: {position:"absolute",top:14,right:14,background:"#f1f5f9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b",fontSize:14},
  modalTitle: {fontFamily:"'Cinzel',serif",fontSize:20,color:"#0a0f2e",marginBottom:20,marginTop:0},
  copyBtn: {display:"inline-flex",alignItems:"center",gap:5,padding:"9px 18px",borderRadius:20,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
  waBtn: {display:"inline-flex",alignItems:"center",gap:5,padding:"9px 18px",borderRadius:20,background:"#25d366",color:"#fff",fontSize:13,fontWeight:600,textDecoration:"none"},
  label: {display:"block",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:5,textAlign:"left"},
  input: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"#f8fafc",color:"#1e293b",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none"},
  btn: {padding:"11px 22px",borderRadius:10,border:"none",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
};

export default CustomerTrackOrder;