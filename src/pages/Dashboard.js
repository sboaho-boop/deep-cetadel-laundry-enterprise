import { useState, useMemo, useEffect } from "react";
import {
  FaTshirt, FaStar, FaUserAlt, FaPlus, FaEdit, FaTrash,
  FaBars, FaTimes, FaSearch, FaBell, FaMoon, FaSun, FaChevronUp,
  FaChevronDown, FaChevronLeft, FaChevronRight, FaExpand,
  FaCheckCircle, FaSpinner, FaBoxOpen, FaHourglass
} from "react-icons/fa";
// No recharts needed — using inline SVG charts below

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  Completed: { color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: <FaCheckCircle size={10}/> },
  Washing:   { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",  icon: <FaSpinner size={10}/>    },
  Ready:     { color: "#0077b6", bg: "rgba(0,119,182,0.12)",   icon: <FaBoxOpen size={10}/>    },
  Pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <FaHourglass size={10}/>  },
};

const STATUS_ORDER = ["Pending", "Washing", "Ready", "Completed"];

let _id = 100;
const uid = () => `#L${++_id}`;
const now = () => new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const SEED_JOBS = [
  { id: "#L001", customer: "John Doe",      service: "Wash & Fold",   kg: 3, revenue: 45,  status: "Completed", time: "Feb 22, 2026, 09:00" },
  { id: "#L002", customer: "Ama Mensah",    service: "Dry Cleaning",  kg: 2, revenue: 50,  status: "Washing",   time: "Feb 22, 2026, 11:30" },
  { id: "#L003", customer: "Kwame Boateng", service: "Ironing",       kg: 1, revenue: 15,  status: "Ready",     time: "Feb 23, 2026, 08:00" },
  { id: "#L004", customer: "Sarah K.",      service: "Wash & Fold",   kg: 5, revenue: 75,  status: "Pending",   time: "Feb 23, 2026, 10:15" },
  { id: "#L005", customer: "Abena Osei",    service: "Dry Cleaning",  kg: 2, revenue: 50,  status: "Pending",   time: "Feb 23, 2026, 12:00" },
  { id: "#L006", customer: "Kofi Adu",      service: "Express",       kg: 4, revenue: 80,  status: "Completed", time: "Feb 21, 2026, 14:00" },
  { id: "#L007", customer: "Maame Serwaa",  service: "Wash & Fold",   kg: 6, revenue: 90,  status: "Completed", time: "Feb 20, 2026, 09:30" },
  { id: "#L008", customer: "Yaw Darko",     service: "Ironing",       kg: 2, revenue: 30,  status: "Washing",   time: "Feb 23, 2026, 13:00" },
  { id: "#L009", customer: "Akosua Frema",  service: "Express",       kg: 3, revenue: 60,  status: "Pending",   time: "Feb 23, 2026, 14:30" },
  { id: "#L010", customer: "Nana Yaw",      service: "Wash & Fold",   kg: 7, revenue: 105, status: "Ready",     time: "Feb 22, 2026, 16:00" },
  { id: "#L101", customer: "Esi Amoah",     service: "Dry Cleaning",  kg: 1, revenue: 25,  status: "Completed", time: "Feb 19, 2026, 10:00" },
  { id: "#L102", customer: "Mensah Kojo",   service: "Wash & Fold",   kg: 4, revenue: 60,  status: "Completed", time: "Feb 18, 2026, 11:00" },
];

const CHART_DATA = [
  { day: "Mon", jobs: 4, revenue: 120 },
  { day: "Tue", jobs: 6, revenue: 200 },
  { day: "Wed", jobs: 3, revenue: 90  },
  { day: "Thu", jobs: 8, revenue: 260 },
  { day: "Fri", jobs: 5, revenue: 175 },
  { day: "Sat", jobs: 9, revenue: 310 },
  { day: "Sun", jobs: 2, revenue: 70  },
];

