/* ============================================================
   CIRO — Pixel Timer Extension  |  popup.js  (v2)

   Module layout:
     1. State
     2. DOM Refs
     3. Helpers
     4. Storage module
     5. Theme module
     6. Emoji module
     7. Navigation module (page routing + back stack + logo/home)
     8. Timer logic module
     9. Pomodoro sessions module
    10. Mini timer widget module
    11. Tasks module
    12. Event bindings
    13. Init
   ============================================================ */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1. STATE
   ═══════════════════════════════════════════════════════════ */

const state = {
  /* Navigation */
  page:     'timer',   // 'timer' | 'tasks' | 'settings'
  prevPage: null,      // for back-button

  /* Timer mode */
  mode: 'timer',       // 'timer' | 'pomodoro'

  /* Timer inputs (user-set values) */
  timer: { hours: 0, minutes: 0, seconds: 0 },

  /* Pomodoro config */
  pomodoro: {
    sessionMinutes:  25,
    breakMinutes:    5,
    sessions:        4,   // total sessions user sets
    currentSession:  1,
    phase:          'session', // 'session' | 'break'
  },

  /* Countdown state */
  remaining: 0,
  running:   false,

  /* Appearance */
  theme:         'yellow',
  selectedEmoji: 'camera',

  /* Mini timer widget */
  miniCollapsed: false,
  miniPos:       null,   // { x, y } saved position

  /* Tasks — array of task objects */
  tasks: [],
  /*
    Task shape:
    {
      id:        string  (timestamp-based unique ID),
      text:      string,
      status:    'today' | 'pending' | 'completed',
      createdAt: number  (Date.now()),
      dateKey:   string  (YYYY-MM-DD for grouping "today")
    }
  */
};


/* ═══════════════════════════════════════════════════════════
   2. DOM REFS
   ═══════════════════════════════════════════════════════════ */

// Shell
const outerShell = document.getElementById('outerShell');

// Header
const logoLink   = document.getElementById('logoLink');
const btnBack    = document.getElementById('btnBack');
const btnTasks   = document.getElementById('btnTasks');
const btnSettings= document.getElementById('btnSettings');

// Pages
const pageTimer    = document.getElementById('pageTimer');
const pageTasks    = document.getElementById('pageTasks');
const pageSettings = document.getElementById('pageSettings');

// Mode toggle
const modeTimerBtn    = document.getElementById('modeTimerBtn');
const modePomodoroBtn = document.getElementById('modePomodoroBtn');
const timerView       = document.getElementById('timerView');
const pomodoroView    = document.getElementById('pomodoroView');

// Timer display + controls
const dispHours   = document.getElementById('dispHours');
const dispMinutes = document.getElementById('dispMinutes');
const dispSeconds = document.getElementById('dispSeconds');
const timerPause  = document.getElementById('timerPause');
const timerStart  = document.getElementById('timerStart');
const timerReset  = document.getElementById('timerReset');

// Pomodoro display + controls
const pomoDispH        = document.getElementById('pomoDispH');
const pomoDispM        = document.getElementById('pomoDispM');
const pomoDispS        = document.getElementById('pomoDispS');
const pomoSessionLabel = document.getElementById('pomoSessionLabel');
const pomoBreakLabel   = document.getElementById('pomoBreakLabel');
const pomoPause        = document.getElementById('pomoPause');
const pomoStart        = document.getElementById('pomoStart');
const pomoReset        = document.getElementById('pomoReset');

// Sessions control
const sessionsDown     = document.getElementById('sessionsDown');
const sessionsUp       = document.getElementById('sessionsUp');
const sessionsCount    = document.getElementById('sessionsCount');
const sessionsProgress = document.getElementById('sessionsProgress');

// Settings
const activeEmojiPreview = document.getElementById('activeEmojiPreview');

