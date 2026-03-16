// ─── ADHDポモドーロ画面（APOMO） ──────────────────────
window.PomodoroScreen = function PomodoroScreen({ onBack, onStop, addUsage, onOpenEmotion }) {
  const containerRef = React.useRef(null);
  const cleanupRef = React.useRef(null);
  const workTotalRef = React.useRef(0);
  const workTotalAtStartRef = React.useRef(0);
  const [wakeLockActive, setWakeLockActive] = React.useState(false);

  useWakeLock(wakeLockActive);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // ── APOMO ロジック（vanilla JS） ──
    const IDLING_SEC = 60;
    const CIRCUMFERENCE = 2 * Math.PI * 112;

    let phase = 'standby';
    let elapsed = 0;
    let workTotal = 0;
    let isPaused = false;
    let tickInterval = null;
    let phaseStartTime = null;
    let pausedAccum = 0;
    let pauseStartTime = null;

    let shindoiCount = 0;
    let explosionCount = 0;
    const SHINDOI_MAX = 100;
    const SHINDOI_SHAKE = 100;
    const SHINDOI_EXPLODE = 131;
    const SHINDOI_KEY = 'adhd-shindoi';

    // DOM refs
    const timerDisplay = root.querySelector('#apomoTimerDisplay');
    const timerStatus = root.querySelector('#apomoTimerStatus');
    const progressCircle = root.querySelector('#apomoProgressCircle');
    const pulseCircle = root.querySelector('#apomoPulseCircle');
    const btnMain = root.querySelector('#apomoBtnMain');
    const btnReset = root.querySelector('#apomoBtnReset');
    const btnSkip = root.querySelector('#apomoBtnSkip');
    const descText = root.querySelector('#apomoDescText');
    const iconDeco = root.querySelector('#apomoIconDeco');
    const choicePanel = root.querySelector('#apomoChoicePanel');
    const btnContinue = root.querySelector('#apomoBtnContinue');
    const btnRest = root.querySelector('#apomoBtnRest');
    const sessionStats = root.querySelector('#apomoSessionStats');
    const totalWorkDisplay = root.querySelector('#apomoTotalWorkDisplay');
    const btnShindoi = root.querySelector('#apomoBtnShindoi');
    const shindoiGaugeWrap = root.querySelector('#apomoShindoiGaugeWrap');
    const shindoiGaugeFill = root.querySelector('#apomoShindoiGaugeFill');
    const shindoiCountText = root.querySelector('#apomoShindoiCountText');
    const shindoiExplosionBadge = root.querySelector('#apomoShindoiExplosionBadge');
    const shindoiExplosionCountEl = root.querySelector('#apomoShindoiExplosionCount');

    function pad(n) { return String(n).padStart(2, '0'); }
    function formatTime(secs) { return `${pad(Math.floor(secs/60))}:${pad(secs%60)}`; }
    function setProgress(ratio, color) {
      const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, ratio)));
      progressCircle.style.strokeDashoffset = offset;
      progressCircle.style.stroke = color;
    }
    function clearTick() { if (tickInterval) { clearInterval(tickInterval); tickInterval = null; } }
    function getSmoothedElapsed() {
      if (phaseStartTime === null) return elapsed;
      const now = performance.now();
      const paused = pausedAccum + (isPaused && pauseStartTime !== null ? now - pauseStartTime : 0);
      return (now - phaseStartTime - paused) / 1000;
    }
    function markPhaseStart() { phaseStartTime = performance.now(); pausedAccum = 0; pauseStartTime = null; }

    function setStatus(text, cls) {
      timerStatus.textContent = text;
      timerStatus.className = 'timer-status ' + cls;
    }

    // Persistence
    const STATE_KEY = 'adhd-timer-state';
    const HISTORY_KEY = 'adhd-history';

    function saveApomoHistory() {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
      hist[todayStr()] = workTotal;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
    }
    function saveState() {
      localStorage.setItem(STATE_KEY, JSON.stringify({ phase, elapsed, workTotal, isPaused, savedAt: Date.now(), savedDate: todayStr() }));
    }
    function loadState() {
      const today = todayStr();
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
      let s;
      try { s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch(e) { s = null; }
      if (!s || s.savedDate !== today) { workTotal = hist[today] || 0; return; }
      workTotal = s.workTotal;
      isPaused = s.isPaused;
      phase = s.phase;
      const passedSec = Math.floor((Date.now() - s.savedAt) / 1000);
      if (s.phase === 'idling' && !s.isPaused) {
        const newElapsed = s.elapsed + passedSec;
        if (newElapsed >= IDLING_SEC) { workTotal += (IDLING_SEC - s.elapsed); phase = 'choice'; elapsed = IDLING_SEC; }
        else { elapsed = newElapsed; workTotal += passedSec; }
      } else if (s.phase === 'working' && !s.isPaused) { elapsed = s.elapsed + passedSec; workTotal += passedSec; }
      else if (s.phase === 'break' && !s.isPaused) { elapsed = s.elapsed + passedSec; }
      else { elapsed = s.elapsed; }
      saveApomoHistory();
    }

    // Shindoi
    function saveShindoi() {
      const data = JSON.parse(localStorage.getItem(SHINDOI_KEY) || '{}');
      data[todayStr()] = { taps: shindoiCount, explosions: explosionCount };
      localStorage.setItem(SHINDOI_KEY, JSON.stringify(data));
    }
    function loadShindoi() {
      const data = JSON.parse(localStorage.getItem(SHINDOI_KEY) || '{}');
      const today = data[todayStr()];
      if (today) { shindoiCount = today.taps || 0; explosionCount = today.explosions || 0; }
    }
    function lerpColor(c1, c2, t) {
      const [r1,g1,b1] = [parseInt(c1.slice(1,3),16), parseInt(c1.slice(3,5),16), parseInt(c1.slice(5,7),16)];
      const [r2,g2,b2] = [parseInt(c2.slice(1,3),16), parseInt(c2.slice(3,5),16), parseInt(c2.slice(5,7),16)];
      return `rgb(${Math.round(r1+(r2-r1)*t)},${Math.round(g1+(g2-g1)*t)},${Math.round(b1+(b2-b1)*t)})`;
    }
    function getGaugeColor(count) {
      const r = Math.min(count / SHINDOI_MAX, 1);
      if (r <= 0.25) return lerpColor('#4EA8DE', '#4CD964', r / 0.25);
      if (r <= 0.50) return lerpColor('#4CD964', '#FFCC00', (r - 0.25) / 0.25);
      if (r <= 0.75) return lerpColor('#FFCC00', '#FF7A00', (r - 0.50) / 0.25);
      return lerpColor('#FF7A00', '#FF3B30', (r - 0.75) / 0.25);
    }
    function updateShindoiUI() {
      const display = Math.min(shindoiCount, SHINDOI_MAX);
      const pct = (display / SHINDOI_MAX) * 100;
      shindoiGaugeFill.style.width = pct + '%';
      shindoiGaugeFill.style.background = getGaugeColor(shindoiCount);
      shindoiCountText.textContent = shindoiCount > 0 ? `${display} / ${SHINDOI_MAX}` : '';
      if (shindoiCount > 0) {
        const color = getGaugeColor(shindoiCount);
        const alpha = Math.min(shindoiCount / SHINDOI_MAX, 1) * 0.18;
        btnShindoi.style.background = color.replace('rgb(', 'rgba(').replace(')', `,${alpha.toFixed(2)})`);
      } else { btnShindoi.style.background = 'transparent'; }
      const ratio = pct / 100;
      const emoji = ratio < 0.25 ? '😣' : ratio < 0.5 ? '😰' : ratio < 0.75 ? '😤' : ratio < 1 ? '🤯' : '💥';
      btnShindoi.querySelector('.shindoi-emoji').textContent = emoji;
      const isShaking = shindoiCount > SHINDOI_SHAKE && shindoiCount < SHINDOI_EXPLODE;
      shindoiGaugeWrap.classList.toggle('shaking', isShaking);
      shindoiGaugeWrap.classList.remove('exploding');
      if (explosionCount > 0) { shindoiExplosionBadge.style.display = 'inline'; shindoiExplosionCountEl.textContent = explosionCount; }
    }
    function triggerConfetti() {
      const colors = ['#FF3B30','#FF7A00','#FFCC00','#4CD964','#4EA8DE','#AF52DE','#FF2D55','#FF6B9D'];
      for (let i = 0; i < 100; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        const size = (6 + Math.random() * 9).toFixed(1);
        el.style.cssText = `left:${(Math.random()*100).toFixed(1)}vw;animation-delay:${(Math.random()*0.8).toFixed(2)}s;animation-duration:${(2.5+Math.random()*2).toFixed(2)}s;background:${colors[Math.floor(Math.random()*colors.length)]};width:${size}px;height:${size}px;transform:rotate(${Math.floor(Math.random()*360)}deg);border-radius:${Math.random()>0.5?'50%':'3px'}`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }
    }
    function triggerExplosion() {
      shindoiGaugeFill.style.transition = 'none';
      shindoiGaugeFill.style.width = '100%';
      shindoiGaugeFill.style.background = '#FF3B30';
      btnShindoi.style.background = 'rgba(255,59,48,0.3)';
      btnShindoi.querySelector('.shindoi-emoji').textContent = '💥';
      shindoiGaugeWrap.classList.remove('shaking');
      void shindoiGaugeWrap.offsetWidth;
      shindoiGaugeWrap.classList.add('exploding');
      triggerConfetti();
      setTimeout(() => { shindoiGaugeFill.style.transition = 'width 0.4s ease, background 0.3s ease'; updateShindoiUI(); }, 550);
    }
    function shindoiTap() {
      shindoiCount++;
      if (shindoiCount >= SHINDOI_EXPLODE) { explosionCount++; shindoiCount = 0; saveShindoi(); triggerExplosion(); return; }
      updateShindoiUI();
      saveShindoi();
    }

    // Sound
    function playCoinSound() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      [[988, 0, 0.08], [1319, 0.08, 0.28]].forEach(([freq, start, end]) => {
        const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq;
        osc.connect(gain); osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + end);
      });
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      setTimeout(() => ctx.close(), 500);
    }

    // Phase transitions
    function startIdling() {
      clearTick(); phase = 'idling'; elapsed = 0; isPaused = false; markPhaseStart();
      saveState(); tickInterval = setInterval(tick, 1000); setWakeLockActive(true); render();
    }
    function startWorking() {
      clearTick(); phase = 'working'; elapsed = 0; isPaused = false; markPhaseStart();
      saveState(); tickInterval = setInterval(tick, 1000); setWakeLockActive(true); render();
    }
    function startBreak() {
      clearTick(); phase = 'break'; elapsed = 0; isPaused = false; markPhaseStart();
      saveState(); tickInterval = setInterval(tick, 1000); setWakeLockActive(true); render();
    }
    function showChoice() { clearTick(); phase = 'choice'; isPaused = false; saveState(); playCoinSound(); render(); }
    function reset() {
      clearTick(); phase = 'standby'; elapsed = 0; workTotal = 0; isPaused = false;
      phaseStartTime = null; pausedAccum = 0; pauseStartTime = null;
      workTotalRef.current = 0; workTotalAtStartRef.current = 0;
      setWakeLockActive(false); saveState(); saveApomoHistory(); render();
      sessionStats.style.display = 'none';
    }

    let lastSaveAt = 0;
    function saveIfNeeded(force) {
      const now = Date.now();
      if (force || now - lastSaveAt >= 30000) {
        saveApomoHistory(); saveState(); lastSaveAt = now;
      }
    }

    function tick() {
      if (isPaused) return;
      elapsed++;
      if (phase === 'idling') { workTotal++; if (elapsed >= IDLING_SEC) { saveApomoHistory(); saveState(); showChoice(); return; } }
      else if (phase === 'working') { workTotal++; }
      saveIfNeeded(false);
      workTotalRef.current = workTotal;
      render();
    }

    function render() {
      choicePanel.classList.remove('visible');
      pulseCircle.classList.toggle('active', phase === 'standby');
      switch (phase) {
        case 'standby':
          timerDisplay.textContent = '00:00'; setProgress(0, '#FF7A00'); setStatus('待機中...', 'status-standby');
          btnMain.innerHTML = '▶'; btnMain.classList.remove('break-mode');
          btnReset.disabled = true; btnSkip.disabled = true;
          descText.innerHTML = 'お帰りなさい！今日も頑張りましょう';
          iconDeco.textContent = '🧑‍💻'; break;
        case 'idling':
          timerDisplay.textContent = formatTime(workTotal); setProgress(elapsed / IDLING_SEC, '#FF7A00');
          setStatus('アイドリング中...', 'status-idling');
          btnMain.innerHTML = isPaused ? '▶' : '⏸'; btnMain.classList.remove('break-mode');
          btnReset.disabled = false; btnSkip.disabled = true;
          descText.innerHTML = 'まずは1分間頑張ってみましょう！<br>1分後に休憩か続行か選べます';
          iconDeco.textContent = '🧑‍💻'; break;
        case 'choice':
          timerDisplay.textContent = formatTime(workTotal); setProgress(1, '#FF7A00');
          setStatus('アイドリング中...', 'status-choice');
          btnMain.innerHTML = '▶'; btnMain.classList.remove('break-mode');
          btnReset.disabled = false; btnSkip.disabled = true;
          descText.innerHTML = 'アイドリング作業が終了しました。<br>このまま作業を継続するか一度休憩するかを選んでください。';
          iconDeco.textContent = ''; choicePanel.classList.add('visible'); break;
        case 'working':
          timerDisplay.textContent = formatTime(workTotal); setProgress(1, '#FF7A00');
          setStatus('作業中', 'status-working');
          btnMain.innerHTML = isPaused ? '▶' : '⏸'; btnMain.classList.remove('break-mode');
          btnReset.disabled = false; btnSkip.disabled = false;
          descText.innerHTML = 'その調子！疲れたらスキップボタンで休憩しましょう！';
          iconDeco.textContent = '🧑‍💻'; break;
        case 'break':
          timerDisplay.textContent = formatTime(elapsed); setProgress(1, '#4EA8DE');
          setStatus('休憩中', 'status-break');
          btnMain.innerHTML = isPaused ? '▶' : '⏸'; btnMain.classList.add('break-mode');
          btnReset.disabled = false; btnSkip.disabled = false;
          descText.innerHTML = 'ゆっくり休憩しましょう。休憩できたら、スキップボタンでアイドリングへ';
          iconDeco.textContent = '☕'; break;
      }
      if (workTotal > 0) {
        sessionStats.style.display = 'block';
        const mins = Math.floor(workTotal / 60); const secs = workTotal % 60;
        totalWorkDisplay.textContent = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
      }
    }

    // Event listeners
    const onBtnMain = () => {
      if (phase === 'standby') { startIdling(); return; }
      if (phase === 'choice') { startWorking(); return; }
      isPaused = !isPaused;
      if (isPaused) { pauseStartTime = performance.now(); setWakeLockActive(false); }
      else { if (pauseStartTime !== null) { pausedAccum += performance.now() - pauseStartTime; pauseStartTime = null; } clearTick(); tickInterval = setInterval(tick, 1000); setWakeLockActive(true); }
      saveState(); render();
    };
    const onBtnSkip = () => { if (phase === 'working') startBreak(); else if (phase === 'break') startIdling(); };
    const onBtnReset = () => { reset(); };
    const onBtnContinue = () => { startWorking(); };
    const onBtnRest = () => { startBreak(); };
    const onShindoiTap = () => { shindoiTap(); };

    btnMain.addEventListener('click', onBtnMain);
    btnSkip.addEventListener('click', onBtnSkip);
    btnReset.addEventListener('click', onBtnReset);
    btnContinue.addEventListener('click', onBtnContinue);
    btnRest.addEventListener('click', onBtnRest);
    btnShindoi.addEventListener('click', onShindoiTap);

    // Animation loop
    let rafId;
    function animationLoop() {
      if (phase === 'idling' && phaseStartTime !== null) {
        const smooth = getSmoothedElapsed();
        const offset = CIRCUMFERENCE * (1 - Math.min(1, smooth / IDLING_SEC));
        progressCircle.style.strokeDashoffset = offset;
      }
      rafId = requestAnimationFrame(animationLoop);
    }
    rafId = requestAnimationFrame(animationLoop);

    // Visibility handler
    const onVisibility = () => { if (document.visibilityState === 'hidden') { saveApomoHistory(); saveState(); } };
    window.addEventListener('visibilitychange', onVisibility);

    // Init
    loadState();
    workTotalAtStartRef.current = workTotal;
    loadShindoi();
    updateShindoiUI();

    if (phase === 'idling' && !isPaused) { markPhaseStart(); phaseStartTime -= elapsed * 1000; tickInterval = setInterval(tick, 1000); setWakeLockActive(true); }
    else if (phase === 'working' && !isPaused) { markPhaseStart(); phaseStartTime -= elapsed * 1000; tickInterval = setInterval(tick, 1000); setWakeLockActive(true); }
    else if (phase === 'break' && !isPaused) { markPhaseStart(); phaseStartTime -= elapsed * 1000; tickInterval = setInterval(tick, 1000); setWakeLockActive(true); }

    render();

    // Cleanup（二重実行防止フラグ付き）
    let cleanedUp = false;
    cleanupRef.current = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearTick();
      cancelAnimationFrame(rafId);
      window.removeEventListener('visibilitychange', onVisibility);
      btnMain.removeEventListener('click', onBtnMain);
      btnSkip.removeEventListener('click', onBtnSkip);
      btnReset.removeEventListener('click', onBtnReset);
      btnContinue.removeEventListener('click', onBtnContinue);
      btnRest.removeEventListener('click', onBtnRest);
      btnShindoi.removeEventListener('click', onShindoiTap);
      saveState();
    };

    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const handleGoHome = () => {
    if (cleanupRef.current) cleanupRef.current();
    const delta = workTotalRef.current - workTotalAtStartRef.current;
    if (addUsage && delta > 0) {
      addUsage("study", delta);
    }
    setWakeLockActive(false);
    onStop();
    onBack();
  };

  return (
    <div className="apomo-root" ref={containerRef}>
      <header className="app-header">
        <div className="app-title">ADHDポモドーロ</div>
      </header>

      <div className="shindoi-section">
        <div className="shindoi-gauge-wrap" id="apomoShindoiGaugeWrap">
          <div className="shindoi-gauge-bg">
            <div className="shindoi-gauge-fill" id="apomoShindoiGaugeFill"></div>
          </div>
          <div className="shindoi-meta">
            <span className="shindoi-count-text" id="apomoShindoiCountText"></span>
            <span className="shindoi-explosion-badge" id="apomoShindoiExplosionBadge" style={{display:'none'}}>💥 <span id="apomoShindoiExplosionCount">0</span>回</span>
          </div>
        </div>
      </div>

      <div className="timer-header">
        <div className="timer-display" id="apomoTimerDisplay">00:00</div>
        <div className="timer-status status-standby" id="apomoTimerStatus">待機中...</div>
      </div>

      <div className="timer-wrapper">
        <svg className="timer-svg" viewBox="0 0 260 260">
          <circle className="timer-bg-circle" cx="130" cy="130" r="112"/>
          <circle className="pulse-circle" id="apomoPulseCircle" cx="130" cy="130" r="112"/>
          <circle className="timer-progress-circle" id="apomoProgressCircle"
            cx="130" cy="130" r="112" stroke="#FF7A00"
            strokeDasharray="703.7" strokeDashoffset="703.7"/>
        </svg>
        <div className="timer-center" id="apomoBtnShindoi">
          <span className="shindoi-emoji">😣</span>
          <span className="shindoi-label">しんどい</span>
        </div>
      </div>

      <div className="controls">
        <button className="btn-icon" id="apomoBtnReset" title="リセット" disabled>↺</button>
        <button className="btn-main" id="apomoBtnMain" title="スタート">▶</button>
        <button className="btn-icon" id="apomoBtnSkip" title="スキップ" disabled>›</button>
      </div>

      <div className="description-area">
        <p className="description-text" id="apomoDescText">
          今日も一日頑張りましょう！
        </p>
        <div className="icon-decoration" id="apomoIconDeco">🧑‍💻</div>
      </div>

      <div className="choice-panel" id="apomoChoicePanel">
        <button className="btn-choice continue" id="apomoBtnContinue">
          <span className="choice-icon">🧑‍💻</span>
          <span className="choice-label">続行</span>
          <span className="choice-desc">このまま作業を継続します</span>
        </button>
        <button className="btn-choice rest" id="apomoBtnRest">
          <span className="choice-icon">☕</span>
          <span className="choice-label">休憩</span>
          <span className="choice-desc">好きなだけ休憩してから再度アイドリング作業を実施します</span>
        </button>
      </div>

      <div className="session-stats" id="apomoSessionStats" style={{display:'none'}}>
        本日の作業時間: <span id="apomoTotalWorkDisplay">0分</span>
      </div>

      <button className="btn-back-home" onClick={handleGoHome}>🏠 ホームに戻る</button>
      <FloatingPostButton onClick={onOpenEmotion} />
    </div>
  );
};
