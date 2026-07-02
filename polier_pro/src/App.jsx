export default function PolierApp() {
  document.getElementById("status").textContent = "★ POLARIS – React OK!";
  return (
    <div style={{textAlign:"center",paddingTop:40}}>
      <div style={{fontSize:48,color:"#F5C400"}}>★</div>
      <div style={{fontSize:24,fontWeight:900,color:"#F5C400",marginTop:8}}>POLARIS</div>
      <div style={{color:"#8B9EC8",marginTop:8}}>v1.0.8 Debug – React funktioniert!</div>
      <div style={{color:"#4A5878",fontSize:11,marginTop:16}}>
        {window.innerWidth}x{window.innerHeight} · {navigator.userAgent.substring(0,40)}
      </div>
    </div>
  );
}