// Tasks
const taskInput         = document.getElementById('taskInput');
const taskAddBtn        = document.getElementById('taskAddBtn');
const taskListToday     = document.getElementById('taskListToday');
const taskListPending   = document.getElementById('taskListPending');
const taskListCompleted = document.getElementById('taskListCompleted');
const emptyToday        = document.getElementById('emptyToday');
const emptyPending      = document.getElementById('emptyPending');
const emptyCompleted    = document.getElementById('emptyCompleted');
const todayDateLabel    = document.getElementById('todayDateLabel');

// Mini timer widget
const miniTimer        = document.getElementById('miniTimer');
const miniHandle       = document.getElementById('miniHandle');
const miniBody         = document.getElementById('miniBody');
const miniEmoji        = document.getElementById('miniEmoji');
const miniDigits       = document.getElementById('miniDigits');
const miniToggle       = document.getElementById('miniToggle');
const miniPomoExtras   = document.getElementById('miniPomoExtras');
const miniSessionLabel = document.getElementById('miniSessionLabel');
const miniProgressFill = document.getElementById('miniProgressFill');


/* ═══════════════════════════════════════════════════════════
   3. HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Zero-pad to 2 digits */
const pad = n => String(Math.max(0, n)).padStart(2, '0');

/** H/M/S → total seconds */
const toSeconds = (h, m, s) => h * 3600 + m * 60 + s;

/** Total seconds → { hours, minutes, seconds } */
function fromSeconds(total) {
  total = Math.max(0, total);
  return {
    hours:   Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Today's date as YYYY-MM-DD */
const todayKey = () => new Date().toISOString().slice(0, 10);

/** Friendly date string e.g. "Mon 18 Mar" */
function friendlyDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

/** Unicode emoji fallback map */
const EMOJI_CHARS = {
  camera:'📷', tree:'🌲', rabbit:'🐰', music:'🎵',
  frog:'🐸', cans:'🥫', milk:'🥛', turtle:'🐢',
  mountain:'⛰️', arcade:'🕹️', cookie:'🍪', diamond:'💎',
  cherry:'🍒', robot:'🤖', heart:'❤️', coffee:'☕',
};

/** Map short emoji names → actual asset filenames */
const EMOJI_FILES = {
  camera:   'photography-camera-1--Streamline-Pixel',
  tree:     'ecology-tree--Streamline-Pixel',
  rabbit:   'pet-animals-rabbit-2--Streamline-Pixel',
  music:    'music-headphones-human--Streamline-Pixel',
  frog:     'pet-animals-frog-face--Streamline-Pixel',
  cans:     'business-products-climb-top--Streamline-Pixel',
  milk:     'food-drink-milk--Streamline-Pixel',
  turtle:   'pet-animals-turtle--Streamline-Pixel',
  mountain: 'ecology-bush--Streamline-Pixel',
  arcade:   'entertainment-events-hobbies-game-machines-arcade-2--Streamline-Pixel',
  cookie:   'food-drink-sushi--Streamline-Pixel',
  diamond:  'business-prodect-diamond--Streamline-Pixel',
  cherry:   'food-drink-fruit-cherry--Streamline-Pixel',
  robot:    'coding-apps-websites-music-player--Streamline-Pixel',
  heart:    'social-rewards-heart-like-circle--Streamline-Pixel',
  coffee:   'food-drink-tea--Streamline-Pixel',
};


/* ═══════════════════════════════════════════════════════════
   4. STORAGE MODULE
   ═══════════════════════════════════════════════════════════ */

const Storage = {
  /** Persist all relevant state keys */
  save() {
    chrome.storage.local.set({
      ciroState: {
        mode:          state.mode,
        timer:         state.timer,
        pomodoro:      state.pomodoro,
        remaining:     state.remaining,
        running:       state.running,
        theme:         state.theme,
        selectedEmoji: state.selectedEmoji,
        miniCollapsed: state.miniCollapsed,
        miniPos:       state.miniPos,
      },
      ciroTasks: state.tasks,
    });
  },

  /** Load all state from storage, then call callback */
  load(callback) {
    chrome.storage.local.get(['ciroState', 'ciroTasks'], (data) => {
      if (data.ciroState) {
        const s = data.ciroState;
        state.mode          = s.mode          || 'timer';
        state.timer         = s.timer         || { hours: 0, minutes: 0, seconds: 0 };
        state.pomodoro      = { ...state.pomodoro, ...(s.pomodoro || {}) };
        state.remaining     = s.remaining     || 0;
        state.running       = s.running       || false;
        state.theme         = s.theme         || 'yellow';
        state.selectedEmoji = s.selectedEmoji || 'camera';
        state.miniCollapsed = s.miniCollapsed || false;
        state.miniPos       = s.miniPos       || null;
      }
      if (Array.isArray(data.ciroTasks)) {
        state.tasks = data.ciroTasks;
      }
      callback();
    });
  },
};


/* ═══════════════════════════════════════════════════════════
   5. THEME MODULE
   ═══════════════════════════════════════════════════════════ */

const THEMES = ['white','black','yellow','green','teal','purple','pink'];

const Theme = {
  apply(theme) {
    THEMES.forEach(t => outerShell.classList.remove(`theme-${t}`));
    outerShell.classList.add(`theme-${theme}`);
    state.theme = theme;

    // Also sync mini timer's outer background (it uses CSS var via inline style)
    miniTimer.style.background = getComputedStyle(outerShell)
      .getPropertyValue('--bg-outer').trim() || '#F5C842';

    document.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === theme);
    });
  },
};


