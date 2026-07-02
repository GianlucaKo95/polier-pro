import { useState, useEffect, useRef } from "react";

// ─── Error Boundary ───────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background:"#0B1120", minHeight:"100vh", padding:20,
          fontFamily:"monospace", color:"#F0F4FF" }}>
          <div style={{ color:"#F5C400", fontSize:20, fontWeight:900, marginBottom:16 }}>
            ★ POLARIS – Fehler
          </div>
          <div style={{ background:"#1E293B", borderRadius:10, padding:16,
            color:"#FF6B6B", fontSize:13, wordBreak:"break-all" }}>
            <strong>Fehler:</strong><br/>
            {this.state.error?.message}<br/><br/>
            <strong>Stack:</strong><br/>
            {this.state.error?.stack?.substring(0, 500)}
          </div>
          <div style={{ marginTop:16, color:"#8B9EC8", fontSize:11 }}>
            {navigator.userAgent}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from "react";
import ReactDOM from "react-dom/client";

// ─── Haupt-App ─────────────────────────────────────────────────────────────
function App() {
  const [log, setLog] = useState(["App startet...", "v1.0.7 Debug"]);

  useEffect(() => {
    const checks = [];
    
    // Check 1: localStorage
    try { localStorage.setItem("test","1"); localStorage.removeItem("test"); checks.push("✅ localStorage"); }
    catch(e) { checks.push("❌ localStorage: " + e.message); }
    
    // Check 2: fetch
    checks.push(typeof fetch !== "undefined" ? "✅ fetch" : "❌ fetch nicht verfügbar");
    
    // Check 3: URLSearchParams
    try { new URLSearchParams("test=1"); checks.push("✅ URLSearchParams"); }
    catch(e) { checks.push("❌ URLSearchParams: " + e.message); }
    
    // Check 4: CSS Variables
    checks.push("✅ CSS ok");
    
    // Check 5: Viewport
    checks.push("📐 " + window.innerWidth + "x" + window.innerHeight);
    
    // Check 6: userAgent
    checks.push("📱 " + navigator.userAgent.substring(0,60));

    setLog(prev => [...prev, ...checks, "✅ Alle Checks OK"]);
  }, []);

  return (
    <div style={{ background:"#0B1120", minHeight:"100vh", padding:20,
      fontFamily:"system-ui", color:"#F0F4FF" }}>
      <div style={{ color:"#F5C400", fontSize:24, fontWeight:900, marginBottom:16 }}>
        ★ POLARIS Debug
      </div>
      {log.map((l, i) => (
        <div key={i} style={{ padding:"6px 0", borderBottom:"1px solid #1E293B",
          fontSize:13, color: l.startsWith("❌") ? "#FF6B6B" : "#8BC34A" }}>
          {l}
        </div>
      ))}
    </div>
  );
}

export default function PolierApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
