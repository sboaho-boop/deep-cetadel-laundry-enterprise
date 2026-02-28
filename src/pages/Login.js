import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye, FaEyeSlash, FaGoogle, FaFacebook, FaEnvelope,
  FaLock, FaUserTie, FaUser, FaShieldAlt, FaArrowLeft,
  FaCheckCircle, FaExclamationCircle, FaFileInvoice,
} from "react-icons/fa";

// ── Role config ───────────────────────────────────────────────────────────────
const ROLES = [
  { key: "client", label: "Client",  icon: <FaUser size={15}/>,     color: "#00d4ff", desc: "Enter your invoice number to access your orders" },
  { key: "staff",  label: "Staff",   icon: <FaUserTie size={15}/>,  color: "#10b981", desc: "Manage laundry operations"  },
  { key: "owner",  label: "Owner",   icon: <FaShieldAlt size={15}/>,color: "#f59e0b", desc: "Full access & analytics"    },
];

// ── Demo credentials ──────────────────────────────────────────────────────────
const DEMO_USERS = {
  client: { route: "/track" },
  staff:  { email: "staff@deepcitadel.com",  password: "staff123",  route: "/dashboard" },
  owner:  { email: "owner@deepcitadel.com",  password: "owner123",  route: "/dashboard" },
};

// Valid invoice numbers — in production, look these up from your orders DB / localStorage
const VALID_INVOICES = ["INV-DEMO001", "INV-001", "INV-002", "INV-003"];

// ── Floating particle background ──────────────────────────────────────────────
function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size:  Math.random() * 4 + 2,
    left:  Math.random() * 100,
    delay: Math.random() * 8,
    dur:   Math.random() * 10 + 8,
    opacity: Math.random() * 0.15 + 0.05,
  }));
  return (
    <>
      {dots.map(d => (
        <div key={d.id} style={{
          position: "fixed", borderRadius: "50%",
          width: d.size, height: d.size,
          left: `${d.left}%`, bottom: "-10px",
          background: `rgba(0,212,255,${d.opacity})`,
          animation: `floatUp ${d.dur}s ${d.delay}s infinite linear`,
          pointerEvents: "none", zIndex: 0,
        }}/>
      ))}
    </>
  );
}

// ── Logo with animated glow ───────────────────────────────────────────────────
function AnimatedLogo() {
  return (
    <div style={{ textAlign: "center", marginBottom: 28 }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%", margin: "0 auto 16px",
        background: "linear-gradient(135deg,#0077b6,#00d4ff)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "logoGlow 3s ease-in-out infinite",
        boxShadow: "0 0 0 0 rgba(0,212,255,0.4)",
        position: "relative",
      }}>
        {/* Rotating ring */}
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "#00d4ff", borderRightColor: "rgba(0,212,255,0.3)",
          animation: "spin 3s linear infinite",
        }}/>
        <span style={{ fontFamily: "'Cinzel',serif", color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>
          DC
        </span>
      </div>
      <h1 style={{ fontFamily: "'Cinzel',serif", color: "#fff", fontSize: 22, letterSpacing: 1, margin: "0 0 4px" }}>
        Deep Citadel
      </h1>
      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
        Laundry Services
      </p>
    </div>
  );
}

