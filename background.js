/* ============================================================
   CIRO — Pixel Timer Extension  |  background.js  (v2)

   Service Worker responsibilities:
   • Persist timer across popup open/close via chrome.alarms
   • Broadcast TIMER_COMPLETE to popup when alarm fires
   • Handle START / PAUSE / RESET / GET_STATE messages
   • Persist background timer state in chrome.storage.local
   ============================================================ */

'use strict';

/* ─── Internal State ──────────────────────────────────────── */

let timerState = {
  running:    false,
  remaining:  0,       // seconds at last start/pause
  startedAt:  null,    // Date.now() when last started (wall clock anchor)
  mode:       'timer', // 'timer' | 'pomodoro'
};

/* ─── Alarm names ─────────────────────────────────────────── */
const ALARM_END  = 'ciro-end';   // fires when timer reaches zero

/* ─── Wall-clock accurate remaining ──────────────────────── */
function calcRemaining() {
  if (!timerState.running || timerState.startedAt === null) {
    return Math.max(0, timerState.remaining);
  }
  const elapsedSec = (Date.now() - timerState.startedAt) / 1000;
  return Math.max(0, timerState.remaining - elapsedSec);
}

/* ─── Persist to storage ──────────────────────────────────── */
function persistBg() {
  chrome.storage.local.set({ ciroTimerBg: { ...timerState } });
}

/* ─── Timer control ───────────────────────────────────────── */

function startTimer(seconds, mode) {
  chrome.alarms.clearAll();

  timerState.remaining = seconds;
  timerState.startedAt = Date.now();
  timerState.running   = true;
  timerState.mode      = mode || 'timer';

  // Schedule the completion alarm
  chrome.alarms.create(ALARM_END, {
    delayInMinutes: seconds / 60,
  });

  persistBg();
}

function pauseTimer() {
  if (!timerState.running) return;

  timerState.remaining = Math.round(calcRemaining());
  timerState.startedAt = null;
  timerState.running   = false;

  chrome.alarms.clear(ALARM_END);
  persistBg();
}

function resetTimer() {
  timerState.running   = false;
  timerState.remaining = 0;
  timerState.startedAt = null;

  chrome.alarms.clearAll();
  persistBg();
}

/* ─── Alarm listener ──────────────────────────────────────── */

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_END) return;

  timerState.running   = false;
  timerState.remaining = 0;
  timerState.startedAt = null;

  // Desktop notification
  chrome.notifications.create(`ciro-${Date.now()}`, {
    type:     'basic',
    iconUrl:  'assets/icons/icon128.png',
    title:    "Ciro — Time's Up! ⏰",
    message:  timerState.mode === 'pomodoro'
                ? 'Session complete! Time for a break.'
                : 'Timer finished!',
    priority: 2,
  });

  // Tell popup so it can advance Pomodoro sessions / reset UI
  chrome.runtime.sendMessage({ type: 'TIMER_COMPLETE', mode: timerState.mode })
    .catch(() => {}); // popup may be closed — that's fine

  persistBg();
});

/* ─── Message listener ────────────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    case 'START_TIMER':
      startTimer(message.seconds, message.mode);
      sendResponse({ ok: true });
      break;

    case 'PAUSE_TIMER':
      pauseTimer();
      sendResponse({ ok: true });
      break;

    case 'RESET_TIMER':
      resetTimer();
      sendResponse({ ok: true });
      break;

    case 'GET_STATE':
      sendResponse({
        remaining: Math.round(calcRemaining()),
        running:   timerState.running,
        mode:      timerState.mode,
      });
      break;

    default:
      sendResponse({ ok: false, error: 'Unknown type' });
  }

  // Keep channel open for async sendResponse
  return true;
});

/* ─── Lifecycle ───────────────────────────────────────────── */

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('ciroTimerBg', (data) => {
    if (data.ciroTimerBg) {
      timerState = { ...timerState, ...data.ciroTimerBg };
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  resetTimer();
});
