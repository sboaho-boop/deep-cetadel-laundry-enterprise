import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SchedulePickup from "./pages/SchedulePickup";
import TrackOrders from "./pages/TrackOrders";
import Payments from "./pages/Payments";
import Support from "./pages/Support";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/schedule" element={<SchedulePickup />} />
        <Route path="/track" element={<TrackOrders />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/support" element={<Support />} />
        <Route path="/track/:token" element={<TrackOrders />} />
      </Routes>
    </>
  );
}

export default App;