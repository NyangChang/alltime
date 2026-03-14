import { useState, useEffect } from "react";

// ─── 定数 ───────────────────────────────────────────
const APPS = [
  { id: "sns",     label: "SNS",     emoji: "💬", color: "linear-gradient(135deg, #222 40%, #4caf50)", textColor: "white" },
  { id: "firefox", label: "Firefox", emoji: "🦊", color: "#f4956a" },
];
const MODES = [
  { id: "study",   label: "勉強",       color: "#b5e8a0", character: "🌸", screen: "pomodoro" },
  { id: "chill",   label: "チルタイム", color: "#f0d6f5", character: "🍃", screen: "timer" },
  { id: "commute", label: "移動中",     color: "#fff3b0", character: "🚕", screen: "timer" },
  { id: "sleep",   label: "睡眠",       color: "#d9d6f5", character: "😴", screen: "timer" },
];

// 全トラッキング対象（グラフ用）
const TRACK_ITEMS = [
  { id: "sns",      label: "SNS",         color: "#5abf7a" },
  { id: "firefox",  label: "Firefox",     color: "#f4956a" },
  { id: "study",    label: "勉強",        color: "#7ec870" },
  { id: "chill",    label: "チルタイム",  color: "#c88ae0" },
  { id: "commute",  label: "移動中",      color: "#f5d060" },
  { id: "sleep",    label: "睡眠",        color: "#9090d8" },
  { id: "interval", label: "インターバル", color: "#b0c8e8" },
];

const STORAGE_KEYS = {
  sns:     "memo_posts_sns",
  firefox: "memo_posts_firefox",
};
const USAGE_TODAY_KEY  = "usage_today";   // { date:"YYYY-MM-DD", sns:秒, firefox:秒, ... }
const USAGE_HISTORY_KEY = "usage_history"; // [{ date, sns, firefox, study, chill, commute, sleep }, ...]

// ─── ユーティリティ ───────────────────────────────────
const todayStr = () => new Date().toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" }).replace(/\//g,"-");

