const SUPABASE_URL = "https://bxxeuhlgvkqdfmebctgn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4eGV1aGxndmtxZGZtZWJjdGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDQ5NjgsImV4cCI6MjA5MjEyMDk2OH0.n6Cn7XSOEwVXtlfUc-_iSPXWk8WtQLO3rg57kuki3kY";

export const supabaseFetch = async (table, method = "GET", body = null) => {
  const options = {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=minimal"
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, options);
  if (!res.ok) throw new Error(await res.text());
  return method === "DELETE" ? {} : res.json();
};

export const getOrders = () => supabaseFetch("orders?select=*&order=createdAt.desc");
export const createOrder = (order) => supabaseFetch("orders", "POST", order);
export const updateOrder = (id, updates) => supabaseFetch(`orders?id=eq.${id}`, "PATCH", updates);
export const deleteOrder = (id) => supabaseFetch(`orders?id=eq.${id}`, "DELETE");

export const getStaff = () => supabaseFetch("staff?select=*&order=createdAt.desc");
export const createStaff = (staff) => supabaseFetch("staff", "POST", staff);
export const updateStaff = (id, updates) => supabaseFetch(`staff?id=eq.${id}`, "PATCH", updates);
export const deleteStaff = (id) => supabaseFetch(`staff?id=eq.${id}`, "DELETE");