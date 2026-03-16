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

  const [payments,setPayments] = useState([])


  /* ---------------- FORM STATE ---------------- */

  const [invoiceId,setInvoiceId] = useState("")
  const [amount,setAmount] = useState("")
  const [method,setMethod] = useState("cash")
  const [message,setMessage] = useState("")


  /* ---------------- FORMAT MONEY ---------------- */

  const formatGHS = (amount) =>
    new Intl.NumberFormat("en-GH",{
      style:"currency",
      currency:"GHS"
    }).format(amount)


  /* ---------------- ADD PAYMENT ---------------- */

  const handleAddPayment = () => {

    const num = parseFloat(amount)

    if(!invoiceId){
      setMessage("Enter invoice number")
      return
    }

    if(isNaN(num) || num <= 0){
      setMessage("Enter valid amount")
      return
    }

    const invoice = invoices.find(i => i.id === invoiceId)

    if(!invoice){
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

    setPayments(prev => [newPayment,...prev])


    /* update invoice status */

    if(method === "cash"){
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === invoiceId
          ? {...inv,status:"paid"}
          : inv
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
        p.id === paymentId
        ? {...p,status:"confirmed"}
        : p
      )
    )

    const payment = payments.find(p => p.id === paymentId)

    if(payment){

      setInvoices(prev =>
        prev.map(inv =>
          inv.id === payment.invoiceId
          ? {...inv,status:"paid"}
          : inv
        )
      )

    }

  }


  return (

    <div style={{maxWidth:700,margin:"auto",padding:20,fontFamily:"sans-serif"}}>

      <h2>Laundry Payments</h2>


      {/* ---------------- INVOICE LIST ---------------- */}

      <div style={{marginBottom:30}}>

        <h3>Invoices</h3>

        {invoices.map(inv => (

          <div
            key={inv.id}
            style={{
              display:"flex",
              justifyContent:"space-between",
              borderBottom:"1px solid #eee",
              padding:"8px 0"
            }}
          >

            <div>
              <strong>{inv.id}</strong>
              <div>{inv.customer}</div>
              <small>{inv.service}</small>
            </div>

            <div>

              {formatGHS(inv.total)}

              <span
                style={{
                  marginLeft:10,
                  color: inv.status === "paid" ? "green" : "orange"
                }}
              >
                {inv.status}
              </span>

            </div>

          </div>

        ))}

      </div>


      {/* ---------------- PAYMENT FORM ---------------- */}

      <div style={{marginBottom:30}}>

        <h3>Record Payment</h3>

        <input
          placeholder="Invoice Number"
          value={invoiceId}
          onChange={e=>setInvoiceId(e.target.value)}
          style={{width:"100%",padding:8,marginBottom:10}}
        />

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e=>setAmount(e.target.value)}
          style={{width:"100%",padding:8,marginBottom:10}}
        />

        <select
          value={method}
          onChange={e=>setMethod(e.target.value)}
          style={{width:"100%",padding:8,marginBottom:10}}
        >
          <option value="cash">Cash</option>
          <option value="mobile">Mobile Money</option>
          <option value="bank">Bank</option>
        </select>

        <button
          onClick={handleAddPayment}
          style={{
            padding:10,
            width:"100%",
            background:"#0077b6",
            color:"#fff",
            border:"none"
          }}
        >
          Add Payment
        </button>

        {message && <p>{message}</p>}

      </div>


      {/* ---------------- PAYMENT HISTORY ---------------- */}

      <div>

        <h3>Payment History</h3>

        {payments.map(p => {

          const invoice = invoices.find(i => i.id === p.invoiceId)

          return (

            <div
              key={p.id}
              style={{
                borderBottom:"1px solid #eee",
                padding:"10px 0",
                display:"flex",
                justifyContent:"space-between"
              }}
            >

              <div>

                <strong>{p.invoiceId}</strong>

                <div>{invoice?.customer}</div>

                <small>{invoice?.service}</small>

                <div>{formatGHS(p.amount)}</div>

                <small>{p.method}</small>

              </div>

              <div>

                <span
                  style={{
                    color:
                      p.status === "confirmed"
                      ? "green"
                      : "orange"
                  }}
                >
                  {p.status}
                </span>

                {p.status === "pending" && (

                  <button
                    onClick={()=>confirmPayment(p.id)}
                    style={{marginLeft:10}}
                  >
                    Confirm
                  </button>

                )}

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )
}