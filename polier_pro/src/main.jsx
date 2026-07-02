import React from "react";
import ReactDOM from "react-dom/client";

try {
  const { default: App } = await import("./App.jsx");
  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(App)
  );
} catch(e) {
  document.getElementById("status").textContent = "★ Import Fehler";
  document.getElementById("status").style.color = "#FF6B6B";
  var box = document.getElementById("error-box");
  box.style.display = "block";
  box.innerHTML = "<strong>Import Error:</strong><br>" + e.message + "<br><br>" + (e.stack||"kein Stack").substring(0,300);
}
