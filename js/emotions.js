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
    const ts = Date.now();
    const d = new Date(ts);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const newPost = {
      id: ts, emotionId: emotion.id, timestamp: ts,
      date: dateStr, time: fmtTime(ts), mode: currentMode?.label || null, modeElapsed,
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

// ─── タイムライン集計コンポーネント ─────────────────────
window.TimelineStats = function TimelineStats({ posts }) {
  const [popup, setPopup] = React.useState(null);

  // 日付を導出（dateフィールドがない古いデータはtimestampから生成）
  const getDate = (p) => {
    if (p.date) return p.date;
    const d = new Date(p.timestamp);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };

  // 日付ごとにグルーピング
  const grouped = {};
  posts.forEach(p => {
    const dateKey = getDate(p);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(p);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 時刻→0〜24のfloat変換
  const tsToHour = (ts) => {
    const d = new Date(ts);
    return d.getHours() + d.getMinutes() / 60;
  };

  // アイコン重なり回避: 同一日の投稿を時刻順にソートし、近すぎるものをずらす
  const layoutIcons = (dayPosts) => {
    const items = dayPosts.map(p => ({
      post: p,
      hour: tsToHour(p.timestamp),
      pct: (tsToHour(p.timestamp) / 24) * 100,
      row: 0,
    })).sort((a, b) => a.hour - b.hour);

    // 各アイコンが占める幅を%で概算（アイコン≒24px, バー幅≒280px → 約8.5%）
    const iconWidthPct = 8;
    for (let i = 1; i < items.length; i++) {
      let row = 0;
      for (let j = 0; j < i; j++) {
        if (items[j].row === row && Math.abs(items[i].pct - items[j].pct) < iconWidthPct) {
          row++;
          j = -1; // restart check
        }
      }
      items[i].row = row;
    }
    return items;
  };

  const maxRows = (items) => Math.max(0, ...items.map(it => it.row)) + 1;

  // 日付の表示フォーマット
  const fmtDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return `${y}-${Number(m)}-${Number(d)}`;
  };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"16px 16px", display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:12, color:"#aaa", marginBottom:0 }}>日別タイムライン</div>
      {sortedDates.length === 0 && (
        <div style={{ textAlign:"center", color:"#ccc", marginTop:60, fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
          まだデータがないよ！
        </div>
      )}
      {sortedDates.map(dateKey => {
        const dayPosts = grouped[dateKey];
        const items = layoutIcons(dayPosts);
        const rows = maxRows(items);
        const iconAreaHeight = rows * 30;

        return (
          <div key={dateKey} style={{
            background:"white", borderRadius:14, padding:"12px 14px 10px",
            boxShadow:"0 2px 8px rgba(180,140,255,0.1)",
          }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#7755cc", marginBottom:6 }}>
              {fmtDate(dateKey)}
              <span style={{ fontSize:11, fontWeight:400, color:"#bbb", marginLeft:8 }}>{dayPosts.length}件</span>
            </div>
            {/* アイコンエリア + バー */}
            <div style={{ position:"relative", marginLeft:28, marginRight:28 }}>
              {/* アイコン群 */}
              <div style={{ position:"relative", height: iconAreaHeight, marginBottom:2 }}>
                {items.map(it => {
                  const em = EMOTIONS.find(e => e.id === it.post.emotionId);
                  if (!em) return null;
                  return (
                    <div key={it.post.id}
                      onClick={() => setPopup(popup === it.post.id ? null : it.post.id)}
                      style={{
                        position:"absolute",
                        left:`calc(${it.pct}% - 12px)`,
                        top: it.row * 30,
                        fontSize:22, cursor:"pointer",
                        transition:"transform 0.15s",
                        transform: popup === it.post.id ? "scale(1.3)" : "scale(1)",
                        zIndex: popup === it.post.id ? 5 : 1,
                        filter: `drop-shadow(0 1px 2px ${em.color}88)`,
                      }}
                      title={`${it.post.time} ${em.label}`}
                    >
                      {em.emoji}
                      {/* ポップアップ */}
                      {popup === it.post.id && (
                        <div onClick={e => e.stopPropagation()} style={{
                          position:"absolute", bottom:"110%", left:"50%", transform:"translateX(-50%)",
                          background:"#333", color:"#fff", borderRadius:10, padding:"8px 12px",
                          fontSize:11, whiteSpace:"nowrap", zIndex:20,
                          boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
                          animation:"fadeIn 0.15s ease",
                        }}>
                          <div style={{ fontWeight:700, marginBottom:2 }}>{em.emoji} {em.label}</div>
                          <div>{it.post.time}</div>
                          {it.post.mode && <div style={{ color:"#aaa" }}>{it.post.mode}{it.post.modeElapsed != null ? ` ${fmtElapsed(it.post.modeElapsed)}` : ""}</div>}
                          <div style={{
                            position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
                            width:0, height:0, borderLeft:"6px solid transparent",
                            borderRight:"6px solid transparent", borderTop:"6px solid #333",
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 横バー */}
              <div style={{
                height:6, background:"linear-gradient(90deg, #e8e0f5, #f5e0f0)",
                borderRadius:3, position:"relative",
              }}>
                {/* 6時間ごとの目盛り線 */}
                {[6,12,18].map(h => (
                  <div key={h} style={{
                    position:"absolute", left:`${(h/24)*100}%`, top:-2,
                    width:1, height:10, background:"#d0c0e0",
                  }} />
                ))}
              </div>
              {/* 時刻ラベル */}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                <span style={{ fontSize:10, color:"#bbb" }}>0時</span>
                <span style={{ fontSize:10, color:"#bbb" }}>6</span>
                <span style={{ fontSize:10, color:"#bbb" }}>12</span>
                <span style={{ fontSize:10, color:"#bbb" }}>18</span>
                <span style={{ fontSize:10, color:"#bbb" }}>24時</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
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
        <TimelineStats posts={posts} />
      )}
    </div>
  );
};
