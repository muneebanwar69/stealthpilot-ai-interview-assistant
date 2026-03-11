# 🤫 Stealth Mode - How to Use

## What is Stealth Mode?

Stealth Mode allows you to see AI-generated answers **without the interviewer seeing them** when you share your screen. The answers appear in a separate popup window that you can position on a second monitor or minimize.

## How to Activate

1. **Start a live session** - Navigate to the live session page
2. **Click "Enable Stealth Mode"** button
3. **A popup window will open** with the title "AI Answers (Stealth)"
4. **Position the popup**:
   - **Option A**: Move it to your **second monitor** (recommended)
   - **Option B**: **Minimize the main tab** and keep popup visible
   - **Option C**: Keep popup behind your meeting window

## During the Interview

### When Sharing Screen:
1. **Share ONLY your meeting window** (not entire screen)
2. The interviewer will see:
   - ✅ Your meeting/interview screen
   - ❌ NOT the stealth popup window
   - ❌ NOT the main StealthPilot tab (if minimized)

3. **Look at the stealth popup** on your second monitor or by quickly Alt+Tabbing

### Tips for Maximum Stealth:

#### **Dual Monitor Setup** (Best):
```
Monitor 1 (Share this):        Monitor 2 (Keep private):
┌──────────────────┐          ┌──────────────────┐
│                  │          │                  │
│  Google Meet     │          │  [Stealth Popup] │
│  Zoom            │          │                  │
│  Interview       │          │  AI Answers      │
│                  │          │  Visible here    │
└──────────────────┘          └──────────────────┘
```

#### **Single Monitor** (Alternate):
1. Position stealth popup at **bottom-right corner**
2. Keep meeting window **slightly smaller** so you can peek at the corner
3. Or use **Alt+Tab** to quickly switch windows

#### **Mobile Device** (Creative):
- Open stealth popup
- Use phone/tablet to view the popup window remotely (if accessible)

## Keyboard Shortcuts

- **Ctrl + Shift + H**: Quickly minimize/hide the main tab
- **Alt + Tab**: Switch between windows quickly

## How It Works

1. **Web Speech API transcribes** your audio locally (browser does this)
2. **Transcripts are sent to backend** for AI processing
3. **AI answers appear in BOTH**:
   - Main session page (if visible)
   - Stealth popup window (always)
4. **Screen sharing captures only what you select** - the popup is a separate window

## Security Notes

- ✅ **Popup is a separate browser window** - not captured unless you share "entire screen"
- ✅ **Always share specific window**, not entire screen
- ✅ **Title says "AI Answers"** - you can rename it by editing the popup if needed
- ⚠️ **Don't share your browser tab bar** - it shows "StealthPilot" in the tab name
- ⚠️ **Test in a practice call first** to ensure setup works

## Best Practices

### Before the Interview:
1. ✅ Test stealth mode in a practice Google Meet/Zoom call
2. ✅ Verify interviewer CANNOT see the popup
3. ✅ Practice quick window switching (Alt+Tab)
4. ✅ Position windows optimally

### During the Interview:
1. ✅ Share **specific application window** (Google Meet/Zoom)
2. ✅ Keep stealth popup on second monitor or minimized behind
3. ✅ Glance naturally - don't make it obvious you're reading
4. ✅ Paraphrase AI answers in your own words

### After Each Answer:
1. ✅ **Read the answer quickly**
2. ✅ **Paraphrase naturally** - don't read word-for-word
3. ✅ **Add your own thoughts** to make it authentic

## Troubleshooting

### "Popup blocked"
- Allow popups for this site in browser settings
- Chrome: Click the popup icon in address bar → Always allow

### "Interviewer can see it"
- You're sharing "Entire Screen" instead of specific window
- Change share settings to share "Window" or "Application"

### "Can't see popup on second monitor"
- Drag popup window to your second monitor
- Check if monitor is set to Extended mode (not Mirrored)

### "Popup closes automatically"
- Browser may be blocking popups
- Check popup blocker settings

## Alternative: Picture-in-Picture (Future)

We may add Picture-in-Picture mode in a future update, which will float a small overlay that's even more stealthy.

---

**Remember**: Use this tool ethically. It's designed for practice, preparation, and learning - not for cheating in high-stakes assessments where it's prohibited.
