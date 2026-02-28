import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = [
    { route: "/", label: "Home", icon: "🏠" },
    { route: "/login", label: "Login", icon: "🔑" },
    { route: "/dashboard", label: "Dashboard", icon: "📊" },
    { route: "/schedule", label: "Schedule", icon: "📅" },
    { route: "/track", label: "Track Order", icon: "📍" },
    { route: "/payments", label: "Payments", icon: "💳" },
    { route: "/support", label: "Support", icon: "💬" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 50) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <style>{`
        .laundry-side-nav {
          position: fixed;
          top: 50%;
          right: 1rem;
          transform: translateY(-50%);
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 9999;
          font-family: Arial, sans-serif;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          transition: transform 0.35s ease, opacity 0.35s ease;
        }
        .laundry-side-nav.hide { transform: translateY(-50%) translateX(-120%); opacity: 0; }
        .laundry-nav-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          color: #000;
          overflow: visible;
        }
        .laundry-nav-item:hover { background: rgba(255,255,255,0.35); }
        .laundry-nav-item.active { background: linear-gradient(135deg, #1e88e5, #42a5f5); color: white; box-shadow: 0 4px 16px rgba(30,136,229,0.5); }
        .laundry-nav-icon { font-size: 16px; }
        .laundry-nav-text { font-size: 11px; font-weight: bold; white-space: nowrap; }

        /* Foam Bubbles */
        .foam { position: absolute; border-radius: 50%; background: rgba(33,150,243,0.2); pointer-events: none; animation: foam-float-random linear infinite; }
        .foam-1 { width: 6px; height: 6px; top: -4px; left: 20%; animation-duration: 3s; animation-delay: 0s; }
        .foam-2 { width: 4px; height: 4px; top: -2px; left: 55%; animation-duration: 2.5s; animation-delay: 0.6s; }
        .foam-3 { width: 5px; height: 5px; top: -5px; left: 78%; animation-duration: 3.5s; animation-delay: 1.2s; }
        @keyframes foam-float-random {0% { transform: translate(0,0); opacity: 0.5; } 25% { transform: translate(-2px,-4px); opacity: 0.8; } 50% { transform: translate(1px,-6px); opacity: 1; } 75% { transform: translate(-1px,-3px); opacity: 0.7; } 100% { transform: translate(0,0); opacity: 0.5; }}

        /* Water Drops */
        .drop { position: absolute; border-radius: 50%; background: rgba(33,150,243,0.15); width: 4px; height: 4px; pointer-events: none; animation: drop-float-random linear infinite; }
        .drop-1 { left: 10%; top: -6px; animation-duration: 3s; animation-delay: 0s; }
        .drop-2 { left: 40%; top: -4px; animation-duration: 2.5s; animation-delay: 0.7s; }
        .drop-3 { left: 70%; top: -5px; animation-duration: 3.2s; animation-delay: 1.4s; }
        .drop-4 { left: 25%; top: -3px; animation-duration: 3.5s; animation-delay: 0.3s; }
        .drop-5 { left: 60%; top: -6px; animation-duration: 2.8s; animation-delay: 1s; }
        @keyframes drop-float-random {0% { transform: translate(0,0); opacity: 0.3; } 25% { transform: translate(1px,-6px); opacity: 0.6; } 50% { transform: translate(-1px,-8px); opacity: 0.7; } 75% { transform: translate(2px,-4px); opacity: 0.5; } 100% { transform: translate(0,0); opacity: 0.3; }

        /* Hover interaction */
        .laundry-nav-item:hover .foam,
        .laundry-nav-item:hover .drop { animation-duration: 0.8s !important; transform: translateY(-2px) !important; }

        /* Mobile toggle button */
        .mobile-toggle {
          display: none;
          position: fixed;
          top: 50%;
          left: 1rem;
          transform: translateY(-50%);
          z-index: 10000;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e88e5, #42a5f5);
          color: white;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        @media (max-width: 768px) {
          .laundry-side-nav { left: ${mobileOpen ? "1rem" : "-120%"}; opacity: ${mobileOpen ? "1" : "0"}; transition: left 0.35s ease, opacity 0.35s ease; }
          .mobile-toggle { display: flex; }
          .laundry-nav-text { display: none; }
        }
      `}</style>

      {/* Mobile toggle button */}
      <div className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        ☰
      </div>

      <nav className={`laundry-side-nav ${!showNav ? "hide" : ""}`}>
        {sections.map((s) => (
          <button
            key={s.route}
            className={`laundry-nav-item ${location.pathname === s.route ? "active" : ""}`}
            onClick={() => { navigate(s.route); setMobileOpen(false); }}
            title={s.label}
          >
            {location.pathname === s.route && (
              <>
                <span className="foam foam-1" />
                <span className="foam foam-2" />
                <span className="foam foam-3" />
              </>
            )}
            <span className="drop drop-1" />
            <span className="drop drop-2" />
            <span className="drop drop-3" />
            <span className="drop drop-4" />
            <span className="drop drop-5" />
            <span className="laundry-nav-icon">{s.icon}</span>
            <span className="laundry-nav-text">{s.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}