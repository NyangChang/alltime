// ─── ミニバーチャート ────────────────────────────────
window.MiniStackBar = function MiniStackBar({ todayUsage }) {
  const total = TRACK_ITEMS.reduce((s, t) => s + (todayUsage[t.id] || 0), 0);
  if (total === 0) return <div style={{ height: 12, background: "#eee", borderRadius: 6 }} />;
  return (
    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden" }}>
      {TRACK_ITEMS.map(t => {
        const pct = ((todayUsage[t.id] || 0) / total) * 100;
        if (pct < 0.5) return null;
        return <div key={t.id} style={{ width: `${pct}%`, background: t.color }} />;
      })}
    </div>
  );
};

window.MiniHistoryBars = function MiniHistoryBars({ history }) {
  const last7 = history.slice(-7);
  const maxTotal = Math.max(...last7.map(d => TRACK_ITEMS.reduce((s,t) => s+(d[t.id]||0), 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
      {last7.map((d, i) => {
        const total = TRACK_ITEMS.reduce((s,t) => s+(d[t.id]||0), 0);
        const heightPct = (total / maxTotal) * 100;
        return (
          <div key={i} style={{ flex:1, height:`${heightPct}%`, display:"flex", flexDirection:"column-reverse", borderRadius:"3px 3px 0 0", overflow:"hidden", minHeight:2 }}>
            {TRACK_ITEMS.map(t => {
              const pct = total > 0 ? ((d[t.id]||0) / total) * 100 : 0;
              if (pct < 0.5) return null;
              return <div key={t.id} style={{ height:`${pct}%`, background:t.color }} />;
            })}
          </div>
        );
      })}
    </div>
  );
};

window.UsageCard = function UsageCard({ type, todayUsage, history, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%)",
      borderRadius: 20, padding: "12px 16px", flex: 1,
      boxShadow: "0 4px 12px rgba(140,180,255,0.2)",
      border: "2px solid rgba(255,255,255,0.8)", cursor: "pointer",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5577cc", marginBottom: 8 }}>
        {type === "today" ? "今日の使用量" : "今までの使用量"}
      </div>
      {type === "today" ? <MiniStackBar todayUsage={todayUsage} /> : <MiniHistoryBars history={history} />}
    </div>
  );
};

// ─── 今日の使用量画面 ────────────────────────────────
window.TodayUsageScreen = function TodayUsageScreen({ todayUsage, onBack }) {
  const total = TRACK_ITEMS.reduce((s, t) => s + (todayUsage[t.id] || 0), 0);
  const maxSec = Math.max(...TRACK_ITEMS.map(t => todayUsage[t.id] || 0), 1);
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f4ff 0%,#f0e8ff 100%)", fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", maxWidth:400, margin:"0 auto" }}>
      <div style={{ padding:"16px 16px 12px", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)", borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)", border:"none", borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, color:"white", cursor:"pointer" }}>🏠 戻る</button>
        <div style={{ fontSize:16, fontWeight:800, color:"#5566cc" }}>📊 今日の使用量</div>
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>合計 {fmtSec(total)}</div>
      </div>
      <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:14 }}>
        {total > 0 && (
          <div style={{ background:"white", borderRadius:16, padding:"12px 16px", boxShadow:"0 2px 10px rgba(140,160,255,0.12)" }}>
            <div style={{ fontSize:12, color:"#aaa", marginBottom:8 }}>内訳</div>
            <div style={{ display:"flex", height:16, borderRadius:8, overflow:"hidden" }}>
              {TRACK_ITEMS.map(t => {
                const pct = ((todayUsage[t.id] || 0) / total) * 100;
                if (pct < 0.5) return null;
                return <div key={t.id} style={{ width:`${pct}%`, background:t.color }} />;
              })}
            </div>
          </div>
        )}
        {TRACK_ITEMS.map(t => {
          const sec = todayUsage[t.id] || 0;
          return (
            <div key={t.id} style={{ background:"white", borderRadius:16, padding:"14px 16px", boxShadow:"0 2px 10px rgba(140,160,255,0.1)", border:"2px solid rgba(220,230,255,0.5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#444" }}>{t.label}</span>
                <span style={{ fontSize:13, color:"#888", fontVariantNumeric:"tabular-nums" }}>{fmtSec(sec)}</span>
              </div>
              <div style={{ background:"#f0f4ff", borderRadius:6, height:10, overflow:"hidden" }}>
                <div style={{ width:`${(sec/maxSec)*100}%`, height:"100%", background:t.color, borderRadius:6, transition:"width 0.6s ease" }} />
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <div style={{ textAlign:"center", color:"#ccc", marginTop:40, fontSize:14 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🌸</div>
            まだ記録がないよ！
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 今までの使用量画面 ──────────────────────────────
window.HistoryUsageScreen = function HistoryUsageScreen({ history, onBack }) {
  const allDays = [...history].reverse();
  // popup state: { date, itemId } or null
  const [popup, setPopup] = React.useState(null);

  // 背景タップでポップアップを閉じる
  const handleBgClick = () => { if (popup) setPopup(null); };

  return (
    <div onClick={handleBgClick} style={{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f4ff 0%,#f0e8ff 100%)", fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", maxWidth:400, margin:"0 auto" }}>
      <div style={{ padding:"16px 16px 12px", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)", borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)", border:"none", borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, color:"white", cursor:"pointer" }}>🏠 戻る</button>
        <div style={{ fontSize:16, fontWeight:800, color:"#5566cc" }}>📈 今までの使用量</div>
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>{allDays.length}日分</div>
      </div>
      <div style={{ padding:"12px 16px 4px", display:"flex", flexWrap:"wrap", gap:8 }}>
        {TRACK_ITEMS.map(t => (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:t.color }} />
            <span style={{ fontSize:11, color:"#777" }}>{t.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"8px 16px 32px", display:"flex", flexDirection:"column", gap:10 }}>
        {allDays.length === 0 && (
          <div style={{ textAlign:"center", color:"#ccc", marginTop:40, fontSize:14 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>📅</div>
            まだ記録がないよ！
          </div>
        )}
        {allDays.map(d => {
          const total = TRACK_ITEMS.reduce((s, t) => s + (d[t.id] || 0), 0);
          const isActive = popup && popup.date === d.date;
          return (
            <div key={d.date} style={{ background:"white", borderRadius:16, padding:"12px 16px", boxShadow:"0 2px 10px rgba(140,160,255,0.1)", border:"2px solid rgba(220,230,255,0.5)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#555" }}>{d.date}</span>
                <span style={{ fontSize:12, color:"#aaa" }}>合計 {fmtSec(total)}</span>
              </div>
              {total > 0 ? (
                <div style={{ position:"relative" }}>
                  <div style={{ display:"flex", height:18, borderRadius:8, overflow:"hidden" }}>
                    {TRACK_ITEMS.map(t => {
                      const sec = d[t.id] || 0;
                      const pct = sec / total * 100;
                      if (pct < 0.5) return null;
                      const selected = isActive && popup.itemId === t.id;
                      return (
                        <div key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selected) { setPopup(null); }
                            else { setPopup({ date: d.date, itemId: t.id }); }
                          }}
                          style={{
                            width:`${pct}%`, background:t.color, cursor:"pointer",
                            opacity: isActive && !selected ? 0.5 : 1,
                            transition:"opacity 0.15s",
                          }}
                        />
                      );
                    })}
                  </div>
                  {/* ポップアップ */}
                  {isActive && (() => {
                    const item = TRACK_ITEMS.find(t => t.id === popup.itemId);
                    if (!item) return null;
                    const sec = d[item.id] || 0;
                    // ポップアップの水平位置を帯の中央に合わせる
                    let leftPct = 0;
                    for (const t of TRACK_ITEMS) {
                      const tSec = d[t.id] || 0;
                      const tPct = tSec / total * 100;
                      if (tPct < 0.5) continue;
                      if (t.id === item.id) { leftPct += tPct / 2; break; }
                      leftPct += tPct;
                    }
                    return (
                      <div onClick={e => e.stopPropagation()} style={{
                        position:"absolute", bottom:"calc(100% + 8px)",
                        left:`${leftPct}%`, transform:"translateX(-50%)",
                        background:"#333", color:"#fff", borderRadius:10,
                        padding:"7px 14px", fontSize:12, fontWeight:700,
                        whiteSpace:"nowrap", zIndex:20,
                        boxShadow:"0 4px 16px rgba(0,0,0,0.25)",
                        animation:"fadeIn 0.15s ease",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:item.color, flexShrink:0 }} />
                          <span>{item.label}：{fmtSec(sec)}</span>
                        </div>
                        <div style={{
                          position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
                          width:0, height:0, borderLeft:"6px solid transparent",
                          borderRight:"6px solid transparent", borderTop:"6px solid #333",
                        }} />
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ height:18, background:"#f5f5f5", borderRadius:8 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
