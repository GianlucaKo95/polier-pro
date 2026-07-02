import React from "react";
import ReactDOM from "react-dom/client";
import PolierApp from "./App.jsx";

try {
  var root = document.getElementById("root");
  ReactDOM.createRoot(root).render(React.createElement(PolierApp));
} catch(e) {
  var s = document.getElementById("status");
  if(s) { s.textContent = "React Fehler: " + e.message; s.style.color = "#FF6B6B"; }
  var b = document.getElementById("error-box");
  if(b) { b.style.display = "block"; b.textContent = e.stack || e.message; }
}
