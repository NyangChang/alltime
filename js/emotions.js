// ─── 感情投稿モーダル ────────────────────────────────
window.EmotionModal = function EmotionModal({ currentMode, modeStartTime, pomodoroTimeRef, onClose }) {
  const [posts, setPosts] = React.useState(() => loadEmotionPosts());
  const [now, setNow] = React.useState(() => Date.now());

  // クールダウンタイマーを毎秒更新
  React.useEffect(() => {
    const ref = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ref);
  }, []);

  const getLastPosted = (emotionId) => {
    const last = posts.find(p => p.emotionId === emotionId);
    return last ? last.timestamp : null;
  };
  const canPost = (emotionId) => {
    const last = getLastPosted(emotionId);
    return !last || (now - last) >= COOLDOWN_MS;
  };
  const remainSec = (emotionId) => {
    const last = getLastPosted(emotionId);
    if (!last) return 0;
    return Math.max(0, Math.ceil((COOLDOWN_MS - (now - last)) / 1000));
  };
  const postEmotion = (emotion) => {
    if (!canPost(emotion.id)) return;
    const modeElapsed = (currentMode && currentMode.id === "study" && pomodoroTimeRef)
      ? pomodoroTimeRef.current
      : (currentMode && modeStartTime)
        ? Math.floor((Date.now() - modeStartTime) / 1000) : null;
    const newPost = {
      id: Date.now(), emotionId: emotion.id, timestamp: Date.now(),
      time: fmtTime(Date.now()), mode: currentMode?.label || null, modeElapsed,
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    saveEmotionPosts(updated);
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
        borderRadius:"24px 24px 0 0", padding:"20px 16px 32px",
        width:"100%", maxWidth:400,
        boxShadow:"0 -8px 32px rgba(0,0,0,0.15)", animation:"slideUp 0.25s ease",
      }}>
        <div style={{ fontSize:16, fontWeight:800, color:"#5566cc", marginBottom:4 }}>
          今どんな気持ち？
        </div>
        {currentMode && (
          <div style={{ fontSize:11, color:"#aaa", marginBottom:16 }}>
            {currentMode.label}中 · {fmtElapsed(
              (currentMode.id === "study" && pomodoroTimeRef)
                ? pomodoroTimeRef.current
                : (modeStartTime ? Math.floor((Date.now()-modeStartTime)/1000) : null)
            )}
          </div>
        )}
        {!currentMode && <div style={{ marginBottom:16 }} />}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {EMOTIONS.map(emotion => {
            const ok = canPost(emotion.id);
            const remain = remainSec(emotion.id);
            return (
              <button key={emotion.id} onClick={() => { if(ok){ postEmotion(emotion); onClose(); } }}
                disabled={!ok}
                style={{
                  background: ok ? `linear-gradient(135deg, ${emotion.color}, white)` : "#f0f0f0",
                  border: `2px solid ${ok ? emotion.color : "#ddd"}`,
                  borderRadius:14, padding:"12px 8px",
                  display:"flex", alignItems:"center", gap:8,
                  cursor: ok ? "pointer" : "not-allowed",
                  opacity: ok ? 1 : 0.6, transition:"all 0.15s ease",
                }}>
                <span style={{ fontSize:22 }}>{emotion.emoji}</span>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:12, fontWeight:700, color: ok ? "#444" : "#aaa" }}>{emotion.label}</div>
                  {!ok && <div style={{ fontSize:10, color:"#bbb" }}>{Math.floor(remain/60)}:{String(remain%60).padStart(2,"0")}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── フローティング投稿ボタン ────────────────────────
window.FloatingPostButton = function FloatingPostButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position:"fixed", bottom:24, right:20, zIndex:50,
      width:56, height:56, borderRadius:"50%",
      background:"linear-gradient(135deg, #a0d890, #7ec870)",
      border:"none", cursor:"pointer",
      boxShadow:"0 4px 16px rgba(100,200,100,0.4)",
      fontSize:24, color:"white",
      display:"flex", alignItems:"center", justifyContent:"center",
      transition:"transform 0.15s ease",
    }}>
      投稿
    </button>
  );
};

