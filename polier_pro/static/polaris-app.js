
// Polaris App - kein React, pures JS
export default function init() {
  document.getElementById('log').innerHTML += '<div style="color:#4CAF50;padding:4px 0">App.js geladen!</div>';
  document.getElementById('root').innerHTML = '<div style="background:#1E293B;border-radius:12px;padding:20px;margin-top:16px"><div style="color:#F5C400;font-size:24px;font-weight:900">&#9733; POLARIS</div><div style="color:#8B9EC8;margin-top:8px">Läuft auf iOS!</div></div>';
}
init();
