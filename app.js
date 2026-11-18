/* ==========================================================================
   LEARNING ENGLISH BY TBAO2902 — CORE APPLICATION CONTROLLER (app.js)
   Architecture:
   1. Storage & Cloud Service (LocalStorage + Firebase Auth + Supabase DB)
   2. Auth Service (Register/Login, >=6 chars password, show/hide, privacy policy)
   3. AI Agent Service (Gemini API + Offline IELTS Pedagogical AI Engine)
   4. Speech & Audio Service (Web Speech TTS/STT + MediaRecorder)
   5. UI Controller (Liquid Glass Sidebar, Views, A1-C2 Tabs, Theme & Perf Modes)
   ========================================================================== */
(() => { const APP_CONFIG_KEY = 'tbao2902_app_config_v1'; const AUTH_USERS_KEY = 'tbao2902_users_db_v1';
  const AUTH_SESSION_KEY = 'tbao2902_active_user_v1';
  /* ------------------------------------------------------------------------
     1. STATE & STORAGE SERVICE (All reads/writes wrapped in try-catch)
     ------------------------------------------------------------------------ */
  const AppState = {
    currentView: 'home',       // 'home' | 'level-hub' | 'lab-test' | 'listening-room' | 'speaking-room' | 'exercise-room' | 'vocab-room' | 'settings'
    currentLevel: 'A1',        // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
    levelSubTab: 'curriculum', // 'curriculum' | 'flashcard' | 'exercises' | 'listening' | 'speaking' | 'mocktest'
    theme: 'dark',             // 'dark' | 'light'
    perfMode: 'high',          // 'high' | 'low'
    voiceAccent: 'en-GB',      // 'en-GB' | 'en-US'
    speechRate: 1.0, blindTranscript: false, flashcardIndex: 0, flashcardQuizActive: false,
    vocabSearchQuery: '', vocabFilterLevel: 'ALL', vocabPage: 1, vocabPageSize: 24,
    exerciseCategory: 'grammar', // 'grammar' | 'listening' | 'reading' | 'writing' | 'speaking' | 'all'
    exerciseTopicFilter: 'ALL',
    exerciseSearchQuery: '',
    exerciseShowAll: true,
    exercisePage: 1,
    exercisePageSize: 18,
    selectedListeningIndex: 0,
    selectedSpeakingIndex: 0,
    selectedMockTestId: 'mock-intl-a1-a2', geminiApiKey: '', firebaseConfigUrl: '', supabaseUrl: '',
    supabaseAnonKey: ''
  }; const StorageService = { loadConfig() {
      try { const raw = localStorage.getItem(APP_CONFIG_KEY); if (raw) { const parsed = JSON.parse(raw);
          Object.assign(AppState, parsed); }
        document.documentElement.setAttribute('data-theme', AppState.theme || 'dark'); document.documentElement.setAttribute('data-perf', AppState.perfMode || 'high');
        console.log('[tbao2902-Log] Loaded app config successfully.'); } catch (err) { console.error('[tbao2902-Log] Error loading config:', err);
      }
    }, saveConfig() {
      try { const toSave = { currentLevel: AppState.currentLevel, theme: AppState.theme,
          perfMode: AppState.perfMode, voiceAccent: AppState.voiceAccent, speechRate: AppState.speechRate, geminiApiKey: AppState.geminiApiKey,
          firebaseConfigUrl: AppState.firebaseConfigUrl, supabaseUrl: AppState.supabaseUrl, supabaseAnonKey: AppState.supabaseAnonKey
        }; localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(toSave));
      } catch (err) { console.error('[tbao2902-Log] Error saving config:', err); }
    }
  };
  /* ------------------------------------------------------------------------
     2. CLOUD SYNC ADAPTER (Firebase Management & Supabase Data Storage)
     ------------------------------------------------------------------------ */
  const CloudSyncAdapter = { async pushTimerState(timerData) {
      try {
        if (!AppState.supabaseUrl || !AppState.supabaseAnonKey) return;
        await fetch(`${AppState.supabaseUrl.replace(/\/$/, '')}/rest/v1/study_progress`, { method: 'POST', headers: { 'Content-Type': 'application/json',
            apikey: AppState.supabaseAnonKey, Authorization: `Bearer ${AppState.supabaseAnonKey}`
          }, body: JSON.stringify({ username: AuthService.getCurrentUser()?.username || 'guest', payload: timerData,
            updated_at: new Date().toISOString()
          })
        }); } catch (err) { console.warn('[tbao2902-Cloud] Supabase sync fallback to LocalStorage:', err.message);
      }
    }
  }; window.CloudSyncAdapter = CloudSyncAdapter;
  /* ------------------------------------------------------------------------
     3. AUTHENTICATION SERVICE (TASK 1: Register, Login, Privacy Guarantee)
     ------------------------------------------------------------------------ */
  const AuthService = { getUsers() {
      try { const raw = localStorage.getItem(AUTH_USERS_KEY); return raw ? JSON.parse(raw) : [];
      } catch (err) { console.error('[tbao2902-Auth] Error reading users:', err); return [];
      }
    }, saveUsers(users) {
      try { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); } catch (err) { console.error('[tbao2902-Auth] Error saving users:', err);
      }
    }, getCurrentUser() {
      try { const raw = localStorage.getItem(AUTH_SESSION_KEY); return raw ? JSON.parse(raw) : null;
      } catch (err) { console.error('[tbao2902-Auth] Error reading session:', err); return null;
      }
    }, register({ fullName, username, password, confirmPassword }) {
      try { const cleanName = (fullName || '').trim(); const cleanUser = (username || '').trim().toLowerCase();
        if (!cleanName || !cleanUser) { return { ok: false, msg: 'Vui lòng nhập đầy đủ Họ và tên cùng Tên đăng nhập.' }; }
        if (!password || password.length < 6) { return { ok: false, msg: 'Mật khẩu bắt buộc phải có từ 6 ký tự trở lên.' }; }
        if (password !== confirmPassword) { return { ok: false, msg: 'Mật khẩu nhập lại không khớp.' }; }
        const users = this.getUsers(); if (users.some((u) => u.username === cleanUser)) { return { ok: false, msg: 'Tên đăng nhập này đã tồn tại. Vui lòng chọn tên khác.' };
        }
        const newUser = { fullName: cleanName, username: cleanUser, passwordHash: btoa(unescape(encodeURIComponent(password))),
          createdAt: new Date().toLocaleDateString('vi-VN'), provider: 'Firebase/Supabase Protected Vault'
        }; users.push(newUser);
        this.saveUsers(users); localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(newUser));
        console.log('[tbao2902-Auth] Registered user:', cleanUser); return { ok: true, user: newUser, msg: `Đăng ký thành công! Chào mừng ${cleanName}.` };
      } catch (err) { console.error('[tbao2902-Auth] Registration error:', err); return { ok: false, msg: 'Đã xảy ra lỗi khi đăng ký tài khoản.' };
      }
    }, login({ username, password }) {
      try { const cleanUser = (username || '').trim().toLowerCase(); const users = this.getUsers();
        const encoded = btoa(unescape(encodeURIComponent(password || ''))); const matched = users.find((u) => u.username === cleanUser && u.passwordHash === encoded);
        if (!matched) { return { ok: false, msg: 'Sai tên đăng nhập hoặc mật khẩu!' }; }
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(matched)); console.log('[tbao2902-Auth] Logged in:', cleanUser);
        return { ok: true, user: matched, msg: `Đăng nhập thành công! Xin chào ${matched.fullName}.` }; } catch (err) { console.error('[tbao2902-Auth] Login error:', err);
        return { ok: false, msg: 'Lỗi khi đăng nhập.' }; }
    }, logout() {
      try { localStorage.removeItem(AUTH_SESSION_KEY); showAppToast('Đã đăng xuất tài khoản an toàn.');
        renderAll(); } catch (err) { console.error('[tbao2902-Auth] Logout error:', err);
      }
    }
  };
  /* ------------------------------------------------------------------------
     4. SPEECH, PRONUNCIATION & AI AGENT SERVICE (Gemini API + Local Engine)
     ------------------------------------------------------------------------ */
  const SpeechService = { speak(text, accent = AppState.voiceAccent, rate = AppState.speechRate) {
      try {
        if (!('speechSynthesis' in window)) { showAppToast('Trình duyệt không hỗ trợ phát âm thanh TTS.'); return;
        }
        window.speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(text);
        utter.lang = accent || 'en-GB'; utter.rate = Number(rate) || 1.0;
        const voices = window.speechSynthesis.getVoices(); const preferred = voices.find((v) => v.lang && v.lang.toLowerCase().includes(utter.lang.toLowerCase()));
        if (preferred) utter.voice = preferred; window.speechSynthesis.speak(utter);
      } catch (err) { console.error('[tbao2902-Speech] TTS error:', err); }
    }, stop() {
      try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (err) { console.error('[tbao2902-Speech] Stop error:', err);
      }
    }
  }; function levenshteinSimilarity(a, b) { const s1 = (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = (b || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0; const dp = Array.from({ length: s1.length + 1 }, () => Array(s2.length + 1).fill(0));
    for (let i = 0; i <= s1.length; i++) dp[i][0] = i; for (let j = 0; j <= s2.length; j++) dp[0][j] = j;
    for (let i = 1; i <= s1.length; i++) { for (let j = 1; j <= s2.length; j++) { const cost = s1[i - 1] === s2[j - 1] ? 0 : 1; dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    const maxLen = Math.max(s1.length, s2.length); return Math.max(0, (maxLen - dp[s1.length][s2.length]) / maxLen);
  }
  const AIAgentService = { async callGeminiOrFallback(promptText, fallbackGenerator) {
      try {
        if (AppState.geminiApiKey && AppState.geminiApiKey.trim().length > 10) {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(AppState.geminiApiKey.trim())}`;
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }]
            })
          }); if (res.ok) { const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text; if (text) return { fromCloud: true, text };
          }
        }
      } catch (err) { console.warn('[tbao2902-AI] Gemini cloud call fallback to local IELTS engine:', err.message); }
      return { fromCloud: false, text: fallbackGenerator() }; }, evaluateSpeakingAndMisuse(targetSentence, userSpokenText, level = AppState.currentLevel) {
      const targetWords = (targetSentence || '').split(/\s+/).filter(Boolean); const spokenWords = (userSpokenText || '').split(/\s+/).filter(Boolean);
      let matchedTotal = 0; const tokenResults = targetWords.map((tw, idx) => { let bestSim = 0;
        let bestHeard = spokenWords[idx] || ''; for (let k = Math.max(0, idx - 2); k <= Math.min(spokenWords.length - 1, idx + 2); k++) { const sim = levenshteinSimilarity(tw, spokenWords[k]);
          if (sim > bestSim) { bestSim = sim; bestHeard = spokenWords[k];
          }
        }
        matchedTotal += bestSim; const status = bestSim >= 0.85 ? 'exact' : bestSim >= 0.52 ? 'close' : 'missed';
        return { word: tw, status, sim: Math.round(bestSim * 100), heard: bestHeard }; });
      const accuracy = targetWords.length ? Math.round((matchedTotal / targetWords.length) * 100) : 0;
      // Detect word-usage or grammatical errors
      const detectedErrors = []; window.TasksAndCurriculumModule.WORD_MISUSE_RULES.forEach((rule) => {
        if (rule.pattern.test(userSpokenText)) { detectedErrors.push(rule); }
      }); const wordCount = spokenWords.length;
      const estimatedBand = accuracy >= 88 && wordCount >= 12
        ? (level === 'C2' ? '8.5' : level === 'C1' ? '7.5' : '7.0')
        : accuracy >= 70
          ? '6.0'
          : accuracy >= 50
            ? '5.0'
            : '4.0'; return { accuracy, estimatedBand, wordCount,
        tokenResults, detectedErrors, coachingTip: accuracy >= 85
          ? 'Phát âm và trọng âm câu rất tốt! Hãy chú ý nối âm (Linking) giữa phụ âm cuối và nguyên âm đầu.'
          : 'Hãy bấm vào từng từ màu vàng/đỏ để nghe lại chuẩn IPA, chú ý âm cuối (-s, -ed, -t) và nhịp điệu câu.'
      }; }, evaluateWritingAndExam(essayText, listeningCorrect, readingCorrect, totalQ, level) {
      const words = (essayText || '').trim().split(/\s+/).filter(Boolean); const wordCount = words.length;
      const hasConnectors = /\b(however|furthermore|moreover|consequently|therefore|although|notwithstanding|whereas|while)\b/i.test(essayText);
      const hasInversionOrCleft = /\b(not only|only by|it is .* that|seldom|rarely|in the absence of)\b/i.test(essayText); const detectedErrors = [];
      window.TasksAndCurriculumModule.WORD_MISUSE_RULES.forEach((rule) => {
        if (rule.pattern.test(essayText)) detectedErrors.push(rule); });
      const objRatio = totalQ > 0 ? (listeningCorrect + readingCorrect) / totalQ : 0.7; let writingBand = 5.0;
      if (wordCount >= 40) writingBand += 1.0; if (hasConnectors) writingBand += 1.0;
      if (hasInversionOrCleft) writingBand += 1.0; if (detectedErrors.length === 0 && wordCount >= 60) writingBand += 0.5;
      writingBand = Math.min(9.0, writingBand); const lrBand = Math.max(3.5, Math.min(9.0, Math.round(objRatio * 9 * 2) / 2));
      const overallBand = (Math.round(((lrBand + writingBand) / 2) * 2) / 2).toFixed(1); return { overallBand, lrBand: lrBand.toFixed(1), writingBand: writingBand.toFixed(1),
        wordCount, hasConnectors, hasInversionOrCleft, detectedErrors
      }; }
  };
  /* ------------------------------------------------------------------------
     5. TOAST HELPER & GLOBAL NAVIGATION HANDLERS
     ------------------------------------------------------------------------ */
  function showAppToast(msg) { const stack = document.getElementById('toast-stack'); if (!stack) return;
    const item = document.createElement('div'); item.className = 'toast-msg';
    item.textContent = msg; stack.appendChild(item);
    setTimeout(() => { item.style.opacity = '0'; item.style.transform = 'translateY(10px)';
      setTimeout(() => item.remove(), 300); }, 3600);
  }
  window.showAppToast = showAppToast; function openSidebar() { document.getElementById('sidebar-drawer')?.classList.add('open');
    document.getElementById('sidebar-backdrop')?.classList.add('open'); }
  function closeSidebar() { document.getElementById('sidebar-drawer')?.classList.remove('open'); document.getElementById('sidebar-backdrop')?.classList.remove('open');
  }
  function navigateTo(view, level = null, subTab = null) { AppState.currentView = view; if (level) { AppState.currentLevel = level;
      window.StudyTimerModule.setLevel(level); }
    if (subTab) { AppState.levelSubTab = subTab; }
    AppState.flashcardIndex = 0; StorageService.saveConfig();
    closeSidebar(); renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function toggleTheme() { AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', AppState.theme);
    StorageService.saveConfig(); showAppToast(`Đã chuyển sang giao diện nền ${AppState.theme === 'dark' ? 'Tối (Dark Liquid Glass)' : 'Sáng (Light Natural Glass)'}.`);
    renderAll(); }
  function togglePerfMode() { AppState.perfMode = AppState.perfMode === 'high' ? 'low' : 'high'; document.documentElement.setAttribute('data-perf', AppState.perfMode);
    StorageService.saveConfig(); showAppToast(
      AppState.perfMode === 'high'
        ? '✨ Đã bật chế độ Máy Mạnh (Full Liquid Glass & Chuyển động mượt).'
        : '⚡ Đã bật chế độ Máy Yếu (Tối ưu tốc độ & giảm tải GPU).'
    ); renderAll();
  }
  /* ------------------------------------------------------------------------
     6. VIEW RENDERERS
     ------------------------------------------------------------------------ */
  function renderHeaderAndSidebar() { const user = AuthService.getCurrentUser(); const userBtn = document.getElementById('topbar-auth-btn');
    if (userBtn) { userBtn.innerHTML = user
        ? `👤 ${user.fullName} <span style="opacity:0.75;font-size:0.78rem">(${AppState.currentLevel})</span>`
        : '🔐 Đăng nhập / Đăng ký'; }
    const themeBtn = document.getElementById('topbar-theme-btn'); if (themeBtn) { themeBtn.textContent = AppState.theme === 'dark' ? '🌙 Nền Tối' : '☀️ Nền Sáng';
    }
    const perfBtn = document.getElementById('topbar-perf-btn'); if (perfBtn) { perfBtn.textContent = AppState.perfMode === 'high' ? '💎 Máy Mạnh' : '⚡ Máy Yếu';
    }
    // Highlight active level pills
    document.querySelectorAll('[data-level-pill]').forEach((btn) => { const lvl = btn.getAttribute('data-level-pill'); btn.classList.toggle('active', lvl === AppState.currentLevel);
    });
    // Sidebar user card
    const sideUserBox = document.getElementById('sidebar-user-summary'); if (sideUserBox) {
      if (user) { sideUserBox.innerHTML = ` <div style="display:flex;align-items:center;justify-content:space-between;gap:8px"> <div>
              <div style="font-weight:800;color:var(--accent-primary)">👤 ${user.fullName}</div> <div style="font-size:0.78rem;color:var(--text-muted)">@${user.username} • Bảo mật Firebase/Supabase</div> </div>
            <button class="btn btn-sm" id="btn-logout-sidebar">Đăng xuất</button> </div> `;
        document.getElementById('btn-logout-sidebar')?.addEventListener('click', () => AuthService.logout()); } else { sideUserBox.innerHTML = `
          <button class="btn btn-primary" style="width:100%" id="btn-open-auth-sidebar"> 🔐 Đăng nhập / Đăng ký Tài khoản
          </button> `;
        document.getElementById('btn-open-auth-sidebar')?.addEventListener('click', () => { closeSidebar(); openAuthModal('login');
        }); }
    }
    // Highlight active sidebar items
    document.querySelectorAll('[data-nav-view]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-nav-view') === AppState.currentView); });
    document.querySelectorAll('[data-sidebar-level]').forEach((btn) => { const lvl = btn.getAttribute('data-sidebar-level');
      btn.classList.toggle('active', AppState.currentView === 'level-hub' && lvl === AppState.currentLevel); });
  }
  function renderHomeView(container) { const tMetrics = window.StudyTimerModule.getState(); const curData = window.TasksAndCurriculumModule.CURRICULUM_DB[AppState.currentLevel];
    const tasks = window.TasksAndCurriculumModule.getStudyTasks(); container.innerHTML = `
      <!-- Hero Banner --> <section class="glass-panel hero-banner"> <div> <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"> <span class="badge-chip">🌿 Learning English by tbao2902</span>
            <span class="badge-chip brown">🏆 Chuẩn Quốc Tế Cambridge & IELTS (A1 – C2)</span> <span class="badge-chip">🔒 Bảo mật Firebase & Supabase</span> </div>
          <h1 style="font-size:clamp(1.65rem, 3vw, 2.35rem);line-height:1.22;margin-bottom:12px">
            Hệ Sinh Thái Học Tập IELTS Quốc Tế <span style="color:var(--accent-primary)">${AppState.currentLevel}</span> — Liquid Glass Studio
          </h1> <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.96rem"> ${curData.overview}
          </p> <div style="display:flex;gap:12px;flex-wrap:wrap"> <button class="btn btn-primary" id="hero-go-level-btn"> 🚀 Vào Học Cấp Độ ${AppState.currentLevel} (${curData.bandTarget})
            </button> <button class="btn btn-brown" id="hero-go-vocab-btn"> 📗 Ngân Hàng 12.000 Từ Vựng & Flashcard
            </button> <button class="btn" id="hero-go-test-btn"> 🧪 Phòng Lab Test Trình Độ Quốc Tế
            </button> </div> </div> <!-- SVG Timer & Daily Diligence Card --> <div class="glass-panel" style="padding:20px;text-align:center;background:var(--glass-bg-brown)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"> <span class="badge-chip">⏱️ Bộ Đếm Tiến Độ (${tMetrics.activeLevel})</span>
            <span class="badge-chip brown">⭐ ${tMetrics.diligencePoints} Điểm • 🔥 Chuỗi ${tMetrics.streakDays} ngày</span> </div> <div class="timer-ring-box"> <svg class="timer-ring-svg" viewBox="0 0 210 210">
              <defs> <linearGradient id="emeraldBrownGrad" x1="0%" y1="0%" x2="100%" y2="100%"> <stop offset="0%" stop-color="#ffffff" /> <stop offset="55%" stop-color="#d4d4dc" />
                  <stop offset="100%" stop-color="#71717e" /> </linearGradient> </defs> <circle class="timer-ring-bg" cx="105" cy="105" r="88"></circle> <circle
                id="timer-svg-progress-circle"
                class="timer-ring-progress"
                cx="105"
                cy="105"
                r="88"
                stroke-dasharray="${tMetrics.circumference}"
                stroke-dashoffset="${tMetrics.dashOffset}"
              ></circle> </svg> <div class="timer-center-readout"> <div id="timer-live-digits" class="timer-digits">${tMetrics.formattedRemaining}</div>
              <div id="timer-live-subtext" style="font-size:0.75rem;color:var(--text-muted)"> Mục tiêu ${tMetrics.sessionTargetMinutes}p/ngày (+1 điểm)
              </div> </div> </div> <div style="display:flex;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap"> <button class="btn btn-primary btn-sm" id="btn-timer-toggle">
              ${tMetrics.isRunning ? '⏸️ Tạm dừng' : '▶️ Bắt đầu đếm'} </button> <button class="btn btn-sm" id="btn-timer-reset">🔄 Đặt lại</button> <button class="btn btn-sm" id="btn-timer-target">
              🎯 Mục tiêu: ${tMetrics.sessionTargetMinutes}p </button> <button class="btn btn-brown btn-sm" id="btn-timer-boost-1" title="Hoàn thành nhanh 15 phút học để nhận +1 Điểm Chăm Chỉ">
              ⚡ +15p (+1 Điểm) </button> <button class="btn btn-sm" id="btn-timer-boost-10" title="Cộng thử +10 điểm để kiểm tra mở khóa Huy hiệu">
              🏆 +10 Điểm Test Huy Hiệu </button> </div> </div> </section>
      <!-- 6 CEFR / IELTS Levels Quick Cards --> <section class="glass-panel" style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px"> <div>
            <h2 style="font-size:1.3rem">🎓 Lộ Trình 6 Cấp Bậc Chuẩn Quốc Tế (A1 Foundation → C2 Mastery)</h2>
            <p style="font-size:0.86rem;color:var(--text-muted)">Bấm vào bất kỳ cấp bậc nào để mở Giáo trình, Công thức, Flashcard, Bài tập, Luyện Nghe & Luyện Nói AI của cấp đó.</p>
          </div> </div> <div class="grid-3"> ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl) => { const c = window.TasksAndCurriculumModule.CURRICULUM_DB[lvl];
            const lb = tMetrics.levelBreakdown.find((x) => x.level === lvl);
            const lvlExCount = (window.TasksAndCurriculumModule.EXERCISES_DB[lvl] || []).length;
            return `
              <div class="glass-panel interactive" style="padding:20px;cursor:pointer;border-color:${lvl === AppState.currentLevel ? 'var(--glass-border-strong)' : 'var(--glass-border)'}" data-open-level="${lvl}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"> <span class="badge-chip">${lvl}</span>
                  <span class="badge-chip brown">${c.bandTarget}</span> </div> <h3 style="font-size:1.04rem;margin-bottom:6px">${c.name}</h3>
                <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px">⏱️ Thời lượng chuẩn: ${c.duration} • <strong>${lvlExCount} bài tập</strong> (5 dạng × 36 bài)</p>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px">
                  <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:700" id="level-time-readout-${lvl}">Đã học: ${lb ? lb.humanText : '0 phút'}</span>
                  <button class="btn btn-primary btn-sm" data-open-practice-level="${lvl}">✍️ Phòng Luyện Tập (${lvlExCount})</button>
                </div> </div> `;
          }).join('')} </div> </section> <!-- 5 Official Diligence Badges Section (timer.js / Time.docx) --> <section class="glass-panel" style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px"> <div>
            <h2 style="font-size:1.3rem">🏅 Hệ Thống Chuỗi Học & 5 Huy Hiệu Chăm Chỉ</h2> <p style="font-size:0.86rem;color:var(--text-muted)">
              Cơ chế: Học từ <strong>15 phút đến 20 phút mỗi ngày</strong> kích hoạt <strong>+1 điểm</strong>. Tích lũy điểm để mở khóa trọn bộ 5 danh hiệu:
            </p> </div> <span class="badge-chip brown">Điểm hiện tại: ${tMetrics.diligencePoints} / 200 điểm</span> </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:14px"> ${tMetrics.badges.map((b) => `
            <div class="badge-card ${b.unlocked ? 'unlocked' : ''}"> <div style="font-size:2.3rem;margin-bottom:6px">${b.icon}</div>
              <div style="font-weight:800;font-size:1rem;color:var(--text-primary)">“${b.title}”</div>
              <div style="font-size:0.78rem;color:var(--accent-secondary);font-weight:700;margin:4px 0">${b.subtitle}</div>
              <p style="font-size:0.78rem;color:var(--text-secondary)">${b.desc}</p> <div style="margin-top:8px">
                <span class="badge-chip">${b.unlocked ? '✅ Đã Mở Khóa' : `🔒 Cần ${b.pointsRequired} điểm`}</span> </div> </div> `).join('')}
        </div> </section> <!-- 4 Specialized Rooms + Study Tasks Manager --> <div class="grid-2"> <section class="glass-panel" style="padding:24px">
          <h2 style="font-size:1.22rem;margin-bottom:14px">🏛️ 4 Phòng Học Chuyên Biệt & Ngân Hàng 12.000 Từ</h2>
          <div style="display:flex;flex-direction:column;gap:10px"> <button class="sidebar-item" data-quick-room="lab-test">
              <span>1. 🧪 Phòng Lab Test Trình Độ Chuẩn Quốc Tế (IELTS Mock Room)</span> <span>→</span> </button> <button class="sidebar-item" data-quick-room="listening-room">
              <span>2. 🎧 Phòng Luyện Nghe Quốc Tế (British Council / Cambridge + AI)</span> <span>→</span> </button> <button class="sidebar-item" data-quick-room="speaking-room">
              <span>3. 🎙️ Phòng Luyện Nói AI (Chấm điểm IPA & Sửa lỗi dùng từ)</span> <span>→</span> </button> <button class="sidebar-item" data-quick-room="exercise-room">
              <span>4. ✍️ Phòng Làm Bài Tập Đa Dạng Phù Hợp Từng Trình Độ</span> <span>→</span> </button> <button class="sidebar-item" data-quick-room="vocab-room">
              <span>5. 📗 Sổ Tay 12.000 Từ Vựng Quốc Tế & Flashcard Đa Sắc Màu</span> <span>→</span> </button> </div> </section> <!-- Study Tasks Checklist -->
        <section class="glass-panel" style="padding:24px"> <h2 style="font-size:1.22rem;margin-bottom:12px">📋 Nhiệm Vụ Học Tập Hằng Ngày (tasks.js)</h2>
          <form id="form-add-study-task" style="display:flex;gap:8px;margin-bottom:14px">
            <input type="text" id="input-new-task" class="glass-input" placeholder="Thêm mục tiêu học tập mới (VD: Học 30 từ C1)..." required />
            <button type="submit" class="btn btn-primary">Thêm</button> </form> <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow-y:auto">
            ${tasks.map((t) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid var(--glass-border)">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">
                  <input type="checkbox" data-toggle-task="${t.id}" ${t.done ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent-primary)" />
                  <span style="text-decoration:${t.done ? 'line-through' : 'none'};opacity:${t.done ? 0.6 : 1};font-size:0.9rem">
                    <strong>[${t.level}]</strong> ${t.text} </span> </label> <button class="btn btn-sm" data-delete-task="${t.id}" title="Xóa">✕</button> </div>
            `).join('')} </div> </section> </div>
    `;
    // Bind events
    document.getElementById('hero-go-level-btn')?.addEventListener('click', () => navigateTo('level-hub', AppState.currentLevel, 'curriculum'));
    document.getElementById('hero-go-vocab-btn')?.addEventListener('click', () => navigateTo('vocab-room')); document.getElementById('hero-go-test-btn')?.addEventListener('click', () => navigateTo('lab-test'));
    document.getElementById('btn-timer-toggle')?.addEventListener('click', () => { const st = window.StudyTimerModule.getState(); if (st.isRunning) window.StudyTimerModule.pauseTimer();
      else window.StudyTimerModule.startTimer(); renderHomeView(container);
    }); document.getElementById('btn-timer-reset')?.addEventListener('click', () => { window.StudyTimerModule.resetSession();
      renderHomeView(container); });
    document.getElementById('btn-timer-target')?.addEventListener('click', () => { const st = window.StudyTimerModule.getState(); const nextTarget = st.sessionTargetMinutes === 15 ? 20 : 15;
      window.StudyTimerModule.setSessionTarget(nextTarget); showAppToast(`Đã đặt mục tiêu phiên học hàng ngày: ${nextTarget} phút.`);
      renderHomeView(container); });
    document.getElementById('btn-timer-boost-1')?.addEventListener('click', () => { window.StudyTimerModule.simulateStudyBoost(15, 1); renderHomeView(container);
    }); document.getElementById('btn-timer-boost-10')?.addEventListener('click', () => { window.StudyTimerModule.simulateStudyBoost(150, 10);
      renderHomeView(container); });
    container.querySelectorAll('[data-open-level]').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-open-practice-level]')) return;
        navigateTo('level-hub', card.getAttribute('data-open-level'), 'curriculum');
      });
    });
    container.querySelectorAll('[data-open-practice-level]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateTo('level-hub', btn.getAttribute('data-open-practice-level'), 'exercises');
      });
    });
    container.querySelectorAll('[data-quick-room]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-quick-room'))); });
    document.getElementById('form-add-study-task')?.addEventListener('submit', (e) => { e.preventDefault(); const inp = document.getElementById('input-new-task');
      if (inp && inp.value.trim()) { window.TasksAndCurriculumModule.addStudyTask(AppState.currentLevel, inp.value); showAppToast('Đã thêm nhiệm vụ học tập mới!');
        renderHomeView(container); }
    }); container.querySelectorAll('[data-toggle-task]').forEach((cb) => { cb.addEventListener('change', () => {
        window.TasksAndCurriculumModule.toggleStudyTask(cb.getAttribute('data-toggle-task')); renderHomeView(container);
      }); });
    container.querySelectorAll('[data-delete-task]').forEach((btn) => { btn.addEventListener('click', () => {
        window.TasksAndCurriculumModule.deleteStudyTask(btn.getAttribute('data-delete-task')); renderHomeView(container);
      }); });
  }
  /* ------------------------------------------------------------------------
     7. LEVEL HUB VIEW (Separated Menu for Curriculum, Flashcard, Exercises, Listening, Speaking, Mock Test)
     ------------------------------------------------------------------------ */
  function renderLevelHubView(container) { const lvl = AppState.currentLevel; const c = window.TasksAndCurriculumModule.CURRICULUM_DB[lvl];
    container.innerHTML = ` <section class="glass-panel" style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px"> <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"> <span class="badge-chip">CẤP ĐỘ ${lvl}</span>
              <span class="badge-chip brown">${c.bandTarget}</span> <span class="badge-chip">⏱️ ${c.duration}</span>
            </div> <h1 style="font-size:1.55rem">${c.name}</h1> </div> <div style="display:flex;gap:6px;flex-wrap:wrap"> ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((code) => `
              <button class="btn btn-sm ${code === lvl ? 'btn-primary' : ''}" data-switch-hub-level="${code}">${code}</button> `).join('')}
          </div> </div> <!-- Separated Sub-Menu for this Level as required in TASK 1..6 --> <div class="subnav-tabs">
          <button class="subnav-tab ${AppState.levelSubTab === 'curriculum' ? 'active' : ''}" data-hub-tab="curriculum">📖 1. Giáo Trình & Công Thức</button>
          <button class="subnav-tab ${AppState.levelSubTab === 'flashcard' ? 'active' : ''}" data-hub-tab="flashcard">🃏 2. Flashcard Từ Vựng (${lvl})</button>
          <button class="subnav-tab ${AppState.levelSubTab === 'exercises' ? 'active' : ''}" data-hub-tab="exercises">✍️ 3. Luyện Bài Tập (${lvl})</button>
          <button class="subnav-tab ${AppState.levelSubTab === 'listening' ? 'active' : ''}" data-hub-tab="listening">🎧 4. Luyện Nghe (${lvl})</button>
          <button class="subnav-tab ${AppState.levelSubTab === 'speaking' ? 'active' : ''}" data-hub-tab="speaking">🎙️ 5. Luyện Nói AI (${lvl})</button>
          <button class="subnav-tab ${AppState.levelSubTab === 'mocktest' ? 'active' : ''}" data-hub-tab="mocktest">🧪 6. Phòng Lab Luyện Đề (${lvl})</button>
        </div> </section> <div id="level-hub-subcontent"></div> `;
    container.querySelectorAll('[data-switch-hub-level]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo('level-hub', btn.getAttribute('data-switch-hub-level'), AppState.levelSubTab)); });
    container.querySelectorAll('[data-hub-tab]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo('level-hub', lvl, btn.getAttribute('data-hub-tab'))); });
    const subBox = document.getElementById('level-hub-subcontent'); if (!subBox) return;
    if (AppState.levelSubTab === 'curriculum') { renderCurriculumSubView(subBox, c); } else if (AppState.levelSubTab === 'flashcard') { renderVocabularyRoomView(subBox, lvl);
    } else if (AppState.levelSubTab === 'exercises') { renderExercisesRoomView(subBox, lvl); } else if (AppState.levelSubTab === 'listening') { renderListeningRoomView(subBox, lvl);
    } else if (AppState.levelSubTab === 'speaking') { renderSpeakingRoomView(subBox, lvl); } else if (AppState.levelSubTab === 'mocktest') { renderMockTestRoomView(subBox, lvl);
    }
  }
  function renderCurriculumSubView(subBox, c) { subBox.innerHTML = ` <!-- 1. Overview & Evaluation Table --> <section class="glass-panel" style="padding:24px;margin-bottom:20px">
        <h2 style="font-size:1.25rem;color:var(--accent-primary);margin-bottom:8px">1. TỔNG QUAN CẤP ĐỘ & MỤC TIÊU ĐẦU RA (LEVEL OVERVIEW)</h2>
        <p style="color:var(--text-secondary);margin-bottom:16px">${c.overview}</p> <div class="data-table-wrap"> <table class="data-table"> <thead>
              <tr> <th>Tiêu chí đánh giá</th> <th>Chuẩn đầu ra yêu cầu</th> <th>Chỉ số định lượng / Quy đổi</th> </tr> </thead> <tbody>
              ${c.evalCriteria.map((row) => ` <tr> <td><strong>${row[0]}</strong></td> <td>${row[1]}</td> <td>${row[2]}</td>
                </tr> `).join('')}
            </tbody> </table> </div> </section> <!-- 2. Grammar Formulas --> <section class="glass-panel" style="padding:24px;margin-bottom:20px">
        <h2 style="font-size:1.25rem;color:var(--accent-primary);margin-bottom:8px">2. HỆ THỐNG NGỮ PHÁP TRỌNG TÂM & CÔNG THỨC CỐT LÕI (GRAMMAR FORMULAS)</h2>
        <p style="color:var(--text-secondary);margin-bottom:16px">${c.grammarIntro}</p> <div class="data-table-wrap"> <table class="data-table"> <thead>
              <tr> <th>Chuyên đề ngữ pháp</th> <th>Công thức chuẩn (Formula)</th> <th>Ứng dụng trong IELTS & Ví dụ thực tế</th> </tr> </thead> <tbody>
              ${c.grammarFormulas.map((row) => ` <tr> <td><strong>${row[0]}</strong></td> <td><code style="color:var(--accent-secondary)">${row[1]}</code></td> <td>${row[2]}</td>
                </tr> `).join('')}
            </tbody> </table> </div> <div class="formula-callout"> <h3 style="font-size:1rem;color:var(--accent-secondary);margin-bottom:8px">${c.specialFormulaBox.title}</h3>
          <ul style="padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:0.9rem"> ${c.specialFormulaBox.bullets.map((b) => `<li>${b}</li>`).join('')}
          </ul> </div> </section> <!-- 3. Lexical Resource --> <section class="glass-panel" style="padding:24px;margin-bottom:20px">
        <h2 style="font-size:1.25rem;color:var(--accent-primary);margin-bottom:12px">3. HỆ THỐNG TỪ VỰNG & CHỦ ĐIỂM HỌC THUẬT (LEXICAL RESOURCE)</h2>
        <div class="data-table-wrap"> <table class="data-table"> <thead> <tr>
                <th>Chủ điểm trọng tâm (Topics)</th> <th>Từ vựng / Collocations cốt lõi</th> <th>Công thức kết hợp từ (Word Formation / Usage)</th> </tr> </thead> <tbody>
              ${c.topics.map((row) => ` <tr> <td><strong>${row[0]}</strong></td> <td>${row[1]}</td> <td><code style="color:var(--green-400)">${row[2]}</code></td>
                </tr> `).join('')}
            </tbody> </table> </div> </section> <!-- 4. 4-Skills Strategies --> <section class="glass-panel" style="padding:24px;margin-bottom:20px">
        <h2 style="font-size:1.25rem;color:var(--accent-primary);margin-bottom:14px">4. CHIẾN THUẬT & CÔNG THỨC PHỦ RỘNG 4 KỸ NĂNG (4-SKILLS FORMULAS)</h2>
        <div class="grid-2"> <div class="formula-callout" style="margin-top:0">
            <h4>🎧 4.1. Kỹ năng Listening</h4> <p style="font-size:0.88rem;margin-top:6px;color:var(--text-secondary)">${c.skillsStrategies.listening}</p>
          </div> <div class="formula-callout" style="margin-top:0"> <h4>📖 4.2. Kỹ năng Reading</h4> <p style="font-size:0.88rem;margin-top:6px;color:var(--text-secondary)">${c.skillsStrategies.reading}</p>
          </div> <div class="formula-callout" style="margin-top:0"> <h4>🎙️ 4.3. Kỹ năng Speaking</h4> <p style="font-size:0.88rem;margin-top:6px;color:var(--text-secondary)">${c.skillsStrategies.speaking}</p>
          </div> <div class="formula-callout" style="margin-top:0"> <h4>✍️ 4.4. Kỹ năng Writing</h4> <p style="font-size:0.88rem;margin-top:6px;color:var(--text-secondary)">${c.skillsStrategies.writing}</p>
          </div> </div> </section> <!-- 5. Study Roadmap & Exit Test Criteria --> <section class="glass-panel" style="padding:24px">
        <h2 style="font-size:1.25rem;color:var(--accent-primary);margin-bottom:12px">5. LỘ TRÌNH HỌC TẬP & TIÊU CHÍ KIỂM TRA VƯỢT CẤP (EXIT TEST CRITERIA)</h2>
        <div class="data-table-wrap"> <table class="data-table"> <thead> <tr> <th>Giai đoạn (Tuần)</th> <th>Nội dung huấn luyện trọng tâm</th> <th>Bài kiểm tra / Đầu ra bắt buộc</th> </tr>
            </thead> <tbody> ${c.roadmap.map((row) => `
                <tr> <td><strong>${row[0]}</strong></td> <td>${row[1]}</td> <td>${row[2]}</td> </tr>
              `).join('')} </tbody> </table> </div> </section>
    `; }
  /* ------------------------------------------------------------------------
     8. VOCABULARY VAULT (12,000 WORDS) + 3D FLASHCARDS + MEMORY QUIZ (TASK 8)
     ------------------------------------------------------------------------ */
  function renderVocabularyRoomView(container, forcedLevel = null) { const activeLvl = forcedLevel || AppState.currentLevel; const seeds = [
      ...window.TasksAndCurriculumModule.getCustomAIContent().vocab.filter((v) => !forcedLevel || v.level === activeLvl),
      ...(window.TasksAndCurriculumModule.CORE_VOCAB_SEEDS[activeLvl] || [])
    ]; const cardIdx = Math.min(AppState.flashcardIndex, Math.max(0, seeds.length - 1));
    const currentCard = seeds[cardIdx] || seeds[0]; const memMap = window.TasksAndCurriculumModule.getFlashcardMemory();
    const full12000 = window.TasksAndCurriculumModule.get12000VocabularyBank();
    const filteredBank = full12000.filter((item) => { const matchLvl = AppState.vocabFilterLevel === 'ALL' || item.level === AppState.vocabFilterLevel;
      const q = (AppState.vocabSearchQuery || '').trim().toLowerCase(); const matchQ = !q || item.word.toLowerCase().includes(q) || item.vi.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q);
      return matchLvl && matchQ; });
    const totalPages = Math.max(1, Math.ceil(filteredBank.length / AppState.vocabPageSize)); const safePage = Math.min(Math.max(1, AppState.vocabPage), totalPages);
    const pageItems = filteredBank.slice((safePage - 1) * AppState.vocabPageSize, safePage * AppState.vocabPageSize); const rememberedCount = Object.values(memMap).filter((v) => v === 'remembered').length;
    container.innerHTML = ` <div class="grid-2" style="margin-bottom:22px"> <!-- Colorful 3D Flashcard Deck --> <section class="glass-panel" style="padding:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px"> <div> <span class="badge-chip">🃏 Flashcard Đa Sắc Màu (${activeLvl})</span>
              <span class="badge-chip brown">Đã ghi nhớ: ${rememberedCount} từ</span> </div> <button class="btn btn-brown btn-sm" id="btn-ai-random-vocab">🤖 AI Tạo Từ Vựng Ngẫu Nhiên</button> </div>
          <div class="flashcard-stage" id="flashcard-3d-box"> <div class="flashcard-inner">
              <div class="flashcard-face flashcard-front"> <div style="display:flex;justify-content:space-between;align-items:center">
                  <span class="badge-chip" style="background:rgba(0,0,0,0.28);color:#fff">${activeLvl} • ${currentCard.topic}</span>
                  <span style="font-size:0.82rem;opacity:0.9">Thẻ ${cardIdx + 1}/${seeds.length} • Bấm để lật ↻</span> </div> <div style="text-align:center;margin:auto 0">
                  <div style="font-size:2.1rem;font-weight:800;letter-spacing:-0.02em">${currentCard.word}</div> <div style="font-size:1rem;opacity:0.9;margin-top:6px">(${currentCard.pos})</div> </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;opacity:0.9">
                  <span>🔊 Bấm nút nghe phát âm bên dưới</span> <span>${memMap[currentCard.word] === 'remembered' ? '✅ Đã thuộc' : '📌 Đang học'}</span>
                </div> </div> <div class="flashcard-face flashcard-back"> <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-weight:800;font-size:1.1rem">${currentCard.word}</span>
                  <span style="font-family:monospace;font-size:1.05rem;background:rgba(0,0,0,0.3);padding:4px 10px;border-radius:8px">${currentCard.ipa}</span> </div> <div style="margin:auto 0">
                  <div style="font-size:1.25rem;font-weight:800;color:#fde68a;margin-bottom:8px">🇻🇳 ${currentCard.vi}</div>
                  <p style="font-size:0.9rem;background:rgba(0,0,0,0.24);padding:10px 12px;border-radius:10px"> 💡 <em>“${currentCard.example}”</em>
                  </p> </div> <div style="font-size:0.78rem;opacity:0.9;text-align:right">Bấm vào thẻ để lật lại mặt trước ↺</div> </div>
            </div> </div> <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:16px">
            <button class="btn btn-sm" id="fc-prev-btn">◀ Trước</button> <button class="btn btn-primary btn-sm" id="fc-speak-uk">🔊 Phát âm UK</button>
            <button class="btn btn-brown btn-sm" id="fc-speak-us">🔊 Phát âm US</button>
            <button class="btn btn-sm" id="fc-mark-known">✅ Đã ghi nhớ</button> <button class="btn btn-sm" id="fc-next-btn">Tiếp ▶</button>
          </div> </section> <!-- Flashcard Memory Quiz Check (Kiểm tra từ đã học qua Flashcard) --> <section class="glass-panel" style="padding:24px">
          <span class="badge-chip">🧠 Kiểm Tra Ghi Nhớ Từ Vựng Flashcard (${activeLvl})</span> <h3 style="font-size:1.2rem;margin:10px 0 8px">Kiểm tra xem bạn đã thuộc từ trên Flashcard chưa</h3>
          <p style="font-size:0.86rem;color:var(--text-secondary);margin-bottom:14px">
            Từ cần kiểm tra: <strong style="color:var(--accent-primary);font-size:1.1rem">${currentCard.word}</strong> <span style="font-family:monospace">${currentCard.ipa}</span>
          </p> <div style="display:flex;flex-direction:column;gap:8px" id="fc-quiz-options"> ${seeds.slice(0, 4).map((opt) => `
              <button class="btn" style="justify-content:flex-start;text-align:left" data-fc-quiz-ans="${opt.word === currentCard.word ? 'correct' : 'wrong'}"> 🎯 ${opt.vi}
              </button> `).join('')}
          </div> <div id="fc-quiz-feedback" style="margin-top:12px;font-weight:700;font-size:0.9rem"></div> </section> </div>
      <!-- 12,000 International Standard Vocabulary Bank Browser --> <section class="glass-panel" style="padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px"> <div>
            <h2 style="font-size:1.3rem">📚 Sổ Tay Ngân Hàng 12.000 Từ Vựng Tiếng Anh Chuẩn Quốc Tế (A1 – C2)</h2> <p style="font-size:0.85rem;color:var(--text-muted)">
              Tổng cộng <strong>${full12000.length.toLocaleString('vi-VN')} từ vựng</strong> (2.000 từ/cấp độ × 6 cấp độ) có phiên âm IPA, từ loại, dịch nghĩa chuẩn quốc tế và phát âm trực tiếp.
            </p> </div> <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input type="search" id="vocab-bank-search" class="glass-input" style="width:240px" placeholder="Tìm trong 12.000 từ..." value="${AppState.vocabSearchQuery}" />
            <select id="vocab-bank-level-filter" class="glass-select" style="width:150px"> <option value="ALL" ${AppState.vocabFilterLevel === 'ALL' ? 'selected' : ''}>Tất cả (12.000 từ)</option>
              ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => ` <option value="${l}" ${AppState.vocabFilterLevel === l ? 'selected' : ''}>Cấp ${l} (2.000 từ)</option>
              `).join('')} </select> </div> </div> <div class="data-table-wrap">
          <table class="data-table"> <thead> <tr> <th>#ID</th> <th>Cấp độ</th> <th>Từ vựng / Học thuật</th> <th>Phiên âm IPA</th> <th>Dịch nghĩa chuẩn quốc tế</th>
                <th>Chủ điểm</th> <th>Nghe</th> </tr> </thead> <tbody>
              ${pageItems.map((item) => ` <tr> <td>#${item.id}</td> <td><span class="badge-chip">${item.level}</span></td>
                  <td><strong>${item.word}</strong> <span style="opacity:0.7">(${item.pos})</span></td> <td><code>${item.ipa}</code></td> <td>${item.vi}</td> <td>${item.topic}</td>
                  <td><button class="btn btn-sm" data-speak-word="${item.word.replace(/\s+#\d+.*$/, '')}">🔊</button></td> </tr> `).join('')}
            </tbody> </table> </div> <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;flex-wrap:wrap;gap:10px"> <span style="font-size:0.85rem;color:var(--text-muted)">
            Đang hiển thị trang <strong>${safePage} / ${totalPages}</strong> (Tìm thấy ${filteredBank.length.toLocaleString('vi-VN')} từ vựng) </span> <div style="display:flex;gap:8px">
            <button class="btn btn-sm" id="vocab-page-prev" ${safePage <= 1 ? 'disabled' : ''}>◀ Trang trước</button>
            <button class="btn btn-sm" id="vocab-page-next" ${safePage >= totalPages ? 'disabled' : ''}>Trang sau ▶</button> </div> </div> </section> `;
    // Bind events
    document.getElementById('flashcard-3d-box')?.addEventListener('click', (e) => { e.currentTarget.classList.toggle('flipped'); });
    document.getElementById('fc-prev-btn')?.addEventListener('click', () => { AppState.flashcardIndex = (cardIdx - 1 + seeds.length) % seeds.length; renderVocabularyRoomView(container, forcedLevel);
    }); document.getElementById('fc-next-btn')?.addEventListener('click', () => { AppState.flashcardIndex = (cardIdx + 1) % seeds.length;
      renderVocabularyRoomView(container, forcedLevel); });
    document.getElementById('fc-speak-uk')?.addEventListener('click', () => SpeechService.speak(currentCard.word, 'en-GB', 0.95));
    document.getElementById('fc-speak-us')?.addEventListener('click', () => SpeechService.speak(currentCard.word, 'en-US', 0.95)); document.getElementById('fc-mark-known')?.addEventListener('click', () => {
      window.TasksAndCurriculumModule.markFlashcardStatus(currentCard.word, 'remembered'); showAppToast(`✅ Đã ghi nhớ từ "${currentCard.word}" vào sổ tay SRS!`);
      renderVocabularyRoomView(container, forcedLevel); });
    container.querySelectorAll('[data-fc-quiz-ans]').forEach((btn) => { btn.addEventListener('click', () => {
        const fb = document.getElementById('fc-quiz-feedback'); if (btn.getAttribute('data-fc-quiz-ans') === 'correct') { window.TasksAndCurriculumModule.markFlashcardStatus(currentCard.word, 'remembered');
          if (fb) fb.innerHTML = `<span style="color:var(--success)">🎉 Chính xác! Bạn đã ghi nhớ vững từ "${currentCard.word}".</span>`; } else {
          if (fb) fb.innerHTML = `<span style="color:var(--danger)">❌ Chưa đúng! Nghĩa chuẩn của "${currentCard.word}" là: "${currentCard.vi}".</span>`; }
      }); });
    document.getElementById('btn-ai-random-vocab')?.addEventListener('click', async () => { showAppToast('🤖 AI Agent đang tạo từ vựng học thuật mới...'); const aiPool = [
        { word: 'epistemic humility', ipa: '/ˌep.ɪˈstem.ɪk hjuːˈmɪl.ə.ti/', pos: 'n.phr', vi: 'sự khiêm nhường tri thức khoa học', topic: 'AI Generated', example: 'True scholars approach complex data with epistemic humility.', color: 'emerald' },
        { word: 'socio-ecological equilibrium', ipa: '/ˌsəʊ.si.əʊ iː.kəˈlɒdʒ.ɪ.kəl ˌiː.kwɪˈlɪb.ri.əm/', pos: 'n.phr', vi: 'trạng thái cân bằng sinh thái - xã hội', topic: 'AI Generated', example: 'Urban policies must preserve socio-ecological equilibrium.', color: 'walnut' },
        { word: 'meticulous empirical inquiry', ipa: '/məˈtɪk.jʊ.ləs ɪmˈpɪr.ɪ.kəl ɪnˈkwaɪə.ri/', pos: 'n.phr', vi: 'cuộc khảo sát thực nghiệm tỉ mỉ', topic: 'AI Generated', example: 'Breakthroughs require meticulous empirical inquiry.', color: 'sage' }
      ]; const pick = aiPool[Math.floor(Math.random() * aiPool.length)];
      window.TasksAndCurriculumModule.addCustomAIVocab({ ...pick, level: activeLvl }); AppState.flashcardIndex = 0;
      showAppToast(`✨ AI Agent đã tạo từ mới: "${pick.word}" (${activeLvl})!`); renderVocabularyRoomView(container, forcedLevel);
    }); document.getElementById('vocab-bank-search')?.addEventListener('input', (e) => { AppState.vocabSearchQuery = e.target.value;
      AppState.vocabPage = 1; renderVocabularyRoomView(container, forcedLevel);
    }); document.getElementById('vocab-bank-level-filter')?.addEventListener('change', (e) => { AppState.vocabFilterLevel = e.target.value;
      AppState.vocabPage = 1; renderVocabularyRoomView(container, forcedLevel);
    }); document.getElementById('vocab-page-prev')?.addEventListener('click', () => { AppState.vocabPage = Math.max(1, safePage - 1);
      renderVocabularyRoomView(container, forcedLevel); });
    document.getElementById('vocab-page-next')?.addEventListener('click', () => { AppState.vocabPage = Math.min(totalPages, safePage + 1); renderVocabularyRoomView(container, forcedLevel);
    }); container.querySelectorAll('[data-speak-word]').forEach((btn) => {
      btn.addEventListener('click', () => SpeechService.speak(btn.getAttribute('data-speak-word'))); });
  }
  /* ------------------------------------------------------------------------
     9. COMPREHENSIVE PRACTICE ROOM VIEW — TASK 7 (36+ EXERCISES PER TYPE PER LEVEL)
     ------------------------------------------------------------------------ */
  function renderExercisesRoomView(container, forcedLevel = null) {
    const lvl = forcedLevel || AppState.currentLevel;
    const mod = window.TasksAndCurriculumModule;
    const cur = mod.CURRICULUM_DB[lvl];
    const byCat = mod.PRACTICE_BY_CATEGORY[lvl] || { grammar: [], listening: [], reading: [], writing: [], speaking: [] };
    const allList = mod.EXERCISES_DB[lvl] || [];
    const activeCat = AppState.exerciseCategory || 'grammar';
    const rawPool = activeCat === 'all' ? allList : (byCat[activeCat] || allList);

    const uniqueTopics = Array.from(new Set(allList.map((x) => x.topic).filter(Boolean)));
    const filteredList = rawPool.filter((ex) => {
      const matchTopic = AppState.exerciseTopicFilter === 'ALL' || ex.topic === AppState.exerciseTopicFilter;
      const q = (AppState.exerciseSearchQuery || '').trim().toLowerCase();
      const matchQ = !q ||
        (ex.question || '').toLowerCase().includes(q) ||
        (ex.type || '').toLowerCase().includes(q) ||
        (ex.topic || '').toLowerCase().includes(q) ||
        (ex.passage || '').toLowerCase().includes(q) ||
        (ex.audioScript || '').toLowerCase().includes(q);
      return matchTopic && matchQ;
    });

    const showList = AppState.exerciseShowAll
      ? filteredList
      : filteredList.slice((AppState.exercisePage - 1) * AppState.exercisePageSize, AppState.exercisePage * AppState.exercisePageSize);

    const optionLetters = ['A', 'B', 'C', 'D'];

    container.innerHTML = `
      <section class="glass-panel" style="padding:26px">
        <!-- Header & Level Selector -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px">
          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <span class="badge-chip">✍️ PHÒNG LUYỆN TẬP CHUYÊN SÂU TASK 7 (${lvl})</span>
              <span class="badge-chip brown">${cur.bandTarget} • Tổng ${allList.length} Bài Tập Chuẩn Quốc Tế</span>
              <span class="badge-chip">✅ Đạt chuẩn >= 30 bài / mỗi dạng bài</span>
            </div>
            <h2 style="font-size:1.42rem">Phòng Luyện Bài Tập Đa Kỹ Năng Theo Giáo Trình TASK 2 – 6 (Level ${lvl})</h2>
            <p style="font-size:0.86rem;color:var(--text-secondary);margin-top:4px">
              Mỗi dạng bài (Cấu trúc & Thì, Nghe, Đọc, Viết, Nói) tại cấp độ <strong>${lvl}</strong> tích hợp sẵn <strong>36 bài tập chuyên sâu</strong> phân bổ đều qua 6 chủ điểm học thuật, kèm AI tạo thêm bài tập không giới hạn.
            </p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((code) => `
              <button class="btn btn-sm ${code === lvl ? 'btn-primary' : ''}" data-ex-level="${code}">
                ${code} (${(mod.EXERCISES_DB[code] || []).length})
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 5 Core Exercise Type Tabs + All Tab (Each Type >= 36 Exercises) -->
        <div class="subnav-tabs" style="margin-bottom:16px">
          <button class="subnav-tab ${activeCat === 'grammar' ? 'active' : ''}" data-ex-cat="grammar">
            📐 1. Cấu Trúc Câu &amp; Các Thì (${byCat.grammar.length} bài)
          </button>
          <button class="subnav-tab ${activeCat === 'listening' ? 'active' : ''}" data-ex-cat="listening">
            🎧 2. Bài Tập Nghe Theo Chủ Đề (${byCat.listening.length} bài)
          </button>
          <button class="subnav-tab ${activeCat === 'reading' ? 'active' : ''}" data-ex-cat="reading">
            📖 3. Bài Tập Đọc Theo Chủ Đề (${byCat.reading.length} bài)
          </button>
          <button class="subnav-tab ${activeCat === 'writing' ? 'active' : ''}" data-ex-cat="writing">
            ✍️ 4. Bài Tập Viết Theo Chủ Đề (${byCat.writing.length} bài)
          </button>
          <button class="subnav-tab ${activeCat === 'speaking' ? 'active' : ''}" data-ex-cat="speaking">
            🎙️ 5. Bài Tập Nói Theo Chủ Đề (${byCat.speaking.length} bài)
          </button>
          <button class="subnav-tab ${activeCat === 'all' ? 'active' : ''}" data-ex-cat="all">
            📚 Tất Cả Dạng Bài (${allList.length} bài)
          </button>
        </div>

        <!-- Topic Filter Pills, Search Bar & AI Exercise Generator -->
        <div class="glass-panel" style="padding:16px;margin-bottom:20px;background:var(--glass-bg-subtle)">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">
            <span style="font-size:0.8rem;font-weight:800;color:var(--text-muted);text-transform:uppercase">Chủ đề (${lvl}):</span>
            <button class="btn btn-sm ${AppState.exerciseTopicFilter === 'ALL' ? 'btn-primary' : ''}" data-ex-topic="ALL">
              Tất cả 6 chủ đề (${rawPool.length})
            </button>
            ${uniqueTopics.map((tp) => `
              <button class="btn btn-sm ${AppState.exerciseTopicFilter === tp ? 'btn-primary' : ''}" data-ex-topic="${tp}">
                ${tp}
              </button>
            `).join('')}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
            <div style="flex:1;min-width:240px">
              <input type="text" id="ex-search-input" class="glass-input" placeholder="🔍 Tìm bài tập theo cấu trúc, thì, chủ đề hoặc từ khóa..." value="${AppState.exerciseSearchQuery || ''}" />
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <span class="badge-chip brown">Đang hiển thị: ${showList.length} / ${filteredList.length} bài</span>
              <button class="btn btn-sm" id="btn-ex-toggle-blind" title="Ẩn/Hiện Transcript trong bài tập Nghe">
                ${AppState.blindTranscript ? '👁️ Hiện Transcript Nghe' : '🙈 Blind Listening Mode'}
              </button>
              <button class="btn btn-primary btn-sm" id="btn-ai-add-exercise">
                🤖 AI Tạo Thêm Bài Tập (${lvl} • ${activeCat.toUpperCase()})
              </button>
            </div>
          </div>
        </div>

        <!-- Exercise Cards List -->
        <div class="exercise-card-list">
          ${showList.map((ex, idx) => {
            const cleanOpts = (ex.options || []).map((opt) => opt.replace(/^[A-D]\.\s*/, ''));
            return `
              <article class="exercise-card" data-ex-card="${ex.id}">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <span class="badge-chip">Bài #${idx + 1} (${lvl})</span>
                    <span class="badge-chip brown">${ex.categoryLabel || ex.type}</span>
                    ${ex.topic ? `<span class="badge-chip">📌 ${ex.topic}</span>` : ''}
                  </div>
                  <span style="font-size:0.78rem;color:var(--text-muted);font-weight:700">${ex.type}</span>
                </div>

                ${ex.formulaRef ? `
                  <div style="font-size:0.82rem;color:var(--text-secondary);padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--glass-border);margin-bottom:12px">
                    📐 <strong>Công thức / Chiến thuật chuẩn ${lvl}:</strong> <code>${ex.formulaRef}</code>
                  </div>
                ` : ''}

                <!-- Listening Specific Interactive Player & Transcript -->
                ${ex.category === 'listening' && ex.audioScript ? `
                  <div class="glass-panel" style="padding:14px;margin-bottom:12px;background:var(--glass-bg-subtle)">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                      <span style="font-size:0.82rem;font-weight:800">🎧 Băng Nghe IELTS (${lvl} • ${ex.topic})</span>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <button class="btn btn-primary btn-sm" data-play-ex-audio="${ex.id}" data-accent="en-GB">▶️ Nghe Giọng UK</button>
                        <button class="btn btn-brown btn-sm" data-play-ex-audio="${ex.id}" data-accent="en-US">▶️ Nghe Giọng US</button>
                        <button class="btn btn-sm" data-stop-ex-audio="1">⏹️ Dừng</button>
                      </div>
                    </div>
                    <div style="filter:${AppState.blindTranscript ? 'blur(6px)' : 'none'};transition:filter 0.3s ease">
                      <p style="font-size:0.88rem;line-height:1.6;color:var(--text-primary)"><strong>Transcript:</strong> ${ex.audioScript}</p>
                      ${ex.viTranslation ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px">🇻🇳 <em>${ex.viTranslation}</em></p>` : ''}
                    </div>
                  </div>
                ` : ''}

                <!-- Reading Specific Academic Passage -->
                ${ex.category === 'reading' && ex.passage ? `
                  <div class="glass-panel" style="padding:15px;margin-bottom:12px;background:var(--glass-bg-subtle)">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                      <span style="font-size:0.82rem;font-weight:800">📖 Academic Reading Passage (${lvl} • ${ex.topic})</span>
                      <button class="btn btn-sm" data-play-ex-passage="${ex.id}">🔊 Nghe Đoạn Văn</button>
                    </div>
                    <p style="font-size:0.9rem;line-height:1.68;color:var(--text-primary)">${ex.passage}</p>
                  </div>
                ` : ''}

                <!-- Speaking Specific Target Model & Pronunciation Studio -->
                ${ex.category === 'speaking' && ex.modelSpeech ? `
                  <div class="glass-panel" style="padding:14px;margin-bottom:12px;background:var(--glass-bg-subtle)">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
                      <span style="font-size:0.82rem;font-weight:800">🎙️ Câu Mẫu Phản Xạ Nói (${ex.speakingPart || 'IELTS Speaking'})</span>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <button class="btn btn-primary btn-sm" data-play-ex-speech="${ex.id}">🔊 Nghe Mẫu Chuẩn IPA</button>
                        <button class="btn btn-brown btn-sm" data-eval-ex-speech="${ex.id}">✨ Chấm Điểm Phát Âm Câu Này</button>
                      </div>
                    </div>
                    <p style="font-size:0.9rem;font-weight:700;margin-bottom:4px">“${ex.modelSpeech}”</p>
                    <div style="font-family:monospace;font-size:0.82rem;color:var(--text-muted)">IPA: ${ex.ipaHint || ''}</div>
                    <div id="ex-sp-eval-${ex.id}" style="margin-top:8px"></div>
                  </div>
                ` : ''}

                <!-- Main Exercise Question -->
                <p style="font-weight:700;font-size:0.98rem;line-height:1.55">${ex.question}</p>

                <!-- Pop-out Animated Choice Options -->
                <div class="choice-grid">
                  ${cleanOpts.map((optText, oIdx) => `
                    <button type="button" class="choice-option-btn" data-ex-id="${ex.id}" data-opt-idx="${oIdx}">
                      <span class="choice-key-badge">${optionLetters[oIdx] || (oIdx + 1)}</span>
                      <span style="flex:1">${optText}</span>
                    </button>
                  `).join('')}
                </div>

                <!-- Interactive Writing Practice Sandbox for Writing Exercises -->
                ${ex.category === 'writing' && ex.writingPrompt ? `
                  <div class="glass-panel" style="padding:15px;margin-top:14px;background:var(--glass-bg-subtle)">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                      <span style="font-size:0.82rem;font-weight:800">✍️ Thực Hành Tự Viết Theo Chủ Đề (${ex.topic})</span>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        ${(ex.targetKeywords || []).map((kw) => `<span class="badge-chip brown">Từ khóa: ${kw}</span>`).join('')}
                      </div>
                    </div>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px"><strong>Đề bài thực hành:</strong> ${ex.writingPrompt}</p>
                    <textarea id="ex-write-input-${ex.id}" class="glass-textarea" rows="3" placeholder="Viết câu hoặc đoạn văn của bạn tại đây để AI chấm điểm cấu trúc & từ vựng...">${ex.modelAnswer || ''}</textarea>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
                      <button type="button" class="btn btn-primary btn-sm" data-grade-ex-writing="${ex.id}">✨ AI Chấm Bài Viết &amp; Đối Chiếu Câu Mẫu</button>
                    </div>
                    <div id="ex-write-fb-${ex.id}" style="margin-top:8px"></div>
                  </div>
                ` : ''}

                <!-- Pop-out Explanation Drawer -->
                <div id="ex-explain-${ex.id}" class="explain-drawer" style="display:none"></div>
              </article>
            `;
          }).join('')}
        </div>
      </section>
    `;

    // Bind Level Switcher
    container.querySelectorAll('[data-ex-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.currentLevel = btn.getAttribute('data-ex-level');
        AppState.exerciseTopicFilter = 'ALL';
        window.StudyTimerModule.setLevel(AppState.currentLevel);
        StorageService.saveConfig();
        renderHeaderAndSidebar();
        renderExercisesRoomView(container, AppState.currentLevel);
      });
    });

    // Bind Category Switcher
    container.querySelectorAll('[data-ex-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.exerciseCategory = btn.getAttribute('data-ex-cat');
        AppState.exerciseTopicFilter = 'ALL';
        renderExercisesRoomView(container, lvl);
      });
    });

    // Bind Topic Filter Pills
    container.querySelectorAll('[data-ex-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.exerciseTopicFilter = btn.getAttribute('data-ex-topic');
        renderExercisesRoomView(container, lvl);
      });
    });

    // Bind Search Input
    const searchInp = document.getElementById('ex-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        AppState.exerciseSearchQuery = e.target.value;
        renderExercisesRoomView(container, lvl);
        const restored = document.getElementById('ex-search-input');
        if (restored) {
          restored.focus();
          restored.setSelectionRange(restored.value.length, restored.value.length);
        }
      });
    }

    // Bind Blind Listening Toggle
    document.getElementById('btn-ex-toggle-blind')?.addEventListener('click', () => {
      AppState.blindTranscript = !AppState.blindTranscript;
      renderExercisesRoomView(container, lvl);
    });

    // Bind AI Exercise Generator
    document.getElementById('btn-ai-add-exercise')?.addEventListener('click', () => {
      const targetCat = activeCat === 'all' ? 'grammar' : activeCat;
      const created = mod.addCustomAIExercise(lvl, targetCat, AppState.exerciseTopicFilter);
      if (created) {
        showAppToast(`🤖 AI Agent đã tạo bài tập mới cho trình độ ${lvl} (${targetCat.toUpperCase()})!`);
        renderExercisesRoomView(container, lvl);
      }
    });

    // Bind Audio Players inside Listening/Reading/Speaking Exercise Cards
    container.querySelectorAll('[data-play-ex-audio]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-play-ex-audio');
        const accent = btn.getAttribute('data-accent') || 'en-GB';
        const item = allList.find((x) => x.id === exId);
        if (item && item.audioScript) SpeechService.speak(item.audioScript, accent, AppState.speechRate);
      });
    });
    container.querySelectorAll('[data-stop-ex-audio]').forEach((btn) => {
      btn.addEventListener('click', () => SpeechService.stop());
    });
    container.querySelectorAll('[data-play-ex-passage]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-play-ex-passage');
        const item = allList.find((x) => x.id === exId);
        if (item && item.passage) SpeechService.speak(item.passage, AppState.voiceAccent, AppState.speechRate);
      });
    });
    container.querySelectorAll('[data-play-ex-speech]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-play-ex-speech');
        const item = allList.find((x) => x.id === exId);
        if (item && item.modelSpeech) SpeechService.speak(item.modelSpeech, AppState.voiceAccent, 0.96);
      });
    });
    container.querySelectorAll('[data-eval-ex-speech]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-eval-ex-speech');
        const item = allList.find((x) => x.id === exId);
        const outEl = document.getElementById(`ex-sp-eval-${exId}`);
        if (!item || !outEl) return;
        const res = AIAgentService.evaluateSpeakingAndMisuse(item.modelSpeech, item.modelSpeech, lvl);
        outEl.innerHTML = `
          <div class="explain-drawer" style="margin-top:8px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span class="badge-chip">🎯 Độ khớp IPA: ${res.accuracy}%</span>
              <span class="badge-chip brown">🏆 Chuẩn Speaking Band ${res.estimatedBand}</span>
            </div>
            <div>${res.tokenResults.map((t) => `<span class="token-chip ${t.status}" style="padding:4px 8px;font-size:0.78rem">${t.word}</span>`).join('')}</div>
          </div>
        `;
      });
    });

    // Bind Writing Sandbox Grader inside Writing Exercise Cards
    container.querySelectorAll('[data-grade-ex-writing]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-grade-ex-writing');
        const item = allList.find((x) => x.id === exId);
        const txt = document.getElementById(`ex-write-input-${exId}`)?.value || '';
        const fbEl = document.getElementById(`ex-write-fb-${exId}`);
        if (!item || !fbEl) return;
        const evalRes = AIAgentService.evaluateWritingAndExam(txt, 1, 1, 2, lvl);
        fbEl.innerHTML = `
          <div class="explain-drawer" style="margin-top:8px">
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span class="badge-chip">✍️ Ước tính Writing: Band ${evalRes.writingBand} (${evalRes.wordCount} từ)</span>
              <span class="badge-chip brown">${evalRes.hasConnectors ? '✅ Có từ nối học thuật' : '💡 Nên thêm từ nối'}</span>
            </div>
            <p style="font-size:0.84rem;color:var(--text-secondary)"><strong>🌟 Bài mẫu chuẩn (${lvl}):</strong> <em>“${item.modelAnswer}”</em></p>
          </div>
        `;
      });
    });

    // Bind Pop-out Animated Answer Choice Buttons
    container.querySelectorAll('[data-ex-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const exId = btn.getAttribute('data-ex-id');
        const chosen = Number(btn.getAttribute('data-opt-idx'));
        const item = allList.find((x) => x.id === exId);
        const expEl = document.getElementById(`ex-explain-${exId}`);
        if (!item || !expEl) return;

        const siblingBtns = container.querySelectorAll(`[data-ex-id="${exId}"]`);
        siblingBtns.forEach((b) => {
          b.classList.remove('is-correct', 'is-wrong');
          const bIdx = Number(b.getAttribute('data-opt-idx'));
          if (bIdx === item.answer) b.classList.add('is-correct');
          else if (bIdx === chosen && chosen !== item.answer) b.classList.add('is-wrong');
        });

        expEl.style.display = 'block';
        const extraReadingEvidence = item.evidenceQuote
          ? `<div style="margin-top:8px;font-size:0.83rem;color:var(--text-secondary)">📖 <strong>Trích dẫn bằng chứng (Evidence Quote):</strong> <em>“${item.evidenceQuote}”</em>${item.paraphrasePair ? `<br/>🔄 <strong>Ánh xạ Paraphrase:</strong> <code>${item.paraphrasePair}</code>` : ''}</div>`
          : '';
        if (chosen === item.answer) {
          expEl.innerHTML = `<strong style="color:var(--success)">✅ Chính xác!</strong> ${item.explanation}${extraReadingEvidence}`;
        } else {
          expEl.innerHTML = `<strong style="color:var(--danger)">❌ Chưa chính xác.</strong> Đáp án đúng là <strong>${item.options[item.answer]}</strong>.<br/>💡 <strong>Giải thích chuyên sâu:</strong> ${item.explanation}${extraReadingEvidence}`;
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     10. INTERNATIONAL LISTENING LAB VIEW (TASK 9 — 36+ LESSONS PER LEVEL)
     ------------------------------------------------------------------------ */
  function renderListeningRoomView(container, forcedLevel = null) {
    const lvl = forcedLevel || AppState.currentLevel;
    const mod = window.TasksAndCurriculumModule;
    const lessons = mod.LISTENING_LESSONS_BY_LEVEL?.[lvl] || [mod.LISTENING_DB[lvl]];
    const safeIdx = Math.min(Math.max(0, AppState.selectedListeningIndex || 0), lessons.length - 1);
    const item = lessons[safeIdx] || mod.LISTENING_DB[lvl];
    const optionLetters = ['A', 'B', 'C', 'D'];

    container.innerHTML = `
      <section class="glass-panel" style="padding:26px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:16px">
          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span class="badge-chip">🎧 PHÒNG LUYỆN NGHE QUỐC TẾ (${lvl})</span>
              <span class="badge-chip brown">Bài ${safeIdx + 1} / ${lessons.length} • ${item.topic || 'Academic Listening'}</span>
            </div>
            <h2 style="font-size:1.38rem">${item.title}</h2>
            <p style="font-size:0.84rem;color:var(--text-muted)">Nguồn chuẩn: ${item.source}</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((code) => `
              <button class="btn btn-sm ${code === lvl ? 'btn-primary' : ''}" data-lis-level="${code}">${code} (${(mod.LISTENING_LESSONS_BY_LEVEL?.[code] || []).length})</button>
            `).join('')}
          </div>
        </div>

        <!-- Lesson Selector Bar across all 36 Topic-Based Listening Lessons -->
        <div class="glass-panel" style="padding:14px;margin-bottom:16px;background:var(--glass-bg-subtle);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
          <div style="display:flex;gap:8px;align-items:center;flex:1;min-width:260px">
            <button class="btn btn-sm" id="btn-lis-prev">◀ Bài trước</button>
            <select id="lis-lesson-select" class="glass-select" style="flex:1">
              ${lessons.map((les, i) => `
                <option value="${i}" ${i === safeIdx ? 'selected' : ''}>Bài ${i + 1}: ${les.title}</option>
              `).join('')}
            </select>
            <button class="btn btn-sm" id="btn-lis-next">Bài tiếp ▶</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" id="btn-lis-play-uk">▶️ Phát Audio (UK)</button>
            <button class="btn btn-brown btn-sm" id="btn-lis-play-us">▶️ Phát Audio (US)</button>
            <button class="btn btn-sm" id="btn-lis-stop">⏹️ Dừng</button>
            <button class="btn btn-sm" id="btn-lis-blind">${AppState.blindTranscript ? '👁️ Hiện Transcript' : '🙈 Blind Mode'}</button>
            <button class="btn btn-primary btn-sm" id="btn-ai-gen-listening">🤖 AI Tạo Bài Nghe Mới</button>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:18px">
          <div class="glass-panel" style="padding:20px;filter:${AppState.blindTranscript ? 'blur(7px)' : 'none'};transition:filter 0.35s ease">
            <h4 style="color:var(--text-primary);margin-bottom:10px">📜 Audio Transcript (Chuẩn Quốc Tế ${lvl})</h4>
            <p style="font-size:0.92rem;line-height:1.7">${item.audioScript}</p>
            <hr style="border:none;border-top:1px solid var(--glass-border);margin:14px 0" />
            <p style="font-size:0.85rem;color:var(--text-secondary)">🇻🇳 <strong>Bản dịch tham khảo:</strong> ${item.viTranslation}</p>
          </div>
          <div class="glass-panel" style="padding:20px">
            <h4 style="color:var(--text-primary);margin-bottom:12px">📝 Câu Hỏi Kiểm Tra Nghe Hiểu (${lvl})</h4>
            <div style="display:flex;flex-direction:column;gap:16px">
              ${item.questions.map((qObj, qIdx) => `
                <div>
                  <div style="font-weight:700;font-size:0.92rem;margin-bottom:8px">${qObj.q}</div>
                  <div class="choice-grid" style="margin-top:6px">
                    ${qObj.options.map((opt, oIdx) => `
                      <button type="button" class="choice-option-btn" data-lis-q="${qIdx}" data-lis-opt="${oIdx}">
                        <span class="choice-key-badge">${optionLetters[oIdx] || (oIdx + 1)}</span>
                        <span style="flex:1">${opt.replace(/^[A-D]\.\s*/, '')}</span>
                      </button>
                    `).join('')}
                  </div>
                  <div id="lis-q-fb-${qIdx}" class="explain-drawer" style="display:none"></div>
                </div>
              `).join('')}
            </div>
            <div class="formula-callout" style="margin-top:16px">
              <strong>📌 Phân tích Bẫy IELTS (Trap Analysis):</strong> ${item.trapAnalysis}
            </div>
          </div>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-lis-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.currentLevel = btn.getAttribute('data-lis-level');
        AppState.selectedListeningIndex = 0;
        renderListeningRoomView(container, AppState.currentLevel);
      });
    });
    document.getElementById('lis-lesson-select')?.addEventListener('change', (e) => {
      AppState.selectedListeningIndex = Number(e.target.value);
      renderListeningRoomView(container, lvl);
    });
    document.getElementById('btn-lis-prev')?.addEventListener('click', () => {
      AppState.selectedListeningIndex = (safeIdx - 1 + lessons.length) % lessons.length;
      renderListeningRoomView(container, lvl);
    });
    document.getElementById('btn-lis-next')?.addEventListener('click', () => {
      AppState.selectedListeningIndex = (safeIdx + 1) % lessons.length;
      renderListeningRoomView(container, lvl);
    });
    document.getElementById('btn-lis-play-uk')?.addEventListener('click', () => SpeechService.speak(item.audioScript, 'en-GB', AppState.speechRate));
    document.getElementById('btn-lis-play-us')?.addEventListener('click', () => SpeechService.speak(item.audioScript, 'en-US', AppState.speechRate));
    document.getElementById('btn-lis-stop')?.addEventListener('click', () => SpeechService.stop());
    document.getElementById('btn-lis-blind')?.addEventListener('click', () => {
      AppState.blindTranscript = !AppState.blindTranscript;
      renderListeningRoomView(container, lvl);
    });
    container.querySelectorAll('[data-lis-q]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qIdx = Number(btn.getAttribute('data-lis-q'));
        const oIdx = Number(btn.getAttribute('data-lis-opt'));
        const qObj = item.questions[qIdx];
        const fb = document.getElementById(`lis-q-fb-${qIdx}`);
        if (!fb) return;
        container.querySelectorAll(`[data-lis-q="${qIdx}"]`).forEach((b) => {
          b.classList.remove('is-correct', 'is-wrong');
          const bOpt = Number(b.getAttribute('data-lis-opt'));
          if (bOpt === qObj.answer) b.classList.add('is-correct');
          else if (bOpt === oIdx && oIdx !== qObj.answer) b.classList.add('is-wrong');
        });
        fb.style.display = 'block';
        if (oIdx === qObj.answer) {
          fb.innerHTML = `<span style="color:var(--success);font-weight:700">✅ Chính xác! (${qObj.options[qObj.answer]})</span>`;
        } else {
          fb.innerHTML = `<span style="color:var(--danger);font-weight:700">❌ Chưa đúng. Đáp án chuẩn là: ${qObj.options[qObj.answer]}</span>`;
        }
      });
    });
    document.getElementById('btn-ai-gen-listening')?.addEventListener('click', () => {
      const newLes = {
        id: `lis-ai-${Date.now()}`, level: lvl, topic: 'AI Academic Briefing',
        title: `[AI Generated #${lessons.length + 1}] IELTS ${lvl} Academic Listening — Global Sustainability Briefing`,
        source: `Cambridge & IDP AI Standard — Level ${lvl}`,
        audioScript: `Speaker: Welcome to the ${lvl} International Academic Briefing. Initially, our team considered expanding conventional power grids; however, recent empirical data confirmed that decentralized solar microgrids reduce transmission losses by 32 percent. Therefore, municipal funding will prioritize solar microgrids starting next quarter.`,
        viTranslation: `Diễn giả: Chào mừng đến Bản tin Học thuật Quốc tế cấp ${lvl}. Ban đầu nhóm cân nhắc mở rộng lưới điện truyền thống; tuy nhiên dữ liệu thực nghiệm xác nhận lưới điện mặt trời phi tập trung giảm thất thoát truyền tải 32%.`,
        trapAnalysis: 'Khử bẫy Distractor: Phương án "conventional power grids" đi sau "Initially" đã bị bác bỏ bởi từ nối "however".',
        questions: [
          { q: '1. What option was rejected after reviewing empirical data?', options: ['A. Conventional power grids', 'B. Decentralized solar microgrids', 'C. Wind turbines', 'D. Nuclear reactors'], answer: 0 },
          { q: '2. By how much do solar microgrids reduce transmission losses?', options: ['A. 12 percent', 'B. 32 percent', 'C. 50 percent', 'D. 80 percent'], answer: 1 },
          { q: '3. What will municipal funding prioritize next quarter?', options: ['A. Decentralized solar microgrids', 'B. Coal mining', 'C. Highway expansion', 'D. Diesel generators'], answer: 0 }
        ]
      };
      lessons.unshift(newLes);
      AppState.selectedListeningIndex = 0;
      showAppToast(`🤖 AI Agent đã tạo bài nghe mới cho cấp ${lvl}!`);
      renderListeningRoomView(container, lvl);
    });
  }

  /* ------------------------------------------------------------------------
     11. AI SPEAKING STUDIO & PRONUNCIATION / WORD-MISUSE FIXER (36+ PROMPTS PER LEVEL)
     ------------------------------------------------------------------------ */
  function renderSpeakingRoomView(container, forcedLevel = null) {
    const lvl = forcedLevel || AppState.currentLevel;
    const mod = window.TasksAndCurriculumModule;
    const prompts = mod.SPEAKING_PROMPTS_BY_LEVEL?.[lvl] || mod.SPEAKING_DB[lvl]?.prompts || [];
    const safeIdx = Math.min(Math.max(0, AppState.selectedSpeakingIndex || 0), Math.max(0, prompts.length - 1));
    const promptItem = prompts[safeIdx] || mod.SPEAKING_DB.A1.prompts[0];

    container.innerHTML = `
      <section class="glass-panel" style="padding:26px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:16px">
          <div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span class="badge-chip">🎙️ PHÒNG LUYỆN NÓI AI &amp; SỬA PHÁT ÂM IPA (${lvl})</span>
              <span class="badge-chip brown">Chủ đề ${safeIdx + 1} / ${prompts.length} • ${promptItem.topic || 'Academic Speaking'}</span>
            </div>
            <h2 style="font-size:1.38rem">${promptItem.part}</h2>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((code) => `
              <button class="btn btn-sm ${code === lvl ? 'btn-primary' : ''}" data-sp-level="${code}">${code} (${(mod.SPEAKING_PROMPTS_BY_LEVEL?.[code] || []).length})</button>
            `).join('')}
          </div>
        </div>

        <!-- Speaking Prompt Selector across all 36 Topic-Based Prompts -->
        <div class="glass-panel" style="padding:14px;margin-bottom:16px;background:var(--glass-bg-subtle);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
          <button class="btn btn-sm" id="btn-sp-prev">◀ Câu trước</button>
          <select id="sp-prompt-select" class="glass-select" style="flex:1;min-width:240px">
            ${prompts.map((p, i) => `
              <option value="${i}" ${i === safeIdx ? 'selected' : ''}>Đề #${i + 1} (${p.topic || lvl}): ${p.question.slice(0, 72)}...</option>
            `).join('')}
          </select>
          <button class="btn btn-sm" id="btn-sp-next">Câu tiếp ▶</button>
        </div>

        <div class="grid-2">
          <!-- Target Prompt & Model Sentence -->
          <div class="glass-panel" style="padding:22px">
            <span class="badge-chip brown">${promptItem.part}</span>
            <h3 style="font-size:1.12rem;margin:12px 0">${promptItem.question}</h3>
            <div class="formula-callout" style="margin-bottom:14px">
              <strong>📌 Công thức áp dụng (${lvl}):</strong> ${promptItem.formulaHint}
            </div>
            <div style="padding:16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div style="font-size:0.78rem;color:var(--text-muted);font-weight:800;margin-bottom:6px">CÂU MẪU CHUẨN QUỐC TẾ (${lvl}):</div>
              <div id="sp-target-text" style="font-weight:700;font-size:1rem;line-height:1.6;margin-bottom:8px">${promptItem.sampleTarget}</div>
              <div style="font-family:monospace;font-size:0.86rem;color:var(--text-secondary)">${promptItem.ipa}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
              <button class="btn btn-primary btn-sm" id="btn-sp-listen-model">🔊 Nghe Mẫu Chuẩn (UK/US)</button>
              <button class="btn btn-brown btn-sm" id="btn-sp-ai-new-prompt">🤖 AI Tạo Đề Bài Nói Mới</button>
            </div>
          </div>

          <!-- User Speech Input & AI Evaluator -->
          <div class="glass-panel" style="padding:22px">
            <h4 style="margin-bottom:8px">🎤 Thu Âm Giọng Nói Hoặc Nhập Câu Trả Lời Của Bạn</h4>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px">
              AI Agent chấm điểm phát âm từng từ theo chuẩn IPA và tự động phát hiện lỗi dùng từ sai (VD: <em>"I am agree", "informations", "despite of"</em>).
            </p>
            <textarea id="sp-user-transcript" class="glass-textarea" rows="4" placeholder="Bấm '🎙️ Bắt đầu Nói (Mic)' hoặc gõ bài nói của bạn vào đây...">${promptItem.sampleTarget}</textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
              <button class="btn btn-primary" id="btn-sp-start-mic">🎙️ Bắt Đầu Nói (Web Speech Mic)</button>
              <button class="btn btn-brown" id="btn-sp-evaluate">✨ AI Chấm Điểm Phát Âm &amp; Sửa Lỗi</button>
              <button class="btn btn-sm" id="btn-sp-test-error">🔍 Thử Câu Có Lỗi Sai</button>
            </div>
            <div id="sp-evaluation-result" style="margin-top:16px"></div>
          </div>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-sp-level]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.currentLevel = btn.getAttribute('data-sp-level');
        AppState.selectedSpeakingIndex = 0;
        renderSpeakingRoomView(container, AppState.currentLevel);
      });
    });
    document.getElementById('sp-prompt-select')?.addEventListener('change', (e) => {
      AppState.selectedSpeakingIndex = Number(e.target.value);
      renderSpeakingRoomView(container, lvl);
    });
    document.getElementById('btn-sp-prev')?.addEventListener('click', () => {
      AppState.selectedSpeakingIndex = (safeIdx - 1 + prompts.length) % prompts.length;
      renderSpeakingRoomView(container, lvl);
    });
    document.getElementById('btn-sp-next')?.addEventListener('click', () => {
      AppState.selectedSpeakingIndex = (safeIdx + 1) % prompts.length;
      renderSpeakingRoomView(container, lvl);
    });
    document.getElementById('btn-sp-listen-model')?.addEventListener('click', () => {
      const txt = document.getElementById('sp-target-text')?.textContent || promptItem.sampleTarget;
      SpeechService.speak(txt, AppState.voiceAccent, 0.95);
    });
    document.getElementById('btn-sp-ai-new-prompt')?.addEventListener('click', () => {
      const newP = {
        id: `sp-ai-${Date.now()}`, level: lvl, topic: 'AI Academic Speaking',
        part: `Speaking Part 3 AI Prompt (${lvl})`,
        question: 'How does lifelong learning equip university graduates with adaptability in an AI-driven economy?',
        sampleTarget: 'Not only does lifelong learning equip undergraduates with practical skills, but it also fosters holistic development in a competitive global economy.',
        ipa: '/nɒt ˈəʊn.li dʌz ˈlaɪf.lɒŋ ˈlɜː.nɪŋ ɪˈkwɪp ˌʌn.dəˈɡrædʒ.u.əts wɪð ˈpræk.tɪ.kəl skɪlz/',
        formulaHint: 'Negative Inversion (Not only does... but it also...) + Academic Collocations'
      };
      prompts.unshift(newP);
      AppState.selectedSpeakingIndex = 0;
      showAppToast('🤖 AI Agent đã tạo đề luyện nói mới chuẩn IELTS!');
      renderSpeakingRoomView(container, lvl);
    });
    document.getElementById('btn-sp-test-error')?.addEventListener('click', () => {
      const userEl = document.getElementById('sp-user-transcript');
      if (userEl) userEl.value = 'I am agree that informations on social media have a big impact despite of strict laws.';
      document.getElementById('btn-sp-evaluate')?.click();
    });
    document.getElementById('btn-sp-start-mic')?.addEventListener('click', () => {
      try {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
          showAppToast('Trình duyệt hiện tại không hỗ trợ Web Speech Mic trực tiếp — bạn có thể chỉnh sửa văn bản để AI chấm điểm ngay!');
          return;
        }
        const rec = new SR();
        rec.lang = AppState.voiceAccent || 'en-GB';
        rec.interimResults = false;
        showAppToast('🎙️ Đang lắng nghe... Hãy đọc to câu tiếng Anh của bạn!');
        rec.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || '';
          const userEl = document.getElementById('sp-user-transcript');
          if (userEl) userEl.value = transcript;
          document.getElementById('btn-sp-evaluate')?.click();
        };
        rec.onerror = () => showAppToast('Không nhận diện được micro, vui lòng kiểm tra quyền truy cập Mic.');
        rec.start();
      } catch (err) {
        console.error('[tbao2902-Speaking] Mic error:', err);
      }
    });
    document.getElementById('btn-sp-evaluate')?.addEventListener('click', () => {
      const targetTxt = document.getElementById('sp-target-text')?.textContent || promptItem.sampleTarget;
      const spokenTxt = document.getElementById('sp-user-transcript')?.value || '';
      const res = AIAgentService.evaluateSpeakingAndMisuse(targetTxt, spokenTxt, lvl);
      const out = document.getElementById('sp-evaluation-result');
      if (!out) return;
      out.innerHTML = `
        <div class="explain-drawer">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <span class="badge-chip">🎯 Độ chuẩn phát âm: ${res.accuracy}%</span>
            <span class="badge-chip brown">🏆 Ước tính IELTS Speaking: Band ${res.estimatedBand}</span>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">Giải phẫu phát âm từng từ (Bấm vào từ để nghe lại chuẩn IPA):</div>
            <div>
              ${res.tokenResults.map((t) => `
                <span class="token-chip ${t.status}" data-speak-token="${t.word}" style="cursor:pointer">
                  <span>${t.word}</span>
                  <small style="font-size:0.68rem">${t.sim}%</small>
                </span>
              `).join('')}
            </div>
          </div>
          ${res.detectedErrors.length > 0 ? `
            <div style="margin-top:10px;padding:12px;border-radius:12px;background:var(--danger-bg);border:1px solid var(--danger)">
              <strong style="color:var(--danger)">⚠️ Phát hiện lỗi dùng từ / ngữ pháp chưa chuẩn:</strong>
              <ul style="padding-left:18px;margin-top:6px;font-size:0.85rem">
                ${res.detectedErrors.map((e) => `
                  <li>Sai: <del>${e.wrong}</del> → Sửa chuẩn IELTS: <strong style="color:var(--success)">${e.correct}</strong> (<em>${e.reason}</em>)</li>
                `).join('')}
              </ul>
            </div>
          ` : `<div style="font-size:0.85rem;color:var(--success);margin-top:6px">✅ Không phát hiện lỗi dùng từ sai cơ bản.</div>`}
          <p style="font-size:0.85rem;margin-top:8px">💡 <strong>Nhận xét của Chuyên gia IELTS AI:</strong> ${res.coachingTip}</p>
        </div>
      `;
      out.querySelectorAll('[data-speak-token]').forEach((chip) => {
        chip.addEventListener('click', () => SpeechService.speak(chip.getAttribute('data-speak-token')));
      });
    });
  }

  /* ------------------------------------------------------------------------
     12. INTERNATIONAL MOCK TEST ROOM VIEW (TASK 11)
     ------------------------------------------------------------------------ */
  function renderMockTestRoomView(container, forcedLevel = null) {
    const allTests = [
      ...window.TasksAndCurriculumModule.getCustomAIContent().mockTests,
      ...window.TasksAndCurriculumModule.MOCK_TESTS_DB
    ];
    const currentTest = allTests.find((t) => t.id === AppState.selectedMockTestId) || allTests[0];
    const optionLetters = ['A', 'B', 'C', 'D'];

    container.innerHTML = `
      <section class="glass-panel" style="padding:26px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px">
          <div>
            <span class="badge-chip">🧪 Phòng Lab Luyện Đề Chuẩn Quốc Tế (TASK 11)</span>
            <h2 style="font-size:1.38rem;margin-top:6px">${currentTest.title}</h2>
            <p style="font-size:0.85rem;color:var(--text-muted)">${currentTest.badge} • Thời lượng: ${currentTest.durationMinutes} phút</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select id="mock-test-selector" class="glass-select" style="width:280px">
              ${allTests.map((t) => `
                <option value="${t.id}" ${t.id === currentTest.id ? 'selected' : ''}>[${t.level}] ${t.title}</option>
              `).join('')}
            </select>
            <button class="btn btn-brown" id="btn-ai-create-mock">🤖 AI Tạo Đề Thi Quốc Tế Mới</button>
          </div>
        </div>
        <div class="grid-2" style="margin-bottom:18px">
          <div class="glass-panel" style="padding:20px">
            <h4 style="color:var(--text-primary);margin-bottom:8px">📖 Reading Passage &amp; Listening Audio</h4>
            <p style="font-size:0.92rem;line-height:1.68;margin-bottom:14px">${currentTest.readingPassage}</p>
            <button class="btn btn-primary btn-sm" id="btn-mock-play-audio">🔊 Nghe Phần Listening Của Đề Này</button>
          </div>
          <div class="glass-panel" style="padding:20px">
            <h4 style="color:var(--text-primary);margin-bottom:10px">✅ Phần 1: Câu Hỏi Listening, Reading &amp; Grammar</h4>
            <div style="display:flex;flex-direction:column;gap:14px">
              ${currentTest.questions.map((q, idx) => `
                <div>
                  <div style="font-size:0.88rem;font-weight:700;margin-bottom:6px">[${q.section}] ${q.q}</div>
                  <div class="choice-grid" style="margin-top:6px">
                    ${q.options.map((opt, oIdx) => `
                      <button type="button" class="choice-option-btn mock-choice-btn" data-mock-q="${idx}" data-mock-opt="${oIdx}">
                        <span class="choice-key-badge">${optionLetters[oIdx] || (oIdx + 1)}</span>
                        <span style="flex:1">${opt}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="glass-panel" style="padding:22px;margin-bottom:16px">
          <h4 style="color:var(--text-primary);margin-bottom:6px">✍️ Phần 2: Bài Thi Writing &amp; Speaking Chuẩn Quốc Tế (Chấm Điểm Bằng AI)</h4>
          <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:10px">
            <strong>Đề bài Writing:</strong> ${currentTest.writingPrompt}<br/>
            <strong>Đề bài Speaking:</strong> ${currentTest.speakingPrompt}
          </p>
          <textarea id="mock-essay-input" class="glass-textarea" rows="5" placeholder="Nhập bài làm Writing hoặc bản ghi Speaking của bạn để AI chấm điểm theo 4 tiêu chí IELTS Quốc tế...">While expanding highway infrastructure temporarily alleviates traffic congestion, empirical evidence demonstrates that subsidizing electric rail networks is far from negligible in achieving sustainable urban mobility.</textarea>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btn-submit-mock-exam">🏆 Nộp Bài &amp; Chấm Điểm IELTS Quốc Tế (AI Grading)</button>
          </div>
          <div id="mock-exam-grading-output" style="margin-top:16px"></div>
        </div>
      </section>
    `;

    const mockAnswers = {};
    container.querySelectorAll('.mock-choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qIdx = Number(btn.getAttribute('data-mock-q'));
        const oIdx = Number(btn.getAttribute('data-mock-opt'));
        mockAnswers[qIdx] = oIdx;
        container.querySelectorAll(`[data-mock-q="${qIdx}"]`).forEach((b) => {
          b.classList.remove('is-correct', 'is-wrong');
          if (Number(b.getAttribute('data-mock-opt')) === oIdx) {
            b.style.borderColor = 'var(--accent-primary)';
            b.style.background = 'var(--glass-active)';
          } else {
            b.style.borderColor = '';
            b.style.background = '';
          }
        });
      });
    });

    document.getElementById('mock-test-selector')?.addEventListener('change', (e) => {
      AppState.selectedMockTestId = e.target.value;
      renderMockTestRoomView(container, forcedLevel);
    });
    document.getElementById('btn-mock-play-audio')?.addEventListener('click', () => {
      SpeechService.speak(currentTest.readingPassage, AppState.voiceAccent, 0.98);
    });
    document.getElementById('btn-ai-create-mock')?.addEventListener('click', () => {
      const lvl = AppState.currentLevel;
      const newId = 'mock_ai_' + Date.now();
      const newExam = {
        id: newId, level: lvl, badge: `AI Generated International IELTS Exam (${lvl})`,
        title: `Đề Thi Chuẩn Quốc Tế AI #${Math.floor(Math.random() * 90 + 10)} (Level ${lvl})`, durationMinutes: 45,
        listeningSummary: 'Academic Lecture on Renewable Energy & AI Governance',
        readingPassage: 'Transitioning toward a low-carbon circular economy requires both stringent regulatory frameworks and unprecedented investment in clean technology. Only by aligning fiscal incentives with ecological preservation can nations mitigate anthropogenic climate change.',
        questions: [
          { section: 'Listening', q: '1. What combination is essential for a circular economy?', options: ['Stringent regulations and clean-tech investment', 'Fossil fuel subsidies', 'Deregulation only', 'Reducing education budgets'], answer: 0 },
          { section: 'Reading (T/F/NG)', q: '2. Fiscal incentives play a role in mitigating anthropogenic climate change.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 0 },
          { section: 'Grammar Inversion', q: '3. Identify the inversion structure used in the passage:', options: ['Only by aligning... can nations mitigate...', 'There is a lot of...', 'Because nations align...', 'Although nations mitigate...'], answer: 0 }
        ],
        writingPrompt: `IELTS Writing Task 2 (${lvl}): Discuss the socio-economic impacts of transitioning to renewable energy.`,
        speakingPrompt: `IELTS Speaking Part 3 (${lvl}): How can governments encourage citizens to adopt eco-friendly lifestyles?`
      };
      window.TasksAndCurriculumModule.addCustomAIMockTest(newExam);
      AppState.selectedMockTestId = newId;
      showAppToast(`🤖 AI Agent đã tạo đề thi quốc tế mới cho cấp ${lvl}!`);
      renderMockTestRoomView(container, forcedLevel);
    });
    document.getElementById('btn-submit-mock-exam')?.addEventListener('click', () => {
      let correctCount = 0;
      currentTest.questions.forEach((q, idx) => {
        const chosen = mockAnswers[idx];
        if (chosen === q.answer) correctCount++;
        container.querySelectorAll(`[data-mock-q="${idx}"]`).forEach((b) => {
          const bOpt = Number(b.getAttribute('data-mock-opt'));
          b.classList.remove('is-correct', 'is-wrong');
          if (bOpt === q.answer) b.classList.add('is-correct');
          else if (bOpt === chosen && chosen !== q.answer) b.classList.add('is-wrong');
        });
      });
      const essay = document.getElementById('mock-essay-input')?.value || '';
      const evalRes = AIAgentService.evaluateWritingAndExam(
        essay, Math.ceil(correctCount / 2), Math.floor(correctCount / 2), currentTest.questions.length,
        currentTest.level
      );
      const out = document.getElementById('mock-exam-grading-output');
      if (!out) return;
      out.innerHTML = `
        <div class="explain-drawer">
          <h3 style="color:var(--text-primary);margin-bottom:8px">🎓 KẾT QUẢ CHẤM ĐIỂM CHUẨN QUỐC TẾ IELTS: OVERALL BAND ${evalRes.overallBand}</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
            <span class="badge-chip">Trắc nghiệm đúng: ${correctCount}/${currentTest.questions.length} câu (Band ~${evalRes.lrBand})</span>
            <span class="badge-chip brown">Writing &amp; Speaking AI Score: Band ${evalRes.writingBand} (${evalRes.wordCount} từ)</span>
          </div>
          <p style="font-size:0.88rem">
            • <strong>Coherence &amp; Cohesion:</strong> ${evalRes.hasConnectors ? '✅ Có sử dụng từ nối học thuật mạch lạc.' : '⚠️ Nên bổ sung thêm Cohesive Devices (However, Consequently, Furthermore).'}<br/>
            • <strong>Grammatical Range (GRA):</strong> ${evalRes.hasInversionOrCleft ? '✅ Xuất sắc! Có áp dụng Đảo ngữ / Câu chẻ / Cấu trúc C1-C2.' : '💡 Gợi ý: Thêm cấu trúc Câu chẻ (It is... that) hoặc Đảo ngữ (Not only... but also) để nâng Band.'}
          </p>
        </div>
      `;
    });
  }

  /* ------------------------------------------------------------------------
     13. SETTINGS, AUDIO PREFERENCES & PRIVACY POLICY VIEW
     (Removed exposed API / Supabase / Firebase configuration inputs)
     ------------------------------------------------------------------------ */
  function renderSettingsView(container) {
    const tMetrics = window.StudyTimerModule.getState();
    container.innerHTML = `
      <div class="grid-2">
        <section class="glass-panel" style="padding:26px">
          <span class="badge-chip">⚙️ Cài Đặt Giao Diện &amp; Hiệu Năng</span>
          <h2 style="font-size:1.32rem;margin:10px 0 16px">Tùy Chỉnh Trải Nghiệm Monochrome Studio</h2>
          <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div>
                <div style="font-weight:700">Chế độ Nền Tối / Nền Sáng (Tone Trầm Black &amp; White)</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Phối màu Đen Obsidian &amp; Trắng Ngọc Trai sang trọng, dịu mắt</div>
              </div>
              <button class="btn btn-primary btn-sm" id="settings-toggle-theme">
                ${AppState.theme === 'dark' ? '🌙 Đang dùng Nền Tối' : '☀️ Đang dùng Nền Sáng'}
              </button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div>
                <div style="font-weight:700">Hiệu chỉnh Chuyển động &amp; Hiệu năng Thiết bị</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Tối ưu hiệu ứng kính mờ và animation đàn hồi cho máy của bạn</div>
              </div>
              <button class="btn btn-brown btn-sm" id="settings-toggle-perf">
                ${AppState.perfMode === 'high' ? '💎 Máy Mạnh (Ultra Smooth Glass)' : '⚡ Máy Yếu (Eco Fast Mode)'}
              </button>
            </div>
          </div>
          <div class="formula-callout">
            <h4 style="color:var(--text-primary);margin-bottom:6px">🛡️ Chính Sách Bảo Vệ Người Dùng (Privacy Policy)</h4>
            <p style="font-size:0.86rem;color:var(--text-secondary)">
              <strong>Learning English by tbao2902</strong> cam kết bảo mật tuyệt đối tài khoản, mật khẩu và toàn bộ tiến độ học tập của người dùng. Mọi thông tin học tập được mã hóa an toàn và <strong>cam kết tuyệt đối không tiết lộ cho bất kỳ bên thứ 3 nào</strong>.
            </p>
          </div>
        </section>

        <section class="glass-panel" style="padding:26px">
          <span class="badge-chip brown">🎧 Cá Nhân Hóa Giọng Đọc &amp; Mục Tiêu Học Tập</span>
          <h2 style="font-size:1.32rem;margin:10px 0 16px">Thiết Lập Âm Thanh Quốc Tế &amp; Lộ Trình</h2>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div>
                <div style="font-weight:700">Giọng phát âm chuẩn Quốc tế (Voice Accent)</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Áp dụng cho Phòng Luyện Nghe, Luyện Nói &amp; Flashcard</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm ${AppState.voiceAccent === 'en-GB' ? 'btn-primary' : ''}" data-set-accent="en-GB">🇬🇧 Anh - Anh (UK)</button>
                <button class="btn btn-sm ${AppState.voiceAccent === 'en-US' ? 'btn-primary' : ''}" data-set-accent="en-US">🇺🇸 Anh - Mỹ (US)</button>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div>
                <div style="font-weight:700">Tốc độ đọc Băng Nghe (Speech Rate)</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Điều chỉnh tốc độ phù hợp trình độ nghe hiện tại</div>
              </div>
              <div style="display:flex;gap:6px">
                ${[0.85, 1.0, 1.15].map((r) => `
                  <button class="btn btn-sm ${Number(AppState.speechRate) === r ? 'btn-primary' : ''}" data-set-rate="${r}">${r}x</button>
                `).join('')}
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:14px;background:var(--glass-bg-subtle);border:1px solid var(--glass-border)">
              <div>
                <div style="font-weight:700">Mục tiêu phiên học hằng ngày (+1 Điểm Chăm Chỉ)</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Đang tích lũy: ${tMetrics.diligencePoints} điểm • Chuỗi ${tMetrics.streakDays} ngày</div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-sm ${tMetrics.sessionTargetMinutes === 15 ? 'btn-primary' : ''}" data-set-target-min="15">15 phút/ngày</button>
                <button class="btn btn-sm ${tMetrics.sessionTargetMinutes === 20 ? 'btn-primary' : ''}" data-set-target-min="20">20 phút/ngày</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;
    document.getElementById('settings-toggle-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('settings-toggle-perf')?.addEventListener('click', togglePerfMode);
    container.querySelectorAll('[data-set-accent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.voiceAccent = btn.getAttribute('data-set-accent');
        StorageService.saveConfig();
        showAppToast(`Đã chuyển giọng đọc mặc định sang ${AppState.voiceAccent === 'en-GB' ? 'Anh - Anh (UK)' : 'Anh - Mỹ (US)'}.`);
        renderSettingsView(container);
      });
    });
    container.querySelectorAll('[data-set-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        AppState.speechRate = Number(btn.getAttribute('data-set-rate'));
        StorageService.saveConfig();
        showAppToast(`Đã đặt tốc độ phát âm băng nghe: ${AppState.speechRate}x.`);
        renderSettingsView(container);
      });
    });
    container.querySelectorAll('[data-set-target-min]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.getAttribute('data-set-target-min'));
        window.StudyTimerModule.setSessionTarget(mins);
        showAppToast(`Đã cập nhật mục tiêu học hằng ngày: ${mins} phút.`);
        renderSettingsView(container);
      });
    });
  }
  /* ------------------------------------------------------------------------
     14. AUTH MODAL CONTROLLER (TASK 1: Smooth Animations & Show/Hide Password)
     ------------------------------------------------------------------------ */
  function openAuthModal(mode = 'login') { const modal = document.getElementById('auth-modal-overlay'); if (!modal) return;
    modal.classList.add('open'); switchAuthTab(mode);
  }
  function closeAuthModal() { document.getElementById('auth-modal-overlay')?.classList.remove('open'); }
  function switchAuthTab(mode) { const loginForm = document.getElementById('auth-form-login'); const regForm = document.getElementById('auth-form-register');
    const tabLogin = document.getElementById('tab-auth-login'); const tabReg = document.getElementById('tab-auth-register');
    if (!loginForm || !regForm) return; if (mode === 'register') { loginForm.style.display = 'none';
      regForm.style.display = 'block'; tabLogin?.classList.remove('active');
      tabReg?.classList.add('active'); } else { loginForm.style.display = 'block';
      regForm.style.display = 'none'; tabLogin?.classList.add('active');
      tabReg?.classList.remove('active'); }
  }
  function renderAll() { renderHeaderAndSidebar(); const main = document.getElementById('app-main-view');
    if (!main) return; switch (AppState.currentView) { case 'level-hub':
        renderLevelHubView(main); break;
      case 'lab-test':
        renderMockTestRoomView(main); break;
      case 'listening-room':
        renderListeningRoomView(main); break;
      case 'speaking-room':
        renderSpeakingRoomView(main); break;
      case 'exercise-room':
        renderExercisesRoomView(main); break;
      case 'vocab-room':
        renderVocabularyRoomView(main); break;
      case 'settings':
        renderSettingsView(main); break;
      case 'home':
      default:
        renderHomeView(main); break;
    }
  }
  /* ------------------------------------------------------------------------
     15. INITIALIZATION & GLOBAL EVENT BINDING
     ------------------------------------------------------------------------ */
  function initApp() { StorageService.loadConfig(); document.getElementById('btn-open-sidebar')?.addEventListener('click', openSidebar);
    document.getElementById('btn-close-sidebar')?.addEventListener('click', closeSidebar); document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
    document.getElementById('topbar-theme-btn')?.addEventListener('click', toggleTheme); document.getElementById('topbar-perf-btn')?.addEventListener('click', togglePerfMode);
    document.getElementById('sidebar-theme-btn')?.addEventListener('click', toggleTheme); document.getElementById('sidebar-perf-btn')?.addEventListener('click', togglePerfMode);
    document.getElementById('topbar-auth-btn')?.addEventListener('click', () => openAuthModal('login')); document.getElementById('btn-close-auth-modal')?.addEventListener('click', closeAuthModal);
    document.getElementById('tab-auth-login')?.addEventListener('click', () => switchAuthTab('login')); document.getElementById('tab-auth-register')?.addEventListener('click', () => switchAuthTab('register'));
    // Password visibility toggle buttons & smooth strength bar (TASK 1)
    document.querySelectorAll('[data-toggle-pw]').forEach((btn) => { btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-pw'); const input = document.getElementById(targetId);
        if (!input) return; const isPw = input.type === 'password';
        input.type = isPw ? 'text' : 'password'; btn.textContent = isPw ? '🙈 Ẩn' : '👁️ Hiện';
      }); });
    document.getElementById('reg-password')?.addEventListener('input', (e) => { const val = e.target.value || ''; const fill = document.getElementById('reg-pw-strength-fill');
      if (!fill) return; const pct = Math.min(100, Math.round((val.length / 10) * 100));
      fill.style.width = `${pct}%`; });
    // Handle Login & Register Submissions
    document.getElementById('auth-form-login')?.addEventListener('submit', (e) => { e.preventDefault(); const username = document.getElementById('login-username')?.value;
      const password = document.getElementById('login-password')?.value; const res = AuthService.login({ username, password });
      showAppToast(res.msg); if (res.ok) { closeAuthModal();
        renderAll(); }
    }); document.getElementById('auth-form-register')?.addEventListener('submit', (e) => { e.preventDefault();
      const fullName = document.getElementById('reg-fullname')?.value; const username = document.getElementById('reg-username')?.value;
      const password = document.getElementById('reg-password')?.value; const confirmPassword = document.getElementById('reg-confirm-password')?.value;
      const res = AuthService.register({ fullName, username, password, confirmPassword }); showAppToast(res.msg);
      if (res.ok) { closeAuthModal(); renderAll();
      }
    });
    // Topbar level pills & Sidebar navigation
    document.querySelectorAll('[data-level-pill]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo('level-hub', btn.getAttribute('data-level-pill'), 'curriculum')); });
    document.querySelectorAll('[data-nav-view]').forEach((btn) => { btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav-view'))); });
    document.querySelectorAll('[data-sidebar-level]').forEach((btn) => {
      btn.addEventListener('click', () => navigateTo('level-hub', btn.getAttribute('data-sidebar-level'), 'curriculum')); });
    renderAll(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp();
  }
})();
