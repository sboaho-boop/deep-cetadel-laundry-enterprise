import { useState, useEffect, useRef } from "react";
import { FaMobileAlt, FaCashRegister, FaUniversity, FaWhatsapp, FaQrcode, FaCheckCircle, FaTimesCircle, FaClock, FaCopy, FaTimes } from "react-icons/fa";

// ── QR Code Generator (using free API, no library needed) ─────────────────────
function QRModal({ momo, onClose }) {
  const [copied, setCopied] = useState(false);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `MoMo Payment\nProvider: ${momo.provider}\nNumber: ${momo.number}\nDeep Citadel Laundry`
  )}`;

  const copyNumber = () => {
    navigator.clipboard?.writeText(momo.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}><FaTimes /></button>
        <h3 style={styles.modalTitle}>Scan to Pay</h3>
        <div style={{ ...styles.momoChip, background: momo.color }}>
          <FaMobileAlt /> {momo.provider}
        </div>
        <div style={styles.qrWrap}>
          <img src={qrUrl} alt="QR Code" style={styles.qrImg} />
          <div style={styles.qrGlow} />
        </div>
        <p style={styles.momoNumber}>{momo.number}</p>
        <button style={styles.copyBtn} onClick={copyNumber}>
          <FaCopy size={13} />
          {copied ? " Copied!" : " Copy Number"}
        </button>
        <p style={styles.qrHint}>Open your MoMo app and scan this code to send payment directly.</p>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: <FaClock size={11} />,        label: "Pending"   },
    confirmed: { color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: <FaCheckCircle size={11} />,  label: "Confirmed" },
    rejected:  { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: <FaTimesCircle size={11} />,  label: "Rejected"  },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
      {s.icon}&nbsp;{s.label}
    </span>
  );
}

// ── WhatsApp Confirmation Builder ─────────────────────────────────────────────
function buildWhatsAppMsg(payment) {
  return encodeURIComponent(
    `Hello Deep Citadel Laundry 👋\n\nI'd like to confirm my payment:\n\n` +
    `• Amount: GHS ${payment.amount.toFixed(2)}\n` +
    `• Method: ${payment.method}\n` +
    `• Worker: ${payment.worker}\n` +
    `• Date: ${payment.date}\n` +
    `• Ref: #DCL-${payment.id}\n\n` +
    `Please confirm receipt. Thank you!`
  );
}

const WA_NUMBER = "233244639002"; // replace with real number

