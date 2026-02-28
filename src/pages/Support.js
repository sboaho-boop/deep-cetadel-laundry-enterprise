import { useState, useEffect, useRef } from "react";
import {
  FaWhatsapp, FaEnvelope, FaPhone, FaMapMarkerAlt, FaTicketAlt,
  FaChevronDown, FaChevronUp, FaPaperclip, FaTimes, FaCheckCircle,
  FaRobot, FaPaperPlane, FaSearch, FaClock, FaExclamationCircle,
} from "react-icons/fa";

// ── Constants ─────────────────────────────────────────────────────────────────
const WA_NUMBER  = "+233244639002";
const COMPANY    = "Deep Citadel Laundry";
const MAX_CHARS  = 500;
const TICKET_KEY = "dcl_support_tickets";

const CATEGORIES = [
  { key: "billing",   label: "💳 Billing & Payments",  color: "#f59e0b" },
  { key: "delivery",  label: "🚚 Delivery & Pickup",    color: "#0077b6" },
  { key: "quality",   label: "✨ Quality Issue",         color: "#8b5cf6" },
  { key: "account",   label: "👤 Account & Login",      color: "#10b981" },
  { key: "general",   label: "💬 General Enquiry",      color: "#64748b" },
];

const FAQS = [
  { q: "How long does laundry take?",           a: "Standard wash & fold takes 24–48 hours. Express service is available within 6–12 hours for an extra fee." },
  { q: "How do I track my order?",              a: "Visit our Track Order page and enter your unique tracking token sent via WhatsApp/SMS after pickup." },
  { q: "What payment methods do you accept?",   a: "We accept Cash, MTN MoMo, Vodafone Cash, and Bank transfers. Payment is due upon delivery." },
  { q: "Do you offer pickup and delivery?",     a: "Yes! We offer free pickup & delivery for orders above GHS 100 within Accra. Express delivery is GHS 10." },
  { q: "What if my clothes are damaged?",       a: "We take great care of your garments. In the rare case of damage, please contact us within 48 hours of delivery and we will resolve it promptly." },
  { q: "Can I cancel or reschedule a pickup?",  a: "Yes, cancellations or reschedules are free if done at least 2 hours before the scheduled pickup time." },
];

const BOT_RESPONSES = {
  "track":    "To track your order, go to the **Track Order** page and enter your token. Your token was sent to your WhatsApp/phone after pickup. 📦",
  "payment":  "We accept Cash, MoMo (MTN & Vodafone), and Bank transfer. All payments are due on delivery. 💳",
  "delivery": "Standard delivery takes 24–48 hours. Express is 6–12 hours. Free delivery on orders over GHS 100. 🚚",
  "damage":   "We're sorry to hear that! Please contact us within 48 hours of delivery with photos. We'll make it right. 📸",
  "price":    "Our pricing: Wash & Fold = GHS 50/item, Dry Cleaning = GHS 100/item, Ironing = GHS 20/item, Express = GHS 80/item. 💰",
  "cancel":   "You can cancel or reschedule up to 2 hours before your pickup time at no charge. 📅",
  "hours":    "We operate Monday–Saturday 7AM–8PM and Sunday 9AM–5PM. 🕐",
  "default":  "Thanks for your message! For urgent issues, tap the WhatsApp button below to speak with our team directly. 💬",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const genTicketId = () => "TKT-" + Date.now().toString(36).toUpperCase().slice(-6);
const nowStr      = () => new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
function loadTickets() { try { return JSON.parse(localStorage.getItem(TICKET_KEY)) || []; } catch { return []; } }
function saveTickets(t) { try { localStorage.setItem(TICKET_KEY, JSON.stringify(t)); } catch {} }

function getBotReply(msg) {
  const m = msg.toLowerCase();
  for (const [key, reply] of Object.entries(BOT_RESPONSES)) {
    if (key !== "default" && m.includes(key)) return reply;
  }
  return BOT_RESPONSES.default;
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * -canvas.height,
      r: Math.random() * 6 + 3, d: Math.random() * 0.03 + 0.02,
      color: `hsl(${Math.random() * 360},100%,55%)`,
      tiltAngle: 0, tiltInc: Math.random() * 0.07 + 0.05,
    }));
    let angle = 0, raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(c => {
        c.tiltAngle += c.tiltInc;
        const tilt = Math.sin(c.tiltAngle) * 12;
        ctx.beginPath(); ctx.moveTo(c.x + tilt + c.r / 2, c.y);
        ctx.lineTo(c.x + tilt, c.y + c.r);
        ctx.strokeStyle = c.color; ctx.lineWidth = c.r / 2; ctx.stroke();
        c.y += Math.sin(angle + c.d) + 1 + c.r / 2;
        c.x += Math.sin(angle);
        if (c.y > canvas.height) c.y = -10;
      });
      angle += 0.01;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }} />;
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
function FAQItem({ faq, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left",
          color: open ? "#00d4ff" : "rgba(255,255,255,0.85)", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500,
          transition: "color 0.2s" }}>
        <span>{faq.q}</span>
        <span style={{ flexShrink: 0, color: open ? "#00d4ff" : "rgba(255,255,255,0.4)", transition: "transform 0.3s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <FaChevronDown size={13} />
        </span>
      </button>
      <div style={{ maxHeight: open ? 200 : 0, overflow: "hidden", transition: "max-height 0.4s ease", padding: open ? "0 20px 16px" : "0 20px" }}>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7 }}>{faq.a}</p>
      </div>
    </div>
  );
}

