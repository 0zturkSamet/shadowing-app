# 📸 Screenshot Guide for ShadowTube

This guide will help you capture professional screenshots of your application to showcase on GitHub and social media.

## 🎯 Recommended Screenshots (12 Total)

### 1. Landing Page (Not Logged In)
**URL:** `http://localhost:3000`
**What to capture:** Full page showing hero section with title and example video cards
**Filename:** `01-landing-page.png`
**Notes:** Make sure to capture the clean wireframe design with the three image cards

---

### 2. Login Page
**URL:** `http://localhost:3000/auth/login`
**What to capture:** Full login page with Google sign-in button
**Filename:** `02-login-page.png`
**Notes:** Show the clean authentication UI

---

### 3. Home Page (Logged In)
**URL:** `http://localhost:3000` (after logging in)
**What to capture:** Main interface with YouTube URL input field
**Filename:** `03-home-logged-in.png`
**Notes:** Shows where users paste YouTube links to start practicing

---

### 4. Dashboard - Stats Overview
**URL:** `http://localhost:3000/dashboard`
**What to capture:** Full dashboard showing the three stat cards (Total Minutes, Videos Completed, Current Streak)
**Filename:** `04-dashboard-stats.png`
**Notes:** Highlights the gamification and progress tracking features

---

### 5. Dashboard - Example Videos
**URL:** `http://localhost:3000/dashboard`
**What to capture:** Scroll down to show the "Example Videos to Try" section with all three demo videos
**Filename:** `05-dashboard-examples.png`
**Notes:** Shows the video titles you just updated (Das ist DW Deutsch, Dua Lipa, Google news)

---

### 6. Practice Page - Initial Load
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Practice page showing video player and transcript panel side-by-side
**Filename:** `06-practice-initial.png`
**Notes:** This demonstrates the core shadowing interface

---

### 7. Practice Page - Active Sentence Highlighted
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Play the video and capture when a sentence is highlighted (red border)
**Filename:** `07-practice-active-sentence.png`
**Notes:** Shows the auto-scroll and sentence highlighting feature

---

### 8. Practice Page - Completed Sentences (Green Ticks)
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Click a few tick icons to mark sentences complete, then screenshot showing green ticks
**Filename:** `08-practice-completed-ticks.png`
**Notes:** Demonstrates the new tick visibility feature you implemented

---

### 9. Practice Page - Loop Mode Active
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Click the Loop button to activate loop mode (button should turn red)
**Filename:** `09-practice-loop-mode.png`
**Notes:** Shows the loop functionality for sentence repetition

---

### 10. Practice Page - Video Controls
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Focus on the control buttons area (Preview, Play/Pause, Next, Loop, Auto-scroll)
**Filename:** `10-practice-controls.png`
**Notes:** Close-up of the playback control interface

---

### 11. Mobile Responsive View (Optional)
**URL:** `http://localhost:3000/practice?v=mkrw9J064H8`
**What to capture:** Resize browser to mobile width (375px) and capture responsive layout
**Filename:** `11-mobile-responsive.png`
**Notes:** Shows the app works on mobile devices

---

### 12. Practice Page - Different Language (German)
**URL:** `http://localhost:3000/practice?v=ZaUEf2C4fKQ`
**What to capture:** Practice page with German content to show multi-language support
**Filename:** `12-practice-german.png`
**Notes:** Demonstrates international language support

---

## 🛠️ Screenshot Tips

### Browser Setup
1. **Use Chrome or Firefox** for best DevTools
2. **Zoom:** Set to 100% (Ctrl+0 / Cmd+0)
3. **Window Size:** 1920x1080 for desktop screenshots
4. **Clear Browser:** Use incognito/private mode for clean screenshots

### Taking Screenshots
- **Windows:** Win + Shift + S (Snipping Tool)
- **Mac:** Cmd + Shift + 4 (Selection tool)
- **Linux:** Shift + PrtScn or use Flameshot/GNOME Screenshot
- **Browser Extension:** Use "Full Page Screen Capture" for long pages

### Quality Guidelines
- Save as PNG (not JPG) for crisp text
- Minimum resolution: 1920x1080
- Crop unnecessary browser chrome (address bar, bookmarks)
- Use consistent window sizes across screenshots

---

## 📁 Where to Save Screenshots

Create a `screenshots` folder in your repo:
```bash
mkdir -p /home/user/shadowing-app/screenshots
```

Then save all screenshots there with the filenames above.

---

## 🎨 Optional: Create a Showcase GIF

For extra impact, create an animated GIF showing:
1. Pasting a YouTube URL
2. Video loading
3. Playing with auto-scroll
4. Clicking tick icons
5. Loop mode in action

**Tools:**
- **ScreenToGif** (Windows)
- **LICEcap** (Mac/Windows)
- **Peek** (Linux)
- **Record browser + convert:** Chrome DevTools → Record → Convert with FFmpeg

---

## 📝 Update README with Screenshots

After taking screenshots, update your README.md to include them:

```markdown
## 📸 Screenshots

### Landing Page
![Landing Page](screenshots/01-landing-page.png)

### Dashboard
![Dashboard](screenshots/04-dashboard-stats.png)

### Practice Interface
![Practice Page](screenshots/06-practice-initial.png)

### Sentence Completion
![Completed Sentences](screenshots/08-practice-completed-ticks.png)
```

---

## ✅ Checklist

Before sharing your app, make sure you have:

- [ ] All 12 screenshots taken
- [ ] Screenshots saved in `screenshots/` folder
- [ ] Screenshots added to README.md
- [ ] Optional: GIF created showing key features
- [ ] Optional: Create a collage using tools like Figma or Canva
- [ ] Verify all images display correctly on GitHub

---

## 🚀 Ready to Share!

Once you have your screenshots:

1. **Commit screenshots:**
   ```bash
   git add screenshots/
   git commit -m "docs: Add application screenshots"
   git push
   ```

2. **Update README** with screenshot links

3. **Share on:**
   - GitHub repository
   - LinkedIn
   - Twitter/X
   - Dev.to
   - Reddit (r/webdev, r/languagelearning)

---

**Your app is running at: http://localhost:3000**

Start capturing! 📸
