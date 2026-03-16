import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function SideNav() {

  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen,setMobileOpen] = useState(false);
  const [role,setRole] = useState("guest");

  useEffect(()=>{
    const storedRole = localStorage.getItem("role");
    if(storedRole){
      setRole(storedRole);
    }
  },[]);

  const sections = {

    guest:[
      {route:"/",label:"Home",icon:"🏠"},
      {route:"/login",label:"Login",icon:"🔑"},
      {route:"/support",label:"Support",icon:"💬"}
    ],

    owner:[
      {route:"/dashboard",label:"Dashboard",icon:"📊"},
      {route:"/payments",label:"Payments",icon:"💳"},
      {route:"/schedule",label:"Schedule",icon:"📅"},
      {route:"/track",label:"Track Order",icon:"📍"},
      {route:"/support",label:"Support",icon:"💬"}
    ],

    worker:[
      {route:"/schedule",label:"Schedule",icon:"📅"},
      {route:"/payments",label:"Payments",icon:"💳"},
      {route:"/support",label:"Support",icon:"💬"}
    ],

    client:[
      {route:"/schedule",label:"Book Pickup",icon:"📅"},
      {route:"/track",label:"Track Order",icon:"📍"},
      {route:"/payments",label:"Payments",icon:"💳"},
      {route:"/support",label:"Support",icon:"💬"}
    ]

  };

  const menu = sections[role] || sections.guest;

  return (
    <>
      <style>{`

      .sideNav{
        position:fixed;
        right:1rem;
        top:50%;
        transform:translateY(-50%);
        display:flex;
        flex-direction:column;
        gap:8px;
        padding:10px;
        border-radius:14px;
        background:rgba(255,255,255,0.2);
        backdrop-filter:blur(10px);
        z-index:9999;
      }

      .navItem{
        border:none;
        background:rgba(255,255,255,0.3);
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
        display:flex;
        gap:6px;
        align-items:center;
      }

      .navItem.active{
        background:#1e88e5;
        color:white;
      }

      .mobileBtn{
        display:none;
        position:fixed;
        left:1rem;
        top:50%;
        transform:translateY(-50%);
        width:36px;
        height:36px;
        border-radius:50%;
        background:#1e88e5;
        color:white;
        justify-content:center;
        align-items:center;
        cursor:pointer;
      }

      @media(max-width:768px){

        .sideNav{
          left:${mobileOpen ? "1rem":"-120%"};
          opacity:${mobileOpen ? "1":"0"};
          transition:0.3s;
        }

        .mobileBtn{
          display:flex;
        }

      }

      `}</style>


      <div
        className="mobileBtn"
        onClick={()=>setMobileOpen(!mobileOpen)}
      >
        ☰
      </div>


      <nav className="sideNav">

        {menu.map((item)=>(
          <button
            key={item.route}
            className={`navItem ${location.pathname === item.route ? "active":""}`}
            onClick={()=>navigate(item.route)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

      </nav>
    </>
  );
}