const ITEMS_PER_PAGE = 5;
const SERVICES = ["Wash & Fold", "Dry Cleaning", "Ironing", "Express"];

// ── Job Form Modal ─────────────────────────────────────────────────────────────
function JobModal({ job, onSave, onClose, dark }) {
  const [form, setForm] = useState(
    job ?? { customer: "", service: "Wash & Fold", kg: "", revenue: "", status: "Pending" }
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const s = {
    backdrop: { position:"fixed",inset:0,background:"rgba(10,15,46,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)" },
    box: { background: dark?"#0d1b3e":"#fff", borderRadius:20, padding:"32px 28px", width:"90%", maxWidth:440, position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", animation:"slideUp 0.25s ease" },
    label: { fontSize:12, fontWeight:600, color: dark?"#94a3b8":"#64748b", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 },
    input: { width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${dark?"#1e3a5f":"#e2e8f0"}`, background: dark?"#0a1628":"#f8fafc", color: dark?"#e2e8f0":"#1e293b", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" },
    select: { width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${dark?"#1e3a5f":"#e2e8f0"}`, background: dark?"#0a1628":"#f8fafc", color: dark?"#e2e8f0":"#1e293b", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none" },
    row: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
    btn: { padding:"12px 24px", borderRadius:10, border:"none", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" },
    actions: { display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 },
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.box} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:14,background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18 }}><FaTimes/></button>
        <h3 style={{ fontFamily:"'Cinzel',serif", color: dark?"#e2e8f0":"#0a0f2e", margin:"0 0 20px" }}>{job ? "Edit Job" : "Add New Job"}</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div><label style={s.label}>Customer Name</label><input style={s.input} value={form.customer} onChange={e=>set("customer",e.target.value)} placeholder="Full name" /></div>
          <div style={s.row}>
            <div><label style={s.label}>Service</label>
              <select style={s.select} value={form.service} onChange={e=>set("service",e.target.value)}>
                {SERVICES.map(sv=><option key={sv}>{sv}</option>)}
              </select>
            </div>
            <div><label style={s.label}>Status</label>
              <select style={s.select} value={form.status} onChange={e=>set("status",e.target.value)}>
                {STATUS_ORDER.map(st=><option key={st}>{st}</option>)}
              </select>
            </div>
          </div>
          <div style={s.row}>
            <div><label style={s.label}>Weight (kg)</label><input style={s.input} type="number" value={form.kg} onChange={e=>set("kg",e.target.value)} placeholder="0" /></div>
            <div><label style={s.label}>Revenue (GHS)</label><input style={s.input} type="number" value={form.revenue} onChange={e=>set("revenue",e.target.value)} placeholder="0.00" /></div>
          </div>
        </div>
        <div style={s.actions}>
          <button style={{ ...s.btn, background:"transparent", color: dark?"#94a3b8":"#64748b" }} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btn, background:"linear-gradient(135deg,#0077b6,#00d4ff)", color:"#fff" }} onClick={()=>{ if(!form.customer.trim()) return; onSave({ ...form, kg: +form.kg||0, revenue: +form.revenue||0, id: job?.id??uid(), time: job?.time??now() }); }}>
            {job ? "Save Changes" : "Add Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────
function DetailModal({ job, onClose, dark }) {
  const m = STATUS_META[job.status];
  const s = {
    backdrop: { position:"fixed",inset:0,background:"rgba(10,15,46,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)" },
    box: { background:dark?"#0d1b3e":"#fff", borderRadius:20, padding:"32px", width:"90%", maxWidth:400, position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" },
    row: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${dark?"#1e3a5f":"#f1f5f9"}` },
    label: { fontSize:12, color: dark?"#64748b":"#94a3b8", textTransform:"uppercase", letterSpacing:1 },
    val: { fontSize:14, fontWeight:600, color: dark?"#e2e8f0":"#1e293b" },
  };
  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.box} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:14,background:"transparent",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18 }}><FaTimes/></button>
        <h3 style={{ fontFamily:"'Cinzel',serif", color:dark?"#e2e8f0":"#0a0f2e", margin:"0 0 6px" }}>Job Details</h3>
        <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,color:m.color,background:m.bg,marginBottom:20 }}>{m.icon}&nbsp;{job.status}</span>
        {[["Job ID", job.id],["Customer", job.customer],["Service", job.service],["Weight", `${job.kg} kg`],["Revenue", `GHS ${job.revenue}`],["Timestamp", job.time]].map(([l,v])=>(
          <div key={l} style={s.row}><span style={s.label}>{l}</span><span style={s.val}>{v}</span></div>
        ))}
      </div>
    </div>
  );
}

// ── Pure SVG Charts (no recharts needed) ─────────────────────────────────────
function MiniBarChart({ title, dataKey, color, card, border, text, muted }) {
  const W = 300, H = 140, PAD = { top:10, right:10, bottom:28, left:32 };
  const vals = CHART_DATA.map(d => d[dataKey]);
  const max = Math.max(...vals) * 1.15;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const bW = (cW / vals.length) * 0.55;
  const gap = cW / vals.length;

  return (
    <div style={{background:card,borderRadius:16,padding:"20px",border:`1px solid ${border}`,boxShadow:"0 2px 16px rgba(0,0,0,0.05)"}}>
      <h3 style={{fontFamily:"'Cinzel',serif",fontSize:13,color:text,marginBottom:16}}>{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map((r,i) => {
          const y = PAD.top + cH * r;
          return <line key={i} x1={PAD.left} x2={W-PAD.right} y1={y} y2={y} stroke={border} strokeDasharray="3 3" strokeWidth="1"/>;
        })}
        {/* Bars */}
        {vals.map((v,i) => {
          const bH = (v / max) * cH;
          const x = PAD.left + gap * i + (gap - bW) / 2;
          const y = PAD.top + cH - bH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bW} height={bH} rx="4" fill={color} opacity="0.85"/>
              <text x={x + bW/2} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="10" fill={muted}>
                {CHART_DATA[i].day}
              </text>
            </g>
          );
        })}
        {/* Y axis labels */}
        {[0,0.5,1].map((r,i) => (
          <text key={i} x={PAD.left - 5} y={PAD.top + cH*(1-r) + 4} textAnchor="end" fontSize="9" fill={muted}>
            {Math.round(max * r)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function MiniLineChart({ title, dataKey, color, card, border, text, muted }) {
  const W = 300, H = 140, PAD = { top:10, right:10, bottom:28, left:40 };
  const vals = CHART_DATA.map(d => d[dataKey]);
  const max = Math.max(...vals) * 1.15;
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const gap = cW / (vals.length - 1);

  const points = vals.map((v,i) => ({
    x: PAD.left + gap * i,
    y: PAD.top + cH - (v / max) * cH,
  }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = `M ${points[0].x},${PAD.top+cH} ` +
    points.map(p => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length-1].x},${PAD.top+cH} Z`;

  return (
    <div style={{background:card,borderRadius:16,padding:"20px",border:`1px solid ${border}`,boxShadow:"0 2px 16px rgba(0,0,0,0.05)"}}>
      <h3 style={{fontFamily:"'Cinzel',serif",fontSize:13,color:text,marginBottom:16}}>{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        <defs>
          <linearGradient id={`lg-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,0.25,0.5,0.75,1].map((r,i) => {
          const y = PAD.top + cH * r;
          return <line key={i} x1={PAD.left} x2={W-PAD.right} y1={y} y2={y} stroke={border} strokeDasharray="3 3" strokeWidth="1"/>;
        })}
        <path d={areaPath} fill={`url(#lg-${dataKey})`}/>
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color}/>
            <text x={p.x} y={H - PAD.bottom + 16} textAnchor="middle" fontSize="10" fill={muted}>
              {CHART_DATA[i].day}
            </text>
          </g>
        ))}
        {[0,0.5,1].map((r,i) => (
          <text key={i} x={PAD.left - 6} y={PAD.top + cH*(1-r) + 4} textAnchor="end" fontSize="9" fill={muted}>
            {Math.round(max * r)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function LaundryDashboard() {
  const [jobs, setJobs] = useState(SEED_JOBS);
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortKey, setSortKey] = useState("time");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [showJobModal, setShowJobModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setTimeout(()=>setLoaded(true), 100); }, []);

  // Dynamic stats
  const stats = useMemo(() => ({
    total:    jobs.length,
    pending:  jobs.filter(j=>j.status==="Pending").length,
    washing:  jobs.filter(j=>j.status==="Washing").length,
    revenue:  jobs.reduce((a,b)=>a+(+b.revenue||0),0),
    points:   jobs.filter(j=>j.status==="Completed").length * 100,
  }), [jobs]);

  const pendingJobs = jobs.filter(j => j.status === "Pending");

  // Filter + sort + paginate
  const filtered = useMemo(() => {
    let arr = jobs.filter(j => {
      const q = search.toLowerCase();
      return (filterStatus==="All" || j.status===filterStatus) &&
             (!q || j.customer.toLowerCase().includes(q) || j.id.toLowerCase().includes(q) || j.service.toLowerCase().includes(q));
    });
    arr = [...arr].sort((a,b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "revenue" || sortKey === "kg") { va = +va; vb = +vb; }
      if (va < vb) return sortDir==="asc" ? -1 : 1;
      if (va > vb) return sortDir==="asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [jobs, search, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const toggleSort = (key) => {
    if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const saveJob = (job) => {
    setJobs(prev => editJob ? prev.map(j=>j.id===job.id?job:j) : [job,...prev]);
    setShowJobModal(false); setEditJob(null);
  };

  const deleteJob = (id) => { if(window.confirm("Delete this job?")) setJobs(prev=>prev.filter(j=>j.id!==id)); };

  // Colors
  const bg    = dark ? "#060d1f" : "#f0f4f8";
  const card  = dark ? "#0d1b3e" : "#ffffff";
  const text  = dark ? "#e2e8f0" : "#1e293b";
  const muted = dark ? "#64748b" : "#94a3b8";
  const border= dark ? "#1e3a5f" : "#e2e8f0";

  const SortIcon = ({k}) => sortKey===k
    ? (sortDir==="asc" ? <FaChevronUp size={10}/> : <FaChevronDown size={10}/>)
    : <span style={{opacity:0.3}}><FaChevronDown size={10}/></span>;

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = ({mobile=false}) => (
    <aside style={{
      width: mobile?"100%":"240px", flexShrink:0,
      background: dark?"#080f28":"#0a0f2e",
      padding:"28px 18px", display:"flex", flexDirection:"column", gap:6,
      ...(mobile ? {} : { minHeight:"100vh" })
    }}>
      <div style={{ fontFamily:"'Cinzel',serif", color:"#fff", fontSize:17, letterSpacing:1, marginBottom:28, paddingLeft:8 }}>
        Deep <span style={{color:"#00d4ff"}}>Citadel</span>
      </div>
      {[
        { icon:<FaUserAlt/>, label:"Dashboard" },
        { icon:<FaTshirt/>,  label:"Laundry Jobs" },
        { icon:<FaStar/>,    label:"Loyalty Points" },
      ].map(({icon,label}) => (
        <button key={label} onClick={()=>{ setActiveNav(label); setSidebarOpen(false); }}
          style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:12,
            border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500,
            background: activeNav===label ? "rgba(0,212,255,0.12)" : "transparent",
            color: activeNav===label ? "#00d4ff" : "rgba(255,255,255,0.55)",
            borderLeft: activeNav===label ? "3px solid #00d4ff" : "3px solid transparent",
            transition:"all 0.2s", textAlign:"left",
          }}>
          <span style={{fontSize:15}}>{icon}</span>{label}
        </button>
      ))}
      <div style={{flex:1}}/>
      <div style={{padding:"14px", borderRadius:12, background:"rgba(0,212,255,0.07)", border:"1px solid rgba(0,212,255,0.15)"}}>
        <p style={{color:"rgba(255,255,255,0.4)", fontSize:11, margin:"0 0 4px"}}>TOTAL REVENUE</p>
        <p style={{color:"#00d4ff", fontFamily:"'Cinzel',serif", fontSize:20, margin:0}}>GHS {stats.revenue}</p>
      </div>
    </aside>
  );

  // ── Stat Card ──────────────────────────────────────────────────────────────
  const StatCard = ({title, value, icon, grad}) => (
    <div style={{ background:grad, borderRadius:16, padding:"22px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 4px 20px rgba(0,0,0,0.12)", transition:"transform 0.2s", cursor:"default" }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px) scale(1.02)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0) scale(1)"}>
      <div>
        <p style={{color:"rgba(255,255,255,0.75)", fontSize:12, margin:"0 0 6px", letterSpacing:1, textTransform:"uppercase"}}>{title}</p>
        <p style={{color:"#fff", fontSize:28, fontFamily:"'Cinzel',serif", margin:0}}>{value}</p>
      </div>
      <div style={{fontSize:32, opacity:0.7, color:"#fff"}}>{icon}</div>
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .job-row:hover{background:${dark?"rgba(0,212,255,0.04)":"#f8faff"} !important;}
        ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px;}
        @media(max-width:768px){.desktop-sidebar{display:none!important}}
      `}</style>

      {/* Modals */}
      {(showJobModal||editJob) && <JobModal job={editJob} onSave={saveJob} onClose={()=>{setShowJobModal(false);setEditJob(null);}} dark={dark}/>}
      {detailJob && <DetailModal job={detailJob} onClose={()=>setDetailJob(null)} dark={dark}/>}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.5)",display:"flex"}} onClick={()=>setSidebarOpen(false)}>
          <div style={{width:260}} onClick={e=>e.stopPropagation()}><Sidebar mobile/></div>
        </div>
      )}

      <div style={{ display:"flex", minHeight:"100vh", background:bg, opacity:loaded?1:0, transition:"opacity 0.5s" }}>

        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{display:"flex"}}><Sidebar/></div>

        {/* Main */}
        <div style={{flex:1, overflow:"auto"}}>

          {/* Topbar */}
          <div style={{ position:"sticky",top:0,zIndex:100, background:dark?"rgba(6,13,31,0.95)":"rgba(240,244,248,0.95)", backdropFilter:"blur(10px)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${border}` }}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button onClick={()=>setSidebarOpen(true)} style={{background:"transparent",border:"none",cursor:"pointer",color:text,fontSize:18,display:"flex",alignItems:"center"}}>
                <FaBars/>
              </button>
              <h1 style={{fontFamily:"'Cinzel',serif",color:text,fontSize:20}}>Laundry Dashboard</h1>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {/* Notifications */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setNotifOpen(o=>!o)}
                  style={{background:dark?"#0d1b3e":card,border:`1px solid ${border}`,borderRadius:10,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:text,position:"relative"}}>
                  <FaBell size={15}/>
                  {pendingJobs.length>0 && <span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingJobs.length}</span>}
                </button>
                {notifOpen && (
                  <div style={{position:"absolute",right:0,top:46,width:280,background:card,borderRadius:14,boxShadow:"0 10px 40px rgba(0,0,0,0.2)",border:`1px solid ${border}`,zIndex:200,overflow:"hidden",animation:"slideUp 0.2s ease"}}>
                    <div style={{padding:"14px 16px",borderBottom:`1px solid ${border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontWeight:700,color:text,fontSize:14}}>Pending Alerts</span>
                      <span style={{background:"rgba(239,68,68,0.12)",color:"#ef4444",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{pendingJobs.length}</span>
                    </div>
                    {pendingJobs.length===0 && <p style={{padding:"16px",color:muted,fontSize:13}}>No pending jobs 🎉</p>}
                    {pendingJobs.map(j=>(
                      <div key={j.id} style={{padding:"12px 16px",borderBottom:`1px solid ${border}`,cursor:"pointer"}} onClick={()=>{setDetailJob(j);setNotifOpen(false);}}>
                        <p style={{color:text,fontSize:13,fontWeight:600,margin:"0 0 2px"}}>{j.customer}</p>
                        <p style={{color:muted,fontSize:11,margin:0}}>{j.service} · {j.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Dark mode */}
              <button onClick={()=>setDark(d=>!d)}
                style={{background:dark?"#0d1b3e":card,border:`1px solid ${border}`,borderRadius:10,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:text}}>
                {dark ? <FaSun size={14} color="#f59e0b"/> : <FaMoon size={14}/>}
              </button>
              {/* Add Job */}
              <button onClick={()=>setShowJobModal(true)}
                style={{display:"flex",alignItems:"center",gap:7,padding:"9px 16px",borderRadius:10,background:"linear-gradient(135deg,#0077b6,#00d4ff)",color:"#fff",border:"none",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 14px rgba(0,119,182,0.4)"}}>
                <FaPlus size={11}/> Add Job
              </button>
            </div>
          </div>

          <div style={{padding:"24px"}}>

            {/* Stat Cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:24}}>
              <StatCard title="Total Jobs"      value={stats.total}   icon={<FaTshirt/>}    grad="linear-gradient(135deg,#0077b6,#00d4ff)"/>
              <StatCard title="Pending"         value={stats.pending} icon={<FaHourglass/>} grad="linear-gradient(135deg,#d97706,#f59e0b)"/>
              <StatCard title="Washing"         value={stats.washing} icon={<FaSpinner/>}   grad="linear-gradient(135deg,#7c3aed,#a78bfa)"/>
              <StatCard title="Loyalty Points"  value={stats.points}  icon={<FaStar/>}      grad="linear-gradient(135deg,#059669,#10b981)"/>
            </div>

            {/* Charts — pure SVG, no dependencies */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16,marginBottom:24}}>
              <MiniBarChart title="Jobs This Week" dataKey="jobs" color="#0077b6" card={card} border={border} text={text} muted={muted} dark={dark}/>
              <MiniLineChart title="Revenue This Week (GHS)" dataKey="revenue" color="#10b981" card={card} border={border} text={text} muted={muted} dark={dark}/>
            </div>

            {/* Jobs Table */}
            <div style={{background:card,borderRadius:16,border:`1px solid ${border}`,boxShadow:"0 2px 16px rgba(0,0,0,0.05)",overflow:"hidden"}}>

              {/* Table Header Controls */}
              <div style={{padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,borderBottom:`1px solid ${border}`}}>
                <h2 style={{fontFamily:"'Cinzel',serif",fontSize:16,color:text}}>Laundry Jobs</h2>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,background:dark?"#0a1628":"#f8fafc",border:`1.5px solid ${border}`,borderRadius:10,padding:"8px 12px"}}>
                    <FaSearch size={12} color={muted}/>
                    <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
                      placeholder="Search jobs…"
                      style={{background:"transparent",border:"none",outline:"none",fontSize:13,color:text,width:140,fontFamily:"'DM Sans',sans-serif"}}/>
                  </div>
                  <select value={filterStatus} onChange={e=>{setFilterStatus(e.target.value);setPage(1);}}
                    style={{padding:"9px 12px",borderRadius:10,border:`1.5px solid ${border}`,background:dark?"#0a1628":"#f8fafc",color:text,fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",cursor:"pointer"}}>
                    <option>All</option>
                    {STATUS_ORDER.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:dark?"#0a1628":"#f8fafc"}}>
                      {[
                        {label:"Job ID",  key:"id"},
                        {label:"Customer",key:"customer"},
                        {label:"Service", key:"service"},
                        {label:"Weight",  key:"kg"},
                        {label:"Revenue", key:"revenue"},
                        {label:"Status",  key:"status"},
                        {label:"Time",    key:"time"},
                        {label:"Actions", key:null},
                      ].map(({label,key})=>(
                        <th key={label} onClick={key?()=>toggleSort(key):undefined}
                          style={{padding:"12px 16px",textAlign:"left",color:muted,fontWeight:600,fontSize:11,letterSpacing:0.8,textTransform:"uppercase",cursor:key?"pointer":"default",userSelect:"none",whiteSpace:"nowrap"}}>
                          <span style={{display:"inline-flex",alignItems:"center",gap:5}}>{label}{key&&<SortIcon k={key}/>}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length===0 && (
                      <tr><td colSpan={8} style={{padding:"40px",textAlign:"center",color:muted}}>No jobs found.</td></tr>
                    )}
                    {paginated.map((job)=>{
                      const m = STATUS_META[job.status]||STATUS_META.Pending;
                      return (
                        <tr key={job.id} className="job-row" style={{borderBottom:`1px solid ${border}`,transition:"background 0.15s",cursor:"pointer"}} onClick={()=>setDetailJob(job)}>
                          <td style={{padding:"13px 16px",fontWeight:700,color:dark?"#00d4ff":"#0077b6",fontFamily:"'Cinzel',serif",fontSize:12}}>{job.id}</td>
                          <td style={{padding:"13px 16px",color:text,fontWeight:500}}>{job.customer}</td>
                          <td style={{padding:"13px 16px",color:muted}}>{job.service}</td>
                          <td style={{padding:"13px 16px",color:text}}>{job.kg} kg</td>
                          <td style={{padding:"13px 16px",color:text,fontWeight:600}}>GHS {job.revenue}</td>
                          <td style={{padding:"13px 16px"}}>
                            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,color:m.color,background:m.bg}}>
                              {m.icon}&nbsp;{job.status}
                            </span>
                          </td>
                          <td style={{padding:"13px 16px",color:muted,fontSize:12,whiteSpace:"nowrap"}}>{job.time}</td>
                          <td style={{padding:"13px 16px"}} onClick={e=>e.stopPropagation()}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>setEditJob(job)}
                                style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(0,119,182,0.1)",color:"#0077b6",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <FaEdit size={11}/>
                              </button>
                              <button onClick={()=>deleteJob(job.id)}
                                style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(239,68,68,0.1)",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <FaTrash size={11}/>
                              </button>
                              <button onClick={()=>setDetailJob(job)}
                                style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(0,119,182,0.08)",color:muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <FaExpand size={11}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:`1px solid ${border}`,flexWrap:"wrap",gap:10}}>
                <span style={{color:muted,fontSize:12}}>
                  Showing {Math.min((page-1)*ITEMS_PER_PAGE+1, filtered.length)}–{Math.min(page*ITEMS_PER_PAGE, filtered.length)} of {filtered.length} jobs
                </span>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    style={{width:30,height:30,borderRadius:8,border:`1px solid ${border}`,background:card,color:page===1?muted:text,cursor:page===1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <FaChevronLeft size={11}/>
                  </button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <button key={p} onClick={()=>setPage(p)}
                      style={{width:30,height:30,borderRadius:8,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",
                        background: p===page?"linear-gradient(135deg,#0077b6,#00d4ff)":"transparent",
                        color: p===page?"#fff":muted,
                        fontFamily:"'DM Sans',sans-serif"}}>
                      {p}
                    </button>
                  ))}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{width:30,height:30,borderRadius:8,border:`1px solid ${border}`,background:card,color:page===totalPages?muted:text,cursor:page===totalPages?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <FaChevronRight size={11}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}