import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pinIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function LocationMarker({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} icon={pinIcon} /> : null;
}

export default function MapPicker({ value, onChange, height = 250 }) {
  const defaultCenter = { lat: 5.6037, lng: -0.1870 };
  const [position, setPosition] = useState(value || null);

  useEffect(() => {
    if (value) setPosition(value);
  }, [value]);

  const handleChange = (newPos) => {
    setPosition(newPos);
    onChange?.(newPos);
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          handleChange(coords);
        },
        () => {
          console.log("Location access denied");
        }
      );
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ borderRadius: 12, overflow: "hidden", height, border: "1.5px solid rgba(99,102,241,.3)" }}>
        <MapContainer
          center={[position?.lat || defaultCenter.lat, position?.lng || defaultCenter.lng]}
          zoom={position ? 15 : 13}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <LocationMarker position={position} onPositionChange={handleChange} />
        </MapContainer>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={handleDetectLocation}
          style={{
            flex: 1,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,.15)",
            background: "rgba(255,255,255,.05)",
            color: "rgba(255,255,255,.7)",
            fontSize: 12,
            fontFamily: "'DM Sans',sans-serif",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
          Use My Location
        </button>
        {position && (
          <button
            type="button"
            onClick={() => handleChange(null)}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,.3)",
              background: "rgba(239,68,68,.1)",
              color: "#fca5a5",
              fontSize: 12,
              fontFamily: "'DM Sans',sans-serif",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>
      {position && (
        <p style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 6, textAlign: "center" }}>
          📍 {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
      <p style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 4 }}>
        Tap the map to pin pickup location
      </p>
    </div>
  );
}

export function MapView({ lat, lng, height = 200 }) {
  if (!lat || !lng) {
    return (
      <div style={{ 
        height, 
        background: "rgba(255,255,255,.05)", 
        borderRadius: 12, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "rgba(255,255,255,.3)",
        fontSize: 12,
        border: "1px solid rgba(255,255,255,.1)"
      }}>
        No location set
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", height, border: "1.5px solid rgba(99,102,241,.3)" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        attributionControl={false}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
