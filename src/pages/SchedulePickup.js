import { useState, useEffect, useRef, useMemo } from "react";
import {
  FaPlus, FaEdit, FaTrash, FaPrint, FaWhatsapp, FaSearch, FaTimes,
  FaCheck, FaSignOutAlt, FaDownload, FaMoneyBillWave, FaMobileAlt,
  FaUniversity, FaTag, FaChartLine, FaFileInvoice, FaUserTie,
  FaCog, FaChevronDown, FaChevronUp
} from "react-icons/fa";

// ── Constants & helpers ───────────────────────────────────────────────────────
const COMPANY   = "Deep Citadel Laundry Services";
const COMPANY_PHONE = "0244639002";
const WA_NUMBER = "23355244639002";
const PROMO_CODES = { "DCL20": 20, "WELCOME10": 10, "VIP30": 30 };
const STAFF_DB  = [
  { id: 1, name: "Christopher Boakye", pin: "1234", role: "Manager" },
  { id: 2, name: "Ama Serwaa",         pin: "5678", role: "Staff"   },
  { id: 3, name: "Kwame Adu",          pin: "9012", role: "Staff"   },
];
const PAYMENT_METHODS = [
  { key: "cash",  label: "Cash",   icon: <FaMoneyBillWave/> },
  { key: "momo",  label: "MoMo",   icon: <FaMobileAlt/>     },
  { key: "bank",  label: "Bank",   icon: <FaUniversity/>    },
];
const DEFAULT_SERVICES = [
  { name: "Wash & Fold",  pricePerItem: 50  },
  { name: "Dry Cleaning", pricePerItem: 100 },
  { name: "Ironing",      pricePerItem: 20  },
  { name: "Express",      pricePerItem: 80  },
];
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const fmt = n => `₵${Number(n).toFixed(2)}`;
const uid = () => Date.now() + Math.random().toString(36).slice(2,6);
const nowStr = () => new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch{ return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const C = {
  blue:"#0077b6", cyan:"#00d4ff", dark:"#0a0f2e", mid:"#0d2b5e",
  green:"#10b981", yellow:"#f59e0b", red:"#ef4444", purple:"#8b5cf6",
  white:"#ffffff", gray:"#f0f4f8", muted:"#64748b", border:"#e2e8f0",
  text:"#1e293b",
};

const pill = (color, bg, children) => ({
  display:"inline-flex", alignItems:"center", gap:4,
  padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
  color, background: bg || `${color}18`,
});

// ── Mini SVG Bar Chart ────────────────────────────────────────────────────────
function MiniChart({ data, color }) {
  const W=260,H=80,PAD={t:8,r:8,b:24,l:30};
  const vals = data.map(d=>d.v);
  const max  = Math.max(...vals,1)*1.15;
  const cW   = W-PAD.l-PAD.r, cH=H-PAD.t-PAD.b;
  const bW   = (cW/vals.length)*0.55, gap=cW/vals.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      {[0,0.5,1].map((r,i)=>{
        const y=PAD.t+cH*r;
        return <line key={i} x1={PAD.l} x2={W-PAD.r} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1"/>;
      })}
      {vals.map((v,i)=>{
        const bH=(v/max)*cH, x=PAD.l+gap*i+(gap-bW)/2, y=PAD.t+cH-bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} rx="3" fill={color} opacity="0.85"/>
            <text x={x+bW/2} y={H-PAD.b+15} textAnchor="middle" fontSize="9" fill={C.muted}>{data[i].l}</text>
          </g>
        );
      })}
      {[0,0.5,1].map((r,i)=>(
        <text key={i} x={PAD.l-4} y={PAD.t+cH*(1-r)+4} textAnchor="end" fontSize="8" fill={C.muted}>
          {Math.round(max*r)}
        </text>
      ))}
    </svg>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={MS.backdrop}>
      <div style={{...MS.box, maxWidth:360, textAlign:"center"}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <FaTrash size={20} color={C.red}/>
        </div>
        <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,marginBottom:8}}>Delete Order?</h3>
        <p style={{color:C.muted,fontSize:14,marginBottom:24}}>{message}</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button style={{...MS.btn,background:"transparent",color:C.muted,border:`1px solid ${C.border}`}} onClick={onCancel}>Cancel</button>
          <button style={{...MS.btn,background:C.red,color:"#fff"}} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Print View ────────────────────────────────────────────────────────
