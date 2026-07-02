import React from "react";
import ReactDOM from "react-dom/client";
import PolierApp from "./App.jsx";

try {
  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(PolierApp)
  );
} catch(e) {
  document.getElementById("status").textContent = "Fehler: " + e.message;
  document.getElementById("status").style.color = "#FF6B6B";
  var box = document.getElementById("error-box");
  if (box) { box.style.display = "block"; box.textContent = e.stack || e.message; }
}