/* ═══════════════════════════════════════════════════════════
   6. EMOJI MODULE
   ═══════════════════════════════════════════════════════════ */

const Emoji = {
  apply(name) {
    state.selectedEmoji = name;

    // Highlight in grid
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.emoji === name);
    });

    // Settings preview box
    this._renderPreview(activeEmojiPreview, name, 46);

    // Mini timer emoji
    this._renderMini(name);
  },

  /** Render an emoji image (with unicode fallback) into a container */
  _renderPreview(container, name, size) {
    const file = EMOJI_FILES[name] || name;
    const src = `assets/emoji/${file}.png`;
    container.innerHTML =
      `<img src="${src}" alt="${name}" width="${size}" height="${size}"
            onerror="this.parentElement.innerHTML='<span>${EMOJI_CHARS[name] || '⭐'}</span>'"/>`;
  },

  _renderMini(name) {
    const file = EMOJI_FILES[name] || name;
    const src = `assets/emoji/${file}.png`;
    miniEmoji.innerHTML =
      `<img src="${src}" alt="${name}" style="width:44px;height:44px;object-fit:contain;image-rendering:pixelated"
            onerror="this.innerHTML='${EMOJI_CHARS[name] || '⭐'}'"/>`;
  },
};


/* ═══════════════════════════════════════════════════════════
   7. NAVIGATION MODULE
   ═══════════════════════════════════════════════════════════ */

const Nav = {
  /** All page elements keyed by name */
  _pages: {
    timer:    pageTimer,
    tasks:    pageTasks,
    settings: pageSettings,
  },

  /**
   * Navigate to a page.
   * @param {string} to   — target page name
   * @param {boolean} isBack — true when triggered by back-button (don't push history)
   */
  goto(to, isBack = false) {
    // Save history for back button
    if (!isBack && state.page !== to) {
      state.prevPage = state.page;
    }

    state.page = to;

    // Toggle page visibility
    Object.entries(this._pages).forEach(([name, el]) => {
      el.classList.toggle('active', name === to);
    });

    // Back button: visible when not on home (timer)
    const onHome = (to === 'timer');
    btnBack.classList.toggle('hidden', onHome);

    // Tasks label / settings gear: always visible
    // (no hide logic needed — they're always in header)
  },

  goHome() {
    this.goto('timer');
    // Restore last mode
    Mode.set(state.mode);
  },

  goBack() {
    const target = state.prevPage || 'timer';
    this.goto(target, true);
    state.prevPage = null;
    if (target === 'timer') Mode.set(state.mode);
  },
};


