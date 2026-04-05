import { useState } from "react";

export default function Payments({ workerName = "Worker" }) {

  /* ---------------- INVOICES ---------------- */

  const [invoices, setInvoices] = useState([
    {
      id: "INV-1001",
      customer: "John",
      service: "Wash + Iron",
      total: 45,
      status: "unpaid"
    },
    {
      id: "INV-1002",
      customer: "Mary",
      service: "Dry Cleaning",
      total: 30,
      status: "unpaid"
    }
  ])


  /* ---------------- PAYMENTS ---------------- */

  const [payments, setPayments] = useState([])


  /* ---------------- FORM STATE ---------------- */

  const [invoiceId, setInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("cash")
  const [message, setMessage] = useState("")


  /* ---------------- FORMAT MONEY ---------------- */

  const formatGHS = (amount) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS"
    }).format(amount)


  /* ---------------- ADD PAYMENT ---------------- */

  const handleAddPayment = () => {

    const num = parseFloat(amount)

    if (!invoiceId) {
      setMessage("Enter invoice number")
      return
    }

    if (isNaN(num) || num <= 0) {
      setMessage("Enter valid amount")
      return
    }

    const invoice = invoices.find(i => i.id === invoiceId)

    if (!invoice) {
      setMessage("Invoice not found")
      return
    }

    const newPayment = {
      id: Date.now(),
      invoiceId,
      worker: workerName,
      method,
      amount: num,
      date: new Date().toLocaleString(),
      status: method === "cash" ? "confirmed" : "pending"
    }

    setPayments(prev => [newPayment, ...prev])

    if (method === "cash") {
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoiceId ? { ...inv, status: "paid" } : inv
        )
      )
    }

    setInvoiceId("")
    setAmount("")
    setMessage("Payment recorded")
  }


  /* ---------------- CONFIRM PAYMENT ---------------- */

  const confirmPayment = (paymentId) => {

    setPayments(prev =>
      prev.map(p =>
        p.id === paymentId ? { ...p, status: "confirmed" } : p
      )
    )

    const payment = payments.find(p => p.id === paymentId)

    if (payment) {
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === payment.invoiceId ? { ...inv, status: "paid" } : inv
        )
      )
    }

  }


  /* ---------------- SHARED STYLES ---------------- */

  const cardStyle = {
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    padding: "20px 22px",
    marginBottom: 24
  }

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    marginBottom: 10,
    background: "rgba(0,0,0,.25)",
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 10,
    color: "#e8f4f8",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box"
  }

  const labelStyle = {
    fontSize: 11,
    color: "rgba(255,255,255,.35)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
    display: "block"
  }

  const sectionHeading = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: "#fff",
    marginBottom: 4
  }

  const subHeading = {
    fontSize: 11,
    color: "rgba(255,255,255,.3)",
    marginBottom: 18
  }


  return (

    <div style={{
      maxWidth: 700,
      margin: "auto",
      padding: "22px 28px",
      fontFamily: "'DM Sans', sans-serif",
      color: "#e8f4f8"
    }}>

      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: 22,
        color: "#fff",
        marginBottom: 4
      }}>
        💳 Payments
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 28 }}>
        Manage invoices and record customer payments
      </div>


      {/* ---------------- INVOICE LIST ---------------- */}

      <div style={cardStyle}>

        <div style={sectionHeading}>Invoices</div>
        <div style={subHeading}>Outstanding and completed orders</div>

        {invoices.map((inv, i) => (
          <div
            key={inv.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: i < invoices.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none"
            }}
          >
            <div>
              <div style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 13,
                color: "#00c6e0",
                marginBottom: 3
              }}>
                {inv.id}
              </div>
              <div style={{ fontSize: 13, color: "#e8f4f8" }}>{inv.customer}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{inv.service}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#00c6e0"
              }}>
                {formatGHS(inv.total)}
              </div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                background: inv.status === "paid" ? "rgba(16,185,129,.15)" : "rgba(245,158,11,.12)",
                border: `1px solid ${inv.status === "paid" ? "rgba(16,185,129,.3)" : "rgba(245,158,11,.25)"}`,
                color: inv.status === "paid" ? "#10b981" : "#f59e0b"
              }}>
                {inv.status === "paid" ? "✅ Paid" : "⏳ Unpaid"}
              </span>
            </div>
          </div>
        ))}

      </div>


      {/* ---------------- PAYMENT FORM ---------------- */}

      <div style={cardStyle}>

        <div style={sectionHeading}>Record Payment</div>
        <div style={subHeading}>Enter details below to log a payment</div>

        <label style={labelStyle}>Invoice Number</label>
        <input
          placeholder="e.g. INV-1001"
          value={invoiceId}
          onChange={e => setInvoiceId(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Amount (GHS)</label>
        <input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Payment Method</label>
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          style={{ ...inputStyle, marginBottom: 14 }}
        >
          <option value="cash">Cash</option>
          <option value="mobile">Mobile Money</option>
          <option value="bank">Bank Transfer</option>
        </select>


        {/* ---------------- MOMO INSTRUCTIONS ---------------- */}

        {method === "mobile" && (
          <div style={{
            background: "rgba(245,158,11,.07)",
            border: "1px solid rgba(245,158,11,.25)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16
          }}>
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: "#f59e0b",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 16 }}>📱</span> MTN Mobile Money Payment
            </div>

            {/* IMPORTANT - Invoice Reference */}
            <div style={{
              background: "rgba(239,68,68,.15)",
              border: "2px solid #ef4444",
              borderRadius: 12,
              padding: "14px",
              marginBottom: 14
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#fca5a5",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span> IMPORTANT — Use Invoice as Payment Reference
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,.4)", borderRadius: 8, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>Payment Reference:</div>
                  <div style={{ fontSize: 18, color: "#fff", fontFamily: "monospace", fontWeight: 800, letterSpacing: 1 }}>{invoiceId || "(Enter Invoice ID Above)"}</div>
                </div>
                <button
                  onClick={() => invoiceId && navigator.clipboard?.writeText(invoiceId)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,.2)",
                    background: "rgba(255,255,255,.1)",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 10, lineHeight: 1.5 }}>
                You <strong style={{ color: "#fca5a5" }}>MUST</strong> enter this invoice number as the payment note/reference when sending. Without it, we cannot verify your payment.
              </div>
            </div>

            {/* How to Pay */}
            <div style={{
              background: "rgba(0,0,0,.2)",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 10,
              padding: "12px 14px",
              marginBottom: 10
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#00c6e0",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10
              }}>
                How to Pay
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.8 }}>
                <div>1. Dial <strong style={{ color: "#fff" }}>*170#</strong></div>
                <div>2. Select <strong style={{ color: "#fff" }}>Wallet & Payments</strong></div>
                <div>3. Choose <strong style={{ color: "#fff" }}>Pay Merchant</strong> and enter:</div>
              </div>
            </div>

            {/* Payment Options */}
            <div style={{
              background: "rgba(0,0,0,.2)",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 10,
              padding: "12px 14px"
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#00c6e0",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10
              }}>
                Payment Details
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(99,102,241,.2)",
                    border: "1px solid #6366f1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#818cf8",
                    fontWeight: 700,
                    flexShrink: 0
                  }}>A</div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>Option A — Merchant ID</div>
                    <div style={{ fontSize: 14, color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>254345</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Deep Citadel Laundry</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "rgba(99,102,241,.2)",
                    border: "1px solid #6366f1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#818cf8",
                    fontWeight: 700,
                    flexShrink: 0
                  }}>B</div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 2 }}>Option B — Personal Number</div>
                    <div style={{ fontSize: 14, color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>0553560016</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Samuel Gameli</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        <button
          onClick={handleAddPayment}
          style={{
            padding: 13,
            width: "100%",
            background: "linear-gradient(135deg,#0077b6,#00c6e0)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(0,198,224,.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          💾 Add Payment
        </button>

        {message && (
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: message === "Payment recorded"
              ? "rgba(16,185,129,.12)"
              : "rgba(239,68,68,.1)",
            border: `1px solid ${message === "Payment recorded"
              ? "rgba(16,185,129,.3)"
              : "rgba(239,68,68,.25)"}`,
            color: message === "Payment recorded" ? "#10b981" : "#ef4444",
            fontSize: 13,
            fontWeight: 600
          }}>
            {message === "Payment recorded" ? "✅ " : "⚠️ "}{message}
          </div>
        )}

      </div>


      {/* ---------------- PAYMENT HISTORY ---------------- */}

      <div style={cardStyle}>

        <div style={sectionHeading}>Payment History</div>
        <div style={subHeading}>All recorded transactions</div>

        {payments.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "rgba(255,255,255,.18)",
            fontSize: 13,
            padding: "32px 0",
            lineHeight: 1.7
          }}>
            No payments recorded yet.
          </div>
        )}

        {payments.map((p, i) => {

          const invoice = invoices.find(inv => inv.id === p.invoiceId)

          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < payments.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none"
              }}
            >
              <div>
                <div style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#00c6e0",
                  marginBottom: 3
                }}>
                  {p.invoiceId}
                </div>
                <div style={{ fontSize: 13, color: "#e8f4f8" }}>{invoice?.customer}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                  {invoice?.service}
                </div>
                <div style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  color: "#00c6e0",
                  fontSize: 14,
                  marginTop: 4
                }}>
                  {formatGHS(p.amount)}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>
                  {p.method === "mobile" ? "📱 Mobile Money" : p.method === "bank" ? "🏦 Bank Transfer" : "💵 Cash"} · {p.date}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: p.status === "confirmed" ? "rgba(16,185,129,.15)" : "rgba(245,158,11,.12)",
                  border: `1px solid ${p.status === "confirmed" ? "rgba(16,185,129,.3)" : "rgba(245,158,11,.25)"}`,
                  color: p.status === "confirmed" ? "#10b981" : "#f59e0b"
                }}>
                  {p.status === "confirmed" ? "✅ Confirmed" : "⏳ Pending"}
                </span>

                {p.status === "pending" && (
                  <div>
                    <button
                      onClick={() => confirmPayment(p.id)}
                      style={{
                        marginTop: 8,
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#059669,#10b981)",
                        color: "#fff",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                    >
                      ✓ Confirm
                    </button>
                  </div>
                )}
              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}