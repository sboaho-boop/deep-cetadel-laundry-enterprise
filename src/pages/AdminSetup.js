import { useState, useEffect } from "react";
import { setupAPI, loadStaff } from "../utils/api";

export default function AdminSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ username: "admin", email: "admin@deepcitadel.com", password: "admin123" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkAdmin = async () => {
    setLoading(true);
    setError("");
    try {
      // Use localStorage/Firebase instead of Django
      const staff = loadStaff();
      const hasOwner = staff.some(s => s.role === "owner");
      setLoading(false);
      if (hasOwner) {
        setStep(2); // Admin exists, go to login
      } else {
        setStep(1); // Need to create admin
      }
    } catch (err) {
      setLoading(false);
      setError("Please create an owner account using the login page.");
      setStep(1);
    }
  };

  const createAdmin = async () => {
    if (!form.username || !form.password) {
      setError("Username and password required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Save to localStorage/Firebase
      await setupAPI.createStaff({
        name: form.username,
        email: form.email,
        password: form.password,
        role: "owner",
        active: true
      });
      setLoading(false);
      setSuccess(`Owner created! Username: ${form.username}, Password: ${form.password}`);
      setTimeout(() => onComplete(), 3000);
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to create admin");
    }
  };

  // Auto-check on mount
  useEffect(() => { checkAdmin(); }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: 20
    }}>
      <div style={{
        background: "rgba(5,18,40,.99)",
        border: "1px solid rgba(99,102,241,.3)",
        borderRadius: 24,
        padding: 40,
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 24px 70px rgba(0,0,0,.8)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg,#0077b6,#00c6e0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 32
          }}>
            ⚙️
          </div>
          <h2 style={{ color: "#fff", fontFamily: "'Cinzel',serif", marginBottom: 8 }}>Setup Admin</h2>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>
            {step === 1 ? "Create your admin account" : "Admin already exists"}
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
            borderRadius: 12, padding: 12, marginBottom: 16, color: "#fca5a5", fontSize: 13
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.3)",
            borderRadius: 12, padding: 12, marginBottom: 16, color: "#10b981", fontSize: 13
          }}>
            ✅ {success}
          </div>
        )}

        {step === 1 && !success && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 14
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 14
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 14
                }}
              />
            </div>

            <button
              onClick={createAdmin}
              disabled={loading}
              style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#6366f1,#818cf8)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,.35)"
              }}
            >
              {loading ? "Creating..." : "Create Admin Account"}
            </button>
          </>
        )}

        {step === 2 && !success && (
          <div>
            <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, marginBottom: 20, textAlign: "center" }}>
              An admin account already exists. Please log in with your credentials.
            </p>
            <button
              onClick={onComplete}
              style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#6366f1,#818cf8)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,.35)"
              }}
            >
              Go to Login
            </button>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            onClick={checkAdmin}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 12, cursor: "pointer" }}
          >
            🔄 Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}