function buildReceiptHTML(order, staffName) {
  const rows = order.services.map(s=>`
    <div class="row"><span>${s.name} ×${s.count}</span><span>${fmt(s.count*s.pricePerItem)}</span></div>`).join("");
  return `
  <html><head><title>Invoice ${order.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',Arial,sans-serif;padding:20px;max-width:340px;margin:0 auto;font-size:13px;color:#1e293b;}
    .center{text-align:center;} .bold{font-weight:700;}
    .company{font-size:17px;font-weight:700;color:#0077b6;margin-bottom:2px;}
    .tagline{font-size:10px;color:#64748b;margin-bottom:10px;}
    .line{border:none;border-top:1px dashed #cbd5e1;margin:10px 0;}
    .row{display:flex;justify-content:space-between;padding:4px 0;}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;}
    .paid{background:#dcfce7;color:#16a34a;} .unpaid{background:#fee2e2;color:#dc2626;}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-weight:700;font-size:14px;}
    .footer{margin-top:16px;font-size:10px;color:#94a3b8;text-align:center;line-height:1.6;}
    .discount{display:flex;justify-content:space-between;padding:4px 0;color:#0077b6;}
  </style></head>
  <body>
    <div class="center">
      <div class="company">${COMPANY}</div>
      <div class="tagline">Powerful Clean. Trusted Care.</div>
      <div>📞 ${COMPANY_PHONE}</div>
    </div>
    <hr class="line"/>
    <div class="row"><span>Invoice No:</span><span class="bold">${order.invoiceNumber}</span></div>
    <div class="row"><span>Date:</span><span>${order.orderDate}</span></div>
    <div class="row"><span>Staff:</span><span>${staffName}</span></div>
    <div class="row"><span>Customer:</span><span class="bold">${order.customerName}</span></div>
    <div class="row"><span>Phone:</span><span>${order.customerPhone||"—"}</span></div>
    <div class="row"><span>Type:</span><span>${order.orderType==="pickup"?"📦 Pickup":"🚶 Walk-In"}</span></div>
    ${order.orderType==="pickup"?`<div class="row"><span>Pickup:</span><span>${order.pickupDate||""} ${order.pickupTime||""}</span></div>`:""}
    <div class="row"><span>Payment:</span><span>${order.paymentMethod||"Cash"}</span></div>
    <hr class="line"/>
    ${rows}
    <hr class="line"/>
    ${order.discount>0?`<div class="discount"><span>Promo (${order.promoCode})</span><span>-${order.discount}%</span></div>`:""}
    <div class="total-row"><span>Total Clothes</span><span>${order.totalClothes}</span></div>
    <div class="total-row"><span>Total Amount</span><span>${fmt(order.totalPrice)}</span></div>
    <div class="center" style="margin-top:10px;">
      <span class="badge ${order.paid?"paid":"unpaid"}">${order.paid?"✓ PAID":"✗ UNPAID"}</span>
    </div>
    <div class="footer">Thank you for choosing ${COMPANY}!<br/>Powerful Clean. Trusted Care.<br/>${COMPANY_PHONE}</div>
  </body></html>`;
}