// ── Main Component ────────────────────────────────────────────────────────────
export default function Payments({ role = "client", workerName = "Worker" }) {
  const [payments, setPayments] = useState([
    { id: 1700000001, worker: "Ama", method: "mobile", amount: 45.00, date: "Feb 23, 2026, 9:00 AM", status: "confirmed" },
    { id: 1700000002, worker: "Kwame", method: "cash",   amount: 30.00, date: "Feb 23, 2026, 11:30 AM", status: "pending"   },
  ]);
  const [amount, setAmount]   = useState("");
  const [method, setMethod]   = useState("cash");
  const [message, setMessage] = useState("");
  const [qrMomo, setQrMomo]   = useState(null);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const companyMomo = [
    { provider: "MTN",      number: "0244639002", color: "#d97706" },
    { provider: "Vodafone", number: "020-111-2222", color: "#dc2626" },
  ];

  const handleAddPayment = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setMessage({ type: "error", text: "⚠️ Please enter a valid amount" });
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    const newPayment = {
      id: Date.now(),
      worker: workerName,
      method,
      amount: num,
      date: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      status: "pending",
    };
    setPayments(prev => [newPayment, ...prev]);
    setAmount("");
    setMessage({ type: "success", text: `✅ GHS ${num.toFixed(2)} recorded — status: Pending` });
    setTimeout(() => setMessage(""), 4000);
  };

  const updateStatus = (id, status) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const visiblePayments = role === "owner"
    ? payments
    : payments.filter(p => p.worker === workerName);

  const totalRevenue = visiblePayments.reduce((a, b) => a + b.amount, 0);

  const methodIcon = (m) => ({
    cash:   <FaCashRegister size={15} />,
    mobile: <FaMobileAlt size={15} />,
    bank:   <FaUniversity size={15} />,
  }[m] || <FaCashRegister size={15} />);

  // ── CLIENT VIEW ─────────────────────────────────────────────────────────────
  if (role === "client") {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        {qrMomo && <QRModal momo={qrMomo} onClose={() => setQrMomo(null)} />}
        <div style={{ ...styles.page, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s ease" }}>
          <div style={styles.header}>
            <div style={styles.headerIcon}><FaMobileAlt size={22} color="#fff" /></div>
            <div>
              <h2 style={styles.title}>Payment Instructions</h2>
              <p style={styles.subtitle}>Send payment via Mobile Money</p>
            </div>
          </div>

          <p style={styles.infoText}>Choose a MoMo number below to pay. Scan the QR code with your MoMo app for instant payment.</p>

          <div style={styles.momoGrid}>
            {companyMomo.map((momo, i) => (
              <div key={i} style={styles.momoCard}>
                <div style={{ ...styles.momoProvider, background: momo.color }}>
                  <FaMobileAlt size={16} color="#fff" />
                  <span style={styles.providerName}>{momo.provider}</span>
                </div>
                <p style={styles.momoNum}>{momo.number}</p>
                <div style={styles.momoActions}>
                  <button style={styles.qrBtn} onClick={() => setQrMomo(momo)}>
                    <FaQrcode size={13} /> QR Code
                  </button>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hi! I want to pay via ${momo.provider} MoMo to ${momo.number}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={styles.waBtn}
                  >
                    <FaWhatsapp size={13} /> Confirm via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        <InlineStyles />
      </>
    );
  }

  // ── WORKER / OWNER VIEW ──────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      {qrMomo && <QRModal momo={qrMomo} onClose={() => setQrMomo(null)} />}
      <div style={{ ...styles.page, opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s ease" }}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerIcon}><FaCashRegister size={22} color="#fff" /></div>
          <div>
            <h2 style={styles.title}>Payments Dashboard</h2>
            <p style={styles.subtitle}>{role === "owner" ? "All transactions" : `Logged in as ${workerName}`}</p>
          </div>
        </div>

        {/* Summary Card (owner only) */}
        {role === "owner" && (
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total Revenue</span>
              <span style={styles.summaryAmount}>GHS {totalRevenue.toFixed(2)}</span>
            </div>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Transactions</span>
              <span style={styles.summaryAmount}>{visiblePayments.length}</span>
            </div>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Pending</span>
              <span style={{ ...styles.summaryAmount, color: "#f59e0b" }}>
                {visiblePayments.filter(p => p.status === "pending").length}
              </span>
            </div>
          </div>
        )}

        {/* Record Payment (worker only) */}
        {role !== "owner" && (
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Record Payment</h4>
            <div style={styles.inputRow}>
              <div style={styles.inputWrap}>
                <span style={styles.inputPrefix}>GHS</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={styles.input}
                />
              </div>
              <select value={method} onChange={e => setMethod(e.target.value)} style={styles.select}>
                <option value="cash">💵 Cash</option>
                <option value="mobile">📱 Mobile Money</option>
                <option value="bank">🏦 Bank</option>
              </select>
            </div>
            <button onClick={handleAddPayment} style={styles.addBtn}>Add Payment</button>
            {message && (
              <p style={{ ...styles.msg, color: message.type === "error" ? "#ef4444" : "#10b981" }}>
                {message.text}
              </p>
            )}
          </div>
        )}

        {/* MoMo QR Codes */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Company MoMo Numbers</h4>
          <div style={styles.momoGrid}>
            {companyMomo.map((momo, i) => (
              <div key={i} style={styles.momoCard}>
                <div style={{ ...styles.momoProvider, background: momo.color }}>
                  <FaMobileAlt size={14} color="#fff" />
                  <span style={styles.providerName}>{momo.provider}</span>
                </div>
                <p style={styles.momoNum}>{momo.number}</p>
                <button style={styles.qrBtn} onClick={() => setQrMomo(momo)}>
                  <FaQrcode size={12} /> View QR
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div style={styles.card}>
          <h4 style={styles.cardTitle}>Payment History</h4>
          {visiblePayments.length === 0 && (
            <p style={styles.empty}>No payments recorded yet.</p>
          )}
          {visiblePayments.map((p, i) => (
            <div key={p.id} style={{ ...styles.paymentRow, animationDelay: `${i * 0.05}s` }} className="pay-row">
              <div style={styles.payLeft}>
                <div style={styles.payIcon}>{methodIcon(p.method)}</div>
                <div>
                  <p style={styles.payWorker}>{p.worker} <span style={styles.payRef}>#DCL-{p.id}</span></p>
                  <p style={styles.payMeta}>GHS {p.amount.toFixed(2)} · {p.method} · {p.date}</p>
                </div>
              </div>
              <div style={styles.payRight}>
                <StatusBadge status={p.status} />
                <div style={styles.payActions}>
                  {/* Owner can confirm/reject */}
                  {role === "owner" && p.status === "pending" && (
                    <>
                      <button style={styles.confirmBtn} onClick={() => updateStatus(p.id, "confirmed")}>✓</button>
                      <button style={styles.rejectBtn} onClick={() => updateStatus(p.id, "rejected")}>✕</button>
                    </>
                  )}
                  {/* WhatsApp confirmation */}
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${buildWhatsAppMsg(p)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={styles.waIconBtn}
                    title="Confirm via WhatsApp"
                  >
                    <FaWhatsapp size={16} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <InlineStyles />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: "32px 20px",
    maxWidth: 620,
    margin: "0 auto",
    fontFamily: "'DM Sans', sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 24,
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 14,
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 16px rgba(0,119,182,0.4)",
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: 22, color: "#0a0f2e", margin: 0,
  },
  subtitle: { fontSize: 13, color: "#64748b", margin: "2px 0 0" },

  infoText: { color: "#475569", fontSize: 14, marginBottom: 20, lineHeight: 1.6 },

  summaryRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 },
  summaryCard: {
    background: "linear-gradient(135deg, #0a0f2e, #0d2b5e)",
    borderRadius: 14, padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 6,
  },
  summaryLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  summaryAmount: { color: "#00d4ff", fontSize: 24, fontFamily: "'Cinzel', serif", fontWeight: 700 },

  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
    padding: "24px 22px",
    marginBottom: 20,
    border: "1px solid rgba(0,119,182,0.08)",
  },
  cardTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: 15, color: "#0a0f2e",
    marginBottom: 16, marginTop: 0,
  },

  inputRow: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  inputWrap: {
    flex: 1, display: "flex", alignItems: "center",
    border: "1.5px solid #e2e8f0", borderRadius: 10, overflow: "hidden",
    minWidth: 140,
  },
  inputPrefix: {
    padding: "0 12px", background: "#f8fafc",
    color: "#64748b", fontSize: 13, fontWeight: 600,
    borderRight: "1.5px solid #e2e8f0", whiteSpace: "nowrap",
    alignSelf: "stretch", display: "flex", alignItems: "center",
  },
  input: {
    flex: 1, padding: "12px 12px", border: "none", outline: "none",
    fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: "transparent",
  },
  select: {
    padding: "12px 14px", borderRadius: 10,
    border: "1.5px solid #e2e8f0", fontSize: 14,
    fontFamily: "'DM Sans', sans-serif", background: "#fff",
    color: "#1e293b", outline: "none", cursor: "pointer",
    minWidth: 160,
  },
  addBtn: {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: "0 4px 16px rgba(0,119,182,0.35)",
    transition: "transform 0.2s",
  },
  msg: { marginTop: 10, fontSize: 13, fontWeight: 600 },

  momoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  momoCard: {
    border: "1.5px solid #e2e8f0", borderRadius: 14,
    padding: "16px 14px", background: "#fafbff",
    display: "flex", flexDirection: "column", gap: 10,
  },
  momoProvider: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 12px", borderRadius: 8,
    width: "fit-content",
  },
  providerName: { color: "#fff", fontWeight: 700, fontSize: 13 },
  momoNum: { fontFamily: "'Cinzel', serif", fontSize: 15, color: "#0a0f2e", margin: 0 },
  momoActions: { display: "flex", gap: 8, flexWrap: "wrap" },

  qrBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 8,
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    color: "#fff", border: "none", fontSize: 12,
    fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
  waBtn: {
    display: "flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 8,
    background: "#25d366", color: "#fff",
    fontSize: 12, fontWeight: 600,
    textDecoration: "none",
  },

  empty: { color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "20px 0" },

  paymentRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 0", borderBottom: "1px solid #f1f5f9",
    gap: 10, flexWrap: "wrap",
  },
  payLeft: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  payIcon: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff",
  },
  payWorker: { fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 },
  payRef: { fontSize: 11, color: "#94a3b8", fontWeight: 400 },
  payMeta: { fontSize: 12, color: "#64748b", margin: "2px 0 0" },
  payRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  payActions: { display: "flex", alignItems: "center", gap: 6 },

  badge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600,
  },
  confirmBtn: {
    width: 28, height: 28, borderRadius: 8, border: "none",
    background: "rgba(16,185,129,0.15)", color: "#10b981",
    fontWeight: 700, cursor: "pointer", fontSize: 13,
  },
  rejectBtn: {
    width: 28, height: 28, borderRadius: 8, border: "none",
    background: "rgba(239,68,68,0.12)", color: "#ef4444",
    fontWeight: 700, cursor: "pointer", fontSize: 13,
  },
  waIconBtn: {
    width: 30, height: 30, borderRadius: 8,
    background: "#25d366", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    textDecoration: "none",
  },

  // Modal
  modalBackdrop: {
    position: "fixed", inset: 0, background: "rgba(10,15,46,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
    animation: "fadeIn 0.2s ease",
  },
  modal: {
    background: "#fff", borderRadius: 20, padding: "32px 28px",
    maxWidth: 320, width: "90%", textAlign: "center",
    position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    animation: "slideUp 0.3s ease",
  },
  closeBtn: {
    position: "absolute", top: 14, right: 14,
    background: "#f1f5f9", border: "none", borderRadius: 8,
    width: 30, height: 30, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#64748b", fontSize: 14,
  },
  modalTitle: {
    fontFamily: "'Cinzel', serif", fontSize: 20,
    color: "#0a0f2e", marginBottom: 14, marginTop: 0,
  },
  momoChip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 14px", borderRadius: 20, color: "#fff",
    fontSize: 13, fontWeight: 700, marginBottom: 20,
  },
  qrWrap: {
    position: "relative", display: "inline-block",
    marginBottom: 14,
  },
  qrImg: {
    width: 200, height: 200, borderRadius: 12,
    border: "3px solid #e2e8f0", display: "block",
  },
  qrGlow: {
    position: "absolute", inset: -4, borderRadius: 16,
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    zIndex: -1, opacity: 0.3,
    animation: "pulse 2s ease-in-out infinite",
  },
  momoNumber: {
    fontFamily: "'Cinzel', serif", fontSize: 18,
    color: "#0a0f2e", marginBottom: 10,
  },
  copyBtn: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "8px 18px", borderRadius: 20,
    background: "linear-gradient(135deg, #0077b6, #00d4ff)",
    color: "#fff", border: "none", fontSize: 13,
    fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", marginBottom: 14,
  },
  qrHint: { fontSize: 12, color: "#94a3b8", lineHeight: 1.5, margin: 0 },
};

function InlineStyles() {
  return (
    <style>{`
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.5; } }
      .pay-row { transition: background 0.2s; border-radius: 10px; padding-left: 6px; padding-right: 6px; }
      .pay-row:hover { background: #f8faff; }
    `}</style>
  );
}