// ─── 自家製SNSタブ画面 ───────────────────────────────
window.EmotionSNSScreen = function EmotionSNSScreen({ onBack }) {
  const [tab, setTab] = React.useState("timeline");
  const [posts, setPosts] = React.useState(() => loadEmotionPosts());

  const deletePost = (id) => {
    const updated = posts.filter(p => p.id !== id);
    setPosts(updated);
    saveEmotionPosts(updated);
  };

  const stats = EMOTIONS.map(e => ({
    ...e, count: posts.filter(p => p.emotionId === e.id).length,
  })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
      fontFamily:"'Hiragino Maru Gothic Pro', sans-serif", maxWidth:400, margin:"0 auto",
      display:"flex", flexDirection:"column",
    }}>
      {/* ヘッダー */}
      <div style={{
        padding:"16px 16px 0", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)",
        borderBottom:"1px solid rgba(220,200,255,0.3)", position:"sticky", top:0, zIndex:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <button onClick={onBack} style={{
            background:"linear-gradient(135deg, #ffb3c8, #ff9eb5)",
            border:"none", borderRadius:20, padding:"6px 14px",
            fontSize:12, fontWeight:700, color:"white", cursor:"pointer",
          }}>🏠 戻る</button>
          <div style={{ fontSize:16, fontWeight:800, color:"#7755cc" }}>💭 きもち記録</div>
          <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>{posts.length}件</div>
        </div>
        <div style={{ display:"flex", gap:0 }}>
          {[["timeline","タイムライン"],["stats","集計"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1, padding:"8px 0", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight: tab===id ? 800 : 400,
              color: tab===id ? "#7755cc" : "#aaa",
              borderBottom: tab===id ? "2px solid #7755cc" : "2px solid transparent",
              transition:"all 0.2s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* タイムライン */}
      {tab === "timeline" && (
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          {posts.length === 0 && (
            <div style={{ textAlign:"center", color:"#ccc", marginTop:60, fontSize:14 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>💭</div>
              まだ記録がないよ！
            </div>
          )}
          {posts.map(p => {
            const em = EMOTIONS.find(e => e.id === p.emotionId);
            if (!em) return null;
            return (
              <div key={p.id} style={{
                background:"white", borderRadius:16, padding:"12px 14px",
                boxShadow:"0 2px 10px rgba(180,140,255,0.12)",
                border:`2px solid ${em.color}44`, animation:"fadeIn 0.3s ease",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:28 }}>{em.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#444" }}>{em.label}</div>
                    <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>
                      {p.time}
                      {p.mode && <span> · {p.mode}{p.modeElapsed != null ? ` ${fmtElapsed(p.modeElapsed)}` : ""}</span>}
                    </div>
                  </div>
                  <button onClick={() => deletePost(p.id)} style={{
                    background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#ddd", padding:"2px 4px",
                  }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 集計 */}
      {tab === "stats" && (
        <div style={{ flex:1, overflowY:"auto", padding:"16px 16px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:12, color:"#aaa", marginBottom:4 }}>全期間の感情投稿数</div>
          {stats.map(s => (
            <div key={s.id} style={{
              background:"white", borderRadius:14, padding:"12px 16px",
              boxShadow:"0 2px 8px rgba(180,140,255,0.1)", border:`2px solid ${s.color}44`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{s.emoji} {s.label}</span>
                <span style={{ fontSize:13, color:"#888" }}>{s.count}回</span>
              </div>
              <div style={{ background:"#f5f0ff", borderRadius:6, height:8, overflow:"hidden" }}>
                <div style={{
                  width:`${(s.count / maxCount) * 100}%`, height:"100%",
                  background:s.color, borderRadius:6, transition:"width 0.6s ease",
                }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize:12, color:"#aaa", marginTop:8, marginBottom:4 }}>モード別の感情投稿数</div>
          {MODES.map(mode => {
            const modePosts = posts.filter(p => p.mode === mode.label);
            if (modePosts.length === 0) return null;
            return (
              <div key={mode.id} style={{
                background:"white", borderRadius:14, padding:"12px 16px",
                boxShadow:"0 2px 8px rgba(180,140,255,0.1)",
              }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>
                  {mode.character} {mode.label}（{modePosts.length}件）
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {EMOTIONS.map(e => {
                    const cnt = modePosts.filter(p => p.emotionId === e.id).length;
                    if (!cnt) return null;
                    return (
                      <div key={e.id} style={{
                        background:`${e.color}44`, borderRadius:20,
                        padding:"4px 10px", fontSize:11, fontWeight:700,
                      }}>
                        {e.emoji} {e.label} {cnt}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