/* ═══════════════════════════════════════════════════════════
   8. TIMER LOGIC MODULE
   ═══════════════════════════════════════════════════════════ */

/** Mode switch (timer / pomodoro) */
const Mode = {
  set(mode) {
    state.mode = mode;
    modeTimerBtn.classList.toggle('active',    mode === 'timer');
    modePomodoroBtn.classList.toggle('active', mode === 'pomodoro');
    timerView.classList.toggle('hidden',    mode !== 'timer');
    pomodoroView.classList.toggle('hidden', mode !== 'pomodoro');
    Display.refresh();
  },
};

/** Display update — reads from state, writes to DOM */
const Display = {
  refresh() {
    if (state.mode === 'timer') {
      this._timer();
    } else {
      this._pomodoro();
    }
    MiniTimer.refresh();
  },

  _timer() {
    const t = state.running ? fromSeconds(state.remaining) : state.timer;
    dispHours.textContent   = pad(t.hours);
    dispMinutes.textContent = pad(t.minutes   ?? t.minutes);
    dispSeconds.textContent = pad(t.seconds);
  },

  _pomodoro() {
    if (state.running) {
      const t = fromSeconds(state.remaining);
      pomoDispH.textContent = pad(t.hours);
      pomoDispM.textContent = pad(t.minutes);
      pomoDispS.textContent = pad(t.seconds);
    } else {
      const mins = state.pomodoro.phase === 'session'
        ? state.pomodoro.sessionMinutes
        : state.pomodoro.breakMinutes;
      pomoDispH.textContent = '00';
      pomoDispM.textContent = pad(mins);
      pomoDispS.textContent = '00';
    }
    pomoSessionLabel.classList.toggle('active-pomo', state.pomodoro.phase === 'session');
    pomoBreakLabel.classList.toggle('active-pomo',   state.pomodoro.phase === 'break');
    Sessions.updateUI();
  },
};

/** Adjustment buttons for H/M/S */
function adjustTimerUnit(unit, dir) {
  if (state.running) return;
  const delta = dir === 'up' ? 1 : -1;
  const max   = unit === 'hours' ? 23 : 59;
  state.timer[unit] = Math.min(max, Math.max(0, state.timer[unit] + delta));
  Display.refresh();
  Storage.save();
}

/** Local tick interval reference */
let _tick = null;

function startLocalTick() {
  stopLocalTick();
  _tick = setInterval(() => {
    if (!state.running || state.remaining <= 0) {
      stopLocalTick();
      state.running = false;
      MiniTimer.hide();
      return;
    }
    state.remaining--;
    Display.refresh();
  }, 1000);
}

function stopLocalTick() {
  if (_tick) { clearInterval(_tick); _tick = null; }
}

/** Timer controls */
const TimerCtrl = {
  start() {
    if (state.running) return;

    if (state.remaining <= 0) {
      if (state.mode === 'timer') {
        state.remaining = toSeconds(
          state.timer.hours, state.timer.minutes, state.timer.seconds
        );
      } else {
        const mins = state.pomodoro.phase === 'session'
          ? state.pomodoro.sessionMinutes
          : state.pomodoro.breakMinutes;
        state.remaining = mins * 60;
      }
    }

    if (state.remaining <= 0) return;

    state.running = true;

    chrome.runtime.sendMessage({
      type: 'START_TIMER',
      seconds: state.remaining,
      mode: state.mode,
    });

    Storage.save();
    startLocalTick();
    MiniTimer.show();
  },

  pause() {
    if (!state.running) return;
    state.running = false;
    chrome.runtime.sendMessage({ type: 'PAUSE_TIMER' });
    Storage.save();
    stopLocalTick();
    MiniTimer.show(); // keep visible while paused
  },

  reset() {
    state.running  = false;
    state.remaining = 0;

    if (state.mode === 'timer') {
      state.timer = { hours: 0, minutes: 0, seconds: 0 };
    } else {
      state.pomodoro.phase = 'session';
      state.pomodoro.currentSession = 1;
    }

    chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
    Storage.save();
    stopLocalTick();
    Display.refresh();
    MiniTimer.hide();
  },
};

