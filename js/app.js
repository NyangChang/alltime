// ─── メイン ──────────────────────────────────────────
function App() {
  const [screen, setScreen] = React.useState(null);
  const [timerStartTime, setTimerStartTime] = React.useState(null);
  const [todayUsage, setTodayUsage] = React.useState(() => loadTodayUsage());
  const [history, setHistory] = React.useState(() => loadHistory());
  const [homeStartTime, setHomeStartTime] = React.useState(() => Date.now());
  const [emotionModal, setEmotionModal] = React.useState(false);
  const [activeMode, setActiveMode] = React.useState(null);
  const [activeModeStart, setActiveModeStart] = React.useState(null);

  const addUsage = React.useCallback((id, seconds) => {
    if (seconds <= 0) return;
    setTodayUsage(prev => {
      const updated = { ...prev, [id]: (prev[id] || 0) + seconds };
      saveTodayUsage(updated);
      flushTodayToHistory(updated);
      // flushの直後にhistoryを読み込むことでレースコンディションを回避
      setHistory(loadHistory());
      return updated;
    });
  }, []);

  const leaveHome = () => {
    const elapsed = Math.floor((Date.now() - homeStartTime) / 1000);
    addUsage("interval", elapsed);
  };

  const handleModeClick = (mode) => {
    leaveHome();
    const now = Date.now();
    if (mode.screen === "timer") setTimerStartTime(now);
    setActiveMode(mode);
    setActiveModeStart(now);
    setScreen({ type: mode.screen, data: mode });
  };

  const backToHome = () => {
    setHomeStartTime(Date.now());
    setActiveMode(null);
    setActiveModeStart(null);
    setScreen(null);
  };

  const openEmotion = () => setEmotionModal(true);
  const closeEmotion = () => setEmotionModal(false);

  const emotionOverlay = emotionModal ? <EmotionModal currentMode={activeMode} modeStartTime={activeModeStart} onClose={closeEmotion} /> : null;

  // 各画面のルーティング
  if (screen?.type === "today") return (
    <React.Fragment>
      <TodayUsageScreen todayUsage={todayUsage} onBack={backToHome} />
      <FloatingPostButton onClick={openEmotion} />
      {emotionOverlay}
    </React.Fragment>
  );
  if (screen?.type === "history") return (
    <React.Fragment>
      <HistoryUsageScreen history={history} onBack={backToHome} />
      <FloatingPostButton onClick={openEmotion} />
      {emotionOverlay}
    </React.Fragment>
  );
  if (screen?.type === "emotion") return <EmotionSNSScreen onBack={backToHome} />;
  if (screen?.type === "sns") {
    const appStartTime = screen.startTime;
    return (
      <React.Fragment>
        <MemoScreen app={screen.data} onBack={() => { const elapsed = Math.floor((Date.now() - appStartTime) / 1000); addUsage(screen.data.id, elapsed); backToHome(); }} onOpenEmotion={openEmotion} />
        {emotionOverlay}
      </React.Fragment>
    );
  }
  if (screen?.type === "pomodoro") return (
    <React.Fragment>
      <PomodoroScreen onBack={backToHome} onStop={() => {}} addUsage={addUsage} onOpenEmotion={openEmotion} />
      {emotionOverlay}
    </React.Fragment>
  );
  if (screen?.type === "timer") return (
    <React.Fragment>
      <TimerScreen mode={screen.data} startTime={timerStartTime} onStop={(e) => addUsage(screen.data.id, e)} onBack={backToHome} onOpenEmotion={openEmotion} />
      {emotionOverlay}
    </React.Fragment>
  );

  // ─── ホーム画面 ──────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#e8f0ff 0%,#f5e8ff 50%,#fff0f8 100%)", fontFamily:"'Hiragino Maru Gothic Pro','Rounded Mplus 1c',sans-serif", padding:"16px 12px 32px", maxWidth:400, margin:"0 auto" }}>
      {/* SNS・Firefoxボタン */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
        {APPS.map(app => (
          <div key={app.id} onClick={() => { leaveHome(); setScreen({ type:"sns", data:app, startTime: Date.now() }); }} style={{
            background:app.color, borderRadius:16, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", height:68, fontSize:13, fontWeight:700,
            color:app.textColor||"#333", cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,0.12)", gap:4,
            border:"2px solid rgba(255,255,255,0.6)",
          }}>
            <span style={{ fontSize:24 }}>{app.emoji}</span>
            <span>{app.label}</span>
          </div>
        ))}
      </div>

      {/* 使用量カード */}
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <UsageCard type="history" todayUsage={todayUsage} history={history} onClick={() => { leaveHome(); setScreen({ type:"history" }); }} />
        <UsageCard type="today"   todayUsage={todayUsage} history={history} onClick={() => { leaveHome(); setScreen({ type:"today" }); }} />
      </div>

      {/* モードボタン */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
        {MODES.map(mode => (
          <div key={mode.id} onClick={() => handleModeClick(mode)} style={{
            background:`linear-gradient(135deg,${mode.color} 60%,white)`, borderRadius:18,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"14px 4px", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
            border:"2px solid rgba(255,255,255,0.8)", transition:"all 0.2s ease", gap:6,
          }}>
            <span style={{ fontSize:28 }}>{mode.character}</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#555" }}>{mode.label}</span>
          </div>
        ))}
      </div>

      {/* きもち記録タブボタン */}
      <div style={{ marginBottom:12 }}>
        <div onClick={() => { leaveHome(); setScreen({ type:"emotion" }); }} style={{
          background:"linear-gradient(135deg,#f8f0ff,#ffe0f5)",
          borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center",
          height:52, fontSize:14, fontWeight:700, color:"#7755cc",
          cursor:"pointer", boxShadow:"0 2px 10px rgba(180,140,255,0.2)",
          border:"2px solid rgba(200,160,255,0.4)", gap:8,
        }}>
          <span style={{ fontSize:20 }}>💭</span>
          きもち記録
        </div>
      </div>

      {/* 空き地 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            borderRadius:16, border:`2px dashed ${["#b0d4a0","#a0c4f0","#f0d0a0","#d0b0f0"][i]}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            height:80, fontSize:13, color:"#bbb", cursor:"pointer", background:"rgba(255,255,255,0.5)",
          }}>空き地</div>
        ))}
      </div>

      {/* ホーム画面の投稿ボタン */}
      <FloatingPostButton onClick={openEmotion} />
      {emotionOverlay}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
