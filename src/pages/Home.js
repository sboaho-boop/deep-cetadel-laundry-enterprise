/* eslint-disable jsx-a11y/label-has-associated-control */
import { useState, useEffect, useRef } from "react";
import MapPicker, { MapView } from "../components/MapPicker";
import { adminAPI, userAPI } from "../utils/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const PRICE_KEY  = "dcl_prices";
const ORDERS_KEY = "dcl_orders";
const STAFF_KEY  = "dcl_staff";

const ORDER_STAGES = [
  { key:"received",   label:"Received",        icon:"📥", color:"#818cf8", desc:"Order received & logged" },
  { key:"washing",    label:"Washing",          icon:"🫧", color:"#00c6e0", desc:"Currently being washed" },
  { key:"drying",     label:"Drying",           icon:"💨", color:"#60a5fa", desc:"Drying in progress" },
  { key:"ironing",    label:"Ironing",          icon:"🔥", color:"#f59e0b", desc:"Being ironed & folded" },
  { key:"ready",      label:"Ready for Pickup", icon:"✅", color:"#10b981", desc:"Ready — come collect!" },
  { key:"collected",  label:"Collected",        icon:"🎉", color:"#34d399", desc:"Order collected by client" },
];

const PICKUP_STAGES = [
  { key:"pickup_scheduled",  label:"Scheduled",        icon:"📅", color:"#818cf8", desc:"Pickup request logged" },
  { key:"pickup_dispatched", label:"Driver Dispatched", icon:"🚗", color:"#00c6e0", desc:"Driver is on the way" },
  { key:"pickup_collected",  label:"Items Collected",   icon:"🧺", color:"#f59e0b", desc:"Items picked up from you" },
  { key:"pickup_processing", label:"Being Cleaned",     icon:"🫧", color:"#60a5fa", desc:"Your items are being cleaned" },
  { key:"pickup_ready",      label:"Ready for Delivery",icon:"📦", color:"#10b981", desc:"Clean & ready to deliver" },
  { key:"pickup_delivered",  label:"Delivered",         icon:"🎉", color:"#34d399", desc:"Delivered back to you!" },
];

const ALL_PICKUP_STAGE_KEYS = PICKUP_STAGES.map(s=>s.key);
const isPickupOrder = (order) => order?.orderType === "pickup" || ALL_PICKUP_STAGE_KEYS.includes(order?.stage);

const PAYMENT_METHODS = [
  { key:"cash",   label:"Cash",         icon:"💵", color:"#10b981" },
  { key:"momo",   label:"Mobile Money", icon:"📱", color:"#f59e0b" },
  { key:"card",   label:"Card",         icon:"💳", color:"#818cf8" },
  { key:"ussd",   label:"USSD (*447*2679#)", icon:"📞", color:"#10b981" },
];

const DEFAULT_PRICES = {
  "Wash & Fold": 15.00,
  "Dry Cleaning": 25.00,
  "Ironing Only": 10.00,
  "Duvet/Large": 35.00,
};

const ICON_OPTIONS   = ["Wash","Steam","Iron","Duvet","Fold","Bag","Star","Drop"];
const ACCENT_OPTIONS = ["#00c6e0","#10b981","#f59e0b","#818cf8","#f43f5e","#fb923c","#34d399","#60a5fa"];

const ROLES = [
  { key:"client", label:"Client", color:"#00c6e0", desc:"Enter your invoice number to track your order" },
  { key:"staff",  label:"Staff",  color:"#10b981", desc:"Manage laundry operations" },
  { key:"owner",  label:"Owner",  color:"#f59e0b", desc:"Full access & analytics" },
];

const DEFAULT_META = {
  "Wash & Fold":  { icon:"Wash",  accent:"#00c6e0" },
  "Dry Cleaning": { icon:"Steam", accent:"#10b981" },
  "Ironing Only": { icon:"Iron",  accent:"#f59e0b" },
  "Duvet/Large":  { icon:"Duvet", accent:"#818cf8" },
};

// ── Storage helpers ───────────────────────────────────────────────────────────
const loadOrders  = () => { try { return JSON.parse(localStorage.getItem(ORDERS_KEY)||"[]"); } catch { return []; } };
const saveOrders  = (orders) => localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
const loadPrices  = () => { try { const s=localStorage.getItem(PRICE_KEY); return s?JSON.parse(s):DEFAULT_PRICES; } catch { return DEFAULT_PRICES; } };
const loadStaff   = () => { try { return JSON.parse(localStorage.getItem(STAFF_KEY)||"[]"); } catch { return[]; } };
const saveStaff   = (staff) => localStorage.setItem(STAFF_KEY, JSON.stringify(staff));

// ── Sound Engine (Web Audio API — no external deps) ──────────────────────────
const AudioCtx = { ctx: null };
const getCtx = () => {
  if (!AudioCtx.ctx) AudioCtx.ctx = new (window.AudioContext || window.webkitAudioContext)();
  return AudioCtx.ctx;
};

const Sounds = {
  clientUpdate: () => {
    try {
      const ctx = getCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.13);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.13);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.13 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.13 + 0.45);
        osc.start(ctx.currentTime + i * 0.13); osc.stop(ctx.currentTime + i * 0.13 + 0.5);
      });
    } catch(e) {}
  },
  orderReady: () => {
    try {
      const ctx = getCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination); osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + i * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.55);
        osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.6);
      });
    } catch(e) {}
  },
  newBooking: () => {
    try {
      const ctx = getCtx();
      [[880, 0], [1108.73, 0.22], [880, 0.44], [1108.73, 0.66]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination); osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.18);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch(e) {}
  },
  paymentDone: () => {
    try {
      const ctx = getCtx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource(); const filt = ctx.createBiquadFilter();
      filt.type = "highpass"; filt.frequency.value = 1200;
      src.buffer = buf; src.connect(filt); filt.connect(ctx.destination); src.start();
      setTimeout(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine"; osc.frequency.setValueAtTime(1318.51, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        osc.start(); osc.stop(ctx.currentTime + 1);
      }, 80);
    } catch(e) {}
  },
};

// ── Toast Notification System ─────────────────────────────────────────────────
let _toastSetters = [];
const pushToast = (toast) => _toastSetters.forEach(fn => fn(prev => [...prev, { ...toast, id: Date.now() + Math.random() }]));

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _toastSetters.push(setToasts); return () => { _toastSetters = _toastSetters.filter(f => f !== setToasts); }; }, []);
  const remove = (id) => setToasts(p => p.filter(t => t.id !== id));
  useEffect(() => {
    if (toasts.length === 0) return;
    const t = toasts[toasts.length - 1];
    const timer = setTimeout(() => remove(t.id), t.duration || 4500);
    return () => clearTimeout(timer);
  }, [toasts]);
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:12, background: t.bg || "rgba(5,20,42,.97)", border: `1px solid ${t.border || "rgba(0,198,224,.3)"}`, borderLeft: `4px solid ${t.accent || "#00c6e0"}`, borderRadius:14, padding:"14px 16px", minWidth:280, maxWidth:360, boxShadow:"0 8px 32px rgba(0,0,0,.5)", pointerEvents:"all", animation:"sIn .3s ease", backdropFilter:"blur(20px)" }}>
          <span style={{ fontSize:22, flexShrink:0, lineHeight:1 }}>{t.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color: t.accent || "#00c6e0", marginBottom:3 }}>{t.title}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.55)", lineHeight:1.5 }}>{t.message}</div>
          </div>
          <button onClick={() => remove(t.id)} style={{ background:"transparent", border:"none", color:"rgba(255,255,255,.25)", cursor:"pointer", fontSize:16, padding:0, lineHeight:1, flexShrink:0 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:#020e1a; font-family:'DM Sans',sans-serif; }
  @keyframes logoGlow { 0%,100%{box-shadow:0 0 20px rgba(0,198,224,0.3),0 0 40px rgba(0,119,182,0.2);}50%{box-shadow:0 0 35px rgba(0,198,224,0.7),0 0 70px rgba(0,119,182,0.4);} }
  @keyframes spin     { to{transform:rotate(360deg);} }
  @keyframes shake    { 0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-7px);}40%,80%{transform:translateX(7px);} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);} }
  @keyframes floatUp  { 0%{transform:translateY(0) scale(1);opacity:0.1;}50%{opacity:0.15;}100%{transform:translateY(-100vh) scale(0.5);opacity:0;} }
  @keyframes sIn      { from{opacity:0;transform:translateX(-5px);}to{opacity:1;transform:translateX(0);} }
  @keyframes popIn    { from{opacity:0;transform:scale(0.92);}to{opacity:1;transform:scale(1);} }
  @keyframes pulse    { 0%,100%{opacity:1;}50%{opacity:0.5;} }
  @keyframes receiptSlide { from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);} }
  @keyframes stampIn  { 0%{opacity:0;transform:scale(2) rotate(-15deg);}60%{transform:scale(0.95) rotate(3deg);}100%{opacity:1;transform:scale(1) rotate(-4deg);} }
  input::placeholder { color:rgba(255,255,255,0.25); }
  input:focus { outline:none; }
  input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
  @media print {
    body { background: white !important; }
    .no-print { display: none !important; }
    .receipt-print { background: white !important; color: #000 !important; }
  }
`;

// ── Animated Background ───────────────────────────────────────────────────────
function DeepCitadelBackground() {
  const ref = useRef(null);
  useEffect(()=>{
    const canvas=ref.current, ctx=canvas.getContext("2d");
    let id,W,H; const B=[];
    const resize=()=>{W=canvas.width=canvas.offsetWidth;H=canvas.height=canvas.offsetHeight;};
    const initB=()=>{B.length=0;for(let i=0;i<28;i++)B.push({x:Math.random()*W,y:H+Math.random()*H,r:8+Math.random()*38,speed:.3+Math.random()*.7,drift:(Math.random()-.5)*.4,opacity:.04+Math.random()*.1,phase:Math.random()*Math.PI*2});};
    resize();initB();window.addEventListener("resize",()=>{resize();initB();});
    let t=0;
    const draw=()=>{
      t+=.008;ctx.clearRect(0,0,W,H);
      const bg=ctx.createLinearGradient(0,0,W*.6,H);bg.addColorStop(0,"#020e1a");bg.addColorStop(.4,"#021824");bg.addColorStop(.75,"#031e30");bg.addColorStop(1,"#041525");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      [[W*.15,H*.2,W*.45,"rgba(0,168,204,.13)"],[W*.85,H*.8,W*.4,"rgba(16,185,129,.1)"]].forEach(([cx,cy,r,c])=>{const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,c);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
      for(let w=0;w<5;w++){ctx.beginPath();ctx.strokeStyle=`rgba(0,180,220,${.025+w*.008})`;ctx.lineWidth=1.2;const y0=H*(.2+w*.16);for(let x=0;x<=W;x+=4){const y=y0+Math.sin((x/W)*Math.PI*3+t+w*1.1)*(18+w*6);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
      B.forEach(b=>{b.y-=b.speed;b.x+=Math.sin(t*.8+b.phase)*b.drift;if(b.y+b.r<0){b.y=H+b.r;b.x=Math.random()*W;}ctx.beginPath();const g=ctx.createRadialGradient(b.x-b.r*.3,b.y-b.r*.3,b.r*.1,b.x,b.y,b.r);g.addColorStop(0,`rgba(180,240,255,${b.opacity*1.5})`);g.addColorStop(.5,`rgba(0,180,220,${b.opacity})`);g.addColorStop(1,"rgba(0,100,160,0)");ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.strokeStyle=`rgba(180,240,255,${b.opacity*.8})`;ctx.lineWidth=.6;ctx.stroke();});
      ctx.strokeStyle="rgba(0,180,220,.022)";ctx.lineWidth=.5;for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      id=requestAnimationFrame(draw);
    };
    draw();return()=>{cancelAnimationFrame(id);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",zIndex:0,display:"block"}}/>;
}

function Particles(){
  const D=Array.from({length:14},(_,i)=>({id:i,s:Math.random()*4+2,l:Math.random()*100,d:Math.random()*8,dur:Math.random()*10+8,o:Math.random()*.12+.04}));
  return <>{D.map(d=><div key={d.id} style={{position:"fixed",borderRadius:"50%",width:d.s,height:d.s,left:`${d.l}%`,bottom:"-10px",background:`rgba(0,198,224,${d.o})`,animation:`floatUp ${d.dur}s ${d.d}s infinite linear`,pointerEvents:"none",zIndex:0}}/>)}</>;
}

// ── Shared UI pieces ──────────────────────────────────────────────────────────
function DCLogo({size="md"}){
  const big=size==="lg";
  const dim=big?80:42;
  return(
    <div style={{textAlign:"center",marginBottom:big?28:0}}>
      <div style={{width:dim,height:dim,borderRadius:big?"50%":"12px",margin:big?"0 auto 16px":0,background:"linear-gradient(135deg,#0077b6,#00c6e0)",display:"flex",alignItems:"center",justifyContent:"center",animation:big?"logoGlow 3s ease-in-out infinite":"none",boxShadow:"0 0 20px rgba(0,198,224,.4)",position:"relative",flexShrink:0,overflow:"hidden"}}>
        {big&&<div style={{position:"absolute",inset:-4,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"#00c6e0",borderRightColor:"rgba(0,198,224,.3)",animation:"spin 3s linear infinite",zIndex:1}}/>}
        <img src="/logo.jpg" alt="Deep Citadel Logo" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:big?"50%":"12px"}} onError={(e)=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
        <span style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:big?26:15,fontWeight:700,letterSpacing:-1,display:"none",position:"absolute"}}>DC</span>
      </div>
      {big&&<><h1 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:22,letterSpacing:1,margin:"0 0 4px"}}>Deep Citadel</h1><p style={{color:"rgba(255,255,255,.35)",fontSize:12,letterSpacing:2,textTransform:"uppercase"}}>Laundry Services</p></>}
    </div>
  );
}

const Icon={
  Eye:      ()=><svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>,
  EyeOff:   ()=><svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>,
  Mail:     ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/></svg>,
  Lock:     ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>,
  Invoice:  ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/><path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg>,
  Check:    ()=><svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>,
  Alert:    ()=><svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>,
  ArrowLeft:()=><svg width="11" height="11" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>,
  Minus:    ()=><svg width="11" height="11" fill="currentColor" viewBox="0 0 16 16"><path d="M2 8a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1z"/></svg>,
  Plus:     ()=><svg width="11" height="11" fill="currentColor" viewBox="0 0 16 16"><path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 0 1 0 2H9v4a1 1 0 0 1-2 0V9H3a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z"/></svg>,
  Trash:    ()=><svg width="11" height="11" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>,
  Print:    ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z"/></svg>,
  Cart:     ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.102 4l1.313 7h8.17l1.313-7H3.102zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>,
  User:     ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.03 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>,
  Phone:    ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>,
  Wash:     ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M9 9c1-1 3-1 4 0"/></svg>,
  Steam:    ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 17l3-6 3 6 3-6 3 6 3-6"/></svg>,
  Iron:     ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 17h12l4-8H8L4 17z"/><circle cx="7" cy="20" r="1.5"/><circle cx="14" cy="20" r="1.5"/></svg>,
  Duvet:    ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20M8 10v10M16 10v10"/></svg>,
  Fold:     ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h10"/></svg>,
  Bag:      ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Star:     ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Drop:     ()=><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
  Edit:     ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg>,
  Settings: ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.474l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>,
  SignOut:  ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/><path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/></svg>,
  Close:    ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>,
  Save:     ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/></svg>,
  Money:    ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4zm0 5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9zm0 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-1z"/></svg>,
  Receipt:  ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M1.92.506a.5.5 0 0 1 .434.14L3 1.293l.646-.647a.5.5 0 0 1 .708 0L5 1.293l.646-.647a.5.5 0 0 1 .708 0L7 1.293l.646-.647a.5.5 0 0 1 .708 0L9 1.293l.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .801.13l.5 1A.5.5 0 0 1 15 2v12a.5.5 0 0 1-.053.224l-.5 1a.5.5 0 0 1-.8.13L13 14.707l-.646.647a.5.5 0 0 1-.708 0L11 14.707l-.646.647a.5.5 0 0 1-.708 0L9 14.707l-.646.647a.5.5 0 0 1-.708 0L7 14.707l-.646.647a.5.5 0 0 1-.708 0L5 14.707l-.646.647a.5.5 0 0 1-.708 0L3 14.707l-.646.647a.5.5 0 0 1-.801-.13l-.5-1A.5.5 0 0 1 1 14V2a.5.5 0 0 1 .053-.224l.5-1a.5.5 0 0 1 .367-.27zm.217 1.338L2 2.118v11.764l.137.274.51-.51a.5.5 0 0 1 .707 0l.646.647.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.646.646.646-.646a.5.5 0 0 1 .708 0l.509.509.137-.274V2.118l-.137-.274-.51.51a.5.5 0 0 1-.707 0L12 1.707l-.646.647a.5.5 0 0 1-.708 0L10 1.707l-.646.647a.5.5 0 0 1-.708 0L8 1.707l-.646.647a.5.5 0 0 1-.708 0L6 1.707l-.646.647a.5.5 0 0 1-.708 0L4 1.707l-.646.647a.5.5 0 0 1-.708 0l-.509-.51z"/><path d="M3 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 1 1 0 1h-6a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5zm8-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/></svg>,
  // Staff icon
  Team:     ()=><svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.784 6A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>,
  Key:      ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M0 8a4 4 0 0 1 7.465-2H14L15 7l1 1-1 1-1 1-1-1-1 1-1-1-1 1-1-1-1 1L7.465 10A4 4 0 0 1 0 8Zm4-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>,
  Shield:   ()=><svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.775 11.775 0 0 1-2.517 2.453 7.159 7.159 0 0 1-1.048.625c-.28.132-.581.24-.883.24s-.604-.108-.883-.24a7.158 7.158 0 0 1-1.048-.625 11.777 11.777 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 62.456 62.456 0 0 1 5.072.56z"/></svg>,
};

// ── Payment Recording Modal ───────────────────────────────────────────────────
function PaymentModal({ order, onClose, onPaid }) {
  const [method, setMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState(order.total.toFixed(2));
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const change = parseFloat(amountPaid) - order.total;
  const isValid = parseFloat(amountPaid) >= order.total;

  const handlePay = () => {
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      const payment = { method, amountPaid: parseFloat(amountPaid), change: Math.max(0, change), note: note.trim(), paidAt: new Date().toISOString(), recordedBy: "staff" };
      onPaid(order.id, payment);
      setLoading(false); setDone(true);
    }, 900);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",padding:16,overflowY:"auto" }}>
      <div style={{ background:"rgba(5,18,40,.98)",border:"1px solid rgba(0,198,224,.25)",borderRadius:24,padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 70px rgba(0,0,0,.8)",animation:"popIn .25s ease",margin:"auto" }}>
        {!done ? <>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
            <div>
              <h3 style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:19,marginBottom:4 }}>Record Payment</h3>
              <div style={{ fontFamily:"monospace",fontSize:12,color:"#00c6e0",background:"rgba(0,198,224,.1)",border:"1px solid rgba(0,198,224,.2)",padding:"2px 10px",borderRadius:20,display:"inline-block" }}>{order.invoiceNumber}</div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><Icon.Close /></button>
          </div>
          <div style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff" }}>{order.customer.name}</div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2 }}>{order.customer.phone}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase" }}>Amount Due</div>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#f59e0b" }}>₵{order.total.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:10 }}>Payment Method</label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.key} onClick={() => setMethod(pm.key)} style={{ padding:"12px 8px",borderRadius:12,border:`2px solid ${method===pm.key?pm.color:"rgba(255,255,255,.08)"}`,background:method===pm.key?`${pm.color}1a`:"rgba(255,255,255,.03)",color:method===pm.key?pm.color:"rgba(255,255,255,.4)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                  <span style={{ fontSize:20 }}>{pm.icon}</span>{pm.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>Amount Tendered (₵)</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.4)",fontSize:16,fontFamily:"'Syne',sans-serif",fontWeight:700 }}>₵</span>
              <input type="number" min={order.total} step="0.50" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} style={{ width:"100%",padding:"13px 14px 13px 30px",borderRadius:12,border:`1.5px solid ${isValid?"rgba(16,185,129,.4)":"rgba(239,68,68,.4)"}`,background:"rgba(0,0,0,.3)",color:"#fff",fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:700,outline:"none" }}/>
            </div>
            {parseFloat(amountPaid) > order.total && (
              <div style={{ marginTop:8,display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:10,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)" }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>Change to return:</span>
                <span style={{ fontSize:13,fontWeight:700,color:"#10b981",fontFamily:"'Syne',sans-serif" }}>₵{change.toFixed(2)}</span>
              </div>
            )}
            {parseFloat(amountPaid) < order.total && (
              <div style={{ marginTop:8,padding:"8px 12px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",fontSize:12,color:"#fca5a5",display:"flex",gap:6,alignItems:"center" }}>
                <Icon.Alert /> Amount is less than total due
              </div>
            )}
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>Note (optional)</label>
            <input name="note" type="text" placeholder="e.g. Paid in full, partial deposit…" value={note} onChange={e => setNote(e.target.value)} style={{ width:"100%",padding:"11px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"#fff",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none" }}/>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer" }}>Cancel</button>
            <button onClick={handlePay} disabled={!isValid || loading} style={{ flex:2,padding:"13px",borderRadius:12,border:"none",background:isValid?"linear-gradient(135deg,#059669,#10b981)":"rgba(255,255,255,.05)",color:isValid?"#fff":"rgba(255,255,255,.2)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:isValid?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:isValid?"0 4px 18px rgba(16,185,129,.3)":"none" }}>
              {loading ? <span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block" }}/> : <><Icon.Receipt /> Confirm Payment</>}
            </button>
          </div>
        </> : (
          <div style={{ textAlign:"center",padding:"10px 0" }}>
            <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(16,185,129,.15)",border:"2px solid #10b981",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:32 }}>✅</div>
            <h3 style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:20,marginBottom:8 }}>Payment Recorded!</h3>
            <p style={{ color:"rgba(255,255,255,.4)",fontSize:13,marginBottom:24,lineHeight:1.6 }}>Receipt is now available for <span style={{ color:"#00c6e0",fontFamily:"monospace" }}>{order.invoiceNumber}</span>.</p>
            <button onClick={onClose} style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Digital Receipt Component ─────────────────────────────────────────────────
function DigitalReceipt({ order, onClose }) {
  const pm = PAYMENT_METHODS.find(p => p.key === order.payment?.method) || PAYMENT_METHODS[0];
  const paidAt = order.payment?.paidAt ? new Date(order.payment.paidAt) : null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",backdropFilter:"blur(10px)",padding:16,overflowY:"auto" }}>
      <div style={{ width:"100%",maxWidth:420,animation:"receiptSlide .4s ease" }}>
        <div className="no-print" style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(255,255,255,.6)",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6 }}><Icon.Close /> Close</button>
        </div>
        <div className="receipt-print" style={{ background:"rgba(5,18,40,.97)",border:"1px solid rgba(0,198,224,.2)",borderRadius:24,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.7)" }}>
          <div style={{ background:"linear-gradient(135deg,#020e1a,#031e30)",borderBottom:"1px dashed rgba(0,198,224,.2)",padding:"28px 28px 22px",textAlign:"center",position:"relative" }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#0077b6,#00c6e0)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 0 20px rgba(0,198,224,.4)" }}>
              <span style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:17,fontWeight:700 }}>DC</span>
            </div>
            <div style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18,letterSpacing:1,marginBottom:2 }}>Deep Citadel</div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",letterSpacing:2,textTransform:"uppercase" }}>Laundry Services</div>
            <div style={{ marginTop:14,display:"inline-block",background:"rgba(16,185,129,.12)",border:"1px solid rgba(16,185,129,.35)",borderRadius:20,padding:"5px 18px" }}>
              <span style={{ fontSize:12,color:"#10b981",fontWeight:700,letterSpacing:1 }}>✓ PAID RECEIPT</span>
            </div>
          </div>
          <div style={{ position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:12,right:16,background:"rgba(16,185,129,.12)",border:"2px solid rgba(16,185,129,.5)",borderRadius:8,padding:"4px 12px",transform:"rotate(-4deg)",animation:"stampIn .5s ease .2s both",zIndex:10 }}>
              <div style={{ fontFamily:"'Cinzel',serif",color:"#10b981",fontSize:18,fontWeight:700,letterSpacing:3 }}>PAID</div>
            </div>
          </div>
          <div style={{ padding:"0 28px 28px" }}>
            <div style={{ paddingTop:20,borderBottom:"1px dashed rgba(255,255,255,.08)",paddingBottom:16,marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>Invoice</span>
                <span style={{ fontFamily:"monospace",fontSize:13,color:"#00c6e0",fontWeight:700 }}>{order.invoiceNumber}</span>
              </div>
              {paidAt && (
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>Payment Date</span>
                  <span style={{ fontSize:12,color:"rgba(255,255,255,.7)" }}>{paidAt.toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"})}</span>
                </div>
              )}
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>Payment Time</span>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.7)" }}>{paidAt ? paidAt.toLocaleTimeString("en-GH",{hour:"2-digit",minute:"2-digit"}) : "—"}</span>
              </div>
            </div>
            <div style={{ borderBottom:"1px dashed rgba(255,255,255,.08)",paddingBottom:16,marginBottom:16 }}>
              <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:8 }}>Customer</div>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#fff",fontSize:15 }}>{order.customer.name}</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:3 }}>{order.customer.phone}</div>
            </div>
            <div style={{ borderBottom:"1px dashed rgba(255,255,255,.08)",paddingBottom:16,marginBottom:16 }}>
              <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>Items</div>
              {order.items.map((item, i) => (
                <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13,color:"rgba(255,255,255,.8)" }}>{item.name}</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",marginTop:1 }}>{item.qty} × ₵{item.unitPrice.toFixed(2)}</div>
                  </div>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#00c6e0" }}>₵{item.subtotal.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div style={{ borderBottom:"1px dashed rgba(255,255,255,.08)",paddingBottom:16,marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>Subtotal</span>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>₵{order.total.toFixed(2)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.4)" }}>Tax / VAT</span>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>₵0.00</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.1)" }}>
                <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff" }}>TOTAL</span>
                <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#10b981" }}>₵{order.total.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ background:`${pm.color}0f`,border:`1px solid ${pm.color}33`,borderRadius:14,padding:"14px 16px",marginBottom:20 }}>
              <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10 }}>Payment Details</div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.5)",display:"flex",alignItems:"center",gap:6 }}>{pm.icon} Method</span>
                <span style={{ fontSize:13,color:pm.color,fontWeight:700 }}>{pm.label}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>Tendered</span>
                <span style={{ fontSize:13,color:"rgba(255,255,255,.8)",fontWeight:600 }}>₵{(order.payment?.amountPaid||order.total).toFixed(2)}</span>
              </div>
              {(order.payment?.change||0) > 0 && (
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:12,color:"rgba(255,255,255,.5)" }}>Change Given</span>
                  <span style={{ fontSize:13,color:"#10b981",fontWeight:600 }}>₵{order.payment.change.toFixed(2)}</span>
                </div>
              )}
              {order.payment?.note && (
                <div style={{ marginTop:8,paddingTop:8,borderTop:`1px solid ${pm.color}22`,fontSize:11,color:"rgba(255,255,255,.4)",fontStyle:"italic" }}>Note: {order.payment.note}</div>
              )}
            </div>
            <div style={{ textAlign:"center",marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"center",gap:1.5,marginBottom:6 }}>
                {Array.from({length:32},(_,i)=>(
                  <div key={i} style={{ width:Math.random()>0.5?2:1,height:i%5===0?28:20,background:"rgba(0,198,224,0.3)",borderRadius:1 }}/>
                ))}
              </div>
              <div style={{ fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,.2)",letterSpacing:3 }}>{order.invoiceNumber}</div>
            </div>
            <div style={{ textAlign:"center",paddingTop:12,borderTop:"1px dashed rgba(255,255,255,.08)" }}>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.3)",lineHeight:1.7 }}>
                Thank you for choosing Deep Citadel<br/>
                <span style={{ color:"rgba(0,198,224,.4)" }}>Powerful Clean. Trusted Care.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="no-print" style={{ marginTop:14,display:"flex",gap:10 }}>
          <button onClick={() => window.print()} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",borderRadius:12,border:"1px solid rgba(0,198,224,.3)",background:"rgba(0,198,224,.08)",color:"#00c6e0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer" }}>
            <Icon.Print /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login Input ───────────────────────────────────────────────────────────────
function LoginInput({icon,type,placeholder,value,onChange,error,right}){
  return(
    <div style={{marginBottom:error?6:16}}>
      <div style={{position:"relative",display:"flex",alignItems:"center"}}>
        <span style={{position:"absolute",left:14,color:error?"#ef4444":"rgba(255,255,255,.3)",zIndex:1,display:"flex"}}>{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{width:"100%",padding:"12px 14px 12px 42px",paddingRight:right?42:14,borderRadius:12,border:`1.5px solid ${error?"#ef4444":value?"#00c6e0":"rgba(255,255,255,.12)"}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",transition:"border-color .2s,box-shadow .2s",boxShadow:error?"0 0 0 3px rgba(239,68,68,.1)":value?"0 0 0 3px rgba(0,198,224,.08)":"none"}}/>
        {right&&<span style={{position:"absolute",right:14,zIndex:1}}>{right}</span>}
      </div>
      {error&&<p style={{color:"#fca5a5",fontSize:11,display:"flex",alignItems:"center",gap:4,marginTop:5}}><Icon.Alert/> {error}</p>}
    </div>
  );
}

