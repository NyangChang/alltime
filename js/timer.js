// ─── タイマー画面（Wake Lock対応） ──────────────────
window.TimerScreen = function TimerScreen({ mode, startTime, onStop, onBack, onOpenEmotion }) {
  const [elapsed, setElapsed] = React.useState(() => Math.floor((Date.now()-startTime)/1000));
  useWakeLock(true);

  React.useEffect(() => {
    const ref = setInterval(() => setElapsed(Math.floor((Date.now()-startTime)/1000)), 1000);
    return () => clearInterval(ref);
  }, [startTime]);

  const fmt = s => {
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    return h>0 ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg,${mode.color} 0%,white 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", gap:28, padding:24 }}>
      <div style={{ fontSize:72, filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.1))", animation:"pulse 2s ease-in-out infinite" }}>{mode.character}</div>
      <div style={{ background:"rgba(255,255,255,0.8)", borderRadius:24, padding:"24px 48px", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:"2px solid rgba(255,255,255,0.9)" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#888", marginBottom:8, letterSpacing:1 }}>{mode.label}</div>
        <div style={{ fontSize:52, fontWeight:800, color:"#444", letterSpacing:2, fontVariantNumeric:"tabular-nums" }}>{fmt(elapsed)}</div>
      </div>
      <button onClick={() => { onStop(elapsed); onBack(); }} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)", border:"none", borderRadius:50, padding:"14px 36px", fontSize:16, fontWeight:700, color:"white", cursor:"pointer" }}>🏠 ホームに戻る</button>
      <FloatingPostButton onClick={onOpenEmotion} />
    </div>
  );
};