function loadTodayUsage() {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_TODAY_KEY) || "{}");
    if (raw.date !== todayStr()) return { date: todayStr(), sns:0, firefox:0, study:0, chill:0, commute:0, sleep:0, interval:0 };
    return raw;
  } catch { return { date: todayStr(), sns:0, firefox:0, study:0, chill:0, commute:0, sleep:0, interval:0 }; }
}
function saveTodayUsage(data) {
  localStorage.setItem(USAGE_TODAY_KEY, JSON.stringify({ ...data, date: todayStr() }));
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(USAGE_HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function saveHistory(arr) {
  localStorage.setItem(USAGE_HISTORY_KEY, JSON.stringify(arr));
}
// 今日分を履歴に追記・更新
function flushTodayToHistory(todayData) {
  const hist = loadHistory();
  const idx = hist.findIndex(d => d.date === todayData.date);
  if (idx >= 0) hist[idx] = todayData;
  else hist.push(todayData);
  saveHistory(hist);
}
function fmtSec(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,"0")}m`;
  if (m > 0) return `${m}m${String(sec).padStart(2,"0")}s`;
  return `${sec}s`;
}

// ─── ミニバーチャート（ホーム用） ────────────────────
function MiniStackBar({ todayUsage }) {
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
}
function MiniHistoryBars({ history }) {
  const last7 = history.slice(-7);
  const maxTotal = Math.max(...last7.map(d => TRACK_ITEMS.reduce((s,t) => s+(d[t.id]||0), 0)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
      {last7.map((d, i) => {
        const total = TRACK_ITEMS.reduce((s,t) => s+(d[t.id]||0), 0);
        const heightPct = (total / maxTotal) * 100;
        return (
          <div key={i} style={{ flex: 1, height: `${heightPct}%`, display: "flex", flexDirection: "column-reverse", borderRadius: "3px 3px 0 0", overflow: "hidden", minHeight: 2 }}>
            {TRACK_ITEMS.map(t => {
              const pct = total > 0 ? ((d[t.id]||0) / total) * 100 : 0;
              if (pct < 0.5) return null;
              return <div key={t.id} style={{ height: `${pct}%`, background: t.color }} />;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── 使用量カード（ホーム） ───────────────────────────
function UsageCard({ type, todayUsage, history, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(135deg, #e8f4ff 0%, #d4e8ff 100%)",
      borderRadius: 20, padding: "12px 16px", flex: 1,
      boxShadow: "0 4px 12px rgba(140,180,255,0.2)",
      border: "2px solid rgba(255,255,255,0.8)",
      cursor: "pointer",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5577cc", marginBottom: 8 }}>
        {type === "today" ? "今日の使用量" : "今までの使用量"}
      </div>
      {type === "today"
        ? <MiniStackBar todayUsage={todayUsage} />
        : <MiniHistoryBars history={history} />
      }
    </div>
  );
}

// ─── 今日の使用量画面 ────────────────────────────────
function TodayUsageScreen({ todayUsage, onBack }) {
  const total = TRACK_ITEMS.reduce((s, t) => s + (todayUsage[t.id] || 0), 0);
  const maxSec = Math.max(...TRACK_ITEMS.map(t => todayUsage[t.id] || 0), 1);
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #e8f4ff 0%, #f0e8ff 100%)",
      fontFamily: "'Hiragino Maru Gothic Pro', sans-serif",
      maxWidth: 400, margin: "0 auto",
    }}>
      <div style={{
        padding: "16px 16px 12px",
        background: "rgba(255,255,255,0.75)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(200,200,255,0.3)",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "linear-gradient(135deg, #ffb3c8, #ff9eb5)",
          border: "none", borderRadius: 20, padding: "6px 14px",
          fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer",
        }}>🏠 戻る</button>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#5566cc" }}>📊 今日の使用量</div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>合計 {fmtSec(total)}</div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 積み上げバー全体 */}
        {total > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: "12px 16px", boxShadow: "0 2px 10px rgba(140,160,255,0.12)" }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>内訳</div>
            <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden" }}>
              {TRACK_ITEMS.map(t => {
                const pct = ((todayUsage[t.id] || 0) / total) * 100;
                if (pct < 0.5) return null;
                return <div key={t.id} style={{ width: `${pct}%`, background: t.color }} />;
              })}
            </div>
          </div>
        )}

        {/* 各アイテムの横棒グラフ */}
        {TRACK_ITEMS.map(t => {
          const sec = todayUsage[t.id] || 0;
          const pct = (sec / maxSec) * 100;
          return (
            <div key={t.id} style={{
              background: "white", borderRadius: 16, padding: "14px 16px",
              boxShadow: "0 2px 10px rgba(140,160,255,0.1)",
              border: "2px solid rgba(220,230,255,0.5)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>{t.label}</span>
                <span style={{ fontSize: 13, color: "#888", fontVariantNumeric: "tabular-nums" }}>{fmtSec(sec)}</span>
              </div>
              <div style={{ background: "#f0f4ff", borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: t.color,
                  borderRadius: 6,
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          );
        })}

        {total === 0 && (
          <div style={{ textAlign: "center", color: "#ccc", marginTop: 40, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
            まだ記録がないよ！
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 今までの使用量画面 ──────────────────────────────
function HistoryUsageScreen({ history, onBack }) {
  const allDays = [...history].reverse(); // 新しい順
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #e8f4ff 0%, #f0e8ff 100%)",
      fontFamily: "'Hiragino Maru Gothic Pro', sans-serif",
      maxWidth: 400, margin: "0 auto",
    }}>
      <div style={{
        padding: "16px 16px 12px",
        background: "rgba(255,255,255,0.75)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(200,200,255,0.3)",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "linear-gradient(135deg, #ffb3c8, #ff9eb5)",
          border: "none", borderRadius: 20, padding: "6px 14px",
          fontSize: 12, fontWeight: 700, color: "white", cursor: "pointer",
        }}>🏠 戻る</button>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#5566cc" }}>📈 今までの使用量</div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>{allDays.length}日分</div>
      </div>

      {/* 凡例 */}
      <div style={{ padding: "12px 16px 4px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TRACK_ITEMS.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: t.color }} />
            <span style={{ fontSize: 11, color: "#777" }}>{t.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        {allDays.length === 0 && (
          <div style={{ textAlign: "center", color: "#ccc", marginTop: 40, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📅</div>
            まだ記録がないよ！
          </div>
        )}
        {allDays.map(d => {
          const total = TRACK_ITEMS.reduce((s, t) => s + (d[t.id] || 0), 0);
          return (
            <div key={d.date} style={{
              background: "white", borderRadius: 16, padding: "12px 16px",
              boxShadow: "0 2px 10px rgba(140,160,255,0.1)",
              border: "2px solid rgba(220,230,255,0.5)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#555" }}>{d.date}</span>
                <span style={{ fontSize: 12, color: "#aaa" }}>合計 {fmtSec(total)}</span>
              </div>
              {total > 0 ? (
                <div style={{ display: "flex", height: 18, borderRadius: 8, overflow: "hidden" }}>
                  {TRACK_ITEMS.map(t => {
                    const pct = (d[t.id] || 0) / total * 100;
                    if (pct < 0.5) return null;
                    return (
                      <div key={t.id} title={`${t.label}: ${fmtSec(d[t.id]||0)}`}
                        style={{ width: `${pct}%`, background: t.color }} />
                    );
                  })}
                </div>
              ) : (
                <div style={{ height: 18, background: "#f5f5f5", borderRadius: 8 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── メモ画面 ────────────────────────────────────────
function MemoScreen({ app, onBack }) {
  const storageKey = STORAGE_KEYS[app.id] || `memo_posts_${app.id}`;
  const [posts, setPosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });
  const [input, setInput] = useState("");
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
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#f0f0ff 0%,#fff0f8 100%)",
      fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", display:"flex", flexDirection:"column", maxWidth:400, margin:"0 auto" }}>
      <div style={{ padding:"16px 16px 12px", background:"rgba(255,255,255,0.75)", backdropFilter:"blur(10px)",
        borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", alignItems:"center", gap:12,
        position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)", border:"none",
          borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, color:"white", cursor:"pointer" }}>🏠 戻る</button>
        <div style={{ fontSize:16, fontWeight:800, color:"#5566cc" }}>{app.emoji} {app.label} メモ</div>
        <div style={{ marginLeft:"auto", fontSize:11, color:"#aaa" }}>{posts.length}件</div>
      </div>
      <div style={{ padding:"12px 16px", background:"rgba(255,255,255,0.8)", backdropFilter:"blur(10px)",
        borderBottom:"1px solid rgba(200,200,255,0.3)", display:"flex", gap:8 }}>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();post();} }}
          placeholder="いまなにしてる？" rows={2}
          style={{ flex:1, borderRadius:16, border:"2px solid rgba(180,200,255,0.6)", padding:"10px 14px",
            fontSize:14, fontFamily:"'Hiragino Maru Gothic Pro',sans-serif", resize:"none", outline:"none",
            background:"rgba(240,245,255,0.8)", color:"#333", lineHeight:1.5 }} />
        <button onClick={post} style={{ background:"linear-gradient(135deg,#a0c4ff,#7eb0ff)", border:"none",
          borderRadius:16, padding:"0 18px", fontSize:20, cursor:"pointer", color:"white" }}>↑</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {posts.length===0 && <div style={{ textAlign:"center",color:"#ccc",marginTop:60,fontSize:14 }}><div style={{fontSize:40,marginBottom:8}}>🌸</div>まだ投稿がないよ！</div>}
        {posts.map(p=>(
          <div key={p.id} style={{ background:"white", borderRadius:16, padding:"12px 14px",
            boxShadow:"0 2px 10px rgba(140,160,255,0.15)", border:"2px solid rgba(200,220,255,0.5)", animation:"slideDown 0.3s ease" }}>
            <div style={{ fontSize:14, color:"#333", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{p.text}</div>
            <div style={{ marginTop:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#bbb" }}>{p.time}</span>
              <button onClick={()=>deletePost(p.id)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#ddd",padding:"2px 4px" }}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── ポモドーロ画面 ──────────────────────────────────
function PomodoroScreen({ onBack, onStop }) {
  const FOCUS=25*60, BREAK=5*60;
  const [phase,setPhase]=useState("focus");
  const [timeLeft,setTimeLeft]=useState(FOCUS);
  const [running,setRunning]=useState(false);
  useEffect(()=>{
    if(!running)return;
    const ref=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){const next=phase==="focus"?"break":"focus";setPhase(next);return next==="focus"?FOCUS:BREAK;}
        return t-1;
      });
    },1000);
    return()=>clearInterval(ref);
  },[running,phase]);
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const total=phase==="focus"?FOCUS:BREAK;
  const progress=((total-timeLeft)/total)*100;
  return (
    <div style={{ minHeight:"100vh", background:phase==="focus"?"linear-gradient(160deg,#e8f5e0 0%,#d0f0c0 100%)":"linear-gradient(160deg,#f5e8ff 0%,#e0d0ff 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Hiragino Maru Gothic Pro',sans-serif",gap:28,padding:24,transition:"background 1s ease" }}>
      <div style={{ fontSize:14,fontWeight:700,color:phase==="focus"?"#66aa44":"#9966cc",
        background:"rgba(255,255,255,0.7)",borderRadius:20,padding:"6px 18px",letterSpacing:2 }}>
        {phase==="focus"?"🌸 集中タイム":"🍵 休憩タイム"}
      </div>
      <div style={{ position:"relative",width:200,height:200 }}>
        <svg width="200" height="200" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="12"/>
          <circle cx="100" cy="100" r="88" fill="none" stroke={phase==="focus"?"#7ec870":"#b088e8"}
            strokeWidth="12" strokeDasharray={`${2*Math.PI*88}`}
            strokeDashoffset={`${2*Math.PI*88*(1-progress/100)}`} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 1s linear" }}/>
        </svg>
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ fontSize:48,fontWeight:800,color:"#333",fontVariantNumeric:"tabular-nums",letterSpacing:2 }}>{fmt(timeLeft)}</div>
        </div>
      </div>
      <div style={{ display:"flex",gap:12 }}>
        <button onClick={()=>setRunning(r=>!r)} style={{ background:running?"linear-gradient(135deg,#ffb3c8,#ff9eb5)":"linear-gradient(135deg,#a0d890,#7ec870)",
          border:"none",borderRadius:50,padding:"14px 36px",fontSize:16,fontWeight:700,color:"white",cursor:"pointer" }}>
          {running?"⏸ 一時停止":"▶ スタート"}
        </button>
        <button onClick={()=>{setRunning(false);setPhase("focus");setTimeLeft(FOCUS);}} style={{
          background:"rgba(255,255,255,0.7)",border:"2px solid rgba(200,200,200,0.5)",borderRadius:50,padding:"14px 20px",fontSize:16,cursor:"pointer",color:"#aaa" }}>↺</button>
      </div>
      <button onClick={()=>{onStop();onBack();}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#aaa",textDecoration:"underline" }}>🏠 ホームに戻る</button>
    </div>
  );
}

// ─── タイマー画面 ────────────────────────────────────
function TimerScreen({ mode, startTime, onStop, onBack }) {
  const [elapsed,setElapsed]=useState(()=>Math.floor((Date.now()-startTime)/1000));
  useEffect(()=>{
    const ref=setInterval(()=>setElapsed(Math.floor((Date.now()-startTime)/1000)),1000);
    return()=>clearInterval(ref);
  },[startTime]);
  const fmt=s=>{
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
    return h>0?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };
  return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${mode.color} 0%,white 100%)`,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Hiragino Maru Gothic Pro',sans-serif",gap:28,padding:24 }}>
      <div style={{ fontSize:72,filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.1))",animation:"pulse 2s ease-in-out infinite" }}>{mode.character}</div>
      <div style={{ background:"rgba(255,255,255,0.8)",borderRadius:24,padding:"24px 48px",textAlign:"center",
        boxShadow:"0 8px 32px rgba(0,0,0,0.08)",border:"2px solid rgba(255,255,255,0.9)" }}>
        <div style={{ fontSize:14,fontWeight:700,color:"#888",marginBottom:8,letterSpacing:1 }}>{mode.label}</div>
        <div style={{ fontSize:52,fontWeight:800,color:"#444",letterSpacing:2,fontVariantNumeric:"tabular-nums" }}>{fmt(elapsed)}</div>
      </div>
      <button onClick={()=>{onStop(elapsed);onBack();}} style={{ background:"linear-gradient(135deg,#ffb3c8,#ff9eb5)",
        border:"none",borderRadius:50,padding:"14px 36px",fontSize:16,fontWeight:700,color:"white",cursor:"pointer" }}>🏠 ホームに戻る</button>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`}</style>
    </div>
  );
}

// ─── メイン ──────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState(null);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [todayUsage, setTodayUsage] = useState(() => loadTodayUsage());
  const [history, setHistory] = useState(() => loadHistory());
  // ホーム画面の表示開始時刻
  const [homeStartTime, setHomeStartTime] = useState(() => Date.now());

  // 使用時間を記録して保存
  const addUsage = (id, seconds) => {
    if (seconds <= 0) return;
    setTodayUsage(prev => {
      const updated = { ...prev, [id]: (prev[id] || 0) + seconds };
      saveTodayUsage(updated);
      flushTodayToHistory(updated);
      return updated;
    });
    setHistory(loadHistory());
  };

  // 別画面に遷移するとき：ホーム滞在時間をインターバルとして記録
  const leaveHome = () => {
    const elapsed = Math.floor((Date.now() - homeStartTime) / 1000);
    addUsage("interval", elapsed);
  };

  const handleModeClick = (mode) => {
    leaveHome();
    if (mode.screen === "timer") setTimerStartTime(Date.now());
    setScreen({ type: mode.screen, data: mode });
  };

  // 各画面から戻ったときホームタイマーをリセット
  const backToHome = () => {
    setHomeStartTime(Date.now());
    setScreen(null);
  };

  if (screen?.type === "today")    return <TodayUsageScreen todayUsage={todayUsage} onBack={backToHome} />;
  if (screen?.type === "history")  return <HistoryUsageScreen history={history} onBack={backToHome} />;
  if (screen?.type === "sns") {
    const appStartTime = screen.startTime;
    return <MemoScreen app={screen.data} onBack={() => {
      const elapsed = Math.floor((Date.now() - appStartTime) / 1000);
      addUsage(screen.data.id, elapsed);
      backToHome();
    }} />;
  }
  if (screen?.type === "pomodoro") return <PomodoroScreen onBack={backToHome} onStop={() => {}} />;
  if (screen?.type === "timer")    return (
    <TimerScreen mode={screen.data} startTime={timerStartTime}
      onStop={(elapsed) => addUsage(screen.data.id, elapsed)}
      onBack={backToHome} />
  );

  return (
    <div style={{ minHeight:"100vh",
      background:"linear-gradient(160deg,#e8f0ff 0%,#f5e8ff 50%,#fff0f8 100%)",
      fontFamily:"'Hiragino Maru Gothic Pro','Rounded Mplus 1c',sans-serif",
      padding:"16px 12px 32px", maxWidth:400, margin:"0 auto" }}>

      {/* SNS・Firefoxボタン */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {APPS.map(app => (
          <div key={app.id} onClick={() => { leaveHome(); setScreen({ type:"sns", data:app, startTime: Date.now() }); }} style={{
            background:app.color, borderRadius:16, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            height:68, fontSize:13, fontWeight:700,
            color:app.textColor||"#333", cursor:"pointer",
            boxShadow:"0 2px 10px rgba(0,0,0,0.12)", gap:4,
            border:"2px solid rgba(255,255,255,0.6)",
          }}>
            <span style={{ fontSize:24 }}>{app.emoji}</span>
            <span>{app.label}</span>
          </div>
        ))}
      </div>

      {/* 使用量カード（タップで遷移） */}
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <UsageCard type="history" todayUsage={todayUsage} history={history} onClick={() => { leaveHome(); setScreen({ type:"history" }); }} />
        <UsageCard type="today"   todayUsage={todayUsage} history={history} onClick={() => { leaveHome(); setScreen({ type:"today" }); }} />
      </div>

      {/* モードボタン */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
        {MODES.map(mode => (
          <div key={mode.id} onClick={() => handleModeClick(mode)} style={{
            background:`linear-gradient(135deg,${mode.color} 60%,white)`,
            borderRadius:18, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            padding:"14px 4px", cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
            border:"2px solid rgba(255,255,255,0.8)",
            transition:"all 0.2s ease", gap:6,
          }}>
            <span style={{ fontSize:28 }}>{mode.character}</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#555" }}>{mode.label}</span>
          </div>
        ))}
      </div>

      {/* 空き地 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{
            borderRadius:16,
            border:`2px dashed ${["#b0d4a0","#a0c4f0","#f0d0a0","#d0b0f0"][i]}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            height:80, fontSize:13, color:"#bbb", cursor:"pointer",
            background:"rgba(255,255,255,0.5)",
          }}>空き地</div>
        ))}
      </div>
    </div>
  );
}