function SubmitBtn({loading,label,type="button",onClick}){
  return(
    <button type={type} onClick={onClick} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",border:"none",fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 20px rgba(0,119,182,.4)",cursor:loading?"not-allowed":"pointer",opacity:loading?.8:1}}>
      {loading?<span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>Please wait…</span>:label}
    </button>
  );
}

// ── Top Nav Bar ───────────────────────────────────────────────────────────────
function TopNav({role,subtitle,onLogout,onBack,extra}){
  const rc=ROLES.find(r=>r.key===role)?.color||"#00c6e0";
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <DCLogo size="sm"/>
        <div style={{marginLeft:4}}>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:20,color:"#fff",letterSpacing:.5}}>Deep Citadel</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.35)",letterSpacing:2,textTransform:"uppercase"}}>{subtitle}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {extra}
        {onBack&&<button onClick={onBack} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",color:"#f59e0b",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,.18)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(245,158,11,.08)"}><Icon.ArrowLeft/> Dashboard</button>}
        <div style={{background:`${rc}18`,border:`1px solid ${rc}44`,color:rc,fontSize:11,fontWeight:600,letterSpacing:1.5,padding:"5px 14px",borderRadius:20,textTransform:"uppercase"}}>● {role}</div>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="rgba(255,255,255,.25)";}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.5)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";}}>
          <Icon.SignOut/> Sign Out
        </button>
      </div>
    </div>
  );
}

const GP = {background:"rgba(5,25,45,.65)",border:"1px solid rgba(0,198,224,.12)",borderRadius:20,backdropFilter:"blur(20px)",padding:24,boxShadow:"0 8px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)"};