// ── Forgot Password panel ─────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [step,    setStep]    = useState(1); // 1=email, 2=otp, 3=done
  const [email,   setEmail]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const sendOTP = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email."); return; }
    setLoading(true); setError("");
    setTimeout(() => { setLoading(false); setStep(2); }, 1200);
  };

  const verifyOTP = () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setLoading(true); setError("");
    setTimeout(() => { setLoading(false); setStep(3); }, 1000);
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val;
    setOtp(next);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  return (
    <div style={{ animation: "slideUp 0.4s ease" }}>
      <button onClick={onBack} style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, marginBottom:20, fontFamily:"'DM Sans',sans-serif" }}>
        <FaArrowLeft size={11}/> Back to Login
      </button>

      {step === 1 && (
        <>
          <h2 style={{ fontFamily:"'Cinzel',serif", color:"#fff", fontSize:20, marginBottom:8 }}>Forgot Password?</h2>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, marginBottom:24, lineHeight:1.6 }}>
            Enter your email and we'll send a reset code.
          </p>
          <InputField icon={<FaEnvelope size={14}/>} type="email" placeholder="Your email address"
            value={email} onChange={e => { setEmail(e.target.value); setError(""); }} error={error}/>
          <SubmitBtn loading={loading} label="Send Reset Code" onClick={sendOTP}/>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontFamily:"'Cinzel',serif", color:"#fff", fontSize:20, marginBottom:8 }}>Check Your Email</h2>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, marginBottom:24, lineHeight:1.6 }}>
            We sent a 6-digit code to <span style={{ color:"#00d4ff" }}>{email}</span>
          </p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
            {otp.map((v,i) => (
              <input key={i} id={`otp-${i}`} type="text" maxLength={1} value={v}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => { if(e.key==="Backspace" && !v && i>0) document.getElementById(`otp-${i-1}`)?.focus(); }}
                style={{ width:44, height:52, borderRadius:12, border:`2px solid ${v?"#00d4ff":"rgba(255,255,255,0.15)"}`,
                  background:"rgba(255,255,255,0.06)", color:"#fff", fontSize:22, textAlign:"center",
                  fontFamily:"'Cinzel',serif", outline:"none", transition:"border-color 0.2s" }}/>
            ))}
          </div>
          {error && <p style={S.err}><FaExclamationCircle size={10}/> {error}</p>}
          <SubmitBtn loading={loading} label="Verify Code" onClick={verifyOTP}/>
        </>
      )}

      {step === 3 && (
        <div style={{ textAlign:"center", animation:"slideUp 0.4s ease" }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(16,185,129,0.15)", border:"2px solid #10b981",
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <FaCheckCircle size={28} color="#10b981"/>
          </div>
          <h3 style={{ fontFamily:"'Cinzel',serif", color:"#fff", fontSize:18, marginBottom:8 }}>Code Verified!</h3>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:13, marginBottom:24 }}>
            In a real app, you'd now enter a new password. For demo purposes, your reset is complete!
          </p>
          <button onClick={onBack} style={{ ...S.submitBtn, background:"linear-gradient(135deg,#0077b6,#00d4ff)" }}>
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reusable input ────────────────────────────────────────────────────────────
function InputField({ icon, type, placeholder, value, onChange, error, right }) {
  return (
    <div style={{ marginBottom: error ? 6 : 16 }}>
      <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
        <span style={{ position:"absolute", left:14, color: error ? "#ef4444" : "rgba(255,255,255,0.3)", zIndex:1, display:"flex" }}>{icon}</span>
        <input type={type} placeholder={placeholder} value={value} onChange={onChange}
          style={{ ...S.input, paddingLeft:42, paddingRight: right ? 42 : 14,
            borderColor: error ? "#ef4444" : value ? "#00d4ff" : "rgba(255,255,255,0.12)",
            boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.1)" : value ? "0 0 0 3px rgba(0,212,255,0.08)" : "none" }}/>
        {right && <span style={{ position:"absolute", right:14, zIndex:1 }}>{right}</span>}
      </div>
      {error && <p style={{ ...S.err, marginTop:5 }}><FaExclamationCircle size={10}/> {error}</p>}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ loading, label, onClick, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={loading}
      style={{ ...S.submitBtn, opacity: loading ? 0.8 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
      {loading
        ? <span style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
            <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }}/>
            Please wait…
          </span>
        : label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  const navigate = useNavigate();

  const [role,       setRole]       = useState("client");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [invoiceNum,  setInvoiceNum]  = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [remember,   setRemember]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [errors,     setErrors]     = useState({});
  const [shake,      setShake]      = useState(false);
  const [forgot,     setForgot]     = useState(false);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
    // Restore remembered email
    const saved = localStorage.getItem("dcl_remembered_email");
    if (saved) { setEmail(saved); setRemember(true); }
  }, []);

  const validate = () => {
    const e = {};
    if (role === "client") {
      if (!invoiceNum.trim()) e.invoiceNum = "Invoice number is required.";
      else if (!invoiceNum.trim().toUpperCase().startsWith("INV-")) e.invoiceNum = "Invoice numbers start with INV- (e.g. INV-001).";
    } else {
      if (!email.trim())    e.email    = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address.";
      if (!password.trim()) e.password = "Password is required.";
      else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    }
    return e;
  };

  const handleLogin = (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs); setShake(true);
      setTimeout(() => setShake(false), 500); return;
    }
    setErrors({}); setLoading(true);

    setTimeout(() => {
      const demo = DEMO_USERS[role];
      let success = false;

      if (role === "client") {
        // Client logs in with invoice number only
        const stored = JSON.parse(localStorage.getItem("dcl_pos_orders") || "[]");
        const found  = stored.find(o => o.invoiceNumber?.toUpperCase() === invoiceNum.trim().toUpperCase())
                    || VALID_INVOICES.includes(invoiceNum.trim().toUpperCase());
        success = !!found;
        if (success) {
          localStorage.setItem("dcl_role", "client");
          localStorage.setItem("dcl_client_invoice", invoiceNum.trim().toUpperCase());
          localStorage.setItem("dcl_logged_in", "true");
          navigate(demo.route);
        }
      } else {
        success = email === demo.email && password === demo.password;
        if (success) {
          if (remember) localStorage.setItem("dcl_remembered_email", email);
          else          localStorage.removeItem("dcl_remembered_email");
          localStorage.setItem("dcl_role", role);
          localStorage.setItem("dcl_logged_in", "true");
          navigate(demo.route);
        }
      }

      if (!success) {
        setLoading(false);
        const msg = role === "client"
          ? "Invoice number not found. Check your receipt and try again."
          : `Invalid credentials for ${role} role. Try the demo credentials below.`;
        setErrors({ general: msg });
        setShake(true); setTimeout(() => setShake(false), 500);
      }
    }, 1200);
  };

  const activeRole = ROLES.find(r => r.key === role);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'DM Sans',sans-serif; }
        @keyframes logoGlow { 0%,100%{box-shadow:0 0 20px rgba(0,212,255,0.3),0 0 40px rgba(0,119,182,0.2);} 50%{box-shadow:0 0 35px rgba(0,212,255,0.7),0 0 70px rgba(0,119,182,0.4);} }
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes shake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-7px);} 40%,80%{transform:translateX(7px);} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px);} to{opacity:1;transform:translateY(0);} }
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:0.1;} 50%{opacity:0.15;} 100%{transform:translateY(-100vh) scale(0.5);opacity:0;} }
        input::placeholder { color:rgba(255,255,255,0.25); }
        input:focus { outline:none; }
      `}</style>

      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#060d1f 0%,#0a1628 50%,#0d2b5e 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, position:"relative", overflow:"hidden" }}>
        <Particles/>

        {/* Card */}
        <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1,
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)" }}>

          <AnimatedLogo/>

          <div style={{ background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)", borderRadius:24,
            padding:"32px 28px", border:"1px solid rgba(255,255,255,0.1)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.4)",
            animation: shake ? "shake 0.5s ease" : "none" }}>

            {forgot ? (
              <ForgotPassword onBack={() => setForgot(false)}/>
            ) : (
              <>
                {/* Role selector */}
                <div style={{ marginBottom:24 }}>
                  <p style={{ color:"rgba(255,255,255,0.4)", fontSize:11, letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>Sign in as</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {ROLES.map(r => (
                      <button key={r.key} type="button" onClick={() => { setRole(r.key); setErrors({}); }}
                        style={{ padding:"11px 8px", borderRadius:12, border:`2px solid ${role===r.key ? r.color : "rgba(255,255,255,0.08)"}`,
                          background: role===r.key ? `${r.color}14` : "transparent",
                          color: role===r.key ? r.color : "rgba(255,255,255,0.4)",
                          fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
                          cursor:"pointer", transition:"all 0.25s",
                          display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                        {r.icon}
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ color:"rgba(255,255,255,0.25)", fontSize:11, marginTop:8, textAlign:"center" }}>
                    {activeRole?.desc}
                  </p>
                </div>

                <form onSubmit={handleLogin}>
                  {/* General error */}
                  {errors.general && (
                    <div style={{ padding:"11px 14px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", marginBottom:16, display:"flex", alignItems:"flex-start", gap:8 }}>
                      <FaExclamationCircle size={13} color="#ef4444" style={{ flexShrink:0, marginTop:1 }}/>
                      <p style={{ color:"#fca5a5", fontSize:12, lineHeight:1.5 }}>{errors.general}</p>
                    </div>
                  )}

                  {/* Client: Invoice number only */}
                  {role === "client" ? (
                    <>
                      <InputField
                        icon={<FaFileInvoice size={14}/>}
                        type="text" placeholder="Invoice number (e.g. INV-001)"
                        value={invoiceNum} error={errors.invoiceNum}
                        onChange={e => { setInvoiceNum(e.target.value.toUpperCase()); setErrors(p=>({...p,invoiceNum:"",general:""})); }}
                      />
                      <div style={{ padding:"11px 14px", borderRadius:10, background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.12)", marginBottom:16 }}>
                        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:12, lineHeight:1.6 }}>
                          📄 Your invoice number is printed on your receipt, e.g. <span style={{color:"#00d4ff",fontWeight:600}}>INV-001</span>. Contact us on WhatsApp if you can't find it.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Email */}
                      <InputField
                        icon={<FaEnvelope size={14}/>}
                        type="email" placeholder="Email address"
                        value={email} error={errors.email}
                        onChange={e => { setEmail(e.target.value); setErrors(p=>({...p,email:"",general:""})); }}
                      />

                      {/* Password */}
                      <InputField
                        icon={<FaLock size={14}/>}
                        type={showPwd ? "text" : "password"}
                        placeholder="Password"
                        value={password} error={errors.password}
                        onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:"",general:""})); }}
                        right={
                          <button type="button" onClick={() => setShowPwd(s=>!s)}
                            style={{ background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.35)", display:"flex", alignItems:"center", padding:0 }}>
                            {showPwd ? <FaEyeSlash size={15}/> : <FaEye size={15}/>}
                          </button>
                        }
                      />
                    </>
                  )}

                  {/* Remember + Forgot — only for staff/owner */}
                  {role !== "client" && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                        <div onClick={() => setRemember(r=>!r)} style={{ width:18, height:18, borderRadius:5,
                          border:`2px solid ${remember ? "#00d4ff" : "rgba(255,255,255,0.2)"}`,
                          background: remember ? "#00d4ff" : "transparent",
                          display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", flexShrink:0 }}>
                          {remember && <FaCheckCircle size={10} color="#0a0f2e"/>}
                        </div>
                        <span style={{ color:"rgba(255,255,255,0.45)", fontSize:13 }}>Remember me</span>
                      </label>
                      <button type="button" onClick={() => { setForgot(true); setErrors({}); }}
                        style={{ background:"transparent", border:"none", color:"#00d4ff", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <SubmitBtn loading={loading} label="Sign In" type="submit"/>
                </form>

                {/* Social logins + demo — only for staff/owner */}
                {role !== "client" && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"22px 0" }}>
                      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                      <span style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>or continue with</span>
                      <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.08)" }}/>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {[
                        { icon:<FaGoogle size={15}/>,   label:"Google",   color:"#ea4335" },
                        { icon:<FaFacebook size={15}/>, label:"Facebook", color:"#1877f2" },
                      ].map(({ icon, label, color }) => (
                        <button key={label} type="button"
                          onClick={() => setErrors({ general:`${label} login is not configured yet.` })}
                          style={{ padding:"11px", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)",
                            color:"rgba(255,255,255,0.65)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600,
                            display:"flex", alignItems:"center", justifyContent:"center", gap:9, transition:"all 0.2s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = "#fff"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}>
                          <span style={{ color }}>{icon}</span> {label}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop:22, padding:"13px 16px", borderRadius:12, background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.12)" }}>
                      <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Demo Credentials</p>
                      {ROLES.filter(r=>r.key!=="client").map(r => (
                        <div key={r.key} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ color: r.color, fontSize:11, fontWeight:600 }}>{r.label}</span>
                          <span style={{ color:"rgba(255,255,255,0.3)", fontSize:11, fontFamily:"monospace" }}>
                            {DEMO_USERS[r.key].email.split("@")[0]} / {DEMO_USERS[r.key].password}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* Client demo hint */}
                {role === "client" && (
                  <div style={{ marginTop:8, padding:"13px 16px", borderRadius:12, background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.12)" }}>
                    <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>Demo Invoice Numbers</p>
                    {["INV-DEMO001","INV-001","INV-002","INV-003"].map(inv => (
                      <span key={inv} onClick={() => setInvoiceNum(inv)}
                        style={{ display:"inline-block", marginRight:8, marginBottom:4, padding:"3px 10px", borderRadius:20,
                          background:"rgba(0,212,255,0.08)", border:"1px solid rgba(0,212,255,0.2)",
                          color:"#00d4ff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"monospace" }}>
                        {inv}
                      </span>
                    ))}
                    <p style={{ color:"rgba(255,255,255,0.25)", fontSize:10, marginTop:6 }}>Click any to auto-fill</p>
                  </div>
                )}
              </>
            )}
          </div>

          <p style={{ textAlign:"center", color:"rgba(255,255,255,0.2)", fontSize:12, marginTop:20 }}>
            © {new Date().getFullYear()} {" "}
            <span style={{ color:"rgba(255,255,255,0.35)", fontFamily:"'Cinzel',serif" }}>Deep Citadel</span>
            {" "} · Powerful Clean. Trusted Care.
          </p>
        </div>
      </div>
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  input: {
    width:"100%", padding:"12px 14px", borderRadius:12,
    border:"1.5px solid rgba(255,255,255,0.12)",
    background:"rgba(255,255,255,0.06)", color:"#fff",
    fontSize:14, fontFamily:"'DM Sans',sans-serif",
    transition:"border-color 0.2s, box-shadow 0.2s",
  },
  submitBtn: {
    width:"100%", padding:"14px", borderRadius:12,
    background:"linear-gradient(135deg,#0077b6,#00d4ff)",
    color:"#fff", border:"none", fontWeight:700, fontSize:15,
    fontFamily:"'DM Sans',sans-serif",
    boxShadow:"0 4px 20px rgba(0,119,182,0.4)",
    transition:"all 0.3s", cursor:"pointer",
  },
  err: {
    color:"#fca5a5", fontSize:11, display:"flex", alignItems:"center", gap:4,
  },
};