/** Sync with background service worker on popup open */
function syncWithBackground() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    if (response.remaining !== undefined) {
      state.remaining = response.remaining;
      state.running   = response.running;
      if (state.running) {
        startLocalTick();
        MiniTimer.show();
      }
      Display.refresh();
    }
  });
}


/* ═══════════════════════════════════════════════════════════
   9. POMODORO SESSIONS MODULE
   ═══════════════════════════════════════════════════════════ */

const Sessions = {
  adjust(dir) {
    if (state.running) return;
    const delta = dir === 'up' ? 1 : -1;
    state.pomodoro.sessions = Math.min(20, Math.max(1, state.pomodoro.sessions + delta));
    // Clamp current session
    state.pomodoro.currentSession = Math.min(
      state.pomodoro.currentSession, state.pomodoro.sessions
    );
    this.updateUI();
    Storage.save();
  },

  updateUI() {
    const { sessions, currentSession } = state.pomodoro;
    sessionsCount.textContent    = sessions;
    sessionsProgress.textContent = `${currentSession} / ${sessions}`;
  },

  /** Advance to next session (called when a session timer finishes) */
  advance() {
    const p = state.pomodoro;
    if (p.phase === 'session') {
      if (p.currentSession < p.sessions) {
        p.phase = 'break';
      } else {
        // All sessions done
        p.currentSession = 1;
        p.phase = 'session';
        TimerCtrl.reset();
        return;
      }
    } else {
      p.currentSession++;
      p.phase = 'session';
    }
    // Auto-start next phase
    state.remaining = 0;
    TimerCtrl.start();
    Storage.save();
  },
};


/* ═══════════════════════════════════════════════════════════
   10. MINI TIMER WIDGET MODULE
   ═══════════════════════════════════════════════════════════ */

const MiniTimer = {
  show() {
    miniTimer.classList.remove('hidden');
    this._restorePosition();
    this.refresh();
  },

  hide() {
    miniTimer.classList.add('hidden');
  },

  refresh() {
    if (miniTimer.classList.contains('hidden')) return;

    // Format digits
    const t = fromSeconds(state.remaining);
    // For mini timer: show M:SS if < 1 hour, else H:MM:SS
    if (t.hours > 0) {
      miniDigits.textContent = `${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}`;
    } else {
      miniDigits.textContent = `${pad(t.minutes)}:${pad(t.seconds)}`;
    }

    // Pomodoro extras
    if (state.mode === 'pomodoro') {
      miniPomoExtras.classList.remove('hidden');
      miniSessionLabel.textContent = `${state.pomodoro.currentSession}/${state.pomodoro.sessions}`;
      const pct = (state.pomodoro.currentSession - 1) / state.pomodoro.sessions * 100;
      miniProgressFill.style.width = pct + '%';
    } else {
      miniPomoExtras.classList.add('hidden');
    }
  },

  toggleCollapse() {
    state.miniCollapsed = !state.miniCollapsed;
    miniBody.classList.toggle('collapsed', state.miniCollapsed);
    miniToggle.classList.toggle('collapsed', state.miniCollapsed);
    Storage.save();
  },

  /** Restore drag position from storage */
  _restorePosition() {
    if (state.miniPos) {
      miniTimer.style.left   = state.miniPos.x + 'px';
      miniTimer.style.top    = state.miniPos.y + 'px';
      miniTimer.style.bottom = 'auto';
      miniTimer.style.right  = 'auto';
    }
  },

  /** Sync theme colour to mini timer outer shell */
  syncTheme() {
    const accentRaw = getComputedStyle(outerShell).getPropertyValue('--bg-outer').trim();
    miniTimer.style.background = accentRaw || '#F5C842';
  },
};

