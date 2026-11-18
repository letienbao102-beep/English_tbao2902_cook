/* ==========================================================================
   LEARNING ENGLISH BY TBAO2902 — STUDY TIMER & BADGE ENGINE (timer.js)
   Features:
   - Per-level study time tracking (A1, A2, B1, B2, C1, C2)
   - SVG Progress Ring animation (15-20 min daily session target)
   - Streak & Diligence Point system (+1 point per 15-20 min daily study)
   - 5 Official Badges:
     + 3 pts:   "Chăm chỉ"
     + 10 pts:  "Chú ong chăm chỉ"
     + 30 pts:  "Supper chăm chỉ"
     + 100 pts: "Ác quỷ"
     + 200 pts: "Bé cưng của English"
   ========================================================================== */
const StudyTimerModule = (() => {
  const STORAGE_KEY = 'tbao2902_timer_state_v1';
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const BADGE_DEFINITIONS = [
    {
      id: 'cham_chi',
      pointsRequired: 3,
      title: 'Chăm chỉ',
      icon: '🌱',
      subtitle: 'Mốc 3 điểm tích lũy',
      desc: 'Khởi đầu bền bỉ! Hoàn thành 3 phiên học tiêu chuẩn (15-20 phút/ngày).'
    },
    {
      id: 'chu_ong_cham_chi',
      pointsRequired: 10,
      title: 'Chú ong chăm chỉ',
      icon: '🐝',
      subtitle: 'Mốc 10 điểm tích lũy',
      desc: 'Cần mẫn tích lũy kiến thức IELTS mỗi ngày như chú ong thợ không ngừng nghỉ.'
    },
    {
      id: 'supper_cham_chi',
      pointsRequired: 30,
      title: 'Supper chăm chỉ',
      icon: '🔥',
      subtitle: 'Mốc 30 điểm tích lũy',
      desc: 'Kỷ luật thép 30 phiên học chuyên sâu — bứt phá vững chắc 4 kỹ năng quốc tế.'
    },
    {
      id: 'ac_quy',
      pointsRequired: 100,
      title: 'Ác quỷ',
      icon: '😈',
      subtitle: 'Mốc 100 điểm tích lũy',
      desc: 'Cỗ máy cày đề IELTS thực thụ! 100 điểm tích lũy không một thử thách nào cản bước.'
    },
    {
      id: 'be_cung_cua_english',
      pointsRequired: 200,
      title: 'Bé cưng của English',
      icon: '👑',
      subtitle: 'Mốc 200 điểm tích lũy',
      desc: 'Đỉnh cao danh vọng! Làm chủ hoàn toàn tiếng Anh học thuật từ A1 đến C2 Mastery.'
    }
  ];
  // Standard target hours (converted to minutes for progress bar reference)
  const LEVEL_TARGET_MINUTES = {
    A1: 3600, // 60h standard
    A2: 4200, // 70h standard
    B1: 4800, // 80h standard
    B2: 5400, // 90h standard
    C1: 6000, // 100h standard
    C2: 4800  // 80h mastery
  };
  let state = {
    activeLevel: 'A1',
    sessionTargetMinutes: 15, // 15 or 20 minutes per daily goal
    sessionElapsedSeconds: 0,
    isRunning: false,
    diligencePoints: 0,
    streakDays: 1,
    lastPointDate: null,
    dailyMinutesToday: 0,
    levelSeconds: {
      A1: 900,
      A2: 420,
      B1: 300,
      B2: 180,
      C1: 120,
      C2: 60
    },
    unlockedBadges: [],
    historyLog: []
  };
  let intervalId = null;
  let onUpdateCallback = null;
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {
          ...state,
          ...parsed,
          levelSeconds: { ...state.levelSeconds, ...(parsed.levelSeconds || {}) }
        };
      }
      syncUnlockedBadges(false);
      console.log('[tbao2902-Timer] Loaded timer state successfully.', state);
    } catch (err) {
      console.error('[tbao2902-Timer] Error loading timer state:', err);
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (window.CloudSyncAdapter && typeof window.CloudSyncAdapter.pushTimerState === 'function') {
        window.CloudSyncAdapter.pushTimerState(state);
      }
    } catch (err) {
      console.error('[tbao2902-Timer] Error saving timer state:', err);
    }
  }
  function syncUnlockedBadges(notifyNew = true) {
    try {
      const newlyUnlocked = [];
      BADGE_DEFINITIONS.forEach((badge) => {
        if (state.diligencePoints >= badge.pointsRequired && !state.unlockedBadges.includes(badge.id)) {
          state.unlockedBadges.push(badge.id);
          newlyUnlocked.push(badge);
        }
      });
      if (notifyNew && newlyUnlocked.length > 0 && typeof window.showAppToast === 'function') {
        newlyUnlocked.forEach((b) => {
          window.showAppToast(`🎉 Mở khóa huy hiệu mới: ${b.icon} "${b.title}" (${b.pointsRequired} điểm)!`);
        });
      }
    } catch (err) {
      console.error('[tbao2902-Timer] Error syncing badges:', err);
    }
  }
  function formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remSec = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(remSec)}`;
    }
    return `${pad(mins)}:${pad(remSec)}`;
  }
  function formatHumanHours(totalSeconds) {
    const mins = Math.floor((totalSeconds || 0) / 60);
    const hrs = (mins / 60).toFixed(1);
    return `${mins} phút (${hrs}h)`;
  }
  function setLevel(level) {
    if (LEVELS.includes(level)) {
      state.activeLevel = level;
      saveState();
      notifyUI();
    }
  }
  function setSessionTarget(minutes) {
    const valid = minutes === 20 ? 20 : 15;
    state.sessionTargetMinutes = valid;
    state.sessionElapsedSeconds = 0;
    saveState();
    notifyUI();
  }
  function startTimer() {
    if (state.isRunning) return;
    state.isRunning = true;
    intervalId = setInterval(() => {
      try {
        state.sessionElapsedSeconds += 1;
        const lvl = state.activeLevel || 'A1';
        state.levelSeconds[lvl] = (state.levelSeconds[lvl] || 0) + 1;
        const targetSeconds = state.sessionTargetMinutes * 60;
        if (state.sessionElapsedSeconds >= targetSeconds) {
          completeDailySession(state.sessionTargetMinutes);
        } else {
          if (state.sessionElapsedSeconds % 10 === 0) saveState();
          updateTimerDOMOnly();
        }
      } catch (err) {
        console.error('[tbao2902-Timer] Tick error:', err);
      }
    }, 1000);
    notifyUI();
  }
  function pauseTimer() {
    state.isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    saveState();
    notifyUI();
  }
  function resetSession() {
    pauseTimer();
    state.sessionElapsedSeconds = 0;
    saveState();
    notifyUI();
  }
  function completeDailySession(minutesCompleted) {
    try {
      pauseTimer();
      state.sessionElapsedSeconds = 0;
      state.diligencePoints += 1;
      state.dailyMinutesToday += minutesCompleted;
      const todayStr = new Date().toISOString().slice(0, 10);
      if (state.lastPointDate !== todayStr) {
        state.streakDays += 1;
        state.lastPointDate = todayStr;
      }
      state.historyLog.unshift({
        date: new Date().toLocaleString('vi-VN'),
        level: state.activeLevel,
        minutes: minutesCompleted,
        pointsEarned: 1
      });
      if (state.historyLog.length > 25) state.historyLog.pop();
      syncUnlockedBadges(true);
      saveState();
      if (typeof window.showAppToast === 'function') {
        window.showAppToast(`✅ Hoàn thành ${minutesCompleted} phút học phần ${state.activeLevel}! +1 Điểm Chăm Chỉ (Tổng: ${state.diligencePoints} điểm)`);
      }
      notifyUI();
    } catch (err) {
      console.error('[tbao2902-Timer] Error completing daily session:', err);
    }
  }
  // Helper to simulate completing a 15-20 min study block or testing badge milestones
  function simulateStudyBoost(minutesToAdd = 15, bonusPoints = 1) {
    try {
      const lvl = state.activeLevel || 'A1';
      state.levelSeconds[lvl] = (state.levelSeconds[lvl] || 0) + minutesToAdd * 60;
      state.diligencePoints += bonusPoints;
      state.dailyMinutesToday += minutesToAdd;
      const todayStr = new Date().toISOString().slice(0, 10);
      if (state.lastPointDate !== todayStr) {
        state.streakDays += 1;
        state.lastPointDate = todayStr;
      }
      state.historyLog.unshift({
        date: new Date().toLocaleString('vi-VN'),
        level: lvl,
        minutes: minutesToAdd,
        pointsEarned: bonusPoints
      });
      if (state.historyLog.length > 25) state.historyLog.pop();
      syncUnlockedBadges(true);
      saveState();
      if (typeof window.showAppToast === 'function') {
        window.showAppToast(`⚡ Đã ghi nhận +${minutesToAdd} phút học (${lvl}) & +${bonusPoints} Điểm Chăm Chỉ! Tổng điểm: ${state.diligencePoints}`);
      }
      notifyUI();
    } catch (err) {
      console.error('[tbao2902-Timer] Error in simulateStudyBoost:', err);
    }
  }
  function getProgressMetrics() {
    const targetSec = state.sessionTargetMinutes * 60;
    const ratio = Math.min(1, state.sessionElapsedSeconds / targetSec);
    const radius = 88;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - ratio);
    const remainingSec = Math.max(0, targetSec - state.sessionElapsedSeconds);
    const nextBadge = BADGE_DEFINITIONS.find((b) => state.diligencePoints < b.pointsRequired) || null;
    return {
      ...state,
      targetSec,
      remainingSec,
      formattedRemaining: formatDuration(remainingSec),
      formattedElapsed: formatDuration(state.sessionElapsedSeconds),
      circumference,
      dashOffset,
      percent: Math.round(ratio * 100),
      badges: BADGE_DEFINITIONS.map((b) => ({
        ...b,
        unlocked: state.diligencePoints >= b.pointsRequired
      })),
      nextBadge,
      levelBreakdown: LEVELS.map((lvl) => {
        const secs = state.levelSeconds[lvl] || 0;
        const mins = Math.floor(secs / 60);
        return {
          level: lvl,
          seconds: secs,
          minutes: mins,
          humanText: formatHumanHours(secs),
          targetMinutes: LEVEL_TARGET_MINUTES[lvl],
          progressPercent: Math.min(100, Math.round((mins / 120) * 100))
        };
      })
    };
  }
  function updateTimerDOMOnly() {
    const m = getProgressMetrics();
    const digitEl = document.getElementById('timer-live-digits');
    const ringEl = document.getElementById('timer-svg-progress-circle');
    const subEl = document.getElementById('timer-live-subtext');
    const lvlTimeEl = document.getElementById(`level-time-readout-${state.activeLevel}`);
    if (digitEl) digitEl.textContent = m.formattedRemaining;
    if (ringEl) ringEl.style.strokeDashoffset = `${m.dashOffset}`;
    if (subEl) subEl.textContent = `Đang học ${m.activeLevel} • Đã qua ${m.formattedElapsed} (${m.percent}%)`;
    if (lvlTimeEl) {
      const item = m.levelBreakdown.find((x) => x.level === state.activeLevel);
      if (item) lvlTimeEl.textContent = item.humanText;
    }
  }
  function notifyUI() {
    if (typeof onUpdateCallback === 'function') {
      onUpdateCallback(getProgressMetrics());
    }
  }
  function subscribe(cb) {
    onUpdateCallback = cb;
  }
  loadState();
  return {
    getState: getProgressMetrics,
    setLevel,
    setSessionTarget,
    startTimer,
    pauseTimer,
    resetSession,
    simulateStudyBoost,
    subscribe,
    BADGE_DEFINITIONS
  };
})();
window.StudyTimerModule = StudyTimerModule;