// ── Order Progress Bar ────────────────────────────────────────────────────────
function OrderProgressBar({stage}){
  const idx = ORDER_STAGES.findIndex(s=>s.key===stage);
  const pct  = Math.round(((idx+1)/ORDER_STAGES.length)*100);
  const cur  = ORDER_STAGES[idx]||ORDER_STAGES[0];
  return(
    <div>
      <div style={{height:6,background:"rgba(255,255,255,.07)",borderRadius:10,marginBottom:18,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#0077b6,${cur.color})`,borderRadius:10,transition:"width .6s ease",boxShadow:`0 0 10px ${cur.color}66`}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",position:"relative"}}>
        <div style={{position:"absolute",top:14,left:"6%",right:"6%",height:2,background:"rgba(255,255,255,.06)",zIndex:0}}/>
        {ORDER_STAGES.map((s,i)=>{
          const done=i<=idx; const active=i===idx;
          return(
            <div key={s.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,zIndex:1,flex:1}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,.06)",border:`2px solid ${done?s.color:"rgba(255,255,255,.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:active?`0 0 14px ${s.color}88`:"none",transition:"all .4s",animation:active?"pulse 2s ease-in-out infinite":"none"}}>
                {done?<span style={{fontSize:11}}>✓</span>:<span style={{fontSize:11,opacity:.3}}>○</span>}
              </div>
              <div style={{fontSize:9,color:done?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)",textAlign:"center",lineHeight:1.3,letterSpacing:.3,maxWidth:52}}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:16,display:"flex",alignItems:"center",gap:10,background:`${cur.color}15`,border:`1px solid ${cur.color}44`,borderRadius:12,padding:"10px 14px"}}>
        <span style={{fontSize:20}}>{cur.icon}</span>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:cur.color}}>{cur.label}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{cur.desc}</div>
        </div>
        <div style={{marginLeft:"auto",fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"'Syne',sans-serif",fontWeight:700}}>{pct}%</div>
      </div>
    </div>
  );
}

// ── Get stage info from either stage array ────────────────────────────────────
function getStageInfo(stage) {
  return PICKUP_STAGES.find(s=>s.key===stage) || ORDER_STAGES.find(s=>s.key===stage) || ORDER_STAGES[0];
}

// ── Pickup Order Progress Bar ─────────────────────────────────────────────────
function PickupProgressBar({stage}){
  const idx = PICKUP_STAGES.findIndex(s=>s.key===stage);
  const pct  = Math.round(((idx+1)/PICKUP_STAGES.length)*100);
  const cur  = PICKUP_STAGES[idx]||PICKUP_STAGES[0];
  return(
    <div>
      <div style={{height:6,background:"rgba(255,255,255,.07)",borderRadius:10,marginBottom:18,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#6366f1,${cur.color})`,borderRadius:10,transition:"width .6s ease",boxShadow:`0 0 10px ${cur.color}66`}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",position:"relative"}}>
        <div style={{position:"absolute",top:14,left:"4%",right:"4%",height:2,background:"rgba(255,255,255,.06)",zIndex:0}}/>
        {PICKUP_STAGES.map((s,i)=>{
          const done=i<=idx; const active=i===idx;
          return(
            <div key={s.key} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,zIndex:1,flex:1}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,.06)",border:`2px solid ${done?s.color:"rgba(255,255,255,.12)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,boxShadow:active?`0 0 14px ${s.color}88`:"none",transition:"all .4s",animation:active?"pulse 2s ease-in-out infinite":"none"}}>
                {done?<span style={{fontSize:10}}>✓</span>:<span style={{fontSize:10,opacity:.3}}>○</span>}
              </div>
              <div style={{fontSize:8,color:done?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)",textAlign:"center",lineHeight:1.3,letterSpacing:.3,maxWidth:48}}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:16,display:"flex",alignItems:"center",gap:10,background:`${cur.color}15`,border:`1px solid ${cur.color}44`,borderRadius:12,padding:"10px 14px"}}>
        <span style={{fontSize:20}}>{cur.icon}</span>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:cur.color}}>{cur.label}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{cur.desc}</div>
        </div>
        <div style={{marginLeft:"auto",fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"'Syne',sans-serif",fontWeight:700}}>{pct}%</div>
      </div>
    </div>
  );
}

// ── Schedule Pickup Modal (client-facing) ─────────────────────────────────────
function SchedulePickupModal({ customer, onClose, onSubmit }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const minDate = tomorrow.toISOString().slice(0,10);

  const services = [
    { name: "Wash & Fold", price: 15, unit: "per kg", color: "#4cc9f0" },
    { name: "Dry Cleaning", price: 25, unit: "per item", color: "#4895ef" },
    { name: "Ironing Only", price: 10, unit: "per item", color: "#4361ee" },
    { name: "Duvet / Large", price: 35, unit: "per item", color: "#7209b7" },
  ];

  const [form, setForm] = useState({
    name: customer?.name||"",
    date: minDate,
    time: "09:00",
    address: "",
    addressNote: "",
    items: "",
    phone: customer?.phone||"",
  });
  const [location, setLocation] = useState(null);
  const [selectedServices, setSelectedServices] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    "07:00","08:00","09:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00","17:00","18:00",
  ];

  const toggleService = (name) => {
    setSelectedServices(prev => {
      if (prev[name]) {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      }
      return { ...prev, [name]: 1 };
    });
    setErrors(p => ({ ...p, items: "" }));
  };

  const updateServiceQty = (name, delta) => {
    setSelectedServices(prev => ({
      ...prev,
      [name]: Math.max(1, (prev[name] || 1) + delta)
    }));
  };

  const selectedServicesList = Object.entries(selectedServices).map(([name, qty]) => {
    const svc = services.find(s => s.name === name);
    return { name, qty, price: svc?.price || 0, unit: svc?.unit || "" };
  });

  const totalEstimate = selectedServicesList.reduce((sum, s) => sum + (s.price * s.qty), 0);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Your name is required.";
    if (!location) e.address = "Please pin your pickup location on the map.";
    if (Object.keys(selectedServices).length === 0) e.items = "Please select at least one service.";
    if (!form.phone.trim())   e.phone   = "Phone number is required.";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    
    const orderData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      services: selectedServicesList.map(s => ({ name: s.name, qty: s.qty })),
      pickup_date: form.date,
      pickup_time: form.time,
      address: form.address.trim() || "Location pinned on map",
      address_note: form.addressNote.trim(),
      location: location,
    };
    
    try {
      const result = await userAPI.placeOrder(orderData);
      setLoading(false);
      onSubmit(result.invoice_id || result.invoiceNumber);
    } catch (err) {
      console.log("API placeOrder failed, using localStorage:", err.message);
      // Fallback to localStorage
      const existing = loadOrders();
      const num = `INV-${String(existing.length+1).padStart(3,"0")}`;
      const pickupOrder = {
        id: `pickup-${Date.now()}`,
        invoiceNumber: num,
        orderType: "pickup",
        customer: { name: form.name.trim(), phone: form.phone.trim() },
        pickup: {
          date: form.date,
          time: form.time,
          address: form.address.trim() || "Location pinned on map",
          addressNote: form.addressNote.trim(),
          location: location,
          scheduledAt: new Date().toISOString(),
        },
        assignedStaff: null,
        items: selectedServicesList.map(s => ({ name: s.name, qty: s.qty, unitPrice: s.price, unit: s.unit, subtotal: s.price * s.qty })),
        total: totalEstimate,
        stage: "pickup_scheduled",
        createdAt: new Date().toISOString(),
        paymentStatus: "pending",
      };
      const updated = [...existing, pickupOrder];
      saveOrders(updated);
      setLoading(false);
      onSubmit(num);
    }
  };

  const f = (field, val) => { 
    // console.log(`f(${field}):`, val);
    setForm(p=>({...p,[field]:val})); 
    setErrors(p=>({...p,[field]:""})); 
  };

  const inputBase = (hasErr) => ({
    width:"100%", padding:"11px 14px", borderRadius:12,
    border:`1.5px solid ${hasErr?"#ef4444":"rgba(255,255,255,.12)"}`,
    background:"rgba(255,255,255,.05)", color:"#fff", fontSize:13,
    fontFamily:"'DM Sans',sans-serif", outline:"none",
  });

  return (
    <div style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",backdropFilter:"blur(10px)",padding:16,overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:520,animation:"popIn .25s ease",margin:"auto"}}>
        {/* Header */}
        <div style={{background:"rgba(5,18,40,.99)",border:"1px solid rgba(99,102,241,.3)",borderRadius:24,padding:32,boxShadow:"0 24px 70px rgba(0,0,0,.8)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <h2 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:22,marginBottom:4}}>Schedule a Pickup</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.35)",lineHeight:1.5}}>We'll come to you — fill in your details and we'll handle the rest.</p>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}><Icon.Close/></button>
          </div>

          {/* Purple accent strip */}
          <div style={{height:3,background:"linear-gradient(90deg,#6366f1,#818cf8,#00c6e0)",borderRadius:10,marginBottom:24}}/>

          {/* Name */}
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Your Name *</label>
          <div style={{position:"relative",marginBottom:errors.name?4:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex"}}><Icon.User/></span>
            <input name="name" type="text" placeholder="e.g. Kofi Mensah" value={form.name} onChange={e=>f("name",e.target.value)}
              style={{...inputBase(errors.name), paddingLeft:42}}/>
          </div>
          {errors.name&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center"}}><Icon.Alert/>{errors.name}</p>}

          {/* Date & Time row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div>
              <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Pickup Date</label>
              <input type="date" min={minDate} value={form.date} onChange={e=>f("date",e.target.value)}
                style={{...inputBase(false), colorScheme:"dark"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Preferred Time</label>
              <select value={form.time} onChange={e=>f("time",e.target.value)}
                style={{...inputBase(false), cursor:"pointer"}}>
                {timeSlots.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Phone */}
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Contact Phone</label>
          <div style={{position:"relative",marginBottom:errors.phone?4:16}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex"}}><Icon.Phone/></span>
            <input name="phone" type="tel" placeholder="e.g. 0241234567" value={form.phone} onChange={e=>f("phone",e.target.value)}
              style={{...inputBase(errors.phone), paddingLeft:42}}/>
          </div>
          {errors.phone&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center"}}><Icon.Alert/>{errors.phone}</p>}

          {/* Map Location */}
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Pickup Location *</label>
          <MapPicker 
            value={location} 
            onChange={(loc) => { setLocation(loc); setErrors(p => ({...p, address: ""})); }} 
            height={220}
          />
          {errors.address&&<p style={{color:"#fca5a5",fontSize:11,marginTop:4,marginBottom:8,display:"flex",gap:4,alignItems:"center"}}><Icon.Alert/>{errors.address}</p>}

          {/* Address text */}
          <input name="address" type="text" placeholder="Address label (e.g. Kwabena's House, East Legon)…" value={form.address} onChange={e=>f("address",e.target.value)}
            style={{...inputBase(false), marginBottom:10, fontSize:12}}/>
          <input name="addressNote" type="text" placeholder="Landmark / extra directions (optional)" value={form.addressNote} onChange={e=>f("addressNote",e.target.value)}
            style={{...inputBase(false), marginBottom:16, fontSize:12, color:"rgba(255,255,255,.6)"}}/>

          {/* Service Selection */}
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Select Services *</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:errors.items?4:12}}>
            {services.map(svc => {
              const isSelected = !!selectedServices[svc.name];
              return (
                <div
                  key={svc.name}
                  onClick={() => toggleService(svc.name)}
                  style={{
                    padding:"14px 12px",
                    borderRadius:14,
                    border:`2px solid ${isSelected ? svc.color : "rgba(255,255,255,.1)"}`,
                    background: isSelected ? `${svc.color}18` : "rgba(255,255,255,.03)",
                    cursor:"pointer",
                    transition:"all .2s ease",
                    position:"relative",
                  }}
                >
                  {isSelected && (
                    <div style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:svc.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                  <div style={{fontWeight:700,fontSize:12,color:"#fff",marginBottom:4}}>{svc.name}</div>
                  <div style={{fontSize:15,fontWeight:800,color:svc.color}}>GHS {svc.price}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:2}}>{svc.unit}</div>
                  {isSelected && (
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:10,background:"rgba(0,0,0,.2)",borderRadius:10,padding:"6px 0"}}
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => updateServiceQty(svc.name, -1)}
                        style={{width:28,height:28,borderRadius:8,border:"none",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
                      <span style={{fontWeight:800,fontSize:14,color:"#fff",minWidth:24,textAlign:"center"}}>{selectedServices[svc.name]}</span>
                      <button onClick={() => updateServiceQty(svc.name, 1)}
                        style={{width:28,height:28,borderRadius:8,border:"none",background:svc.color,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.items&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:8,display:"flex",gap:4,alignItems:"center"}}><Icon.Alert/>{errors.items}</p>}
          {Object.keys(selectedServices).length > 0 && (
            <div style={{background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:12,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>Estimated Total</span>
              <span style={{fontSize:18,fontWeight:800,color:"#10b981"}}>GHS {totalEstimate}</span>
            </div>
          )}

          {/* Special Instructions */}
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Special Instructions (Optional)</label>
          <textarea placeholder="Any special notes? e.g. delicate fabrics, specific requests…" value={form.items} onChange={e=>f("items",e.target.value)}
            rows={2} style={{...inputBase(false), marginBottom:16, resize:"vertical", lineHeight:1.6}}/>


          {/* Info box */}
          <div style={{background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:12,padding:"12px 14px",marginBottom:24}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.7}}>
              <span style={{color:"#818cf8",fontWeight:700}}>💡 How it works: </span>
              After scheduling, you'll receive an invoice number. Our staff will confirm your booking and dispatch a driver at your selected time. Pricing is confirmed on pickup — payment can be made via your invoice number once items are processed.
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 18px rgba(99,102,241,.35)"}}>
              {loading?<span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>:<>📅 Confirm Pickup</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pickup Payment Modal (client pays by invoice) ─────────────────────────────
function PickupPaymentModal({ onClose }) {
  const CONFIRM_DELAY_MS = 5 * 60 * 1000; // 5 minutes
  const [step, setStep] = useState("invoice"); // invoice | payment | awaiting | confirmed | notfound
  const [invInput, setInvInput] = useState("");
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(CONFIRM_DELAY_MS / 1000);
  const [invErr, setInvErr] = useState("");

  // Countdown timer for awaiting step
  useEffect(() => {
    if (step !== "awaiting") return;
    if (countdown <= 0) { setStep("confirmed"); return; }
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); setStep("confirmed"); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [step, countdown]);

  const lookupInvoice = () => {
    if (!invInput.trim()) { setInvErr("Enter your invoice number."); return; }
    setLoading(true);
    setTimeout(() => {
      const orders = loadOrders();
      const found = orders.find(o => o.invoiceNumber.toUpperCase() === invInput.trim().toUpperCase());
      setLoading(false);
      if (!found) { setStep("notfound"); return; }
      if (found.paymentStatus === "confirmed" || found.payment) { setOrder(found); setStep("alreadypaid"); return; }
      setOrder(found);
      setAmountPaid(found.total > 0 ? found.total.toFixed(2) : "");
      setStep("payment");
    }, 900);
  };

  const submitPayment = async () => {
    if (!method) return;
    const amt = parseFloat(amountPaid);
    if (order.total > 0 && (isNaN(amt) || amt < order.total)) return;
    setLoading(true);
    
    const paymentData = {
      method: method,
      amount: order.total > 0 ? amt : 0,
      transaction_id: method === "momo" ? order.invoiceNumber : null,
    };
    
    try {
      await userAPI.submitPayment(order.invoiceNumber, paymentData);
      setLoading(false);
      setCountdown(CONFIRM_DELAY_MS / 1000);
      setStep("awaiting");
    } catch (err) {
      console.log("API submitPayment failed, using localStorage:", err.message);
      // Fallback
      const payment = {
        method,
        amountPaid: order.total > 0 ? amt : 0,
        change: order.total > 0 ? Math.max(0, amt - order.total) : 0,
        paidAt: new Date().toISOString(),
        confirmedAt: new Date(Date.now() + CONFIRM_DELAY_MS).toISOString(),
      };
      const updated = loadOrders().map(o =>
        o.id === order.id
          ? { ...o, paymentStatus: "awaiting_confirmation", paymentSubmittedAt: new Date().toISOString(), paymentPending: payment }
          : o
      );
      saveOrders(updated);
      setLoading(false);
      setCountdown(CONFIRM_DELAY_MS / 1000);
      setStep("awaiting");
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s/60), sec = s%60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const pct = ((CONFIRM_DELAY_MS/1000 - countdown) / (CONFIRM_DELAY_MS/1000)) * 100;
  const isPickup = order && isPickupOrder(order);

  return (
    <div style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",backdropFilter:"blur(10px)",padding:16,overflowY:"auto"}}>
      <div style={{background:"rgba(5,18,40,.99)",border:"1px solid rgba(0,198,224,.25)",borderRadius:24,padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 70px rgba(0,0,0,.8)",animation:"popIn .25s ease",margin:"auto"}}>

        {/* Step: enter invoice */}
        {step==="invoice"&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
            <div>
              <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:20,marginBottom:4}}>Pay by Invoice</h3>
              <p style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>Enter your invoice number to proceed with payment</p>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Icon.Close/></button>
          </div>
          <div style={{position:"relative",marginBottom:invErr?4:20}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex"}}><Icon.Invoice/></span>
            <input name="invoice" type="text" placeholder="e.g. INV-005" value={invInput}
              onChange={e=>{setInvInput(e.target.value.toUpperCase());setInvErr("");}}
              onKeyDown={e=>e.key==="Enter"&&lookupInvoice()}
              style={{width:"100%",padding:"13px 14px 13px 42px",borderRadius:12,border:`1.5px solid ${invErr?"#ef4444":invInput?"#00c6e0":"rgba(255,255,255,.12)"}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:15,fontFamily:"monospace",fontWeight:700,outline:"none"}}/>
          </div>
          {invErr&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center"}}><Icon.Alert/>{invErr}</p>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
            <button onClick={lookupInvoice} disabled={loading} style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?<span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>:"Look Up Invoice →"}
            </button>
          </div>
        </>}

        {/* Step: not found */}
        {step==="notfound"&&<div style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔍</div>
          <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18,marginBottom:8}}>Invoice Not Found</h3>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13,lineHeight:1.6,marginBottom:24}}>We couldn't find <span style={{color:"#00c6e0",fontFamily:"monospace"}}>{invInput}</span>. Double-check the number from your receipt or booking confirmation.</p>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setStep("invoice");setInvInput("");}} style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Try Again</button>
            <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Close</button>
          </div>
        </div>}

        {/* Step: already paid */}
        {step==="alreadypaid"&&<div style={{textAlign:"center"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(16,185,129,.15)",border:"2px solid #10b981",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>✅</div>
          <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18,marginBottom:8}}>Already Paid</h3>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:13,lineHeight:1.6,marginBottom:8}}>Invoice <span style={{color:"#00c6e0",fontFamily:"monospace"}}>{order?.invoiceNumber}</span> has already been paid and confirmed.</p>
          <p style={{color:"rgba(255,255,255,.3)",fontSize:12,marginBottom:24}}>Log in with your invoice number to view your receipt.</p>
          <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Close</button>
        </div>}

        {/* Step: payment */}
        {step==="payment"&&order&&<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:19,marginBottom:4}}>Complete Payment</h3>
              <div style={{fontFamily:"monospace",fontSize:12,color:isPickup?"#818cf8":"#00c6e0",background:isPickup?"rgba(99,102,241,.1)":"rgba(0,198,224,.1)",border:`1px solid ${isPickup?"rgba(99,102,241,.2)":"rgba(0,198,224,.2)"}`,padding:"2px 10px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:6}}>
                {isPickup&&<span>🚗</span>}{order.invoiceNumber}
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Icon.Close/></button>
          </div>

          {/* Order summary card */}
          <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:"14px 16px",marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff"}}>{order.customer.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>{order.customer.phone}</div>
                {isPickup&&<div style={{fontSize:11,color:"#818cf8",marginTop:4}}>📍 {order.pickup?.address}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase"}}>Amount Due</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color: order.total===0?"rgba(255,255,255,.5)":"#f59e0b"}}>
                  {order.total===0 ? "TBD on pickup" : `₵${order.total.toFixed(2)}`}
                </div>
              </div>
            </div>
          </div>

          {order.total === 0 ? (
            // Pickup with no price set yet — just confirm intent
            <div style={{background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.2)",borderRadius:12,padding:"14px 16px",marginBottom:24}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.6)",lineHeight:1.7}}>
                <span style={{color:"#818cf8",fontWeight:700}}>📋 Pickup booking confirmed.</span><br/>
                Pricing will be determined once our team assesses your items. You'll be able to complete payment after items are processed. A confirmation will be sent within 5 minutes of driver dispatch.
              </div>
            </div>
          ) : <>
            {/* Payment method */}
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:10}}>Payment Method</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {PAYMENT_METHODS.map(pm=>(
                  <button key={pm.key} onClick={()=>setMethod(pm.key)} style={{padding:"11px 8px",borderRadius:12,border:`2px solid ${method===pm.key?pm.color:"rgba(255,255,255,.08)"}`,background:method===pm.key?`${pm.color}1a`:"rgba(255,255,255,.03)",color:method===pm.key?pm.color:"rgba(255,255,255,.4)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                    <span style={{fontSize:18}}>{pm.icon}</span>{pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MoMo Payment Instructions */}
            {method === "momo" && (
              <div style={{background:"rgba(245,158,11,.06)",border:"1px solid rgba(245,158,11,.2)",borderRadius:14,padding:"16px",marginBottom:18}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f59e0b",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>📱</span> MTN Mobile Money Payment
                </div>
                
                {/* IMPORTANT - Invoice Reference */}
                <div style={{background:"rgba(239,68,68,.15)",border:"2px solid #ef4444",borderRadius:12,padding:"14px",marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#fca5a5",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16}}>⚠️</span> IMPORTANT — Use Invoice as Payment Reference
                  </div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,.4)",borderRadius:8,padding:"12px 14px"}}>
                    <div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:4}}>Your Payment Reference:</div>
                      <div style={{fontSize:20,color:"#fff",fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>{order?.invoiceNumber}</div>
                    </div>
                    <button onClick={()=>navigator.clipboard?.writeText(order?.invoiceNumber)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.1)",color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>📋 Copy</button>
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:10,lineHeight:1.5}}>
                    You <strong style={{color:"#fca5a5"}}>MUST</strong> enter this invoice number as the payment note/reference when sending money. Without it, we cannot verify your payment.
                  </div>
                </div>

                {/* Step 1 - How to Pay */}
                <div style={{background:"rgba(0,0,0,.2)",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#00c6e0",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>How to Pay</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.8}}>
                    <div>1. Dial <strong style={{color:"#fff"}}>*170#</strong></div>
                    <div>2. Select <strong style={{color:"#fff"}}>Wallet & Payments</strong></div>
                    <div>3. Choose <strong style={{color:"#fff"}}>Pay Merchant</strong> and enter:</div>
                  </div>
                </div>

                {/* Step 2 - Payment Options */}
                <div style={{background:"rgba(0,0,0,.2)",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#00c6e0",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Payment Details</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(99,102,241,.2)",border:"1px solid #6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#818cf8",fontWeight:700,flexShrink:0}}>A</div>
                      <div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:2}}>Option A — Merchant ID</div>
                        <div style={{fontSize:14,color:"#fff",fontFamily:"monospace",fontWeight:700}}>254345</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Deep Citadel Laundry</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(99,102,241,.2)",border:"1px solid #6366f1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#818cf8",fontWeight:700,flexShrink:0}}>B</div>
                      <div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:2}}>Option B — Personal Number</div>
                        <div style={{fontSize:14,color:"#fff",fontFamily:"monospace",fontWeight:700}}>0553560016</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Samuel Gameli</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>Amount Tendered (₵)</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.4)",fontSize:16,fontFamily:"'Syne',sans-serif",fontWeight:700}}>₵</span>
                <input type="number" min={order.total} step="0.50" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)}
                  style={{width:"100%",padding:"13px 14px 13px 30px",borderRadius:12,border:"1.5px solid rgba(16,185,129,.4)",background:"rgba(0,0,0,.3)",color:"#fff",fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:700,outline:"none"}}/>
              </div>
            </div>
          </>}

          {/* Info banner */}
          <div style={{background: method === "momo" || method === "ussd" ? "rgba(245,158,11,.07)" : "rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.2)",borderRadius:12,padding:"12px 14px",marginBottom:20}}>
            <div style={{fontSize:12,color:"rgba(255,215,100,.7)",lineHeight:1.6}}>
              {method === "momo" ? (
                <>📱 After sending payment via MoMo, click <strong style={{color:"#f59e0b"}}>Submit Payment</strong> to notify us. Your payment will be <strong style={{color:"#f59e0b"}}>confirmed within 5 minutes</strong>.</>
              ) : method === "ussd" ? (
                <><strong style={{color:"#10b981"}}>📞</strong> After completing USSD payment, click <strong style={{color:"#f59e0b"}}>Submit Payment</strong> to notify us. Payment will be <strong style={{color:"#f59e0b"}}>confirmed within 5 minutes</strong>.</>
              ) : (
                <>⏱️ After submitting, your payment will be <strong style={{color:"#f59e0b"}}>confirmed within 5 minutes</strong> by our team. You'll see a confirmation status on your tracking page.</>
              )}
            </div>
          </div>

          {/* USSD Payment Instructions */}
          {method === "ussd" && (
            <div style={{background:"rgba(16,185,129,.06)",border:"1px solid rgba(16,185,129,.2)",borderRadius:14,padding:"16px",marginBottom:18}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#10b981",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>📞</span> USSD Payment — All Networks
              </div>
              
              {/* Invoice Reference */}
              <div style={{background:"rgba(239,68,68,.15)",border:"2px solid #ef4444",borderRadius:12,padding:"14px",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:"#fca5a5",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:16}}>⚠️</span> IMPORTANT — Use Invoice as Payment Reference
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,.4)",borderRadius:8,padding:"12px 14px"}}>
                  <div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:4}}>Your Payment Reference:</div>
                    <div style={{fontSize:20,color:"#fff",fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>{order?.invoiceNumber}</div>
                  </div>
                  <button onClick={()=>navigator.clipboard?.writeText(order?.invoiceNumber)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.1)",color:"#fff",fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>📋 Copy</button>
                </div>
              </div>

              {/* How to Pay */}
              <div style={{background:"rgba(0,0,0,.2)",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#00c6e0",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>How to Pay — All Networks</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.8}}>
                  <div style={{marginBottom:8}}><strong style={{color:"#10b981"}}>MTN / AirtelTigo / Vodafone:</strong> Dial <strong style={{color:"#fff",fontSize:14}}>*447*2679#</strong></div>
                  <div style={{marginTop:12,background:"rgba(16,185,129,.1)",padding:10,borderRadius:8}}>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:4}}>Merchant Name:</div>
                    <div style={{fontSize:16,color:"#fff",fontFamily:"monospace",fontWeight:700}}>Deep Citadel Enterprise</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:4}}>Then enter amount and confirm</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep("invoice")} style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Back</button>
            <button onClick={submitPayment} disabled={loading}
              style={{flex:2,padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 18px rgba(16,185,129,.3)"}}>
              {loading?<span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>:<><Icon.Receipt/> Submit Payment</>}
            </button>
          </div>
        </>}

        {/* Step: awaiting confirmation */}
        {step==="awaiting"&&<div style={{textAlign:"center"}}>
          <div style={{marginBottom:24}}>
            {/* Circular countdown */}
            <div style={{position:"relative",width:120,height:120,margin:"0 auto 20px"}}>
              <svg width="120" height="120" style={{transform:"rotate(-90deg)"}}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6"/>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#10b981" strokeWidth="6"
                  strokeDasharray={`${2*Math.PI*52}`}
                  strokeDashoffset={`${2*Math.PI*52*(1-pct/100)}`}
                  strokeLinecap="round"
                  style={{transition:"stroke-dashoffset 1s linear"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color:"#10b981"}}>{fmt(countdown)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.35)",letterSpacing:1}}>remaining</div>
              </div>
            </div>
            <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:20,marginBottom:8}}>Awaiting Confirmation</h3>
            <p style={{color:"rgba(255,255,255,.45)",fontSize:13,lineHeight:1.7,marginBottom:8}}>
              Your payment has been submitted for <span style={{color:"#00c6e0",fontFamily:"monospace"}}>{order?.invoiceNumber}</span>.
            </p>
            <p style={{color:"rgba(255,255,255,.3)",fontSize:12,lineHeight:1.6,marginBottom:20}}>
              Our team is verifying your payment. This normally takes up to 5 minutes. You'll see the confirmation on your tracking page.
            </p>
            {/* Animated dots */}
            <div style={{display:"flex",justifyContent:"center",gap:6}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:"#10b981",animation:`pulse 1.2s ${i*0.3}s ease-in-out infinite`}}/>)}
            </div>
          </div>
          <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Track on my order page</button>
        </div>}

        {/* Step: confirmed */}
        {step==="confirmed"&&<div style={{textAlign:"center"}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(16,185,129,.15)",border:"3px solid #10b981",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36,animation:"popIn .4s ease"}}>✅</div>
          <h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:22,marginBottom:8}}>Payment Confirmed!</h3>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:13,lineHeight:1.7,marginBottom:24}}>
            Your payment for <span style={{color:"#00c6e0",fontFamily:"monospace"}}>{order?.invoiceNumber}</span> has been confirmed.<br/>
            Log in with your invoice number to view your full receipt and track your order.
          </p>
          <button onClick={onClose} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 4px 18px rgba(16,185,129,.3)"}}>Done</button>
        </div>}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN VIEW  — full landing page with nav-embedded login
// ══════════════════════════════════════════════════════════════════════════════
function LoginView({onLogin}){
  // ── Login state ──────────────────────────────────────────────────────────
  const [role,setRole]     = useState("client");
  const [email,setEmail]   = useState("");
  const [pwd,setPwd]       = useState("");
  const [inv,setInv]       = useState("");
  const [show,setShow]     = useState(false);
  const [loading]   = useState(false);
  const [errors,setErrors]     = useState({});
  const [shake]       = useState(false);
  const [loaded,setLoaded]     = useState(false);
  const [showSchedule,setShowSchedule] = useState(false);
  const [showPayModal,setShowPayModal] = useState(false);
  const [scheduleSuccess,setScheduleSuccess] = useState(null);

  // ── Nav login panel state ─────────────────────────────────────────────────
  const [navOpen,setNavOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(()=>{ setTimeout(()=>setLoaded(true),120); },[]);

  // Close nav dropdown when clicking outside
  useEffect(()=>{
    const handler = (e)=>{ if(navRef.current && !navRef.current.contains(e.target)) setNavOpen(false); };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[]);

  const ar = ROLES.find(r=>r.key===role);

  const handleLogin = (e) => {
    e?.preventDefault();
    if (role === "client") {
      onLogin({ role: "client", invoice: inv.trim().toUpperCase() });
      return;
    }
    if (role === "owner") {
      if (email === "owner@deepcitadel.com" && pwd === "owner123") {
        onLogin({ role: "owner", staffName: "Owner" });
        return;
      }
      if (email !== "owner@deepcitadel.com" || pwd !== "owner123") {
        setErrors({ general: "Invalid owner credentials" });
        return;
      }
    }
    onLogin({ role: "staff", staffName: "Staff" });
  };

  // ── Landing page data ────────────────────────────────────────────────────
  const services = [
    {icon:"🧺", color:"#00c6e0", title:"Wash & Fold",      desc:"Quick, affordable wash & fold", price:"₵15/kg"},
    {icon:"👔", color:"#818cf8", title:"Dry Cleaning",      desc:"Professional care for delicates", price:"₵25/item"},
    {icon:"🔥", color:"#f59e0b", title:"Ironing Only",      desc:"Crisp ironing for all clothes", price:"₵10/item"},
    {icon:"🛏️", color:"#10b981", title:"Duvet / Large",     desc:"Specialist large-item cleaning", price:"₵35/item"},
    {icon:"🚗", color:"#f43f5e", title:"Pickup & Delivery", desc:"We come to your door", price:"₵10/trip"},
  ];

  const testimonials = [
    {name:"Ama Mensah",    text:"Excellent service! My clothes came back perfectly clean and neatly folded.", stars:5},
    {name:"Kwame Asante",  text:"Fast, reliable, and very friendly staff. Will definitely use again!", stars:5},
    {name:"Abena Osei",    text:"The express delivery is a game changer. Saved me so much time.", stars:5},
  ];

  const pricingPlans = [
    {name:"Basic",    price:"₵120", period:"/mo", popular:false, color:"#0077b6",
      features:["Up to 5 kg Wash & Fold","2 Ironing items","Standard Delivery","Email Support"]},
    {name:"Pro",      price:"₵300", period:"/mo", popular:true,  color:"#00c6e0",
      features:["Up to 15 kg Wash & Fold","10 Ironing items","2 Dry Clean items","Express Delivery","Priority Support"]},
    {name:"Business", price:"₵350", period:"/mo", popular:false, color:"#023e8a",
      features:["Unlimited Wash & Fold","Unlimited Ironing","5 Dry Cleans/week","Free Express Delivery","Dedicated Agent","Invoice Billing"]},
  ];

  const promotions = ["🎉 Get 20% off Wash & Fold this week!","🚚 Free express delivery on orders above ₵200!","✨ New Dry Cleaning packages available!","📲 Book via WhatsApp and get 10% off!"];

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({behavior:"smooth"});

  // ── Landing CSS ──────────────────────────────────────────────────────────
  const landingCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:#f4f7fc;overflow-x:hidden;}
    @keyframes logoGlow{0%,100%{box-shadow:0 0 12px rgba(0,212,255,0.4);}50%{box-shadow:0 0 28px rgba(0,212,255,0.8),0 0 50px rgba(0,119,182,0.4);}}
    @keyframes promoScroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg);}}
    @keyframes navDrop{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes heroGlow{0%,100%{box-shadow:0 0 30px rgba(0,212,255,0.5),0 0 60px rgba(0,119,182,0.3);}50%{box-shadow:0 0 55px rgba(0,212,255,0.9),0 0 100px rgba(0,119,182,0.6);}}
    @keyframes shake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-7px);}40%,80%{transform:translateX(7px);}}
    @keyframes tickerFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-50vh) scale(0.5);opacity:0;}}
    input::placeholder{color:rgba(255,255,255,0.3);}
    input:focus{outline:none;}

    /* Promo ticker */
    .lp-ticker{position:sticky;top:0;z-index:600;background:linear-gradient(90deg,#020e1a,#0077b6,#020e1a);color:white;padding:7px 0;overflow:hidden;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;}
    .lp-ticker-inner{display:inline-flex;white-space:nowrap;animation:promoScroll 28s linear infinite;}
    .lp-ticker-inner:hover{animation-play-state:paused;}
    .lp-sep{margin:0 20px;opacity:.35;}

    /* Nav */
    .lp-nav{position:sticky;top:36px;z-index:500;display:flex;justify-content:space-between;align-items:center;padding:12px 40px;background:rgba(255,255,255,0.95);backdrop-filter:blur(14px);border-bottom:1px solid rgba(0,119,182,0.1);box-shadow:0 2px 20px rgba(0,0,0,0.07);}
    .lp-nav-left{display:flex;align-items:center;gap:12px;}
    .lp-nav-logo-ring{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0077b6,#00c6e0);padding:2px;animation:logoGlow 3s ease-in-out infinite;flex-shrink:0;}
    .lp-nav-logo-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}
    .lp-nav-brand{font-family:'Cinzel',serif;color:#020e1a;font-size:18px;letter-spacing:1px;}
    .lp-nav-links{display:flex;align-items:center;gap:24px;}
    .lp-nav-link{cursor:pointer;color:#64748b;font-weight:500;font-size:14px;position:relative;transition:color .2s;white-space:nowrap;}
    .lp-nav-link::after{content:'';position:absolute;bottom:-3px;left:0;width:0;height:2px;background:#0077b6;transition:width .25s;}
    .lp-nav-link:hover{color:#0077b6;}
    .lp-nav-link:hover::after{width:100%;}

    /* Sign In button in nav */
    .lp-signin-btn{display:flex;align-items:center;gap:7px;padding:"9px 20px";background:linear-gradient(135deg,#0077b6,#00c6e0);color:white;border:none;border-radius:22px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 3px 14px rgba(0,119,182,0.35);transition:all .2s;}
    .lp-signin-btn:hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(0,119,182,0.5);}
    .lp-signin-btn.active{background:rgba(0,119,182,0.15);color:#0077b6;box-shadow:none;border:1.5px solid rgba(0,119,182,0.3);}

    /* Nav dropdown panel */
    .lp-nav-dropdown{position:absolute;top:calc(100% + 10px);right:40px;width:420px;background:rgba(5,20,40,.98);border:1px solid rgba(0,198,224,.2);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.55);backdrop-filter:blur(24px);animation:navDrop .2s ease;z-index:700;overflow:hidden;}
    .lp-nav-dropdown-inner{padding:24px;}
    .lp-dropdown-shake{animation:shake .45s ease;}

    /* Hero */
    .lp-hero{position:relative;min-height:90vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,#020e1a 0%,#0d2b5e 60%,#0077b6 100%);}
    .lp-hero-bg{position:absolute;inset:0;background:url('https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1400&q=80') center/cover no-repeat;}
    .lp-hero-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(2,14,26,.88) 0%,rgba(0,119,182,.65) 100%);}
    .lp-hero-content{position:relative;z-index:2;text-align:center;padding:20px;opacity:0;transform:translateY(28px);transition:all 1.2s cubic-bezier(.22,1,.36,1);}
    .lp-hero-content.loaded{opacity:1;transform:translateY(0);}
    .lp-hero-logo{width:100px;height:100px;border-radius:50%;margin:0 auto 20px;background:linear-gradient(135deg,#0077b6,#00c6e0);padding:3px;animation:heroGlow 2.5s ease-in-out infinite;}
    .lp-hero-logo img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}
    .lp-hero-title{font-family:'Cinzel',serif;font-size:clamp(26px,5vw,52px);color:white;line-height:1.15;margin-bottom:14px;text-shadow:0 2px 20px rgba(0,0,0,.3);}
    .lp-hero-sub{font-size:17px;color:rgba(255,255,255,.8);margin-bottom:32px;}
    .lp-hero-btns{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}
    .lp-btn-primary{padding:13px 26px;border-radius:50px;background:linear-gradient(135deg,#0077b6,#00c6e0);color:white;border:none;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 20px rgba(0,119,182,.5);transition:all .3s;}
    .lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,119,182,.7);}
    .lp-btn-outline{padding:13px 26px;border-radius:50px;background:transparent;color:white;border:2px solid rgba(255,255,255,.55);font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:all .3s;}
    .lp-btn-outline:hover{background:rgba(255,255,255,.12);border-color:white;}

    /* Stats */
    .lp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:#e2e8f0;}
    .lp-stat{background:#020e1a;padding:28px 16px;text-align:center;}
    .lp-stat-num{font-family:'Cinzel',serif;font-size:34px;background:linear-gradient(135deg,#00c6e0,#fff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block;}
    .lp-stat-lbl{color:rgba(255,255,255,.5);font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;display:block;}

    /* Sections */
    .lp-section{padding:70px 40px;position:relative;}
    .lp-section-title{font-family:'Cinzel',serif;font-size:26px;color:#020e1a;text-align:center;margin-bottom:8px;}
    .lp-section-sub{color:#64748b;text-align:center;font-size:15px;margin-bottom:40px;}

    /* Services */
    .lp-services{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:18px;margin-top:36px;}
    .lp-svc{background:white;border-radius:16px;padding:26px 18px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,.07);transition:transform .3s,box-shadow .3s;border:1px solid rgba(0,119,182,.08);animation:fadeUp .6s ease both;}
    .lp-svc:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(0,119,182,.14);}
    .lp-svc-icon{font-size:36px;margin-bottom:12px;}
    .lp-svc h3{font-family:'Syne',sans-serif;font-size:15px;color:#020e1a;margin-bottom:6px;}
    .lp-svc p{font-size:13px;color:#64748b;margin-bottom:10px;line-height:1.5;}
    .lp-svc-price{font-weight:700;color:#0077b6;font-size:14px;}

    /* Pricing */
    .lp-pricing-section{background:linear-gradient(160deg,#020e1a 0%,#0d2b5e 100%);}
    .lp-pricing-section .lp-section-title{color:white;}
    .lp-pricing-section .lp-section-sub{color:rgba(255,255,255,.45);}
    .lp-pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;align-items:center;}
    .lp-plan{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:34px 26px;text-align:center;position:relative;overflow:hidden;transition:transform .3s;}
    .lp-plan:hover{transform:translateY(-4px);}
    .lp-plan.popular{background:linear-gradient(135deg,rgba(0,119,182,.4),rgba(0,198,224,.2));border-color:#00c6e0;transform:scale(1.04);box-shadow:0 8px 40px rgba(0,212,255,.25);}
    .lp-plan-badge{position:absolute;top:14px;right:-26px;background:linear-gradient(90deg,#0077b6,#00c6e0);color:white;font-size:11px;font-weight:700;padding:4px 36px;transform:rotate(40deg);letter-spacing:1px;}
    .lp-plan-name{font-family:'Cinzel',serif;color:white;font-size:20px;margin-bottom:14px;}
    .lp-plan-price .amount{font-size:38px;font-weight:800;color:#00c6e0;font-family:'Cinzel',serif;}
    .lp-plan-price .period{color:rgba(255,255,255,.4);font-size:13px;}
    .lp-plan-features{list-style:none;margin:20px 0 24px;text-align:left;}
    .lp-plan-features li{color:rgba(255,255,255,.75);font-size:13px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:8px;}
    .lp-plan-features .chk{color:#00c6e0;flex-shrink:0;}
    .lp-plan-btn{width:100%;padding:12px;border-radius:50px;border:2px solid rgba(255,255,255,.25);background:transparent;color:white;font-weight:600;font-family:'DM Sans',sans-serif;font-size:14px;cursor:pointer;transition:all .3s;}
    .lp-plan-btn:hover{background:rgba(255,255,255,.1);border-color:white;}
    .lp-plan-btn.pop-btn{background:linear-gradient(135deg,#0077b6,#00c6e0);border-color:transparent;box-shadow:0 4px 18px rgba(0,212,255,.4);}

    /* Testimonials */
    .lp-testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:36px;}
    .lp-testi{background:white;border-radius:16px;padding:26px;box-shadow:0 2px 14px rgba(0,0,0,.07);border-left:4px solid #0077b6;animation:fadeUp .6s ease both;}
    .lp-testi-stars{color:#f59e0b;font-size:17px;margin-bottom:10px;}
    .lp-testi p{font-style:italic;color:#64748b;font-size:14px;margin-bottom:10px;line-height:1.6;}
    .lp-testi strong{color:#020e1a;font-size:14px;}

    /* Footer */
    .lp-footer{background:#020e1a;color:rgba(255,255,255,.65);font-family:'DM Sans',sans-serif;}
    .lp-footer-top{display:grid;grid-template-columns:2fr 1fr 1.5fr;gap:40px;padding:56px 40px 40px;}
    .lp-footer-brand{display:flex;gap:14px;align-items:flex-start;}
    .lp-footer-logo-ring{width:48px;height:48px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#0077b6,#00c6e0);padding:2px;animation:logoGlow 3s ease-in-out infinite;}
    .lp-footer-logo-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;}
    .lp-footer-co{color:white;font-family:'Cinzel',serif;font-size:16px;letter-spacing:1px;}
    .lp-footer-tag{font-size:12px;color:rgba(255,255,255,.35);margin-top:4px;}
    .lp-footer h4{color:white;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}
    .lp-footer-links{display:flex;flex-direction:column;gap:8px;}
    .lp-footer-links a{cursor:pointer;font-size:14px;transition:color .2s;}
    .lp-footer-links a:hover{color:#00c6e0;}
    .lp-footer-contact p{font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:7px;}
    .lp-footer-bottom{border-top:1px solid rgba(255,255,255,.08);padding:18px 40px;text-align:center;font-size:12px;color:rgba(255,255,255,.25);}
    .lp-social{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;}
    .lp-social a{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;color:white;font-size:15px;text-decoration:none;transition:all .25s;}
    .lp-social a:hover{background:#0077b6;transform:translateY(-2px);}

    /* WhatsApp FAB */
    .lp-wa{position:fixed;bottom:26px;right:26px;z-index:800;width:56px;height:56px;border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;color:white;text-decoration:none;font-size:26px;box-shadow:0 4px 20px rgba(37,211,102,.5);transition:transform .25s,box-shadow .25s;}
    .lp-wa:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,.7);}

    /* Responsive */
    @media(max-width:768px){
      .lp-nav{padding:10px 18px;}
      .lp-nav-links{gap:12px;}
      .lp-nav-link{font-size:12px;}
      .lp-nav-dropdown{right:10px;left:10px;width:auto;}
      .lp-section{padding:50px 20px;}
      .lp-footer-top{grid-template-columns:1fr 1fr;padding:40px 20px 30px;}
    }
    @media(max-width:500px){
      .lp-nav-links .lp-nav-link:not(:last-child){display:none;}
      .lp-footer-top{grid-template-columns:1fr;}
    }
  `;

  // ── Animated stat counter ──────────────────────────────────────────────────
  function StatCount({target,suffix="",label}){
    const [count,setCount]=useState(0);
    const ref=useRef(null);
    const started=useRef(false);
    useEffect(()=>{
      const obs=new IntersectionObserver(([entry])=>{
        if(entry.isIntersecting&&!started.current){
          started.current=true;
          let n=0;const step=Math.ceil(target/60);
          const t=setInterval(()=>{n+=step;if(n>=target){setCount(target);clearInterval(t);}else setCount(n);},20);
        }
      },{threshold:.5});
      if(ref.current)obs.observe(ref.current);
      return()=>obs.disconnect();
    },[target]);
    return(
      <div ref={ref} className="lp-stat">
        <span className="lp-stat-num">{count.toLocaleString()}{suffix}</span>
        <span className="lp-stat-lbl">{label}</span>
      </div>
    );
  }

  // ── Compact nav login form ────────────────────────────────────────────────
  const NavLoginForm = () => (
    <div className={`lp-nav-dropdown-inner${shake?" lp-dropdown-shake":""}`}>
      {/* Role tabs */}
      <div style={{marginBottom:18}}>
        <p style={{color:"rgba(255,255,255,.3)",fontSize:10,letterSpacing:1.8,textTransform:"uppercase",marginBottom:10}}>Sign in as</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {ROLES.map(r=>(
            <button key={r.key} onClick={()=>{setRole(r.key);setErrors({});}}
              style={{padding:"10px 6px",borderRadius:12,border:`2px solid ${role===r.key?r.color:"rgba(255,255,255,.07)"}`,background:role===r.key?`${r.color}18`:"rgba(255,255,255,.02)",color:role===r.key?r.color:"rgba(255,255,255,.35)",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:18}}>{r.key==="client"?"👤":r.key==="staff"?"👔":"🛡️"}</span>
              {r.label}
            </button>
          ))}
        </div>
        <p style={{color:"rgba(255,255,255,.2)",fontSize:11,marginTop:8,textAlign:"center"}}>{ar?.desc}</p>
      </div>

      {/* Error */}
      {errors.general&&<div style={{padding:"9px 12px",borderRadius:10,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",marginBottom:12,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{color:"#ef4444",flexShrink:0,marginTop:1}}><Icon.Alert/></span><p style={{color:"#fca5a5",fontSize:12,lineHeight:1.5}}>{errors.general}</p></div>}

      {/* Fields */}
      {role==="client" ? <>
        <LoginInput name="invoice" icon={<Icon.Invoice/>} type="text" placeholder="Invoice number (e.g. INV-001)" value={inv} error={errors.inv}
          onChange={e=>{setInv(e.target.value.toUpperCase());setErrors(p=>({...p,inv:"",general:""}));}}/>
        <div style={{padding:"9px 12px",borderRadius:10,background:"rgba(0,198,224,.05)",border:"1px solid rgba(0,198,224,.1)",marginBottom:12}}>
          <p style={{color:"rgba(255,255,255,.35)",fontSize:11,lineHeight:1.6}}>📄 Invoice number is printed on your receipt.</p>
        </div>
      </> : <>
        <LoginInput name="email" icon={<Icon.Mail/>} type="email" placeholder="Email address" value={email} error={errors.email}
          onChange={e=>{setEmail(e.target.value);setErrors(p=>({...p,email:"",general:""}));}}/>
        <LoginInput name="password" icon={<Icon.Lock/>} type={show?"text":"password"} placeholder="Password" value={pwd} error={errors.pwd}
          onChange={e=>{setPwd(e.target.value);setErrors(p=>({...p,pwd:"",general:""}));}}
          right={<button type="button" onClick={()=>setShow(s=>!s)} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.35)",display:"flex",alignItems:"center",padding:0}}>{show?<Icon.EyeOff/>:<Icon.Eye/>}</button>}/>
      </>}
      
      <SubmitBtn loading={loading} label="Sign In →" onClick={handleLogin}/>

      {/* Quick actions below form */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
        <button onClick={()=>{setNavOpen(false);setShowSchedule(true);}} style={{padding:"9px",borderRadius:10,border:"1px solid rgba(99,102,241,.35)",background:"rgba(99,102,241,.1)",color:"#818cf8",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>🚗 Book Pickup</button>
        <button onClick={()=>{setNavOpen(false);setShowPayModal(true);}} style={{padding:"9px",borderRadius:10,border:"1px solid rgba(16,185,129,.35)",background:"rgba(16,185,129,.1)",color:"#10b981",fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>💳 Pay Invoice</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <style>{landingCSS}</style>
      <Particles/>
      {showSchedule && <SchedulePickupModal customer={{name:"",phone:""}} onClose={()=>setShowSchedule(false)} onSubmit={num=>{setShowSchedule(false);setScheduleSuccess(num);}}/>}
      {showPayModal  && <PickupPaymentModal onClose={()=>setShowPayModal(false)}/>}

      {/* ── Promo ticker ── */}
      <div className="lp-ticker">
        <div className="lp-ticker-inner">
          {[...promotions,...promotions].map((p,i)=><span key={i}>{p}<span className="lp-sep">•</span></span>)}
        </div>
      </div>

      {/* ── Navigation with embedded login ── */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-left">
          <div className="lp-nav-logo-ring">
            <img src="/logo.jpg" alt="DC Logo"/>
          </div>
          <span className="lp-nav-brand">Deep Citadel</span>
        </div>

        <div className="lp-nav-links">
          {["services","pricing","testimonials","contact"].map(s=>(
            <span key={s} className="lp-nav-link" onClick={()=>scrollTo(s)}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>
          ))}
          <button onClick={()=>setShowSchedule(true)} className="lp-nav-link" style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",padding:"5px 14px",borderRadius:20,fontWeight:600,fontSize:13}}>🚗 Book Pickup</button>

          {/* Sign In toggle button */}
          <button className={`lp-signin-btn${navOpen?" active":""}`} onClick={()=>setNavOpen(o=>!o)}
            style={{padding:"8px 20px"}}>
            {navOpen?"✕ Close":"🔐 Sign In"}
          </button>
        </div>

        {/* Dropdown login panel */}
        {navOpen && (
          <div className="lp-nav-dropdown">
            <NavLoginForm/>
          </div>
        )}
      </nav>

      {/* ── Schedule success banner ── */}
      {scheduleSuccess&&(
        <div style={{position:"relative",zIndex:10,background:"linear-gradient(135deg,rgba(99,102,241,.2),rgba(129,140,248,.08))",border:"1px solid rgba(99,102,241,.45)",margin:"12px 40px",borderRadius:14,padding:"14px 18px",animation:"fadeUp .4s ease",display:"flex",alignItems:"flex-start",gap:12}}>
          <span style={{fontSize:22,flexShrink:0}}>📅</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#818cf8",fontSize:13,marginBottom:4}}>Pickup Scheduled!</div>
            <div style={{fontSize:12,color:"rgba(0,0,0,.6)",lineHeight:1.6}}>Invoice <strong style={{color:"#6366f1",fontFamily:"monospace"}}>{scheduleSuccess}</strong> — sign in as Client to track it.</div>
          </div>
          <button onClick={()=>setScheduleSuccess(null)} style={{background:"transparent",border:"none",color:"rgba(0,0,0,.3)",cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
        </div>
      )}

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg"/>
        <div className="lp-hero-overlay"/>
        <div className={`lp-hero-content${loaded?" loaded":""}`}>
          <div className="lp-hero-logo">
            <img src="/logo.jpg" alt="Deep Citadel"/>
          </div>
          <h1 className="lp-hero-title">Smart Laundry &<br/>Delivery Service</h1>
          <p className="lp-hero-sub">Book pickup, track your order & pay — all in one place.</p>
          <div className="lp-hero-btns">
            <button className="lp-btn-primary" onClick={()=>setShowSchedule(true)}>🚗 Schedule Pickup</button>
            <button className="lp-btn-outline" onClick={()=>{setNavOpen(true);setTimeout(()=>document.querySelector(".lp-nav-dropdown")?.scrollIntoView({behavior:"smooth",block:"nearest"}),100);}}>🔐 Sign In</button>
            <button className="lp-btn-outline" onClick={()=>setShowPayModal(true)}>💳 Pay by Invoice</button>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="lp-stats">
        <StatCount target={1240} suffix="+" label="Jobs Completed"/>
        <StatCount target={850}  suffix="+" label="Happy Customers"/>
        <StatCount target={3600} suffix="+" label="Deliveries Made"/>
        <StatCount target={99}   suffix="%" label="Satisfaction Rate"/>
      </div>

      {/* ── Services ── */}
      <section id="services" className="lp-section">
        <h2 className="lp-section-title">Our Services</h2>
        <p className="lp-section-sub">Professional laundry care for every need</p>
        <div className="lp-services">
          {services.map((s,i)=>(
            <div key={i} className="lp-svc" style={{animationDelay:`${i*.08}s`,borderTop:`3px solid ${s.color}`}}>
              <div className="lp-svc-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="lp-svc-price" style={{color:s.color}}>{s.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="lp-section lp-pricing-section">
        <h2 className="lp-section-title">Pricing Plans</h2>
        <p className="lp-section-sub">Choose a plan that works for you</p>
        <div className="lp-pricing-grid">
          {pricingPlans.map((plan,i)=>(
            <div key={i} className={`lp-plan${plan.popular?" popular":""}`}>
              {plan.popular&&<div className="lp-plan-badge">Most Popular</div>}
              <h3 className="lp-plan-name">{plan.name}</h3>
              <div className="lp-plan-price"><span className="amount">{plan.price}</span><span className="period">{plan.period}</span></div>
              <ul className="lp-plan-features">
                {plan.features.map((f,j)=><li key={j}><span className="chk">✓</span>{f}</li>)}
              </ul>
              <button className={`lp-plan-btn${plan.popular?" pop-btn":""}`} onClick={()=>setShowSchedule(true)}>Get Started</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="lp-section" style={{background:"#f8faff"}}>
        <h2 className="lp-section-title">What Customers Say</h2>
        <p className="lp-section-sub">Trusted by hundreds across Tema and Accra</p>
        <div className="lp-testi-grid">
          {testimonials.map((t,i)=>(
            <div key={i} className="lp-testi" style={{animationDelay:`${i*.1}s`}}>
              <div className="lp-testi-stars">{"★".repeat(t.stars)}</div>
              <p>"{t.text}"</p>
              <strong>— {t.name}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact strip ── */}
      <section id="contact" className="lp-section" style={{background:"#f4f7fc",textAlign:"center"}}>
        <h2 className="lp-section-title">Stay Updated</h2>
        <p className="lp-section-sub">Subscribe for exclusive deals and laundry tips</p>
        <div style={{display:"flex",gap:12,maxWidth:460,margin:"0 auto",flexWrap:"wrap",justifyContent:"center"}}>
          <input name="subscribe-email" type="email" placeholder="Enter your email address" style={{flex:1,minWidth:200,padding:"12px 18px",borderRadius:50,border:"1px solid #d0dce8",fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",background:"white"}}/>
          <button onClick={()=>alert("Thank you for subscribing!")} style={{padding:"12px 26px",borderRadius:50,background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"white",border:"none",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>Subscribe</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo-ring">
              <img src="/logo.jpg" alt="DC"/>
            </div>
            <div>
              <div className="lp-footer-co">Deep Citadel Enterprise</div>
              <div className="lp-footer-tag">Your Cloths, Our Care.</div>
              <div className="lp-social">
                {[["Facebook","f","https://facebook.com"],["Instagram","in","https://instagram.com"],["TikTok","♪","https://tiktok.com/@deepcitadel"],["WhatsApp","wa","https://wa.me/+233244639002"]].map(([label,ch,url])=>(
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} style={{fontWeight:700,fontSize:13}}>{ch}</a>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <div className="lp-footer-links">
              {["services","pricing","testimonials"].map(s=><button key={s} onClick={()=>scrollTo(s)} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:"inherit"}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>)}
              <button onClick={()=>setShowSchedule(true)} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:"inherit"}}>Book Pickup</button>
              <button onClick={()=>setShowPayModal(true)} style={{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:"inherit"}}>Pay Invoice</button>
            </div>
          </div>
          <div className="lp-footer-contact">
            <h4>Contact</h4>
            <p>📍 Community 1 Site 17, Tema</p>
            <p>📞 +233 24 463 9002</p>
            <p>✉️ deepcitadelent@gmail.com</p>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} Deep Citadel Enterprise · All rights reserved.</p>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a href="https://wa.me/+233244639002?text=Hello%2C%20I%20would%20like%20to%20book%20a%20laundry%20service" target="_blank" rel="noopener noreferrer" className="lp-wa" aria-label="WhatsApp">💬</a>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CLIENT TRACKING VIEW
// ══════════════════════════════════════════════════════════════════════════════
function ClientTrackingView({invoice,onLogout,audioUnlocked}){
  const [order,setOrder]=useState(null);
  const [showReceipt,setShowReceipt]=useState(false);
  const [view,setView]=useState("track");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const prevStageRef = useRef(null);
  const prevPaidRef  = useRef(null);
  const prevPayStatusRef = useRef(null);

  useEffect(()=>{
    const initOrders=loadOrders();
    const initOrder=initOrders.find(o=>o.invoiceNumber===invoice)||null;
    if(initOrder){prevStageRef.current=initOrder.stage;prevPaidRef.current=!!initOrder.payment;prevPayStatusRef.current=initOrder.paymentStatus||null;}
    setOrder(initOrder);
    const refresh=()=>{
      const orders=loadOrders();const found=orders.find(o=>o.invoiceNumber===invoice)||null;
      if(found){
        if(prevStageRef.current!==null&&prevStageRef.current!==found.stage){
          const stageInfo=getStageInfo(found.stage);
          if(audioUnlocked){if(found.stage==="ready"||found.stage==="pickup_ready")Sounds.orderReady();else Sounds.clientUpdate();}
          pushToast({icon:stageInfo?.icon||"📦",title:"Order "+invoice+" Updated",message:stageInfo?stageInfo.label+" — "+stageInfo.desc:"Your order status changed.",accent:stageInfo?.color||"#00c6e0",border:(stageInfo?.color||"#00c6e0")+"55",duration:found.stage==="ready"||found.stage==="pickup_ready"?7000:5000});
        }
        if(prevPaidRef.current===false&&!!found.payment){
          if(audioUnlocked)Sounds.paymentDone();
          pushToast({icon:"✅",title:"Payment Confirmed",message:"Your payment of ₵"+found.payment.amountPaid.toFixed(2)+" has been recorded. Receipt is now available.",accent:"#10b981",border:"rgba(16,185,129,.4)",duration:6000});
        }
        // detect payment awaiting→confirmed auto-confirm
        if(found.paymentStatus==="awaiting_confirmation"){
          const submitted = found.paymentSubmittedAt ? new Date(found.paymentSubmittedAt).getTime() : 0;
          const elapsed = Date.now() - submitted;
          if(elapsed >= 5*60*1000){
            // auto-confirm
            const confirmedPayment={...found.paymentPending, confirmedAt:new Date().toISOString()};
            const upd2=loadOrders().map(o=>o.id===found.id?{...o,payment:confirmedPayment,paymentStatus:"confirmed",paymentPending:null}:o);
            saveOrders(upd2);
            if(audioUnlocked)Sounds.paymentDone();
            pushToast({icon:"✅",title:"Payment Auto-Confirmed",message:"Your payment for "+invoice+" has been confirmed.",accent:"#10b981",border:"rgba(16,185,129,.4)",duration:6000});
          }
        }
        prevStageRef.current=found.stage;prevPaidRef.current=!!found.payment;prevPayStatusRef.current=found.paymentStatus;
      }
      setOrder(found);
    };
    const id=setInterval(refresh,3000);return()=>clearInterval(id);
  },[invoice,audioUnlocked]);

  if(!order) return(
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,color:"rgba(255,255,255,.3)"}}>
      <span style={{fontSize:40}}>🔍</span><p style={{fontSize:16}}>Order {invoice} not found.</p>
      <button onClick={onLogout} style={{padding:"10px 24px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"rgba(255,255,255,.5)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Back to Login</button>
    </div>
  );

  const isPickup = order && isPickupOrder(order);
  const stageList = isPickup ? PICKUP_STAGES : ORDER_STAGES;
  const stageIdx=stageList.findIndex(s=>s.key===order.stage);
  const isReady=order.stage==="ready"||order.stage==="collected"||order.stage==="pickup_ready"||order.stage==="pickup_delivered";
  const isPaid=!!order.payment;
  const isAwaitingPayment=order.paymentStatus==="awaiting_confirmation";

  return(
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",padding:"22px 20px",color:"#e8f4f8",maxWidth:640,margin:"0 auto"}}>
      {showReceipt&&<DigitalReceipt order={order} onClose={()=>setShowReceipt(false)}/>}
      {showScheduleModal&&<SchedulePickupModal customer={order?.customer} onClose={()=>setShowScheduleModal(false)} onSubmit={(num)=>{setShowScheduleModal(false);setScheduleSuccess(num);}}/>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
        <DCLogo size="sm"/>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:18,color:"#fff"}}>{isPickup?"Track My Pickup":"Track My Order"}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:2,textTransform:"uppercase",marginTop:2}}>{invoice}</div>
        </div>
        <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}><Icon.SignOut/> Exit</button>
      </div>

      {/* Schedule success */}
      {scheduleSuccess&&(
        <div style={{background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.4)",borderRadius:12,padding:"12px 16px",marginBottom:16,animation:"popIn .3s ease",display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18}}>📅</span>
          <div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>New pickup scheduled! Invoice <span style={{color:"#818cf8",fontFamily:"monospace",fontWeight:700}}>{scheduleSuccess}</span> — log in with that number to track it.</div>
          <button onClick={()=>setScheduleSuccess(null)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[
          {id:"track", label: isPickup ? "🚗 Track Pickup" : "📍 Track Order"},
          {id:"receipt",label:"🧾 Receipt",locked:!isPaid&&!isAwaitingPayment},
          {id:"schedule",label:"📅 New Pickup"},
        ].map(t=>(
          <button key={t.id} onClick={()=>!t.locked&&setView(t.id)} title={t.locked?"Payment not yet recorded":""} style={{flex:1,padding:"9px 8px",borderRadius:12,border:`1px solid ${view===t.id?(isPickup?"rgba(99,102,241,.4)":"rgba(0,198,224,.4)"):t.locked?"rgba(255,255,255,.04)":"rgba(255,255,255,.1)"}`,background:view===t.id?(isPickup?"rgba(99,102,241,.12)":"rgba(0,198,224,.12)"):"rgba(255,255,255,.03)",color:view===t.id?(isPickup?"#818cf8":"#00c6e0"):t.locked?"rgba(255,255,255,.2)":"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:11,cursor:t.locked?"not-allowed":"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {t.label}
            {t.locked&&<span style={{fontSize:9,background:"rgba(255,255,255,.08)",borderRadius:10,padding:"2px 5px"}}>Pending</span>}
          </button>
        ))}
      </div>

      {/* SCHEDULE NEW PICKUP tab */}
      {view==="schedule"&&(
        <div style={{...GP}}>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:16}}>🚗</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#fff",marginBottom:8}}>Schedule Another Pickup</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.4)",lineHeight:1.7,marginBottom:24}}>Need to send more laundry? We'll come pick it up at your convenience.</div>
            <button onClick={()=>setShowScheduleModal(true)} style={{padding:"13px 32px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 4px 18px rgba(99,102,241,.35)"}}>
              📅 Book a Pickup
            </button>
          </div>
        </div>
      )}

      {/* TRACK VIEW */}
      {view==="track"&&<>
        {/* Pickup info card (for pickup orders) */}
        {isPickup&&order.pickup&&(
          <div style={{background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.3)",borderRadius:14,padding:"14px 18px",marginBottom:18,animation:"sIn .3s ease"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#818cf8",marginBottom:10}}>🚗 Pickup Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {label:"Date", value: new Date(order.pickup.date+"T00:00:00").toLocaleDateString("en-GH",{weekday:"long",day:"numeric",month:"long"})},
                {label:"Time", value: order.pickup.time},
                {label:"Address", value: order.pickup.address},
                {label:"Items", value: order.pickup.itemsDescription},
              ].map(d=>(
                <div key={d.label} style={{gridColumn:d.label==="Address"||d.label==="Items"?"span 2":"auto"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{d.label}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,.7)"}}>{d.value}</div>
                </div>
              ))}
              {order.pickup.addressNote&&<div style={{gridColumn:"span 2",fontSize:11,color:"rgba(255,255,255,.4)",fontStyle:"italic"}}>Note: {order.pickup.addressNote}</div>}
            </div>
          </div>
        )}

        {isReady&&<div style={{background:"linear-gradient(135deg,rgba(16,185,129,.2),rgba(52,211,153,.1))",border:"1px solid rgba(16,185,129,.4)",borderRadius:16,padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14,animation:"popIn .4s ease"}}><span style={{fontSize:36}}>{isPickup?"📦":"🎉"}</span><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#10b981"}}>{isPickup?"Your items are on their way back!":"Your clothes are ready!"}</div><div style={{fontSize:13,color:"rgba(255,255,255,.6)",marginTop:3}}>{isPickup?"Your cleaned laundry is being delivered to your address.":"Please come collect your laundry at your earliest convenience."}</div></div></div>}

        {/* Payment status */}
        {isAwaitingPayment&&!isPaid&&(
          <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.3)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10,animation:"popIn .3s ease"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#f59e0b",animation:"pulse 1.5s infinite",flexShrink:0}}/>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#f59e0b"}}>Payment Submitted — Awaiting Confirmation</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:2}}>Our team is verifying your payment. Confirmation takes up to 5 minutes.</div>
            </div>
          </div>
        )}
        {isPaid?(
          <div style={{background:"linear-gradient(135deg,rgba(16,185,129,.15),rgba(52,211,153,.08))",border:"1px solid rgba(16,185,129,.35)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",animation:"popIn .4s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>✅</span><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#10b981"}}>Payment Confirmed</div><div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:1}}>{PAYMENT_METHODS.find(p=>p.key===order.payment.method)?.label} · ₵{order.payment.amountPaid.toFixed(2)} paid</div></div></div>
            <button onClick={()=>setShowReceipt(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,border:"1px solid rgba(16,185,129,.35)",background:"rgba(16,185,129,.12)",color:"#10b981",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}><Icon.Receipt/> View Receipt</button>
          </div>
        ):!isAwaitingPayment&&(
          <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>⏳</span><div style={{fontSize:12,color:"rgba(255,215,100,.7)"}}>{isPickup?"Payment will be confirmed once items are assessed. Use \u2018Pay by Invoice\u2019 on the login page when ready.":"Payment not yet recorded. Your receipt will be available once our staff records your payment."}</div></div>
        )}

        {/* Order / customer card */}
        <div style={{...GP,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff"}}>{order.customer.name}</div><div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{order.customer.phone}</div></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase"}}>Total</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,color: isPickup&&order.total===0?"rgba(255,255,255,.4)":"#00c6e0"}}>
                {isPickup&&order.total===0?"TBD":`₵${order.total.toFixed(2)}`}
              </div>
            </div>
          </div>
          {!isPickup&&<div style={{borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:12,display:"flex",flexDirection:"column",gap:6}}>
            {order.items.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"rgba(255,255,255,.7)"}}>{item.name} <span style={{color:"rgba(255,255,255,.35)"}}>× {item.qty}</span></span><span style={{color:"#00c6e0",fontWeight:600}}>₵{item.subtotal.toFixed(2)}</span></div>)}
          </div>}
        </div>

        {/* Progress tracker */}
        <div style={{...GP,marginBottom:18}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff",marginBottom:4}}>{isPickup?"Pickup Progress":"Order Progress"}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.3)",margin:"3px 0 20px"}}>Auto-refreshes every 3 seconds</div>
          {isPickup ? <PickupProgressBar stage={order.stage}/> : <OrderProgressBar stage={order.stage}/>}
        </div>

        {/* Stage history */}
        <div style={{...GP}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff",marginBottom:14}}>Stage History</div>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {stageList.slice(0,stageIdx+1).reverse().map((s,i)=>(
              <div key={s.key} style={{display:"flex",gap:12,paddingBottom:i<stageIdx?"14px":0,borderLeft:i<stageIdx?"2px solid rgba(0,198,224,.2)":"2px solid transparent",marginLeft:10,paddingLeft:16,position:"relative"}}>
                <div style={{position:"absolute",left:-7,top:0,width:14,height:14,borderRadius:"50%",background:s.color,border:"2px solid #020e1a",flexShrink:0}}/>
                <div><div style={{fontSize:13,fontWeight:600,color:i===0?s.color:"rgba(255,255,255,.6)"}}>{s.icon} {s.label}</div><div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:2}}>{s.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </>}
      {view==="receipt"&&(isPaid||isAwaitingPayment)&&<DigitalReceipt order={order} onClose={()=>setView("track")}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAFF VIEW
// ══════════════════════════════════════════════════════════════════════════════
function StaffView({role,onLogout,onBack=null,audioUnlocked=false,staffName=null}){
  const [tab,setTab]=useState("pos");
  const [activePrices]=useState(loadPrices);
  const services=Object.keys(activePrices);
  const [quantities,setQuantities]=useState(()=>Object.fromEntries(services.map(k=>[k,0])));
  const [cart,setCart]=useState([]);
  const [customer,setCustomer]=useState({name:"",phone:""});
  const [orders,setOrders]=useState(loadOrders);
  const [orderFilter, setOrderFilter] = useState("all")
  const [successInv,setSuccessInv]=useState(null);
  const [paymentTarget,setPaymentTarget]=useState(null);
  const [receiptOrder,setReceiptOrder]=useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [staffList] = useState(loadStaff);

  const totalAmount=cart.reduce((s,i)=>s+i.subtotal,0);
  const totalItems=cart.reduce((s,i)=>s+i.qty,0);
  const hasQty=Object.values(quantities).some(q=>q>0);

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === "" || orderFilter === "all")
      return order.stage !== "collected" && order.stage !== "pickup_delivered";
    if (orderFilter === "pickup")
      return isPickupOrder(order) && order.stage !== "pickup_delivered";
    if (orderFilter === "regular")
      return !isPickupOrder(order) && order.stage !== "collected";
    if (orderFilter === "payment")
      return order.paymentStatus === "awaiting_confirmation";
    return true;
  });

  const refreshOrders=()=>setOrders(loadOrders());
  const setQty=(service,val)=>{const n=Math.max(0,Math.min(99,isNaN(parseInt(val))?0:parseInt(val)));setQuantities(prev=>({...prev,[service]:n}));};
  const buildOrder=()=>{setCart(Object.entries(quantities).filter(([,q])=>q>0).map(([name,qty])=>({id:`${name}-${Date.now()}`,name,qty,unitPrice:activePrices[name]||0,subtotal:qty*(activePrices[name]||0)})));};
  const removeFromCart=(id)=>{const item=cart.find(i=>i.id===id);if(item)setQty(item.name,0);setCart(prev=>prev.filter(i=>i.id!==id));};
  const clearAll=()=>{setCart([]);setQuantities(Object.fromEntries(services.map(k=>[k,0])));};

  const processOrder = async () => {
    if (!customer.name.trim() || cart.length === 0) return;
    
    const orderData = {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      items: cart.map(i => ({ name: i.name, qty: i.qty })),
      total: totalAmount,
    };
    
    try {
      const result = await userAPI.createStaffOrder(orderData);
      refreshOrders();
      clearAll();
      setCustomer({ name: "", phone: "" });
      setSuccessInv(result.invoice_id || result.invoiceNumber);
      if (audioUnlocked) Sounds.newBooking();
      pushToast({ icon: "🧺", title: "New Order Created", message: (result.invoice_id || result.invoiceNumber) + " — " + customer.name.trim() + " · ₵" + totalAmount.toFixed(2), accent: "#00c6e0", border: "rgba(0,198,224,.35)", duration: 5000 });
      setTimeout(() => setSuccessInv(null), 6000);
    } catch (err) {
      console.log("API processOrder failed, using localStorage:", err.message);
      // Fallback
      const existing = loadOrders();
      const num = `INV-${String(existing.length + 1).padStart(3, "0")}`;
      const newOrder = { id: `ord-${Date.now()}`, invoiceNumber: num, customer: { name: customer.name.trim(), phone: customer.phone.trim() }, items: cart.map(i => ({ name: i.name, qty: i.qty, unitPrice: i.unitPrice, subtotal: i.subtotal })), total: totalAmount, stage: "RECEIVED", createdAt: new Date().toISOString(), createdBy: staffName || role };
      const updated = [...existing, newOrder];
      saveOrders(updated); setOrders(updated); setSuccessInv(num); clearAll(); setCustomer({ name: "", phone: "" });
      if (audioUnlocked) Sounds.newBooking();
      pushToast({ icon: "🧺", title: "New Order Created", message: num + " — " + customer.name.trim() + " · ₵" + totalAmount.toFixed(2), accent: "#00c6e0", border: "rgba(0,198,224,.35)", duration: 5000 });
      setTimeout(() => setSuccessInv(null), 6000);
    }
  };

  const updateStage = async (orderId, stage) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
      await userAPI.updateStaffOrder(order.invoiceNumber, { status: stage });
      refreshOrders();
    } catch (err) {
      console.log("API updateStage failed, using localStorage:", err.message);
      const updated = loadOrders().map(o => o.id === orderId ? { ...o, stage } : o);
      saveOrders(updated); setOrders(updated);
    }
  };
  
  const recordPayment = async (orderId, payment) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
      await userAPI.recordStaffPayment(order.invoiceNumber, payment);
      refreshOrders();
      const paidOrder = orders.find(o => o.id === orderId);
      if (audioUnlocked) Sounds.paymentDone();
      pushToast({ icon: "💰", title: "Payment Recorded", message: (paidOrder?.invoiceNumber || "Order") + " — ₵" + payment.amountPaid.toFixed(2) + " via " + (PAYMENT_METHODS.find(p => p.key === payment.method)?.label || payment.method), accent: "#10b981", border: "rgba(16,185,129,.4)", duration: 4000 });
      setPaymentTarget(null);
    } catch (err) {
      console.log("API recordPayment failed, using localStorage:", err.message);
      const updated = loadOrders().map(o => o.id === orderId ? { ...o, payment } : o);
      saveOrders(updated); setOrders(updated);
      const paidOrder = updated.find(o => o.id === orderId);
      if (audioUnlocked) Sounds.paymentDone();
      pushToast({ icon: "💰", title: "Payment Recorded", message: (paidOrder?.invoiceNumber || "Order") + " — ₵" + payment.amountPaid.toFixed(2) + " via " + (PAYMENT_METHODS.find(p => p.key === payment.method)?.label || payment.method), accent: "#10b981", border: "rgba(16,185,129,.4)", duration: 4000 });
      setPaymentTarget(null);
    }
  };

  const tabBtn=(id,label,icon,badge=null)=>(
    <button onClick={()=>setTab(id)} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:11,border:`1px solid ${tab===id?"rgba(0,198,224,.4)":"rgba(255,255,255,.08)"}`,background:tab===id?"rgba(0,198,224,.12)":"rgba(255,255,255,.03)",color:tab===id?"#00c6e0":"rgba(255,255,255,.4)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .2s"}}>
      {icon} {label}
      {badge>0&&<span style={{background:"#00c6e0",color:"#020e1a",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800}}>{badge}</span>}
    </button>
  );

  const pendingPickups = orders.filter(o => isPickupOrder(o) && o.stage !== "pickup_delivered" && o.stage !== "pickup_collected");

  const assignStaff = async (orderId, staffId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    try {
      await userAPI.updateStaffOrder(order.invoiceNumber, { assigned_staff: staffId });
      refreshOrders();
      setSelectedPickup(prev => prev ? { ...prev, assignedStaff: staffId } : null);
      pushToast({ icon: "👤", title: "Staff Assigned", message: `${staffList.find(s => s.id === staffId)?.name || "Unknown"} assigned to pickup.`, accent: "#818cf8", border: "rgba(129,140,248,.4)", duration: 3000 });
    } catch (err) {
      console.log("API assignStaff failed, using localStorage:", err.message);
      const updated = loadOrders().map(o => o.id === orderId ? { ...o, assignedStaff: staffId } : o);
      saveOrders(updated);
      setOrders(updated);
      setSelectedPickup(prev => prev ? { ...prev, assignedStaff: staffId } : null);
      pushToast({ icon: "👤", title: "Staff Assigned", message: `${staffList.find(s => s.id === staffId)?.name || "Unknown"} assigned to pickup.`, accent: "#818cf8", border: "rgba(129,140,248,.4)", duration: 3000 });
    }
  };

  return(
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",padding:"22px 28px",color:"#e8f4f8"}}>
      {paymentTarget&&<PaymentModal order={paymentTarget} onClose={()=>setPaymentTarget(null)} onPaid={recordPayment}/>}
      {receiptOrder&&<DigitalReceipt order={receiptOrder} onClose={()=>setReceiptOrder(null)}/>}
      <TopNav role={role} subtitle={staffName?`Staff Terminal · ${staffName}`:"Staff Terminal"} onLogout={onLogout} onBack={onBack}
        extra={<div style={{display:"flex",gap:8}}>{tabBtn("pos","New Order","🧺")}{tabBtn("orders","Orders","📋",orders.filter(o=>o.stage!=="collected").length)}{tabBtn("pickups","Pickups","🚗",pendingPickups.length)}</div>}/>

      {tab==="pos"&&(
        <div>
          {successInv&&<div style={{background:"linear-gradient(135deg,rgba(16,185,129,.2),rgba(52,211,153,.1))",border:"1px solid rgba(16,185,129,.4)",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:12,animation:"popIn .3s ease"}}><span style={{fontSize:24}}>✅</span><div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#10b981"}}>Order Created!</div><div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>Invoice <span style={{color:"#10b981",fontFamily:"monospace",fontWeight:700}}>{successInv}</span> — Give this to the customer.</div></div></div>}
          <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:22}}>
            <div style={GP}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff"}}>Select Services</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.3)",margin:"3px 0 20px"}}>Enter quantity per service</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {services.map(service=>{
                  const meta=DEFAULT_META[service]||{icon:"Wash",accent:"#00c6e0"};const SI=Icon[meta.icon]||Icon.Wash;const qty=quantities[service]||0;
                  return(
                    <div key={service} style={{display:"flex",alignItems:"center",gap:14,background:qty>0?"rgba(255,255,255,.055)":"rgba(255,255,255,.03)",border:`1px solid ${qty>0?meta.accent+"44":"rgba(255,255,255,.07)"}`,borderLeft:`3px solid ${qty>0?meta.accent:"rgba(255,255,255,.07)"}`,borderRadius:14,padding:"13px 16px",transition:"all .2s"}}>
                      <div style={{width:40,height:40,borderRadius:11,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",color:meta.accent}}><SI/></div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13.5,color:"#e8f4f8"}}>{service}</div>
                        <div style={{fontSize:12,color:meta.accent,marginTop:2}}>₵{(activePrices[service]||0).toFixed(2)} / item</div>
                        {qty>0&&<div style={{fontSize:11,color:"rgba(255,255,255,.38)",marginTop:2}}>→ ₵{(qty*(activePrices[service]||0)).toFixed(2)}</div>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,overflow:"hidden",flexShrink:0}}>
                        <button onClick={()=>setQty(service,qty-1)} style={{width:32,height:36,border:"none",background:"transparent",color:"rgba(255,255,255,.45)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><Icon.Minus/></button>
                        <input type="number" min="0" max="99" value={qty===0?"":qty} placeholder="0" onChange={e=>setQty(service,e.target.value)} style={{width:44,height:36,background:"transparent",border:"none",borderLeft:"1px solid rgba(255,255,255,.08)",borderRight:"1px solid rgba(255,255,255,.08)",color:"#fff",textAlign:"center",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,outline:"none"}}/>
                        <button onClick={()=>setQty(service,qty+1)} style={{width:32,height:36,border:"none",background:"transparent",color:"rgba(255,255,255,.45)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,198,224,.2)";e.currentTarget.style.color="#00c6e0";}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,.45)"}}><Icon.Plus/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={buildOrder} disabled={!hasQty} style={{width:"100%",marginTop:18,padding:13,borderRadius:12,border:"none",background:hasQty?"linear-gradient(135deg,#0077b6,#00c6e0)":"rgba(255,255,255,.05)",color:hasQty?"#fff":"rgba(255,255,255,.2)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13.5,cursor:hasQty?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:hasQty?"0 4px 18px rgba(0,198,224,.28)":"none"}}>
                <Icon.Cart/> Add to Order
              </button>
            </div>
            <div style={GP}>
              <div style={{display:"flex",alignItems:"center",marginBottom:3}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff"}}>Order Summary</div>
                {cart.length>0&&<span style={{background:"rgba(0,198,224,.15)",border:"1px solid rgba(0,198,224,.25)",color:"#00c6e0",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,marginLeft:8}}>{totalItems} item{totalItems!==1?"s":""}</span>}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.3)",margin:"3px 0 16px"}}>Customer details & breakdown</div>
              {["name","phone"].map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:"11px 14px",marginBottom:8}} onFocus={e=>e.currentTarget.style.borderColor="rgba(0,198,224,.35)"} onBlur={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.07)"}>
                  <span style={{color:"rgba(0,198,224,.6)",flexShrink:0}}>{f==="name"?<Icon.User/>:<Icon.Phone/>}</span>
                  <input placeholder={f==="name"?"Customer Name *":"Phone Number"} value={customer[f]} onChange={e=>setCustomer({...customer,[f]:e.target.value})} style={{background:"transparent",border:"none",outline:"none",color:"#e8f4f8",fontFamily:"'DM Sans',sans-serif",fontSize:13.5,width:"100%"}}/>
                </div>
              ))}
              <div style={{borderTop:"1px solid rgba(255,255,255,.07)",margin:"14px 0"}}/>
              <div style={{minHeight:140}}>
                {cart.length===0?<div style={{textAlign:"center",color:"rgba(255,255,255,.18)",fontSize:13,padding:"32px 0",lineHeight:1.7}}>Set quantities on the left<br/>then tap Add to Order</div>:cart.map(item=>(
                  <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)",animation:"sIn .2s ease"}}>
                    <div><div style={{color:"rgba(255,255,255,.8)",fontSize:13}}>{item.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,.32)",marginTop:2}}>{item.qty} × ₵{item.unitPrice.toFixed(2)}</div></div>
                    <div style={{color:"#00c6e0",fontWeight:700,fontFamily:"'Syne',sans-serif",fontSize:13}}>₵{item.subtotal.toFixed(2)}</div>
                    <button onClick={()=>removeFromCart(item.id)} style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",borderRadius:6,width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.25)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.1)"}><Icon.Trash/></button>
                  </div>
                ))}
              </div>
              <div style={{marginTop:16,paddingTop:16,borderTop:"1px dashed rgba(0,198,224,.2)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
                  <span style={{fontSize:12,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1.5}}>Total Due</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:"#00c6e0",textShadow:"0 0 20px rgba(0,198,224,.5)"}}>₵{totalAmount.toFixed(2)}</span>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={clearAll} disabled={cart.length===0} style={{padding:"13px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:cart.length===0?"rgba(255,255,255,.2)":"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:cart.length===0?"not-allowed":"pointer",flexShrink:0}}>Clear</button>
                  <button onClick={processOrder} disabled={cart.length===0||!customer.name.trim()} style={{flex:1,padding:13,borderRadius:12,border:"none",background:cart.length>0&&customer.name.trim()?"linear-gradient(135deg,#10b981,#059669)":"rgba(255,255,255,.05)",color:cart.length>0&&customer.name.trim()?"#fff":"rgba(255,255,255,.2)",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13.5,cursor:cart.length>0&&customer.name.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:cart.length>0&&customer.name.trim()?"0 4px 18px rgba(16,185,129,.3)":"none"}}>
                    <Icon.Print/> Create Order
                  </button>
                </div>
                {cart.length>0&&!customer.name.trim()&&<p style={{color:"rgba(245,158,11,.7)",fontSize:11,marginTop:8,textAlign:"center"}}>⚠️ Please enter customer name to proceed</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab==="orders"&&(
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
            <div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#fff"}}>Active Orders</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:3}}>Update stages and record payments</div>
            </div>
            <button onClick={refreshOrders} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:10,border:"1px solid rgba(0,198,224,.3)",background:"rgba(0,198,224,.08)",color:"#00c6e0",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>🔄 Refresh</button>
          </div>

          {/* Filter pills */}
          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            {[
              {id:"all",    label:"All Orders",         count: orders.filter(o=>o.stage!=="collected"&&o.stage!=="pickup_delivered").length},
              {id:"pickup", label:"🚗 Pickups",          count: orders.filter(o=>isPickupOrder(o)&&o.stage!=="pickup_delivered").length, color:"#818cf8"},
              {id:"regular",label:"🧺 In-store",         count: orders.filter(o=>!isPickupOrder(o)&&o.stage!=="collected").length},
              {id:"payment",label:"💳 Awaiting Payment", count: orders.filter(o=>o.paymentStatus==="awaiting_confirmation").length, color:"#f59e0b"},
            ].map(fp=>(
              <button key={fp.id} onClick={()=>setOrderFilter(fp.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:20,border:`1px solid ${orderFilter===fp.id?(fp.color||"#00c6e0"):"rgba(255,255,255,.1)"}`,background:orderFilter===fp.id?`${fp.color||"#00c6e0"}18`:"rgba(255,255,255,.03)",color:orderFilter===fp.id?(fp.color||"#00c6e0"):"rgba(255,255,255,.4)",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s"}}>
                {fp.label}
                {fp.count>0&&<span style={{background:orderFilter===fp.id?(fp.color||"#00c6e0"):"rgba(255,255,255,.12)",color:orderFilter===fp.id?"#020e1a":"rgba(255,255,255,.5)",borderRadius:"50%",minWidth:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,padding:"0 4px"}}>{fp.count}</span>}
              </button>
            ))}
          </div>
          {filteredOrders.length===0
            ? <div style={{...GP,textAlign:"center",color:"rgba(255,255,255,.2)",padding:"50px 0"}}>
                {orderFilter==="pickup"?"No pending pickup orders.":orderFilter==="payment"?"No orders awaiting payment confirmation.":"No orders yet."}
              </div>
            : (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {[...filteredOrders].reverse().map(order=>{
                const pickup = isPickupOrder(order);
                const stageList = pickup ? PICKUP_STAGES : ORDER_STAGES;
                const cur=stageList.find(s=>s.key===order.stage)||stageList[0];
                const collected=order.stage==="collected"||order.stage==="pickup_delivered";const isPaid=!!order.payment;
                const isAwaitingPay=order.paymentStatus==="awaiting_confirmation";
                return(
                  <div key={order.id} style={{...GP,opacity:collected?.7:1,transition:"all .3s",borderLeft:pickup?"3px solid rgba(99,102,241,.5)":"none"}}>
                    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{background:`${cur.color}20`,border:`1px solid ${cur.color}44`,borderRadius:10,padding:"6px 12px",fontFamily:"monospace",fontWeight:700,fontSize:13,color:cur.color,display:"flex",alignItems:"center",gap:6}}>
                          {pickup&&<span style={{fontSize:11}}>🚗</span>}{order.invoiceNumber}
                        </div>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff"}}>{order.customer.name}</div>
                            {pickup&&<span style={{fontSize:10,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",borderRadius:20,padding:"2px 8px",letterSpacing:.5}}>PICKUP</span>}
                          </div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginTop:2}}>{order.customer.phone} · {pickup&&order.total===0?"Pricing TBD":("₵"+order.total.toFixed(2))}</div>
                          {pickup&&order.pickup&&<div style={{fontSize:11,color:"#818cf8",marginTop:2}}>📅 {order.pickup.date} at {order.pickup.time} · 📍 {order.pickup.address}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                        {isAwaitingPay&&!isPaid&&<div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.3)",borderRadius:20,padding:"4px 10px"}}><span style={{width:6,height:6,borderRadius:"50%",background:"#f59e0b",animation:"pulse 1.5s infinite",display:"inline-block"}}/><span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>Awaiting Pay Confirm</span></div>}
                        {isPaid?<div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(16,185,129,.12)",border:"1px solid rgba(16,185,129,.3)",borderRadius:20,padding:"4px 10px"}}><span style={{fontSize:12}}>✅</span><span style={{fontSize:11,color:"#10b981",fontWeight:600}}>Paid</span></div>:!isAwaitingPay&&<div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:20,padding:"4px 10px"}}><span style={{fontSize:12}}>⏳</span><span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>Unpaid</span></div>}
                        <div style={{display:"flex",alignItems:"center",gap:6,background:`${cur.color}15`,border:`1px solid ${cur.color}33`,borderRadius:20,padding:"4px 12px"}}><span style={{fontSize:14}}>{cur.icon}</span><span style={{fontSize:11,color:cur.color,fontWeight:600}}>{cur.label}</span></div>
                      </div>
                    </div>
                    {/* Items / description */}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                      {pickup&&order.pickup?.itemsDescription
                        ? <span style={{padding:"3px 10px",borderRadius:20,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",fontSize:11,color:"#818cf8"}}>📦 {order.pickup.itemsDescription}</span>
                        : order.items.map((item,i)=><span key={i} style={{padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",fontSize:11,color:"rgba(255,255,255,.6)"}}>{item.name} ×{item.qty}</span>)
                      }
                    </div>
                    {/* Payment confirm action (for awaiting) */}
                    {isAwaitingPay&&!isPaid&&(
                      <div style={{marginBottom:14,padding:"10px 14px",borderRadius:10,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                        <div style={{fontSize:12,color:"rgba(255,215,100,.7)"}}>Client has submitted payment ({PAYMENT_METHODS.find(p=>p.key===order.paymentPending?.method)?.label}) — please verify and confirm.</div>
                        <button onClick={()=>{
                          const confirmed={...order.paymentPending,confirmedAt:new Date().toISOString()};
                          const upd=loadOrders().map(o=>o.id===order.id?{...o,payment:confirmed,paymentStatus:"confirmed",paymentPending:null}:o);
                          saveOrders(upd);refreshOrders();
                          if(audioUnlocked)Sounds.paymentDone();
                          pushToast({icon:"✅",title:"Payment Confirmed",message:`${order.invoiceNumber} — payment confirmed manually.`,accent:"#10b981",border:"rgba(16,185,129,.4)",duration:4000});
                        }} style={{flexShrink:0,padding:"7px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                          ✓ Confirm Now
                        </button>
                      </div>
                    )}
                    <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
                      {!isPaid&&!isAwaitingPay?<button onClick={()=>setPaymentTarget(order)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",boxShadow:"0 3px 12px rgba(245,158,11,.3)"}}><Icon.Money/> Record Payment</button>:(isPaid&&<button onClick={()=>setReceiptOrder(order)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:10,border:"1px solid rgba(16,185,129,.3)",background:"rgba(16,185,129,.1)",color:"#10b981",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}><Icon.Receipt/> View Receipt</button>)}
                      {isPaid&&<span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{PAYMENT_METHODS.find(p=>p.key===order.payment.method)?.icon} {PAYMENT_METHODS.find(p=>p.key===order.payment.method)?.label} · ₵{order.payment.amountPaid.toFixed(2)} paid{order.payment.change>0&&<span style={{color:"#10b981"}}> · ₵{order.payment.change.toFixed(2)} change</span>}</span>}
                    </div>
                    {!collected?(
                      <div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Update Progress</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {stageList.map((s,i)=>{
                            const stageIdx=stageList.findIndex(x=>x.key===order.stage);const isPast=i<stageIdx;const isCur=i===stageIdx;const isNext=i===stageIdx+1;
                            return(<button key={s.key} onClick={()=>!isPast&&updateStage(order.id,s.key)} disabled={isPast} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:20,border:`1px solid ${isCur?s.color:isNext?"rgba(255,255,255,.2)":"rgba(255,255,255,.06)"}`,background:isCur?`${s.color}22`:isNext?"rgba(255,255,255,.04)":"transparent",color:isCur?s.color:isNext?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)",fontSize:11,fontWeight:isCur?700:500,cursor:isPast?"not-allowed":"pointer",transition:"all .2s",opacity:isPast?.4:1}}>
                              <span>{s.icon}</span>{s.label}
                              {isCur&&<span style={{width:6,height:6,borderRadius:"50%",background:s.color,animation:"pulse 1.5s infinite"}}/>}
                            </button>);
                          })}
                        </div>
                      </div>
                    ):<div style={{fontSize:12,color:"rgba(52,211,153,.6)",display:"flex",alignItems:"center",gap:6}}>🎉 {pickup?"Delivered":"Collected"} — order complete</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab==="pickups"&&(
        <div>
          <div style={{...GP,marginBottom:20}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff"}}>Pickup Management</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4}}>View pickup locations on map and assign drivers</div>
          </div>
          {pendingPickups.length===0?(
            <div style={{...GP,textAlign:"center",color:"rgba(255,255,255,.2)",padding:"50px 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>🚗</div>
              No pending pickups to manage
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {/* Pickup List */}
              <div style={GP}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff",marginBottom:16}}>Pending Pickups ({pendingPickups.length})</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {pendingPickups.map(order => {
                    const assignedStaff = order.assignedStaff ? staffList.find(s => s.id === order.assignedStaff) : null;
                    const isSelected = selectedPickup?.id === order.id;
                    return(
                      <div key={order.id} onClick={()=>setSelectedPickup(order)} style={{padding:"14px",borderRadius:12,border:`1.5px solid ${isSelected?"#818cf8":"rgba(255,255,255,.1)"}`,background:isSelected?"rgba(99,102,241,.1)":"rgba(255,255,255,.03)",cursor:"pointer",transition:"all .2s"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                          <div style={{background:"rgba(99,102,241,.2)",borderRadius:8,padding:"4px 8px",fontFamily:"monospace",fontWeight:700,fontSize:12,color:"#818cf8"}}>{order.invoiceNumber}</div>
                          {assignedStaff&&<span style={{fontSize:10,background:"rgba(16,185,129,.15)",border:"1px solid rgba(16,185,129,.3)",color:"#10b981",borderRadius:20,padding:"2px 8px"}}>👤 {assignedStaff.name}</span>}
                        </div>
                        <div style={{fontWeight:600,fontSize:13,color:"#fff",marginBottom:4}}>{order.customer.name}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>📅 {order.pickup?.date} at {order.pickup?.time}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>📍 {order.pickup?.address || "Location pinned on map"}</div>
                        {order.pickup?.location&&<div style={{fontSize:10,color:"#818cf8",marginTop:4}}>📌 {order.pickup.location.lat.toFixed(4)}, {order.pickup.location.lng.toFixed(4)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Map & Assignment */}
              <div style={GP}>
                {selectedPickup ? (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff"}}>Pickup Details</div>
                      <button onClick={()=>setSelectedPickup(null)} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.4)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</button>
                    </div>
                    {/* Map */}
                    {selectedPickup.pickup?.location ? (
                      <div style={{borderRadius:12,overflow:"hidden",height:200,marginBottom:16,border:"1.5px solid rgba(99,102,241,.3)"}}>
                        <MapView lat={selectedPickup.pickup.location.lat} lng={selectedPickup.pickup.location.lng} height={200}/>
                      </div>
                    ) : (
                      <div style={{height:200,background:"rgba(255,255,255,.05)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,border:"1px dashed rgba(255,255,255,.1)"}}>
                        <span style={{color:"rgba(255,255,255,.3)",fontSize:12}}>No location pinned by client</span>
                      </div>
                    )}
                    {/* Info */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                      <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:12}}>
                        <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Customer</div>
                        <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{selectedPickup.customer.name}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{selectedPickup.customer.phone}</div>
                      </div>
                      <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:12}}>
                        <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Schedule</div>
                        <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{selectedPickup.pickup?.date}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{selectedPickup.pickup?.time}</div>
                      </div>
                    </div>
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:12,marginBottom:16}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Address</div>
                      <div style={{fontSize:13,color:"#fff"}}>{selectedPickup.pickup?.address || "No address provided"}</div>
                      {selectedPickup.pickup?.addressNote&&<div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:4}}>{selectedPickup.pickup.addressNote}</div>}
                    </div>
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:12,marginBottom:16}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Services</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {selectedPickup.items.map((item,i)=>(
                          <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(99,102,241,.1)",border:"1px solid rgba(99,102,241,.2)",color:"#818cf8"}}>{item.name} ×{item.qty}</span>
                        ))}
                      </div>
                    </div>
                    {/* Assign Staff */}
                    <div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.4)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Assign Driver</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                        {staffList.filter(s=>s.active!==false).length===0 ? (
                          <div style={{fontSize:12,color:"rgba(255,255,255,.3)",padding:10}}>No active staff accounts. Create one in Staff Management.</div>
                        ) : staffList.filter(s=>s.active!==false).map(staff=>{
                          const isAssigned = selectedPickup.assignedStaff === staff.id;
                          return(
                            <button key={staff.id} onClick={()=>assignStaff(selectedPickup.id, staff.id)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${isAssigned?"#10b981":"rgba(255,255,255,.1)"}`,background:isAssigned?"rgba(16,185,129,.15)":"rgba(255,255,255,.03)",color:isAssigned?"#10b981":"rgba(255,255,255,.6)",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:14}}>👤</span> {staff.name}
                              {isAssigned&&<span style={{marginLeft:4}}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",minHeight:300,color:"rgba(255,255,255,.2)"}}>
                    <div style={{fontSize:48,marginBottom:12}}>📍</div>
                    <div style={{fontSize:14,marginBottom:4}}>Select a pickup</div>
                    <div style={{fontSize:12}}>to view location & assign driver</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT  (owner-only)
// ══════════════════════════════════════════════════════════════════════════════
function StaffManagement() {
  const [staffList, setStaffList] = useState(loadStaff);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add new
  const [form, setForm] = useState({ name:"", email:"", password:"", role:"staff" });
  const [formErr, setFormErr] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openAdd = () => {
    setForm({ name:"", email:"", password:"", role:"staff" });
    setFormErr({}); setEditTarget(null); setShowModal(true); setShowPwd(false);
  };

  const openEdit = (member) => {
    setForm({ name:member.name, email:member.email, password:member.password, role:member.role||"staff" });
    setFormErr({}); setEditTarget(member.id); setShowModal(true); setShowPwd(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format.";
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    
    const staffData = {
      name: form.name.trim(),
      username: form.email.trim().split('@')[0],
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    };
    
    try {
      if (editTarget) {
        await adminAPI.updateStaff(editTarget, staffData);
      } else {
        await adminAPI.createStaff(staffData);
      }
      // Refresh staff list from API
      const staff = await adminAPI.getStaff();
      setStaffList(staff);
      pushToast({ icon: editTarget ? "✏️" : "👤", title: editTarget ? "Staff Updated" : "Staff Created", message: `${form.name.trim()}'s account has been ${editTarget ? "updated" : "created"}.`, accent: "#818cf8", border: "rgba(129,140,248,.4)", duration: 3500 });
      setShowModal(false);
    } catch (err) {
      console.log("API handleSave failed, using localStorage:", err.message);
      // Fallback
      const current = loadStaff();
      let updated;
      if (editTarget) {
        updated = current.map(s => s.id === editTarget
          ? { ...s, name: form.name.trim(), email: form.email.trim(), ...(form.password ? { password: form.password } : {}), role: form.role }
          : s
        );
        pushToast({ icon: "✏️", title: "Staff Updated", message: `${form.name.trim()}'s account has been updated.`, accent: "#818cf8", border: "rgba(129,140,248,.4)", duration: 3500 });
      } else {
        const newMember = { id: `staff-${Date.now()}`, name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role, active: true, createdAt: new Date().toISOString() };
        updated = [...current, newMember];
        pushToast({ icon: "👤", title: "Staff Created", message: `${form.name.trim()} can now log in with their credentials.`, accent: "#10b981", border: "rgba(16,185,129,.4)", duration: 4000 });
      }
      saveStaff(updated); setStaffList(updated); setShowModal(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      await adminAPI.deleteStaff(id);
      const staff = await adminAPI.getStaff();
      setStaffList(staff);
    } catch (err) {
      console.log("API toggleActive failed, using localStorage:", err.message);
      const updated = loadStaff().map(s => s.id === id ? { ...s, active: !s.active } : s);
      saveStaff(updated); setStaffList(updated);
    }
  };

  const handleDelete = async (id) => {
    const updated = loadStaff().filter(s => s.id !== id);
    saveStaff(updated); setStaffList(updated); setConfirmDelete(null);
    pushToast({ icon:"🗑️", title:"Staff Removed", message:"Account deleted successfully.", accent:"#ef4444", border:"rgba(239,68,68,.4)", duration:3000 });
  };

  const avatarColor = (name) => {
    const colors = ["#818cf8","#10b981","#f59e0b","#00c6e0","#f43f5e","#fb923c","#34d399"];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const inputStyle = (hasErr) => ({
    width:"100%", padding:"11px 14px", borderRadius:12,
    border:`1.5px solid ${hasErr?"#ef4444":"rgba(255,255,255,.12)"}`,
    background:"rgba(255,255,255,.05)", color:"#fff", fontSize:14,
    fontFamily:"'DM Sans',sans-serif", outline:"none",
  });

  return (
    <div style={{ animation:"sIn .3s ease" }}>
      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",padding:16 }}>
          <div style={{ background:"rgba(5,18,40,.99)",border:"1px solid rgba(129,140,248,.25)",borderRadius:24,padding:32,width:"100%",maxWidth:480,boxShadow:"0 24px 70px rgba(0,0,0,.8)",animation:"popIn .25s ease" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
              <div>
                <h3 style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:20,marginBottom:4 }}>{editTarget?"Edit Staff Account":"Add New Staff"}</h3>
                <p style={{ fontSize:12,color:"rgba(255,255,255,.35)" }}>{editTarget?"Update credentials and details":"Create login credentials for a team member"}</p>
              </div>
              <button onClick={()=>setShowModal(false)} style={{ background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}><Icon.Close/></button>
            </div>

            {/* Name */}
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>Full Name</label>
            <div style={{ position:"relative",marginBottom:formErr.name?4:16 }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex" }}><Icon.User/></span>
              <input name="staff-name" type="text" placeholder="e.g. Abena Owusu" value={form.name} onChange={e=>{setForm(p=>({...p,name:e.target.value}));setFormErr(p=>({...p,name:""}));}} style={{ ...inputStyle(formErr.name), paddingLeft:42 }}/>
            </div>
            {formErr.name&&<p style={{ color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center" }}><Icon.Alert/>{formErr.name}</p>}

            {/* Email */}
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>Email Address</label>
            <div style={{ position:"relative",marginBottom:formErr.email?4:16 }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex" }}><Icon.Mail/></span>
              <input name="staff-email" type="email" placeholder="e.g. abena@deepcitadel.com" value={form.email} onChange={e=>{setForm(p=>({...p,email:e.target.value}));setFormErr(p=>({...p,email:""}));}} style={{ ...inputStyle(formErr.email), paddingLeft:42 }}/>
            </div>
            {formErr.email&&<p style={{ color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center" }}><Icon.Alert/>{formErr.email}</p>}

            {/* Password */}
            <label style={{ display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8 }}>
              {editTarget?"New Password":"Password"} {editTarget&&<span style={{ color:"rgba(255,255,255,.25)",fontSize:10,textTransform:"none" }}>(leave blank to keep current)</span>}
            </label>
            <div style={{ position:"relative",marginBottom:formErr.password?4:16 }}>
              <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",display:"flex" }}><Icon.Key/></span>
              <input name="staff-password" type={showPwd?"text":"password"} placeholder={editTarget?"Leave blank to keep unchanged":"Min. 6 characters"} value={form.password} onChange={e=>{setForm(p=>({...p,password:e.target.value}));setFormErr(p=>({...p,password:""}));}} style={{ ...inputStyle(formErr.password), paddingLeft:42, paddingRight:42 }}/>
              <button type="button" onClick={()=>setShowPwd(s=>!s)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:"rgba(255,255,255,.35)",cursor:"pointer",display:"flex",alignItems:"center",padding:0 }}>{showPwd?<Icon.EyeOff/>:<Icon.Eye/>}</button>
            </div>
            {formErr.password&&<p style={{ color:"#fca5a5",fontSize:11,marginBottom:12,display:"flex",gap:4,alignItems:"center" }}><Icon.Alert/>{formErr.password}</p>}

            {/* Generated credentials hint */}
            {!editTarget&&form.name&&form.email&&(
              <div style={{ background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",borderRadius:12,padding:"12px 14px",marginBottom:20 }}>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Login Preview</div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,.6)",fontFamily:"monospace" }}>Email: <span style={{ color:"#10b981" }}>{form.email}</span></div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,.6)",fontFamily:"monospace",marginTop:4 }}>Password: <span style={{ color:"#10b981" }}>{form.password||"(set above)"}</span></div>
              </div>
            )}

            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowModal(false)} style={{ flex:1,padding:"13px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSave} style={{ flex:2,padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 4px 18px rgba(99,102,241,.3)" }}>
                {editTarget?"Save Changes":"Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",padding:16 }}>
          <div style={{ background:"rgba(5,18,40,.99)",border:"1px solid rgba(239,68,68,.25)",borderRadius:20,padding:28,width:"100%",maxWidth:380,boxShadow:"0 24px 70px rgba(0,0,0,.8)",animation:"popIn .25s ease",textAlign:"center" }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"rgba(239,68,68,.15)",border:"2px solid rgba(239,68,68,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24 }}>🗑️</div>
            <h3 style={{ fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18,marginBottom:8 }}>Remove Staff?</h3>
            <p style={{ color:"rgba(255,255,255,.45)",fontSize:13,lineHeight:1.6,marginBottom:24 }}>
              This will permanently delete <span style={{ color:"#fff",fontWeight:700 }}>{confirmDelete.name}</span>'s account. They will no longer be able to log in.
            </p>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,padding:"12px",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer" }}>Cancel</button>
              <button onClick={()=>handleDelete(confirmDelete.id)} style={{ flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#dc2626,#ef4444)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:"#fff" }}>Staff Management</div>
          <div style={{ fontSize:12,color:"rgba(255,255,255,.35)",marginTop:3 }}>Create and manage staff login accounts</div>
        </div>
        <button onClick={openAdd} style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 20px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 4px 18px rgba(99,102,241,.3)" }}>
          <Icon.Plus/> Add Staff Member
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
        {[
          { label:"Total Staff", value:staffList.length, color:"#818cf8", icon:"👥" },
          { label:"Active",      value:staffList.filter(s=>s.active!==false).length, color:"#10b981", icon:"✅" },
          { label:"Inactive",   value:staffList.filter(s=>s.active===false).length, color:"#f59e0b", icon:"⏸️" },
        ].map(k=>(
          <div key={k.label} style={{ background:"rgba(5,25,45,.65)",border:`1px solid ${k.color}22`,borderRadius:14,padding:"16px 20px",backdropFilter:"blur(20px)" }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:k.color,lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11,color:"rgba(255,255,255,.3)",marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Staff list ── */}
      {staffList.length === 0 ? (
        <div style={{ ...GP, textAlign:"center", padding:"60px 0" }}>
          <div style={{ fontSize:48,marginBottom:16 }}>👥</div>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"rgba(255,255,255,.4)",marginBottom:8 }}>No staff accounts yet</div>
          <div style={{ fontSize:13,color:"rgba(255,255,255,.25)",lineHeight:1.6,marginBottom:24 }}>
            Click "Add Staff Member" to create login credentials<br/>for your team members.
          </div>
          <button onClick={openAdd} style={{ padding:"12px 28px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer" }}>
            Add First Staff Member
          </button>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {staffList.map(member => {
            const ac = avatarColor(member.name);
            const isActive = member.active !== false;
            const initials = member.name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
            return (
              <div key={member.id} style={{ ...GP, padding:"18px 24px", opacity:isActive?1:.65, transition:"opacity .2s" }}>
                <div style={{ display:"flex",alignItems:"center",gap:16 }}>
                  {/* Avatar */}
                  <div style={{ width:48,height:48,borderRadius:"50%",background:`${ac}22`,border:`2px solid ${ac}55`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <span style={{ fontFamily:"'Cinzel',serif",color:ac,fontSize:16,fontWeight:700 }}>{initials}</span>
                  </div>

                  {/* Info */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:3 }}>
                      <span style={{ fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#fff" }}>{member.name}</span>
                      {!isActive&&<span style={{ fontSize:10,background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",color:"#f59e0b",borderRadius:20,padding:"2px 8px",letterSpacing:1 }}>INACTIVE</span>}
                    </div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",fontFamily:"monospace" }}>{member.email}</div>
                    <div style={{ fontSize:11,color:"rgba(255,255,255,.25)",marginTop:3,display:"flex",alignItems:"center",gap:12 }}>
                      <span style={{ display:"flex",alignItems:"center",gap:4 }}><Icon.Key/> ••••••</span>
                      {member.createdAt && <span>Added {new Date(member.createdAt).toLocaleDateString("en-GH",{day:"numeric",month:"short",year:"numeric"})}</span>}
                    </div>
                  </div>

                  {/* Credential pill */}
                  <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(129,140,248,.08)",border:"1px solid rgba(129,140,248,.2)",borderRadius:10,padding:"6px 12px",flexShrink:0 }}>
                    <span style={{ fontSize:12 }}>🔐</span>
                    <span style={{ fontSize:11,color:"#818cf8",fontFamily:"monospace",fontWeight:600 }}>{member.email.split("@")[0]}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                    <button onClick={()=>openEdit(member)} title="Edit" style={{ width:34,height:34,borderRadius:9,border:"1px solid rgba(0,198,224,.25)",background:"rgba(0,198,224,.08)",color:"#00c6e0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(0,198,224,.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(0,198,224,.08)"}><Icon.Edit/></button>
                    <button onClick={()=>toggleActive(member.id)} title={isActive?"Deactivate":"Activate"} style={{ width:34,height:34,borderRadius:9,border:`1px solid ${isActive?"rgba(16,185,129,.25)":"rgba(245,158,11,.25)"}`,background:isActive?"rgba(16,185,129,.08)":"rgba(245,158,11,.08)",color:isActive?"#10b981":"#f59e0b",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }} onMouseEnter={e=>e.currentTarget.style.opacity=".7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{isActive?"✓":"○"}</button>
                    <button onClick={()=>setConfirmDelete(member)} title="Delete" style={{ width:34,height:34,borderRadius:9,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.06)"}><Icon.Trash/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── How it works ── */}
      <div style={{ marginTop:20,padding:"16px 20px",borderRadius:14,background:"rgba(129,140,248,.05)",border:"1px solid rgba(129,140,248,.15)" }}>
        <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
          <span style={{ fontSize:18,flexShrink:0 }}>💡</span>
          <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",lineHeight:1.7 }}>
            <strong style={{ color:"rgba(255,255,255,.6)" }}>How staff logins work:</strong> Create an account here with an email and password. The staff member then selects "Staff" on the login screen and enters their credentials. Active accounts can log in; inactive accounts are blocked. Staff can create orders and record payments, but cannot access owner analytics or manage services.
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DAILY JOBS REPORT  (owner-only)
// ══════════════════════════════════════════════════════════════════════════════
function DailyReport() {
  const allOrders = loadOrders();
  const toDateStr = (iso) => iso ? iso.slice(0,10) : "";
  const today = new Date().toISOString().slice(0,10);
  const allDates = [...new Set(allOrders.map(o => toDateStr(o.createdAt)))].sort().reverse();
  if (!allDates.includes(today)) allDates.unshift(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [stageFilter,  setStageFilter]  = useState("all");
  const [payFilter,    setPayFilter]    = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [receiptOrder, setReceiptOrder] = useState(null);

  const dayOrders = allOrders.filter(o => toDateStr(o.createdAt) === selectedDate);
  const filtered = dayOrders.filter(o => {
    if (stageFilter !== "all" && o.stage !== stageFilter) return false;
    if (payFilter === "paid"   && !o.payment) return false;
    if (payFilter === "unpaid" && o.payment)  return false;
    if (methodFilter !== "all" && o.payment?.method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!o.invoiceNumber.toLowerCase().includes(q) && !o.customer.name.toLowerCase().includes(q) && !o.customer.phone.includes(q)) return false;
    }
    return true;
  });

  const totalRevenue   = filtered.reduce((s,o) => s + (o.payment ? o.total : 0), 0);
  const totalBilled    = filtered.reduce((s,o) => s + o.total, 0);
  const paidCount      = filtered.filter(o=>o.payment).length;
  const unpaidCount    = filtered.filter(o=>!o.payment).length;
  const svcMap = {};
  filtered.forEach(o => o.items.forEach(it => {
    if (!svcMap[it.name]) svcMap[it.name] = { qty:0, revenue:0 };
    svcMap[it.name].qty += it.qty; svcMap[it.name].revenue += it.subtotal;
  }));
  const svcBreakdown = Object.entries(svcMap).sort((a,b)=>b[1].revenue-a[1].revenue);

  const filterBtnStyle = (active, color="#00c6e0") => ({
    padding:"5px 12px", borderRadius:20, border:`1px solid ${active?color+"66":"rgba(255,255,255,.1)"}`,
    background:active?`${color}18`:"rgba(255,255,255,.03)",
    color:active?color:"rgba(255,255,255,.4)", fontSize:11, fontWeight:600,
    cursor:"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .15s",
  });
  const selStyle = { background:"rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"8px 12px", color:"rgba(255,255,255,.8)", fontSize:12, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", outline:"none" };

  return (
    <div style={{animation:"sIn .3s ease"}}>
      {receiptOrder && <DigitalReceipt order={receiptOrder} onClose={()=>setReceiptOrder(null)}/>}
      <div style={{...GP, marginBottom:20, padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>📅</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"rgba(255,255,255,.6)"}}>Date:</span>
            <select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} style={{...selStyle, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"#00c6e0", border:"1px solid rgba(0,198,224,.3)"}}>
              {allDates.map(d=><option key={d} value={d}>{d===today?"Today — "+d:d}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6}}>
            {allDates.slice(0,5).map((d,i)=><button key={d} onClick={()=>setSelectedDate(d)} style={filterBtnStyle(selectedDate===d,"#00c6e0")}>{i===0&&d===today?"Today":i===1?"Yesterday":d}</button>)}
          </div>
          <div style={{marginLeft:"auto",position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13}}>🔍</span>
            <input placeholder="Search name, invoice, phone…" value={search} onChange={e=>setSearch(e.target.value)} style={{...selStyle, paddingLeft:32, width:220}}/>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
        {[{label:"Orders",value:filtered.length,color:"#818cf8",icon:"📋"},{label:"Revenue",value:`₵${totalRevenue.toFixed(2)}`,color:"#10b981",icon:"💰"},{label:"Billed",value:`₵${totalBilled.toFixed(2)}`,color:"#00c6e0",icon:"🧾"},{label:"Paid",value:paidCount,color:"#10b981",icon:"✅"},{label:"Unpaid",value:unpaidCount,color:"#f59e0b",icon:"⏳"},{label:"Completed",value:filtered.filter(o=>o.stage==="collected").length,color:"#34d399",icon:"🎉"}].map(k=>(
          <div key={k.label} style={{background:"rgba(5,25,45,.7)",border:`1px solid ${k.color}22`,borderRadius:14,padding:"14px 16px",backdropFilter:"blur(20px)"}}>
            <div style={{fontSize:18,marginBottom:4}}>{k.icon}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:k.color,lineHeight:1}}>{k.value}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:4,letterSpacing:.5}}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{...GP, marginBottom:20, padding:"14px 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase"}}>Stage:</span>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button onClick={()=>setStageFilter("all")} style={filterBtnStyle(stageFilter==="all")}>All</button>
              {ORDER_STAGES.map(s=><button key={s.key} onClick={()=>setStageFilter(s.key)} style={filterBtnStyle(stageFilter===s.key,s.color)}>{s.icon} {s.label}</button>)}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",marginTop:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase"}}>Payment:</span>
            {[["all","All"],["paid","Paid"],["unpaid","Unpaid"]].map(([k,l])=><button key={k} onClick={()=>setPayFilter(k)} style={filterBtnStyle(payFilter===k,"#10b981")}>{l}</button>)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:1,textTransform:"uppercase"}}>Method:</span>
            <button onClick={()=>setMethodFilter("all")} style={filterBtnStyle(methodFilter==="all","#818cf8")}>All</button>
            {PAYMENT_METHODS.map(pm=><button key={pm.key} onClick={()=>setMethodFilter(pm.key)} style={filterBtnStyle(methodFilter===pm.key,pm.color)}>{pm.icon} {pm.label}</button>)}
          </div>
          {(stageFilter!=="all"||payFilter!=="all"||methodFilter!=="all"||search)&&<button onClick={()=>{setStageFilter("all");setPayFilter("all");setMethodFilter("all");setSearch("");}} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:20,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#ef4444",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✕ Clear Filters</button>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:20,alignItems:"start"}}>
        <div>
          {filtered.length===0?<div style={{...GP,textAlign:"center",padding:"50px 0",color:"rgba(255,255,255,.2)"}}><div style={{fontSize:36,marginBottom:12}}>📭</div><div style={{fontSize:14}}>No orders match your filters for {selectedDate}</div></div>:filtered.map(order=>{
            const cur=ORDER_STAGES.find(s=>s.key===order.stage)||ORDER_STAGES[0];const isPaid=!!order.payment;const pm=PAYMENT_METHODS.find(p=>p.key===order.payment?.method);
            return(
              <div key={order.id} style={{...GP,marginBottom:12,padding:"16px 20px"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{background:`${cur.color}18`,border:`1px solid ${cur.color}44`,borderRadius:8,padding:"4px 10px",fontFamily:"monospace",fontWeight:700,fontSize:12,color:cur.color}}>{order.invoiceNumber}</div>
                    <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,color:"#fff"}}>{order.customer.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{order.customer.phone}</div></div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:11,color:cur.color,background:`${cur.color}15`,border:`1px solid ${cur.color}33`,borderRadius:20,padding:"3px 10px",display:"flex",gap:5,alignItems:"center"}}>{cur.icon}{cur.label}</div>
                    {isPaid?<div style={{fontSize:11,color:"#10b981",background:"rgba(16,185,129,.12)",border:"1px solid rgba(16,185,129,.3)",borderRadius:20,padding:"3px 10px"}}>{pm?.icon} {pm?.label}</div>:<div style={{fontSize:11,color:"#f59e0b",background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",borderRadius:20,padding:"3px 10px"}}>⏳ Unpaid</div>}
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:isPaid?"#10b981":"#f59e0b"}}>₵{order.total.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:isPaid?8:0}}>
                  {order.items.map((it,i)=><span key={i} style={{fontSize:11,padding:"2px 9px",borderRadius:20,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",color:"rgba(255,255,255,.55)"}}>{it.name} ×{it.qty}</span>)}
                </div>
                {isPaid&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:6}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Paid ₵{order.payment.amountPaid.toFixed(2)}{order.payment.change>0&&<span style={{color:"#10b981"}}> · ₵{order.payment.change.toFixed(2)} change</span>}{order.payment.note&&<span style={{fontStyle:"italic"}}> · {order.payment.note}</span>}</div>
                  <button onClick={()=>setReceiptOrder(order)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:8,border:"1px solid rgba(16,185,129,.3)",background:"rgba(16,185,129,.08)",color:"#10b981",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}><Icon.Receipt/> Receipt</button>
                </div>}
              </div>
            );
          })}
        </div>
        <div>
          <div style={{...GP,marginBottom:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff",marginBottom:14}}>Service Breakdown</div>
            {svcBreakdown.length===0?<div style={{fontSize:12,color:"rgba(255,255,255,.2)",textAlign:"center",padding:"20px 0"}}>No data</div>:svcBreakdown.map(([name,data])=>{
              const meta=DEFAULT_META[name]||{accent:"#00c6e0"};const pct=totalBilled>0?(data.revenue/totalBilled*100):0;
              return(<div key={name} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>{name}</span><span style={{fontSize:12,color:meta.accent,fontWeight:700}}>₵{data.revenue.toFixed(2)}</span></div><div style={{height:5,background:"rgba(255,255,255,.06)",borderRadius:10,overflow:"hidden",marginBottom:3}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${meta.accent}88,${meta.accent})`,borderRadius:10,transition:"width .5s ease"}}/></div><div style={{fontSize:10,color:"rgba(255,255,255,.25)"}}>{data.qty} item{data.qty!==1?"s":""} · {pct.toFixed(0)}% of billing</div></div>);
            })}
          </div>
          <div style={{...GP}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#fff",marginBottom:14}}>Payment Methods</div>
            {PAYMENT_METHODS.map(pm=>{
              const pmOrders=filtered.filter(o=>o.payment?.method===pm.key);const pmTotal=pmOrders.reduce((s,o)=>s+o.total,0);const pmPct=totalRevenue>0?(pmTotal/totalRevenue*100):0;
              if(pmOrders.length===0)return null;
              return(<div key={pm.key} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>{pm.icon} {pm.label}</span><span style={{fontSize:12,color:pm.color,fontWeight:700}}>₵{pmTotal.toFixed(2)}</span></div><div style={{height:5,background:"rgba(255,255,255,.06)",borderRadius:10,overflow:"hidden"}}><div style={{height:"100%",width:`${pmPct}%`,background:pm.color,borderRadius:10,transition:"width .5s ease"}}/></div><div style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:3}}>{pmOrders.length} order{pmOrders.length!==1?"s":""}</div></div>);
            })}
            {filtered.filter(o=>o.payment).length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,.2)",textAlign:"center",padding:"16px 0"}}>No paid orders</div>}
            {unpaidCount>0&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px dashed rgba(245,158,11,.2)"}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>⏳ Outstanding</span><span style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>₵{filtered.filter(o=>!o.payment).reduce((s,o)=>s+o.total,0).toFixed(2)}</span></div><div style={{fontSize:10,color:"rgba(255,255,255,.25)",marginTop:3}}>{unpaidCount} order{unpaidCount!==1?"s":""} pending</div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OWNER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function OwnerDashboard({onLogout,audioUnlocked=false}){
  const loadSvc=()=>{try{const p=loadPrices();return Object.entries(p).map(([name,price],i)=>({id:Date.now()+i,name,price,enabled:true,...(DEFAULT_META[name]||{icon:"Wash",accent:"#00c6e0"})}));}catch{return Object.entries(DEFAULT_PRICES).map(([name,price],i)=>({id:Date.now()+i,name,price,enabled:true,...(DEFAULT_META[name]||{icon:"Wash",accent:"#00c6e0"})}))}};
  const [ownerView,setOwnerView]=useState("dashboard");
  const [services,setServices]=useState(loadSvc);
  const [editingId,setEditingId]=useState(null);
  const [showAddModal,setShowAddModal]=useState(false);
  const [saveFlash,setSaveFlash]=useState(false);
  const [newSvc,setNewSvc]=useState({name:"",price:"",icon:"Wash",accent:"#00c6e0"});
  const [newErr,setNewErr]=useState({});

  if(ownerView==="pos") return <StaffView role="owner" onLogout={onLogout} onBack={()=>setOwnerView("dashboard")} audioUnlocked={audioUnlocked}/>;

  const saveToStorage=(svcs)=>{const obj=Object.fromEntries(svcs.filter(s=>s.enabled).map(s=>[s.name,parseFloat(s.price)]));localStorage.setItem(PRICE_KEY,JSON.stringify(obj));setSaveFlash(true);setTimeout(()=>setSaveFlash(false),1800);};
  const upd=(id,f,v)=>setServices(prev=>prev.map(s=>s.id===id?{...s,[f]:v}:s));
  const del=(id)=>setServices(prev=>prev.filter(s=>s.id!==id));
  const tog=(id)=>setServices(prev=>prev.map(s=>s.id===id?{...s,enabled:!s.enabled}:s));
  const addSvc=()=>{const e={};if(!newSvc.name.trim())e.name="Name required.";else if(services.find(s=>s.name.toLowerCase()===newSvc.name.trim().toLowerCase()))e.name="Already exists.";if(!newSvc.price||isNaN(parseFloat(newSvc.price)))e.price="Valid price required.";if(Object.keys(e).length){setNewErr(e);return;}setServices(prev=>[...prev,{id:Date.now(),name:newSvc.name.trim(),price:parseFloat(newSvc.price),icon:newSvc.icon,accent:newSvc.accent,enabled:true}]);setShowAddModal(false);setNewSvc({name:"",price:"",icon:"Wash",accent:"#00c6e0"});setNewErr({});};
  const tot=services.filter(s=>s.enabled).length;
  const staffCount = loadStaff().filter(s=>s.active!==false).length;

  const NAV_TABS = [
    {id:"dashboard", label:"⚙️  Dashboard"},
    {id:"staff",     label:"👥  Staff"},
    {id:"report",    label:"📊  Reports"},
    {id:"pos",       label:"🧺  POS"},
  ];

  return(
    <div style={{position:"relative",zIndex:1,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",padding:"22px 28px",color:"#e8f4f8"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <DCLogo size="sm"/>
          <div style={{marginLeft:4}}>
            <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:20,color:"#fff",letterSpacing:.5}}>Deep Citadel</div>
            <div style={{display:"flex",gap:6,marginTop:4}}>
              {NAV_TABS.map(t=>(
                <button key={t.id} onClick={()=>setOwnerView(t.id)} style={{padding:"3px 12px",borderRadius:20,border:`1px solid ${ownerView===t.id?"rgba(245,158,11,.5)":"rgba(255,255,255,.1)"}`,background:ownerView===t.id?"rgba(245,158,11,.15)":"transparent",color:ownerView===t.id?"#f59e0b":"rgba(255,255,255,.35)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .2s",display:"flex",alignItems:"center",gap:5}}>
                  {t.label}
                  {t.id==="staff"&&staffCount>0&&<span style={{background:"rgba(245,158,11,.25)",color:"#f59e0b",borderRadius:10,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800}}>{staffCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",color:"#f59e0b",fontSize:11,fontWeight:600,letterSpacing:1.5,padding:"5px 14px",borderRadius:20,textTransform:"uppercase"}}>🛡️ Owner</div>
          <button onClick={onLogout} style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>{e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.5)";}}>
            <Icon.SignOut/> Sign Out
          </button>
        </div>
      </div>

      {ownerView==="report" && <DailyReport/>}
      {ownerView==="staff"  && <StaffManagement/>}

      {ownerView==="dashboard" && <>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
          {[
            {label:"Total Services", value:services.length,  color:"#00c6e0", icon:"⚙️"},
            {label:"Active Services",value:tot,              color:"#10b981", icon:"✅"},
            {label:"Staff Members",  value:staffCount,       color:"#818cf8", icon:"👥"},
            {label:"Disabled Svcs",  value:services.length-tot, color:"#f59e0b", icon:"⏸️"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(5,25,45,.65)",border:`1px solid ${s.color}22`,borderRadius:16,padding:"18px 20px",backdropFilter:"blur(20px)",cursor:s.label==="Staff Members"?"pointer":"default"}} onClick={()=>s.label==="Staff Members"&&setOwnerView("staff")}>
              <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,color:s.color}}>{s.value}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2}}>{s.label}</div>
              {s.label==="Staff Members"&&<div style={{fontSize:10,color:s.color,marginTop:4,opacity:.7}}>Click to manage →</div>}
            </div>
          ))}
        </div>

        <div style={GP}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#fff"}}>Service & Price Management</div><div style={{fontSize:11,color:"rgba(255,255,255,.3)",marginTop:3}}>Edit prices, toggle availability, add or remove services</div></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAddModal(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 3px 14px rgba(0,198,224,.3)"}}><Icon.Plus/> Add Service</button>
              <button onClick={()=>saveToStorage(services)} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:11,border:"none",background:saveFlash?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#10b981,#34d399)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}><Icon.Save/> {saveFlash?"Saved ✓":"Save Changes"}</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 80px",gap:12,padding:"8px 16px",marginBottom:8}}>
            {["Service Name","Price (₵)","Icon","Color","Actions"].map(h=><div key={h} style={{fontSize:10,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:1.2,fontWeight:600}}>{h}</div>)}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {services.map(svc=>{
              const SI=Icon[svc.icon]||Icon.Wash;const isE=editingId===svc.id;
              return(
                <div key={svc.id} style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 80px",gap:12,alignItems:"center",background:svc.enabled?"rgba(255,255,255,.04)":"rgba(255,255,255,.015)",border:`1px solid ${svc.enabled?svc.accent+"33":"rgba(255,255,255,.06)"}`,borderLeft:`3px solid ${svc.enabled?svc.accent:"rgba(255,255,255,.1)"}`,borderRadius:14,padding:"12px 16px",opacity:svc.enabled?1:.5,animation:"sIn .2s ease"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,.05)",border:`1px solid ${svc.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",color:svc.accent,flexShrink:0}}><SI/></div>
                    {isE?<input autoFocus value={svc.name} onChange={e=>upd(svc.id,"name",e.target.value)} style={{background:"rgba(0,0,0,.3)",border:`1px solid ${svc.accent}`,borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:13,fontFamily:"'DM Sans',sans-serif",width:"100%"}}/>:<span style={{fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:600,color:svc.enabled?"#e8f4f8":"rgba(255,255,255,.4)"}}>{svc.name}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:"rgba(255,255,255,.3)",fontSize:13}}>₵</span><input type="number" min="0" step=".5" value={svc.price} onChange={e=>upd(svc.id,"price",e.target.value)} style={{background:"rgba(0,0,0,.3)",border:`1px solid ${isE?svc.accent:"rgba(255,255,255,.1)"}`,borderRadius:8,padding:"6px 10px",color:svc.accent,fontSize:14,fontFamily:"'Syne',sans-serif",fontWeight:700,width:"100%"}} onFocus={e=>e.target.style.borderColor=svc.accent} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/></div>
                  <select value={svc.icon} onChange={e=>upd(svc.id,"icon",e.target.value)} style={{background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"6px 8px",color:"rgba(255,255,255,.7)",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",width:"100%"}}>{ICON_OPTIONS.map(ic=><option key={ic} value={ic}>{ic}</option>)}</select>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{ACCENT_OPTIONS.map(c=><div key={c} onClick={()=>upd(svc.id,"accent",c)} style={{width:18,height:18,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${svc.accent===c?"#fff":"transparent"}`,transition:"border .15s"}}/>)}</div>
                  <div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>
                    <button onClick={()=>setEditingId(isE?null:svc.id)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${isE?"#00c6e0":"rgba(255,255,255,.12)"}`,background:isE?"rgba(0,198,224,.15)":"rgba(255,255,255,.04)",color:isE?"#00c6e0":"rgba(255,255,255,.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{isE?<Icon.Check/>:<Icon.Edit/>}</button>
                    <button onClick={()=>tog(svc.id)} style={{width:28,height:28,borderRadius:7,border:`1px solid ${svc.enabled?"rgba(16,185,129,.3)":"rgba(255,255,255,.1)"}`,background:svc.enabled?"rgba(16,185,129,.1)":"rgba(255,255,255,.03)",color:svc.enabled?"#10b981":"rgba(255,255,255,.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>{svc.enabled?"✓":"○"}</button>
                    <button onClick={()=>del(svc.id)} style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.08)",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.2)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.08)"}><Icon.Trash/></button>
                  </div>
                </div>
              );
            })}
          </div>
          {services.length===0&&<div style={{textAlign:"center",color:"rgba(255,255,255,.2)",padding:"40px 0",fontSize:14}}>No services yet.</div>}
          <div style={{marginTop:16,padding:"11px 14px",borderRadius:10,background:"rgba(245,158,11,.05)",border:"1px solid rgba(245,158,11,.15)",display:"flex",alignItems:"center",gap:8}}><span>💡</span><p style={{fontSize:12,color:"rgba(255,255,255,.35)",lineHeight:1.5}}>Edit prices directly. Click <b style={{color:"rgba(255,255,255,.5)"}}>Edit</b> to rename. Toggle to enable/disable on POS. Press <b style={{color:"#10b981"}}>Save Changes</b> to apply.</p></div>
        </div>
      </>}

      {showAddModal&&(
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",padding:16}}>
          <div style={{background:"rgba(5,20,45,.98)",border:"1px solid rgba(0,198,224,.2)",borderRadius:20,padding:28,width:"100%",maxWidth:440,boxShadow:"0 20px 60px rgba(0,0,0,.7)",animation:"popIn .25s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}><h3 style={{fontFamily:"'Cinzel',serif",color:"#fff",fontSize:18}}>Add New Service</h3><button onClick={()=>{setShowAddModal(false);setNewErr({});setNewSvc({name:"",price:"",icon:"Wash",accent:"#00c6e0"});}} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Icon.Close/></button></div>
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Service Name</label>
            <input value={newSvc.name} onChange={e=>{setNewSvc(p=>({...p,name:e.target.value}));setNewErr(p=>({...p,name:""}));}} placeholder="e.g. Express Wash" style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${newErr.name?"#ef4444":"rgba(255,255,255,.12)"}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}/>
            {newErr.name&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:8,display:"flex",alignItems:"center",gap:4}}><Icon.Alert/>{newErr.name}</p>}
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1,textTransform:"uppercase",margin:"12px 0 6px"}}>Price (₵)</label>
            <input type="number" min="0" step=".5" value={newSvc.price} onChange={e=>{setNewSvc(p=>({...p,price:e.target.value}));setNewErr(p=>({...p,price:""}));}} placeholder="0.00" style={{width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${newErr.price?"#ef4444":"rgba(255,255,255,.12)"}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:14,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}/>
            {newErr.price&&<p style={{color:"#fca5a5",fontSize:11,marginBottom:8,display:"flex",alignItems:"center",gap:4}}><Icon.Alert/>{newErr.price}</p>}
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1,textTransform:"uppercase",margin:"12px 0 8px"}}>Icon</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{ICON_OPTIONS.map(ic=>{const IC=Icon[ic]||Icon.Wash;return(<div key={ic} onClick={()=>setNewSvc(p=>({...p,icon:ic}))} style={{width:40,height:40,borderRadius:10,border:`2px solid ${newSvc.icon===ic?newSvc.accent:"rgba(255,255,255,.1)"}`,background:newSvc.icon===ic?`${newSvc.accent}22`:"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:newSvc.icon===ic?newSvc.accent:"rgba(255,255,255,.4)",transition:"all .15s"}}><IC/></div>);})}</div>
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,.4)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Color</label>
            <div style={{display:"flex",gap:10,marginBottom:24,flexWrap:"wrap"}}>{ACCENT_OPTIONS.map(c=><div key={c} onClick={()=>setNewSvc(p=>({...p,accent:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:`3px solid ${newSvc.accent===c?"#fff":"transparent"}`,transition:"border .15s"}}/>)}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowAddModal(false);setNewErr({});setNewSvc({name:"",price:"",icon:"Wash",accent:"#00c6e0"});}} style={{flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.04)",color:"rgba(255,255,255,.5)",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={addSvc} style={{flex:2,padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#0077b6,#00c6e0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Add Service</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audio Unlock Banner ───────────────────────────────────────────────────────
function AudioUnlockBanner({ onUnlock }) {
  return (
    <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", zIndex:9998, background:"rgba(5,20,42,.97)", border:"1px solid rgba(0,198,224,.3)", borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,.5)", backdropFilter:"blur(20px)", animation:"slideUp .4s ease", whiteSpace:"nowrap" }}>
      <span style={{fontSize:20}}>🔔</span>
      <span style={{fontSize:13, color:"rgba(255,255,255,.6)", fontFamily:"'DM Sans',sans-serif"}}>Enable notification sounds?</span>
      <button onClick={onUnlock} style={{ padding:"7px 16px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#0077b6,#00c6e0)", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer" }}>Enable Sounds</button>
      <button onClick={() => onUnlock(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:20,padding:"0 4px",lineHeight:1}}>×</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function DeepCitadelApp(){
  const [session,setSession]=useState(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);

  useEffect(() => {
    if (session && !audioUnlocked) {
      const t = setTimeout(() => setShowUnlockBanner(true), 900);
      return () => clearTimeout(t);
    }
  }, [session, audioUnlocked]);

  const unlockAudio = (doEnable = true) => {
    if (doEnable) {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") ctx.resume();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start(0);
      } catch(e) {}
      setAudioUnlocked(true);
      pushToast({ icon:"🔔", title:"Sounds Enabled", message:"You'll hear alerts for all order updates.", accent:"#00c6e0", border:"rgba(0,198,224,.3)", duration:2500 });
    }
    setShowUnlockBanner(false);
  };

  return(
    <>
      <style>{CSS}</style>
      <DeepCitadelBackground/>
      <ToastContainer/>
      {!session&&<LoginView onLogin={setSession}/>}
      {session?.role==="owner"&&<OwnerDashboard onLogout={()=>setSession(null)} audioUnlocked={audioUnlocked}/>}
      {session?.role==="staff"&&<StaffView role="staff" onLogout={()=>setSession(null)} audioUnlocked={audioUnlocked} staffName={session.staffName}/>}
      {session?.role==="client"&&<ClientTrackingView invoice={session.invoice} onLogout={()=>setSession(null)} audioUnlocked={audioUnlocked}/>}
      {showUnlockBanner && <AudioUnlockBanner onUnlock={unlockAudio}/>}
    </>
  );
}