/** Dragging the mini timer widget */
function initMiniDrag() {
  let dragging = false;
  let ox = 0, oy = 0; // offset of mouse within widget

  miniHandle.addEventListener('mousedown', (e) => {
    dragging = true;
    const rect = miniTimer.getBoundingClientRect();
    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;
    miniTimer.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    let x = e.clientX - ox;
    let y = e.clientY - oy;

    // Clamp inside viewport
    x = Math.max(0, Math.min(window.innerWidth  - miniTimer.offsetWidth,  x));
    y = Math.max(0, Math.min(window.innerHeight - miniTimer.offsetHeight, y));

    miniTimer.style.left   = x + 'px';
    miniTimer.style.top    = y + 'px';
    miniTimer.style.bottom = 'auto';
    miniTimer.style.right  = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    // Save position
    const rect = miniTimer.getBoundingClientRect();
    state.miniPos = { x: rect.left, y: rect.top };
    Storage.save();
  });
}


/* ═══════════════════════════════════════════════════════════
   11. TASKS MODULE
   ═══════════════════════════════════════════════════════════ */

const Tasks = {
  /** Add a new task to "today" list */
  add(text) {
    text = text.trim();
    if (!text) return;

    const task = {
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2),
      text,
      status:    'today',
      createdAt: Date.now(),
      dateKey:   todayKey(),
    };

    state.tasks.unshift(task);
    Storage.save();
    this.render();
  },

  /** Toggle a task's completion */
  toggle(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.status = task.status === 'completed' ? 'today' : 'completed';
    Storage.save();
    this.render();
  },

  /** Move task to a different status bucket */
  moveTo(id, status) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.status = status;
    Storage.save();
    this.render();
  },

  /** Delete a task */
  delete(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    Storage.save();
    this.render();
  },

  /** Re-render all task lists */
  render() {
    const today   = state.tasks.filter(t => t.status === 'today');
    const pending = state.tasks.filter(t => t.status === 'pending');
    const done    = state.tasks.filter(t => t.status === 'completed');

    // Update date label
    todayDateLabel.textContent = `Today — ${friendlyDate()}`;

    this._renderList(taskListToday,     today,   emptyToday,     'today');
    this._renderList(taskListPending,   pending, emptyPending,   'pending');
    this._renderList(taskListCompleted, done,    emptyCompleted, 'completed');
  },

  _renderList(ulEl, tasks, emptyEl, bucket) {
    ulEl.innerHTML = '';
    emptyEl.classList.toggle('hidden', tasks.length > 0);

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.id;

      const isDone = task.status === 'completed';

      /* Build action buttons based on current bucket */
      let moveButtons = '';
      if (bucket === 'today') {
        moveButtons = `<button class="task-action-btn" data-action="move-pending" title="Move to Pending">⏳</button>`;
      } else if (bucket === 'pending') {
        moveButtons = `<button class="task-action-btn" data-action="move-today" title="Move to Today">📅</button>`;
      } else if (bucket === 'completed') {
        moveButtons = `<button class="task-action-btn" data-action="move-today" title="Restore to Today">↩</button>`;
      }

      li.innerHTML = `
        <button class="task-check ${isDone ? 'checked' : ''}" data-action="toggle" title="Complete">
          ${isDone ? '✓' : ''}
        </button>
        <span class="task-text ${isDone ? 'done' : ''}">${this._escape(task.text)}</span>
        <div class="task-actions">
          ${moveButtons}
          <button class="task-action-btn delete" data-action="delete" title="Delete">✕</button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        const id = li.dataset.id;
        if (action === 'toggle')       this.toggle(id);
        if (action === 'delete')       this.delete(id);
        if (action === 'move-pending') this.moveTo(id, 'pending');
        if (action === 'move-today')   this.moveTo(id, 'today');
      });

      ulEl.appendChild(li);
    });
  },

  _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};


/* ═══════════════════════════════════════════════════════════
   12. EVENT BINDINGS
   ═══════════════════════════════════════════════════════════ */

function attachEvents() {
  /* ── Header navigation ── */

  // Logo + "Ciro" text → go home
  logoLink.addEventListener('click', () => {
    Nav.goHome();
  });

  // Back button → go to previous page
  btnBack.addEventListener('click', () => Nav.goBack());

  // Tasks button
  btnTasks.addEventListener('click', () => {
    Nav.goto('tasks');
    Tasks.render();
  });

  // Settings gear
  btnSettings.addEventListener('click', () => Nav.goto('settings'));


  /* ── Mode toggle ── */
  modeTimerBtn.addEventListener('click', () => {
    Mode.set('timer');
    Storage.save();
  });
  modePomodoroBtn.addEventListener('click', () => {
    Mode.set('pomodoro');
    Storage.save();
  });


  /* ── Timer +/- buttons ── */
  document.querySelectorAll('.adj-btn:not(.sessions-adj-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      adjustTimerUnit(btn.dataset.unit, btn.dataset.dir);
    });
  });


  /* ── Timer controls ── */
  timerStart.addEventListener('click', () => TimerCtrl.start());
  timerPause.addEventListener('click', () => TimerCtrl.pause());
  timerReset.addEventListener('click', () => TimerCtrl.reset());

  /* ── Pomodoro controls (share same logic) ── */
  pomoStart.addEventListener('click', () => TimerCtrl.start());
  pomoPause.addEventListener('click', () => TimerCtrl.pause());
  pomoReset.addEventListener('click', () => TimerCtrl.reset());

  /* ── Pomodoro phase switch ── */
  pomoSessionLabel.addEventListener('click', () => {
    if (state.running) return;
    state.pomodoro.phase = 'session';
    state.remaining = 0;
    Display.refresh();
    Storage.save();
  });
  pomoBreakLabel.addEventListener('click', () => {
    if (state.running) return;
    state.pomodoro.phase = 'break';
    state.remaining = 0;
    Display.refresh();
    Storage.save();
  });

  /* ── Sessions count ── */
  sessionsDown.addEventListener('click', () => Sessions.adjust('down'));
  sessionsUp.addEventListener('click',   () => Sessions.adjust('up'));


  /* ── Settings: colour swatches ── */
  document.querySelectorAll('.swatch').forEach(s => {
    s.addEventListener('click', () => {
      Theme.apply(s.dataset.color);
      MiniTimer.syncTheme();
      Storage.save();
    });
  });

  /* ── Settings: emoji grid ── */
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Emoji.apply(btn.dataset.emoji);
      Storage.save();
    });
  });


  /* ── Tasks: add on button click or Enter ── */
  taskAddBtn.addEventListener('click', () => {
    Tasks.add(taskInput.value);
    taskInput.value = '';
    taskInput.focus();
  });
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      Tasks.add(taskInput.value);
      taskInput.value = '';
    }
  });


  /* ── Mini timer: collapse toggle ── */
  miniToggle.addEventListener('click', () => MiniTimer.toggleCollapse());

  /* ── Mini timer: drag ── */
  initMiniDrag();

  /* ── Messages from background (timer finished) ── */
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TIMER_COMPLETE') {
      if (state.mode === 'pomodoro') {
        Sessions.advance();
      } else {
        TimerCtrl.reset();
      }
    }
  });
}


/* ═══════════════════════════════════════════════════════════
   13. INIT
   ═══════════════════════════════════════════════════════════ */

function init() {
  Storage.load(() => {
    // Apply visual state
    Theme.apply(state.theme);
    Emoji.apply(state.selectedEmoji);
    Mode.set(state.mode);
    Sessions.updateUI();

    // Restore page (always open to timer home)
    Nav.goto('timer');

    // Refresh display
    Display.refresh();

    // Restore mini timer if timer was running
    if (state.running && state.remaining > 0) {
      MiniTimer.show();
    }

    // Restore mini-collapse state
    if (state.miniCollapsed) {
      miniBody.classList.add('collapsed');
      miniToggle.classList.add('collapsed');
    }

    // Sync timer state from background worker
    syncWithBackground();

    // Wire events
    attachEvents();

    // Pre-render tasks (in case popup re-opens on tasks page)
    Tasks.render();
  });
}

init();
