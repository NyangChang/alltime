// ─── メモ画面 ────────────────────────────────────────
window.MemoScreen = function MemoScreen({ app, onBack, onOpenEmotion }) {
  const storageKey = STORAGE_KEYS[app.id] || `memo_posts_${app.id}`;
  const [posts, setPosts] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch(e) { return []; }
  });
  const [input, setInput] = React.useState("");

  const post = () => {
    if (!input.trim()) return;
    const updated = [{ id: Date.now(), text: input.trim(),
      time: new Date().toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" }) }, ...posts];
    setPosts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setInput("");
  };
  const deletePost = (id) => {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0f0ff 0%,#fff0f8 100%)", fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", display:"flex", flexDirection:"column", maxWidth:400, margin:"0 auto" }}>
      <div style={{ padding:"16px 16px 12px", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)", borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)", border:"none", borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, color:"white", cursor:"pointer" }}>🏠 戻る</button>
        <div style={{ fontSize:16, fontWeight:800, color:"#5566cc" }}>{app.emoji} {app.label} メモ</div>
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>{posts.length}件</div>
      </div>
      <div style={{ padding:"12px 16px", background:"rgba(255,255,255,0.8)", backdropFilter:"blur(10px)", borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", gap:8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();post();} }}
          placeholder="いまなにしてる？" rows={2}
          style={{ flex:1, borderRadius:16, border:"2px solid rgba(180,200,255,0.6)", padding:"10px 14px", fontSize:14, fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", resize:"none", outline:"none", background:"rgba(240,245,255,0.8)", color:"#333", lineHeight:1.5 }} />
        <button onClick={post} style={{ background:"linear-gradient(135deg,#a0c4ff,#7eb0ff)", border:"none", borderRadius:16, padding:"0 18px", fontSize:20, cursor:"pointer", color:"white" }}>↑</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {posts.length===0 && <div style={{ textAlign:"center",color:"#ccc",marginTop:60,fontSize:14 }}><div style={{fontSize:40,marginBottom:8}}>🌸</div>まだ投稿がないよ！</div>}
        {posts.map(p => (
          <div key={p.id} style={{ background:"white", borderRadius:16, padding:"12px 14px", boxShadow:"0 2px 10px rgba(140,160,255,0.15)", border:"2px solid rgba(200,220,255,0.5)", animation:"slideDown 0.3s ease" }}>
            <div style={{ fontSize:14, color:"#333", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{p.text}</div>
            <div style={{ marginTop:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#bbb" }}>{p.time}</span>
              <button onClick={() => deletePost(p.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ddd",padding:"2px 4px" }}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <FloatingPostButton onClick={onOpenEmotion} />
    </div>
  );
};