// ── Chat Bot ──────────────────────────────────────────────────────────────────
function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: "👋 Hi! I'm the DCL support bot. Ask me about tracking, payments, delivery, pricing, or hours!" }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    const userMsg = { from: "user", text: txt };
    const botMsg  = { from: "bot",  text: getBotReply(txt), typing: true };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { ...botMsg, typing: false }]);
    }, 700);
  };

  return (
    <div style={{ position: "fixed", bottom: 96, right: 24, width: 320, borderRadius: 20,
      background: "#0d1b3e", border: "1px solid rgba(0,212,255,0.2)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)", zIndex: 900, overflow: "hidden",
      animation: "slideUp 0.3s ease", fontFamily: "'DM Sans',sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", background: "linear-gradient(135deg,#0077b6,#00d4ff)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaRobot size={15} color="#fff" />
          </div>
          <div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0 }}>DCL Support Bot</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, margin: 0 }}>● Online</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16 }}><FaTimes /></button>
      </div>

      {/* Messages */}
      <div style={{ height: 260, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
            {m.from === "bot" && (
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#0077b6,#00d4ff)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                <FaRobot size={11} color="#fff" />
              </div>
            )}
            <div style={{ maxWidth: "75%", padding: "9px 13px", borderRadius: m.from === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
              background: m.from === "user" ? "linear-gradient(135deg,#0077b6,#00d4ff)" : "rgba(255,255,255,0.07)",
              color: m.from === "user" ? "#fff" : "rgba(255,255,255,0.85)", fontSize: 12, lineHeight: 1.6 }}>
              {m.typing ? <span style={{ opacity: 0.6 }}>Typing…</span> : m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12, outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
        <button onClick={send} style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#0077b6,#00d4ff)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FaPaperPlane size={13} />
        </button>
      </div>

      {/* Quick replies */}
      <div style={{ padding: "0 12px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Track order", "Pricing", "Hours", "Payment"].map(q => (
          <button key={q} onClick={() => { setInput(q); }}
            style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(0,212,255,0.3)", background: "transparent", color: "#00d4ff", fontSize: 10, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ticket Status Tracker ─────────────────────────────────────────────────────
function TicketTracker() {
  const [searchId, setSearchId] = useState("");
  const [result,   setResult]   = useState(null);
  const [notFound, setNotFound] = useState(false);

  const search = () => {
    const tickets = loadTickets();
    const found   = tickets.find(t => t.id.toLowerCase() === searchId.trim().toLowerCase());
    if (found) { setResult(found); setNotFound(false); }
    else       { setResult(null); setNotFound(true); setTimeout(() => setNotFound(false), 3000); }
  };

  const STATUS_COLOR = { open: "#f59e0b", "in-progress": "#0077b6", resolved: "#10b981" };

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "20px", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
      <h4 style={{ fontFamily: "'Cinzel',serif", color: "#e2e8f0", fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <FaSearch size={13} color="#00d4ff" /> Track Your Ticket
      </h4>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={searchId} onChange={e => setSearchId(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Enter ticket ID e.g. TKT-ABC123"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 13, outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
        <button onClick={search} style={{ padding: "10px 16px", borderRadius: 10, background: "linear-gradient(135deg,#0077b6,#00d4ff)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
          Find
        </button>
      </div>

      {notFound && <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>❌ Ticket not found. Check the ID and try again.</p>}

      {result && (
        <div style={{ marginTop: 14, padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Cinzel',serif", color: "#00d4ff", fontSize: 13, fontWeight: 700 }}>{result.id}</span>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: STATUS_COLOR[result.status], background: `${STATUS_COLOR[result.status]}18` }}>
              {result.status === "open" ? "🟡 Open" : result.status === "in-progress" ? "🔵 In Progress" : "🟢 Resolved"}
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}><b style={{ color: "rgba(255,255,255,0.5)" }}>Category:</b> {result.category}</p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 }}><b style={{ color: "rgba(255,255,255,0.5)" }}>Submitted:</b> {result.date}</p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}><b style={{ color: "rgba(255,255,255,0.5)" }}>Message:</b> {result.message.slice(0, 80)}…</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SUPPORT PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function Support() {
  const [email,    setEmail]    = useState("");
  const [name,     setName]     = useState("");
  const [message,  setMessage]  = useState("");
  const [category, setCategory] = useState("general");
  const [file,     setFile]     = useState(null);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [submitted,setSubmitted]= useState(null); // ticket object on success
  const [shake,    setShake]    = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [loaded,   setLoaded]   = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const validate = () => {
    const e = {};
    if (!name.trim())    e.name    = "Name is required.";
    if (!email.trim())   e.email   = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Please enter a valid email.";
    if (!message.trim()) e.message = "Please describe your issue.";
    else if (message.length < 20) e.message = "Message must be at least 20 characters.";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setErrors({});
    setLoading(true);

    setTimeout(() => {
      const ticket = {
        id: genTicketId(), date: nowStr(), email, name,
        category: CATEGORIES.find(c => c.key === category)?.label || category,
        message, status: "open",
      };
      const tickets = loadTickets();
      saveTickets([ticket, ...tickets]);
      setSubmitted(ticket);
      setConfetti(true);
      setLoading(false);
      setTimeout(() => setConfetti(false), 3500);
    }, 1200);
  };

  const reset = () => {
    setSubmitted(null); setEmail(""); setName(""); setMessage("");
    setCategory("general"); setFile(null); setErrors({});
  };

  const charLeft = MAX_CHARS - message.length;
  const catMeta  = CATEGORIES.find(c => c.key === category);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-6px);} 40%,80%{transform:translateX(6px);} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,0.5);} 50%{box-shadow:0 0 0 10px rgba(37,211,102,0);} }
        @keyframes spin { to { transform:rotate(360deg); } }
        input:focus, textarea:focus, select:focus { outline: none; border-color: #00d4ff !important; box-shadow: 0 0 0 3px rgba(0,212,255,0.12) !important; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
        @media(max-width:768px) { .support-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <Confetti active={confetti} />

      {/* WhatsApp float */}
      <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I need support from Deep Citadel Laundry.")}`}
        target="_blank" rel="noopener noreferrer"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 800, width: 56, height: 56, borderRadius: "50%",
          background: "#25d366", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(37,211,102,0.5)", animation: "pulse 2s infinite", textDecoration: "none" }}
        title="Chat on WhatsApp">
        <FaWhatsapp size={26} color="#fff" />
      </a>

      {/* Chat bot toggle */}
      <button onClick={() => setChatOpen(o => !o)}
        style={{ position: "fixed", bottom: 90, right: 24, zIndex: 800, width: 46, height: 46, borderRadius: "50%",
          background: chatOpen ? "#ef4444" : "linear-gradient(135deg,#0077b6,#00d4ff)",
          border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,119,182,0.4)", cursor: "pointer", transition: "all 0.3s" }}>
        {chatOpen ? <FaTimes size={18} color="#fff" /> : <FaRobot size={18} color="#fff" />}
      </button>
      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}

      {/* Page */}
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#060d1f 0%,#0a1628 50%,#0d2b5e 100%)",
        opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.7s ease", padding: "48px 16px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#0077b6,#00d4ff)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            boxShadow: "0 0 30px rgba(0,212,255,0.4)" }}>
            <FaTicketAlt size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Cinzel',serif", color: "#fff", fontSize: "clamp(24px,5vw,36px)", letterSpacing: 1, marginBottom: 10 }}>
            Support Centre
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, maxWidth: 440, margin: "0 auto" }}>
            We're here to help. Submit a ticket, browse FAQs, or chat with us directly.
          </p>
        </div>

        {/* Contact info cards */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
          {[
            { icon: <FaWhatsapp size={18}/>, label: "WhatsApp", val: "++233 24 463 9002", href: `https://wa.me/${WA_NUMBER}`, color: "#25d366" },
            { icon: <FaEnvelope size={18}/>, label: "Email",    val: "deepcitadelentaprice@gmail.com",  href: "mailto:deepcitadelenterprice@gmail.com", color: "#00d4ff" },
            { icon: <FaPhone size={18}/>,   label: "Phone",    val: "0244639002",             href: "tel:0244639002",              color: "#f59e0b" },
            { icon: <FaClock size={18}/>,   label: "Hours",    val: "Mon–Sat 7AM–8PM",        href: null,                          color: "#10b981" },
          ].map(({ icon, label, val, href, color }) => (
            <a key={label} href={href || "#"} target={href?.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)", textDecoration: "none", minWidth: 180,
                transition: "all 0.25s", cursor: href ? "pointer" : "default" }}
              onMouseEnter={e => { if(href) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</p>
                <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{val}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Main grid */}
        <div className="support-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 24, maxWidth: 980, margin: "0 auto" }}>

          {/* LEFT: FAQ + Tracker */}
          <div>
            {/* Ticket tracker */}
            <TicketTracker />

            {/* FAQ */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <h3 style={{ fontFamily: "'Cinzel',serif", color: "#e2e8f0", fontSize: 15 }}>Frequently Asked Questions</h3>
              </div>
              {FAQS.map((faq, i) => <FAQItem key={i} faq={faq} index={i} />)}
            </div>
          </div>

          {/* RIGHT: Form */}
          <div>
            {submitted ? (
              /* Success State */
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 20, padding: "40px 28px", border: "1px solid rgba(16,185,129,0.3)", textAlign: "center", animation: "slideUp 0.5s ease" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "2px solid #10b981" }}>
                  <FaCheckCircle size={32} color="#10b981" />
                </div>
                <h3 style={{ fontFamily: "'Cinzel',serif", color: "#fff", fontSize: 20, marginBottom: 8 }}>Ticket Submitted!</h3>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24 }}>
                  We've received your request and will respond within 24 hours.
                </p>
                <div style={{ padding: "18px", borderRadius: 14, background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", marginBottom: 24 }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Your Ticket ID</p>
                  <p style={{ fontFamily: "'Cinzel',serif", color: "#00d4ff", fontSize: 24, fontWeight: 700 }}>{submitted.id}</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 6 }}>Save this ID to track your ticket status</p>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={reset}
                    style={{ padding: "11px 22px", borderRadius: 10, background: "linear-gradient(135deg,#0077b6,#00d4ff)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
                    Submit Another
                  </button>
                  <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! My ticket ID is ${submitted.id}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ padding: "11px 22px", borderRadius: 10, background: "#25d366", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                    <FaWhatsapp size={14}/> Follow Up
                  </a>
                </div>
              </div>
            ) : (
              /* Form */
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", animation: shake ? "shake 0.5s" : "none" }}>
                <h3 style={{ fontFamily: "'Cinzel',serif", color: "#e2e8f0", fontSize: 16, marginBottom: 22 }}>Submit a Support Ticket</h3>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Name + Email */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[["Full Name", name, setName, "text", "name"], ["Email Address", email, setEmail, "email", "email"]].map(([lbl, val, set, type, key]) => (
                      <div key={key}>
                        <label style={LS.label}>{lbl}</label>
                        <input type={type} value={val} onChange={e => { set(e.target.value); setErrors(p => ({ ...p, [key]: "" })); }}
                          placeholder={lbl} style={{ ...LS.input, borderColor: errors[key] ? "#ef4444" : "rgba(255,255,255,0.12)" }} />
                        {errors[key] && <p style={LS.err}><FaExclamationCircle size={10}/> {errors[key]}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Category */}
                  <div>
                    <label style={LS.label}>Issue Category</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {CATEGORIES.map(c => (
                        <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                          style={{ padding: "7px 12px", borderRadius: 20, border: `2px solid ${category === c.key ? c.color : "rgba(255,255,255,0.12)"}`,
                            background: category === c.key ? `${c.color}18` : "transparent",
                            color: category === c.key ? c.color : "rgba(255,255,255,0.45)",
                            fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" }}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={LS.label}>Message</label>
                      <span style={{ fontSize: 10, color: charLeft < 50 ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                        {charLeft} chars left
                      </span>
                    </div>
                    <textarea value={message} maxLength={MAX_CHARS}
                      onChange={e => { setMessage(e.target.value); setErrors(p => ({ ...p, message: "" })); }}
                      placeholder="Describe your issue in detail…"
                      style={{ ...LS.input, height: 130, resize: "vertical", borderColor: errors.message ? "#ef4444" : "rgba(255,255,255,0.12)" }} />
                    {errors.message && <p style={LS.err}><FaExclamationCircle size={10}/> {errors.message}</p>}
                  </div>

                  {/* File attach */}
                  <div>
                    <label style={LS.label}>Attachment <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>(optional)</span></label>
                    <div onClick={() => fileRef.current?.click()}
                      style={{ padding: "12px 16px", borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.15)", cursor: "pointer",
                        background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, transition: "border-color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#00d4ff"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}>
                      <FaPaperclip size={14} color="#00d4ff" />
                      <span style={{ color: file ? "#e2e8f0" : "rgba(255,255,255,0.35)", fontSize: 13 }}>
                        {file ? file.name : "Click to attach image or file"}
                      </span>
                      {file && <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                        style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <FaTimes size={12}/>
                      </button>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={e => setFile(e.target.files[0])}
                      style={{ display: "none" }} />
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={loading}
                    style={{ padding: "14px", borderRadius: 12, background: loading ? "rgba(0,119,182,0.5)" : "linear-gradient(135deg,#0077b6,#00d4ff)",
                      color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: loading ? "none" : "0 4px 20px rgba(0,119,182,0.4)", transition: "all 0.3s" }}>
                    {loading
                      ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }}/> Submitting…</>
                      : <><FaPaperPlane size={13}/> Submit Ticket</>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Label styles ──────────────────────────────────────────────────────────────
const LS = {
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: 13, fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s, box-shadow 0.2s" },
  err:   { color: "#fca5a5", fontSize: 11, marginTop: 5, display: "flex", alignItems: "center", gap: 4 },
};