# 🟡 Ciro — Pixel Timer Extension

A retro pixel-art styled productivity timer and Pomodoro extension for Chrome, Edge, and Brave.

---

## 📁 Folder Structure

```
ciro-extension/
├── manifest.json          ← Chrome Extension MV3 config
├── popup.html             ← Main popup UI (all 3 screens)
├── popup.css              ← All styles + theme system
├── popup.js               ← UI logic, state, storage
├── background.js          ← Service worker (persistent timer)
└── assets/
    ├── icons/
    │   ├── icon16.png     ← Extension icon (16×16)
    │   ├── icon48.png     ← Extension icon (48×48)
    │   └── icon128.png    ← Extension icon (128×128)
    └── emoji/
        ├── camera.png     ← 📷 Add your pixel emoji PNGs here
        ├── tree.png
        ├── rabbit.png
        ├── music.png
        ├── frog.png
        ├── cans.png
        ├── milk.png
        ├── turtle.png
        ├── mountain.png
        ├── arcade.png
        ├── cookie.png
        ├── diamond.png
        ├── cherry.png
        ├── robot.png
        ├── heart.png
        └── coffee.png
```

---

## 🎨 Adding Your Emoji Images

The emoji grid supports **16 pixel-art emoji icons** (2 rows of 8).

### Steps:
1. Export your emoji as **PNG files** (recommended size: **64×64px** or **128×128px**)
2. Drop them into the `assets/emoji/` folder
3. Name each file exactly as listed in the table below

| Slot | File Name     | Fallback |
|------|--------------|---------|
| 1    | camera.png   | 📷      |
| 2    | tree.png     | 🌲      |
| 3    | rabbit.png   | 🐰      |
| 4    | music.png    | 🎵      |
| 5    | frog.png     | 🐸      |
| 6    | cans.png     | 🥫      |
| 7    | milk.png     | 🥛      |
| 8    | turtle.png   | 🐢      |
| 9    | mountain.png | ⛰️      |
| 10   | arcade.png   | 🕹️      |
| 11   | cookie.png   | 🍪      |
| 12   | diamond.png  | 💎      |
| 13   | cherry.png   | 🍒      |
| 14   | robot.png    | 🤖      |
| 15   | heart.png    | ❤️      |
| 16   | coffee.png   | ☕      |

> If an image file is missing, the extension automatically falls back to the Unicode emoji character.

---

## 🎨 Adding Custom Icons (icon16/48/128)

Replace the placeholder PNGs in `assets/icons/` with your Ciro logo exports at the correct sizes:
- `icon16.png`  — 16×16px (toolbar icon)
- `icon48.png`  — 48×48px (extensions page)
- `icon128.png` — 128×128px (Chrome Web Store)

---

## 🚀 Installation (Developer Mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `ciro-extension/` folder
5. The Ciro icon appears in your toolbar 🟡

Works the same way on **Edge** and **Brave**.

---

## ⚙️ Features

| Feature | Description |
|---------|-------------|
| **Timer mode** | Set hours/min/sec with +/- buttons, Start/Pause/Reset |
| **Pomodoro mode** | 25min session / 5min break cycling |
| **Persistent timer** | Timer runs even when popup is closed (via service worker) |
| **7 colour themes** | White, Black, Yellow, Green, Teal, Purple, Pink |
| **16 emoji icons** | Selectable icon shown in mini timer view |
| **Settings page** | Theme + emoji selector |
| **Notifications** | Desktop notification when timer completes |

---

## 🗃️ Storage Keys

All data is stored in `chrome.storage.local`:

| Key | Contents |
|-----|---------|
| `ciroState` | theme, selectedEmoji, timer values, mode, pomodoro config |
| `ciroTimerBg` | background worker timer state (remaining, running, startedAt) |
