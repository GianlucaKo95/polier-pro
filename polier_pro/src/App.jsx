export default function PolierApp() {
  var s = document.getElementById("status");
  if(s) s.style.display = "none";
  return (
    <div style={{background:"#0B1120",minHeight:"100vh",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"system-ui",color:"#F0F4FF",padding:20}}>
      <div style={{fontSize:64,color:"#F5C400",marginBottom:16}}>&#9733;</div>
      <div style={{fontSize:28,fontWeight:900,color:"#F5C400",marginBottom:8}}>POLARIS</div>
      <div style={{color:"#8B9EC8",marginBottom:24}}>v1.0.9 - React laeuft!</div>
      <div style={{background:"#1E293B",borderRadius:10,padding:16,
        fontSize:12,color:"#4A5878",maxWidth:320,wordBreak:"break-all"}}>
        {navigator.userAgent.substring(0,80)}
      </div>
    </div>
  );
}
