// ─── 定数 ───────────────────────────────────────────
window.APPS = [
  { id: "sns",     label: "SNS",     emoji: "💬", color: "linear-gradient(135deg, #222 40%, #4caf50)", textColor: "white" },
  { id: "firefox", label: "Firefox", emoji: "🦊", color: "#f4956a" },
];
window.MODES = [
  { id: "study",   label: "勉強",       color: "#b5e8a0", character: "🌸", screen: "pomodoro" },
  { id: "chill",   label: "チルタイム", color: "#f0d6f5", character: "🍃", screen: "timer" },
  { id: "commute", label: "移動中",     color: "#fff3b0", character: "🚕", screen: "timer" },
  { id: "sleep",   label: "睡眠",       color: "#d9d6f5", character: "😴", screen: "timer" },
];
window.TRACK_ITEMS = [
  { id: "sns",      label: "SNS",         color: "#5abf7a" },
  { id: "firefox",  label: "Firefox",     color: "#f4956a" },
  { id: "study",    label: "勉強",        color: "#7ec870" },
  { id: "chill",    label: "チルタイム",  color: "#c88ae0" },
  { id: "commute",  label: "移動中",      color: "#f5d060" },
  { id: "sleep",    label: "睡眠",        color: "#9090d8" },
  { id: "interval", label: "インターバル", color: "#b0c8e8" },
];
window.EMOTIONS = [
  { id: "body_tired",  label: "体の疲労",  emoji: "😮‍💨", color: "#f5a0a0" },
  { id: "head_tired",  label: "頭の疲労",  emoji: "🤯",   color: "#f5c0a0" },
  { id: "sad",         label: "悲しい",    emoji: "😢",   color: "#a0c0f5" },
  { id: "irritated",   label: "イライラ",  emoji: "😤",   color: "#f5a0c0" },
  { id: "happy",       label: "楽しい",    emoji: "😄",   color: "#a0f5b0" },
  { id: "glad",        label: "嬉しい",    emoji: "🥰",   color: "#f5e0a0" },
  { id: "inspired",    label: "ひらめき",  emoji: "💡",   color: "#e0d060" },
  { id: "approval",    label: "承認欲求",  emoji: "🫣",   color: "#d0b0f5" },
  { id: "future_anxiety", label: "将来への不安", emoji: "😰", color: "#a0b8d8" },
  { id: "low_engine",  label: "エンジン不調", emoji: "🫠", color: "#c8b8a0" },
  { id: "mendokusai",  label: "めんどくさい", emoji: "😑", color: "#b0b0b0" },
  { id: "motivated",   label: "やる気！",     emoji: "🔥", color: "#f5a040" },
];
window.COOLDOWN_MS = 5 * 60 * 1000;
window.STORAGE_KEYS = { sns: "memo_posts_sns", firefox: "memo_posts_firefox" };
window.USAGE_TODAY_KEY = "usage_today";
window.USAGE_HISTORY_KEY = "usage_history";
window.EMOTION_POSTS_KEY = "emotion_posts";

// ─── ユーティリティ ───────────────────────────────────
window.todayStr = () => new Date().toLocaleDateString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" }).replace(/\//g, "-");

window.loadTodayUsage = function() {
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_TODAY_KEY) || "{}");
    if (raw.date !== todayStr()) return { date: todayStr(), sns:0, firefox:0, study:0, chill:0, commute:0, sleep:0, interval:0 };
    return raw;
  } catch(e) { return { date: todayStr(), sns:0, firefox:0, study:0, chill:0, commute:0, sleep:0, interval:0 }; }
};
window.saveTodayUsage = function(data) {
  localStorage.setItem(USAGE_TODAY_KEY, JSON.stringify({ ...data, date: todayStr() }));
};
window.loadHistory = function() {
  try { return JSON.parse(localStorage.getItem(USAGE_HISTORY_KEY) || "[]"); }
  catch(e) { return []; }
};
window.saveHistory = function(arr) {
  localStorage.setItem(USAGE_HISTORY_KEY, JSON.stringify(arr));
};
window.flushTodayToHistory = function(todayData) {
  const hist = loadHistory();
  const idx = hist.findIndex(d => d.date === todayData.date);
  if (idx >= 0) hist[idx] = todayData; else hist.push(todayData);
  saveHistory(hist);
};
window.loadEmotionPosts = function() {
  try { return JSON.parse(localStorage.getItem(EMOTION_POSTS_KEY) || "[]"); }
  catch(e) { return []; }
};
window.saveEmotionPosts = function(arr) {
  localStorage.setItem(EMOTION_POSTS_KEY, JSON.stringify(arr));
};

window.fmtSec = function(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h${String(m).padStart(2,"0")}m`;
  if (m > 0) return `${m}m${String(sec).padStart(2,"0")}s`;
  return `${sec}s`;
};
window.fmtTime = function(ts) {
  return new Date(ts).toLocaleTimeString("ja-JP", { hour:"2-digit", minute:"2-digit" });
};
window.fmtElapsed = function(sec) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}分${s}秒目` : `${s}秒目`;
};

// ─── Wake Lock ヘルパー ─────────────────────────────
window.acquireWakeLock = async function() {
  try {
    if ('wakeLock' in navigator) {
      return await navigator.wakeLock.request('screen');
    }
  } catch (e) {
    console.log('Wake Lock not acquired:', e.message);
  }
  return null;
};
window.releaseWakeLock = async function(lockRef) {
  try {
    if (lockRef) await lockRef.release();
  } catch (e) {
    console.log('Wake Lock release failed:', e.message);
  }
};
window.useWakeLock = function(active) {
  const lockRef = React.useRef(null);
  React.useEffect(() => {
    if (active) {
      acquireWakeLock().then(lock => { lockRef.current = lock; });
      const handleVisibility = async () => {
        if (active && document.visibilityState === 'visible') {
          lockRef.current = await acquireWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        releaseWakeLock(lockRef.current);
        lockRef.current = null;
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    } else {
      releaseWakeLock(lockRef.current);
      lockRef.current = null;
    }
  }, [active]);
};