// ── Staff Login ───────────────────────────────────────────────────────────────
function StaffLogin({ onLogin }) {
  const [selectedStaff, setSelectedStaff] = useState(STAFF_DB[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(()=>{ setTimeout(()=>setLoaded(true),100); },[]);

  const login = () => {
    if (pin === selectedStaff.pin) { onLogin(selectedStaff); }
    else { setError("Incorrect PIN. Try again."); setPin(""); setTimeout(()=>setError(""),3000); }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;} body{font-family:'DM Sans',sans-serif;}`}</style>
      <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.dark} 0%,${C.mid} 60%,${C.blue} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{width:"100%",maxWidth:380,opacity:loaded?1:0,transform:loaded?"translateY(0)":"translateY(20px)",transition:"all 0.6s ease"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:70,height:70,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00d4ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 0 30px rgba(0,212,255,0.5)"}}>
              <FaUserTie size={30} color="#fff"/>
            </div>
            <h1 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:22,letterSpacing:1}}>Staff Login</h1>
            <p style={{color:"rgba(255,255,255,0.45)",fontSize:13,marginTop:4}}>{COMPANY}</p>
          </div>
          <div style={{background:"rgba(255,255,255,0.07)",backdropFilter:"blur(12px)",borderRadius:16,padding:"28px 24px",border:"1px solid rgba(255,255,255,0.1)"}}>
            <label style={{display:"block",color:"rgba(255,255,255,0.55)",fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Select Staff</label>
            <select value={selectedStaff.id} onChange={e=>setSelectedStaff(STAFF_DB.find(s=>s.id===+e.target.value))}
              style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:14,marginBottom:16,fontFamily:"'DM Sans',sans-serif",outline:"none"}}>
              {STAFF_DB.map(s=><option key={s.id} value={s.id} style={{background:"#0a0f2e"}}>{s.name} ({s.role})</option>)}
            </select>
            <label style={{display:"block",color:"rgba(255,255,255,0.55)",fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>PIN</label>
            <input type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()}
              placeholder="Enter 4-digit PIN"
              style={{width:"100%",padding:"11px 14px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:14,letterSpacing:6,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:error?8:20}}/>
            {error && <p style={{color:"#fca5a5",fontSize:12,marginBottom:12}}>{error}</p>}
            <button onClick={login} style={{width:"100%",padding:"13px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 16px rgba(0,119,182,0.4)"}}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN POS
// ═══════════════════════════════════════════════════════════════════════════════
export default function LaundryPOS() {
  const [staff,      setStaff]      = useState(null);
  const [orders,     setOrders]     = useState(()=>load("dcl_pos_orders",[]));
  const [services,   setServices]   = useState(()=>load("dcl_pos_services",DEFAULT_SERVICES));
  const [activeTab,  setActiveTab]  = useState("pos"); // pos | invoices | analytics
  const [loaded,     setLoaded]     = useState(false);

  // Form state
  const [orderType,     setOrderType]     = useState("walkin");
  const [customerName,  setCustomerName]  = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupDate,    setPickupDate]    = useState("");
  const [pickupTime,    setPickupTime]    = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [promoCode,     setPromoCode]     = useState("");
  const [promoApplied,  setPromoApplied]  = useState(null);
  const [promoMsg,      setPromoMsg]      = useState("");
  const [selections,    setSelections]    = useState({}); // {serviceName: count}
  const [editOrderId,   setEditOrderId]   = useState(null);
  const formRef = useRef(null);

  // Invoice state
  const [search,      setSearch]      = useState("");
  const [filterPaid,  setFilterPaid]  = useState("all");
  const [filterType,  setFilterType]  = useState("all");
  const [deleteTarget,setDeleteTarget]= useState(null);

  // New service form
  const [newSvcName,  setNewSvcName]  = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [showSvcForm, setShowSvcForm] = useState(false);

  useEffect(()=>{ setTimeout(()=>setLoaded(true),100); },[]);
  useEffect(()=>{ save("dcl_pos_orders",orders); },[orders]);
  useEffect(()=>{ save("dcl_pos_services",services); },[services]);

  // Computed totals
  const selectedItems = services.filter(s=>selections[s.name]>0);
  const subtotal  = selectedItems.reduce((a,s)=>a+(selections[s.name]||0)*s.pricePerItem,0);
  const discount  = promoApplied ? Math.round(subtotal*(promoApplied/100)) : 0;
  const total     = subtotal - discount;
  const totalClothes = selectedItems.reduce((a,s)=>a+(selections[s.name]||0),0);

  // Dashboard metrics
  const metrics = useMemo(()=>({
    totalOrders:   orders.length,
    totalRevenue:  orders.reduce((a,o)=>a+(o.paid?o.totalPrice:0),0),
    totalUnpaid:   orders.reduce((a,o)=>a+(!o.paid?o.totalPrice:0),0),
    totalClothes:  orders.reduce((a,o)=>a+o.totalClothes,0),
    todayRevenue:  orders.filter(o=>o.paid&&o.orderDate.includes(new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}))).reduce((a,o)=>a+o.totalPrice,0),
  }),[orders]);

  // Chart data (last 7 days revenue)
  const chartData = useMemo(()=>{
    return WEEK_DAYS.map((l,i)=>{
      const d = new Date(); d.setDate(d.getDate()-6+i);
      const ds = d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
      const v  = orders.filter(o=>o.paid&&o.orderDate.includes(ds)).reduce((a,o)=>a+o.totalPrice,0);
      return {l,v};
    });
  },[orders]);

  const resetForm = () => {
    setCustomerName(""); setCustomerPhone(""); setPickupDate(""); setPickupTime("");
    setPaymentMethod("cash"); setPromoCode(""); setPromoApplied(null); setPromoMsg("");
    setSelections({}); setEditOrderId(null); setOrderType("walkin");
  };

  const applyPromo = () => {
    const disc = PROMO_CODES[promoCode.trim().toUpperCase()];
    if (disc) { setPromoApplied(disc); setPromoMsg(`✅ ${disc}% discount applied!`); }
    else       { setPromoApplied(null); setPromoMsg("❌ Invalid promo code."); }
    setTimeout(()=>setPromoMsg(""),3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim() || selectedItems.length===0) return;
    const invoiceNumber = editOrderId
      ? orders.find(o=>o.id===editOrderId).invoiceNumber
      : "INV-" + Date.now();

    const order = {
      id: editOrderId || uid(),
      invoiceNumber, orderDate: nowStr(),
      orderType, customerName, customerPhone,
      pickupDate: orderType==="pickup"?pickupDate:null,
      pickupTime: orderType==="pickup"?pickupTime:null,
      paymentMethod, promoCode: promoApplied?promoCode:"",
      discount: promoApplied||0,
      services: selectedItems.map(s=>({name:s.name,count:selections[s.name],pricePerItem:s.pricePerItem})),
      totalClothes, subtotal, totalPrice: total,
      paid: editOrderId ? orders.find(o=>o.id===editOrderId).paid : false,
      staffName: staff.name,
    };

    setOrders(prev=>editOrderId ? prev.map(o=>o.id===editOrderId?order:o) : [order,...prev]);
    resetForm();
    setActiveTab("invoices");
  };

  const handleEdit = (order) => {
    setEditOrderId(order.id);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone||"");
    setPickupDate(order.pickupDate||""); setPickupTime(order.pickupTime||"");
    setOrderType(order.orderType); setPaymentMethod(order.paymentMethod||"cash");
    const sel = {};
    order.services.forEach(s=>{ sel[s.name]=s.count; });
    setSelections(sel);
    setActiveTab("pos");
    setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };

  const handleDelete = (id) => {
    setOrders(prev=>prev.filter(o=>o.id!==id));
    setDeleteTarget(null);
  };

  const handlePrint = (order) => {
    const win = window.open("","","width=400,height=700");
    win.document.write(buildReceiptHTML(order, order.staffName||staff?.name||"Staff"));
    win.document.close(); win.print();
  };

  const sendWhatsApp = (order) => {
    const msg = encodeURIComponent(
      `Hello ${order.customerName}! 👋\n\nYour laundry invoice from *${COMPANY}*:\n\n` +
      order.services.map(s=>`• ${s.name} ×${s.count} = ${fmt(s.count*s.pricePerItem)}`).join("\n") +
      `\n\n*Total: ${fmt(order.totalPrice)}*\n` +
      (order.discount?`Promo ${order.promoCode}: -${order.discount}%\n`:"") +
      `Status: ${order.paid?"✅ Paid":"❌ Unpaid"}\n\n` +
      `Thank you for choosing ${COMPANY}! 🧺`
    );
    const phone = (order.customerPhone||"").replace(/\D/g,"");
    window.open(`https://wa.me/${phone||WA_NUMBER}?text=${msg}`,"_blank","noopener");
  };

  const exportCSV = () => {
    const headers = ["Invoice","Date","Customer","Phone","Service","Type","Payment","Clothes","Total","Discount","Paid","Staff"];
    const rows = orders.map(o=>[
      o.invoiceNumber,o.orderDate,o.customerName,o.customerPhone||"",
      o.services.map(s=>`${s.name}×${s.count}`).join(";"),
      o.orderType,o.paymentMethod||"cash",o.totalClothes,o.totalPrice,
      `${o.discount||0}%`,o.paid?"Yes":"No",o.staffName||""
    ]);
    const csv = [headers,...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="DCL_Invoices.csv"; a.click();
  };

  const addService = () => {
    if (!newSvcName.trim()||!newSvcPrice) return;
    setServices(prev=>[...prev,{name:newSvcName.trim(),pricePerItem:+newSvcPrice}]);
    setNewSvcName(""); setNewSvcPrice(""); setShowSvcForm(false);
  };

  const filteredOrders = useMemo(()=>{
    const q = search.toLowerCase();
    return orders.filter(o=>{
      const matchQ = !q||o.customerName.toLowerCase().includes(q)||o.invoiceNumber.toLowerCase().includes(q)||o.customerPhone?.includes(q);
      const matchP = filterPaid==="all"||(filterPaid==="paid"?o.paid:!o.paid);
      const matchT = filterType==="all"||o.orderType===filterType;
      return matchQ&&matchP&&matchT;
    });
  },[orders,search,filterPaid,filterType]);

  if (!staff) return <StaffLogin onLogin={setStaff}/>;

  const TAB = (key,label,icon) => (
    <button onClick={()=>setActiveTab(key)} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:10,border:"none",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
      background:activeTab===key?"linear-gradient(135deg,#0077b6,#00d4ff)":"transparent",
      color:activeTab===key?"#fff":"rgba(255,255,255,0.5)"}}>
      {icon}{label}
    </button>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;background:#f0f4f8;}
        input,select,textarea{font-family:'DM Sans',sans-serif;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:600px){.pos-grid{grid-template-columns:1fr!important;} .stat-grid{grid-template-columns:1fr 1fr!important;} .inv-actions{flex-direction:column!important;} .topbar-right{gap:6px!important;}}
      `}</style>

      {deleteTarget && <ConfirmDialog
        message={`Delete invoice ${orders.find(o=>o.id===deleteTarget)?.invoiceNumber}? This cannot be undone.`}
        onConfirm={()=>handleDelete(deleteTarget)}
        onCancel={()=>setDeleteTarget(null)}
      />}

      <div style={{minHeight:"100vh",background:"#f0f4f8",opacity:loaded?1:0,transition:"opacity 0.4s"}}>

        {/* Topbar */}
        <div style={{background:`linear-gradient(135deg,${C.dark},${C.mid})`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18,letterSpacing:1}}>Deep Citadel POS</h1>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:2}}>Logged in: <b style={{color:"#00d4ff"}}>{staff.name}</b> · {staff.role}</p>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}} className="topbar-right">
            {TAB("pos",     "POS",       <FaFileInvoice size={12}/>)}
            {TAB("invoices","Invoices",  <FaSearch size={12}/>)}
            {TAB("analytics","Analytics",<FaChartLine size={12}/>)}
            <button onClick={()=>setStaff(null)} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
              <FaSignOutAlt size={12}/> Sign Out
            </button>
          </div>
        </div>

        <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>

          {/* ── POS TAB ── */}
          {activeTab==="pos" && (
            <div className="pos-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}} ref={formRef}>

              {/* Left: Form */}
              <div>
                {editOrderId && (
                  <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(245,158,11,0.1)",border:`1px solid ${C.yellow}`,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:C.yellow,fontSize:13,fontWeight:600}}>✏️ Editing order</span>
                    <button onClick={resetForm} style={{background:"transparent",border:"none",cursor:"pointer",color:C.muted}}><FaTimes/></button>
                  </div>
                )}

                <div style={{background:"#fff",borderRadius:16,padding:"22px",border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(0,0,0,0.06)"}}>
                  <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,fontSize:16,marginBottom:18}}>{editOrderId?"Edit Order":"New Order"}</h3>
                  <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:12}}>

                    {/* Order type */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {["walkin","pickup"].map(t=>(
                        <button key={t} type="button" onClick={()=>setOrderType(t)}
                          style={{padding:"10px",borderRadius:10,border:`2px solid ${orderType===t?C.blue:C.border}`,background:orderType===t?"rgba(0,119,182,0.08)":"#f8fafc",color:orderType===t?C.blue:C.muted,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                          {t==="walkin"?"🚶 Walk-In":"📦 Pickup"}
                        </button>
                      ))}
                    </div>

                    {[["Customer Name",customerName,setCustomerName,"text"],["Customer Phone",customerPhone,setCustomerPhone,"tel"]].map(([lbl,val,set,type])=>(
                      <div key={lbl}>
                        <label style={FS.label}>{lbl}</label>
                        <input style={FS.input} type={type} value={val} onChange={e=>set(e.target.value)} placeholder={lbl} required={lbl.includes("Name")}/>
                      </div>
                    ))}

                    {orderType==="pickup" && (
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div><label style={FS.label}>Pickup Date</label><input style={FS.input} type="date" value={pickupDate} onChange={e=>setPickupDate(e.target.value)}/></div>
                        <div><label style={FS.label}>Pickup Time</label><input style={FS.input} type="time" value={pickupTime} onChange={e=>setPickupTime(e.target.value)}/></div>
                      </div>
                    )}

                    {/* Payment method */}
                    <div>
                      <label style={FS.label}>Payment Method</label>
                      <div style={{display:"flex",gap:8}}>
                        {PAYMENT_METHODS.map(m=>(
                          <button key={m.key} type="button" onClick={()=>setPaymentMethod(m.key)}
                            style={{flex:1,padding:"9px 4px",borderRadius:10,border:`2px solid ${paymentMethod===m.key?C.blue:C.border}`,background:paymentMethod===m.key?"rgba(0,119,182,0.08)":"#f8fafc",color:paymentMethod===m.key?C.blue:C.muted,fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,fontFamily:"'DM Sans',sans-serif"}}>
                            {m.icon}{m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Promo code */}
                    <div>
                      <label style={FS.label}>Promo Code <span style={{color:C.muted,fontWeight:400}}>(optional)</span></label>
                      <div style={{display:"flex",gap:8}}>
                        <input style={{...FS.input,flex:1}} value={promoCode} onChange={e=>setPromoCode(e.target.value)} placeholder="e.g. DCL20"/>
                        <button type="button" onClick={applyPromo} style={{padding:"10px 14px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:600,cursor:"pointer",fontSize:13,whiteSpace:"nowrap"}}>
                          <FaTag size={11}/> Apply
                        </button>
                      </div>
                      {promoMsg && <p style={{fontSize:12,marginTop:4,color:promoMsg.startsWith("✅")?C.green:C.red}}>{promoMsg}</p>}
                    </div>

                    <button type="submit" style={{padding:"13px",borderRadius:10,background:`linear-gradient(135deg,${C.blue},${C.cyan})`,color:"#fff",border:"none",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:"0 4px 16px rgba(0,119,182,0.35)"}}>
                      {editOrderId?"💾 Update Order":"➕ Create Order"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: Services */}
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{background:"#fff",borderRadius:16,padding:"22px",border:`1px solid ${C.border}`,boxShadow:"0 2px 16px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,fontSize:16}}>Services</h3>
                    <button type="button" onClick={()=>setShowSvcForm(v=>!v)}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,background:"rgba(0,119,182,0.08)",border:"none",color:C.blue,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                      <FaPlus size={10}/> Add Service
                    </button>
                  </div>

                  {showSvcForm && (
                    <div style={{padding:"12px",background:"#f8fafc",borderRadius:10,border:`1px solid ${C.border}`,marginBottom:14,display:"flex",gap:8,flexWrap:"wrap"}}>
                      <input style={{...FS.input,flex:2,minWidth:100}} placeholder="Service name" value={newSvcName} onChange={e=>setNewSvcName(e.target.value)}/>
                      <input style={{...FS.input,flex:1,minWidth:70}} type="number" placeholder="Price ₵" value={newSvcPrice} onChange={e=>setNewSvcPrice(e.target.value)}/>
                      <button onClick={addService} style={{padding:"10px 14px",borderRadius:10,background:C.green,color:"#fff",border:"none",cursor:"pointer",fontWeight:600}}><FaCheck/></button>
                    </div>
                  )}

                  {services.map(s=>(
                    <div key={s.name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:600,color:C.text,fontSize:14}}>{s.name}</p>
                        <p style={{color:C.muted,fontSize:12}}>{fmt(s.pricePerItem)} / item</p>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button type="button" onClick={()=>setSelections(p=>({...p,[s.name]:Math.max(0,(p[s.name]||0)-1)}))}
                          style={{width:28,height:28,borderRadius:8,border:`1px solid ${C.border}`,background:"#f8fafc",cursor:"pointer",fontWeight:700,fontSize:16,color:C.muted}}>−</button>
                        <span style={{width:32,textAlign:"center",fontWeight:700,color:C.text,fontSize:15}}>{selections[s.name]||0}</span>
                        <button type="button" onClick={()=>setSelections(p=>({...p,[s.name]:(p[s.name]||0)+1}))}
                          style={{width:28,height:28,borderRadius:8,border:"none",background:`linear-gradient(135deg,${C.blue},${C.cyan})`,color:"#fff",cursor:"pointer",fontWeight:700,fontSize:16}}>+</button>
                      </div>
                      <span style={{minWidth:54,textAlign:"right",fontWeight:700,color:C.blue,fontSize:13}}>
                        {fmt((selections[s.name]||0)*s.pricePerItem)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order summary */}
                <div style={{background:`linear-gradient(135deg,${C.dark},${C.mid})`,borderRadius:16,padding:"20px",color:"#fff"}}>
                  <h4 style={{fontFamily:"'Cinzel',serif",fontSize:14,marginBottom:14,color:"rgba(255,255,255,0.7)",letterSpacing:1}}>ORDER SUMMARY</h4>
                  {selectedItems.length===0
                    ? <p style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>No services selected yet.</p>
                    : selectedItems.map(s=>(
                      <div key={s.name} style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13}}>
                        <span style={{color:"rgba(255,255,255,0.7)"}}>{s.name} ×{selections[s.name]}</span>
                        <span style={{fontWeight:600}}>{fmt((selections[s.name]||0)*s.pricePerItem)}</span>
                      </div>
                    ))
                  }
                  {promoApplied && (
                    <div style={{display:"flex",justifyContent:"space-between",color:C.cyan,fontSize:13,marginTop:6}}>
                      <span>Promo ({promoCode}) -{promoApplied}%</span><span>-{fmt(discount)}</span>
                    </div>
                  )}
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.1)",marginTop:12,paddingTop:12,display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:"rgba(255,255,255,0.6)",fontSize:13}}>{totalClothes} items</span>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:22,color:C.cyan}}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── INVOICES TAB ── */}
          {activeTab==="invoices" && (
            <div>
              {/* Controls */}
              <div style={{background:"#fff",borderRadius:14,padding:"16px",marginBottom:16,border:`1px solid ${C.border}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:180,background:"#f8fafc",border:`1.5px solid ${C.border}`,borderRadius:10,padding:"9px 12px"}}>
                  <FaSearch size={12} color={C.muted}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, invoice, phone…"
                    style={{flex:1,border:"none",outline:"none",fontSize:13,color:C.text,background:"transparent"}}/>
                  {search&&<button onClick={()=>setSearch("")} style={{background:"transparent",border:"none",cursor:"pointer",color:C.muted}}><FaTimes size={11}/></button>}
                </div>
                {[["all","All"],["paid","Paid"],["unpaid","Unpaid"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setFilterPaid(k)} style={{padding:"9px 14px",borderRadius:10,border:`2px solid ${filterPaid===k?C.blue:C.border}`,background:filterPaid===k?"rgba(0,119,182,0.08)":"transparent",color:filterPaid===k?C.blue:C.muted,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    {l}
                  </button>
                ))}
                {[["all","All Types"],["walkin","Walk-In"],["pickup","Pickup"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setFilterType(k)} style={{padding:"9px 14px",borderRadius:10,border:`2px solid ${filterType===k?C.blue:C.border}`,background:filterType===k?"rgba(0,119,182,0.08)":"transparent",color:filterType===k?C.blue:C.muted,fontWeight:600,fontSize:12,cursor:"pointer"}}>
                    {l}
                  </button>
                ))}
                <button onClick={exportCSV} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:600,fontSize:12,cursor:"pointer"}}>
                  <FaDownload size={11}/> CSV
                </button>
              </div>

              <p style={{color:C.muted,fontSize:12,marginBottom:12}}>{filteredOrders.length} invoice{filteredOrders.length!==1?"s":""} found</p>

              {filteredOrders.length===0 && <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:14}}>No invoices found.</div>}

              {filteredOrders.map((order,i)=>(
                <div key={order.id} style={{background:"#fff",borderRadius:14,padding:"18px",marginBottom:12,border:`1px solid ${C.border}`,boxShadow:"0 2px 12px rgba(0,0,0,0.05)",animation:"slideUp 0.3s ease"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:12}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontFamily:"'Cinzel',serif",color:C.blue,fontWeight:700,fontSize:14}}>{order.invoiceNumber}</span>
                        <span style={pill(order.paid?C.green:C.red)}>{order.paid?"✓ Paid":"✗ Unpaid"}</span>
                        <span style={pill(C.purple)}>{order.orderType==="walkin"?"Walk-In":"Pickup"}</span>
                      </div>
                      <p style={{color:C.text,fontWeight:600,fontSize:15}}>{order.customerName}</p>
                      <p style={{color:C.muted,fontSize:12}}>{order.orderDate} · {order.customerPhone||"—"} · {order.paymentMethod||"cash"}</p>
                      <p style={{color:C.muted,fontSize:12,marginTop:2}}>{order.services.map(s=>`${s.name}×${s.count}`).join(", ")}</p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <p style={{fontFamily:"'Cinzel',serif",fontSize:22,color:C.blue,fontWeight:700}}>{fmt(order.totalPrice)}</p>
                      {order.discount>0&&<p style={{color:C.cyan,fontSize:12}}>-{order.discount}% promo</p>}
                      <p style={{color:C.muted,fontSize:12}}>{order.totalClothes} items</p>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}} className="inv-actions">
                    {[
                      {label:"Print",    icon:<FaPrint size={11}/>,    fn:()=>handlePrint(order),          bg:C.blue  },
                      {label:"Edit",     icon:<FaEdit size={11}/>,     fn:()=>handleEdit(order),           bg:C.purple},
                      {label:"WhatsApp", icon:<FaWhatsapp size={11}/>, fn:()=>sendWhatsApp(order),         bg:"#25d366"},
                      {label:order.paid?"Unpaid":"Mark Paid",icon:<FaCheck size={11}/>,fn:()=>setOrders(prev=>prev.map(o=>o.id===order.id?{...o,paid:!o.paid}:o)),bg:order.paid?C.yellow:C.green},
                      {label:"Delete",   icon:<FaTrash size={11}/>,    fn:()=>setDeleteTarget(order.id),   bg:C.red   },
                    ].map(({label,icon,fn,bg})=>(
                      <button key={label} onClick={fn} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 13px",borderRadius:9,background:bg,color:"#fff",border:"none",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                        {icon}{label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab==="analytics" && (
            <div>
              {/* Stat Cards */}
              <div className="stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24}}>
                {[
                  {label:"Total Orders",  val:metrics.totalOrders,           color:C.blue,   bg:"#f0f9ff"},
                  {label:"Total Revenue", val:fmt(metrics.totalRevenue),      color:C.green,  bg:"#f0fdf4"},
                  {label:"Unpaid",        val:fmt(metrics.totalUnpaid),       color:C.red,    bg:"#fff1f2"},
                  {label:"Today Revenue", val:fmt(metrics.todayRevenue),      color:C.cyan,   bg:"#ecfeff"},
                  {label:"Total Clothes", val:metrics.totalClothes,           color:C.purple, bg:"#faf5ff"},
                ].map(({label,val,color,bg})=>(
                  <div key={label} style={{background:bg,borderRadius:14,padding:"18px 16px",border:`1.5px solid ${color}22`}}>
                    <p style={{color:C.muted,fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{label}</p>
                    <p style={{fontFamily:"'Cinzel',serif",fontSize:22,color,fontWeight:700}}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div style={{background:"#fff",borderRadius:16,padding:"22px",border:`1px solid ${C.border}`,marginBottom:20}}>
                <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,fontSize:15,marginBottom:16}}>Revenue — Last 7 Days</h3>
                <MiniChart data={chartData} color={C.blue}/>
              </div>

              {/* Payment breakdown */}
              <div style={{background:"#fff",borderRadius:16,padding:"22px",border:`1px solid ${C.border}`,marginBottom:20}}>
                <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,fontSize:15,marginBottom:16}}>Payment Methods</h3>
                {PAYMENT_METHODS.map(m=>{
                  const count = orders.filter(o=>o.paymentMethod===m.key).length;
                  const pct   = orders.length?Math.round(count/orders.length*100):0;
                  return (
                    <div key={m.key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                      <div style={{width:36,height:36,borderRadius:10,background:`${C.blue}15`,display:"flex",alignItems:"center",justifyContent:"center",color:C.blue}}>{m.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontWeight:600,color:C.text,fontSize:13}}>{m.label}</span>
                          <span style={{color:C.muted,fontSize:12}}>{count} orders ({pct}%)</span>
                        </div>
                        <div style={{height:6,borderRadius:3,background:"#f1f5f9",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.blue},${C.cyan})`,borderRadius:3,transition:"width 0.6s"}}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top services */}
              <div style={{background:"#fff",borderRadius:16,padding:"22px",border:`1px solid ${C.border}`}}>
                <h3 style={{fontFamily:"'Cinzel',serif",color:C.dark,fontSize:15,marginBottom:16}}>Top Services</h3>
                {services.map(svc=>{
                  const count = orders.flatMap(o=>o.services).filter(s=>s.name===svc.name).reduce((a,s)=>a+s.count,0);
                  const rev   = orders.flatMap(o=>o.services).filter(s=>s.name===svc.name).reduce((a,s)=>a+s.count*s.pricePerItem,0);
                  return (
                    <div key={svc.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div>
                        <p style={{fontWeight:600,color:C.text,fontSize:14}}>{svc.name}</p>
                        <p style={{color:C.muted,fontSize:12}}>{count} items processed</p>
                      </div>
                      <span style={{fontFamily:"'Cinzel',serif",color:C.blue,fontWeight:700,fontSize:16}}>{fmt(rev)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Form styles ───────────────────────────────────────────────────────────────
const FS = {
  label: {display:"block",fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:5},
  input: {width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"#f8fafc",color:C.text,fontSize:14,outline:"none"},
};

// ── Modal styles ──────────────────────────────────────────────────────────────
const MS = {
  backdrop: {position:"fixed",inset:0,background:"rgba(10,15,46,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"},
  box: {background:"#fff",borderRadius:20,padding:"32px 28px",width:"90%",maxWidth:440,position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"slideUp 0.25s ease"},
  btn: {padding:"11px 22px",borderRadius:10,border:"none",fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"},
};