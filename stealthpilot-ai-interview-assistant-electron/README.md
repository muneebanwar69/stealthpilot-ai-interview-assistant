# Parakeet AI - Electron Desktop App

**Invisible AI Interview Assistant for Desktop**

This electron wrapper provides screen-share invisibility for the Parakeet AI web application, making it perfect for real interviews where you need the AI assistant to remain hidden from the interviewer.

## Features

- ✅ **Content Protection**: Window is invisible to screen capture (Zoom, Teams, Meet, etc.)
- ✅ **Always on Top**: Overlay stays above all other windows
- ✅ **Frameless**: Custom UI without OS window frame
- ✅ **System Tray**: Minimize to tray, quick access
- ✅ **Global Hotkeys**: Control visibility without clicking
- ✅ **Adjustable Opacity**: 70%-100% transparency
- ✅ **Position Presets**: Top-right, top-left, bottom-right, bottom-left
- ✅ **Persistent Settings**: Window position and preferences saved

## Requirements

- Node.js 18+ and npm
- Parakeet backend running (FastAPI server on port 8000)
- Parakeet frontend running (Next.js dev server on port 3000)

## Installation

```bash
cd parakeet-electron
npm install
```

## Development

### 1. Start the Backend API

```bash
cd ../stealthpilot-ai-interview-assistant-backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend (in a new terminal)

```bash
cd ../stealthpilot-ai-interview-assistant-frontend
npm run dev
```

### 3. Start Electron (in a new terminal)

```bash
cd ../stealthpilot-ai-interview-assistant-electron
npm run electron:dev
```

This will:
- Wait for the Next.js dev server to be ready on http://localhost:3000
- Launch the Electron app automatically
- Load the live session page directly

**Alternatively**, start Electron manually:

```bash
npm run electron
```

## Production Build

### Build Frontend Static Export

First, build the Next.js app as a static export:

```bash
cd ../stealthpilot-ai-interview-assistant-frontend
npm run build
npm run export   # Creates 'out' directory
```

### Build Electron App

```bash
cd ../stealthpilot-ai-interview-assistant-electron
npm run dist
```

This creates installers in the `dist/` directory:
- **Windows**: `Parakeet-AI-Setup-1.0.0.exe` and `Parakeet-AI-1.0.0-portable.exe`
- **macOS**: `Parakeet-AI-1.0.0.dmg` and `Parakeet-AI-1.0.0-mac.zip`
- **Linux**: `Parakeet-AI-1.0.0.AppImage` and `parakeet-ai_1.0.0_amd64.deb`

## Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` / `Cmd+Shift+H` | Show/Hide window |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Toggle content protection |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Toggle always on top |

## System Tray Menu

Right-click the tray icon to access:
- Show/Hide window
- Toggle Always On Top
- Toggle Content Protection (invisibility)
- Adjust Opacity (70%-100%)
- Quit application

## How Content Protection Works

### Windows
- Uses `setContentProtection(true)` API
- Window appears as **black box** in screen captures
- Interviewer sees nothing, you see the live transcript and AI suggestions

### macOS
- Uses `setContentProtection(true)` + entitlements
- Works with Zoom, Teams, Google Meet, Discord
- Requires signed app for full functionality

### Linux
- Limited support (depends on compositor)
- Works with some screen capture tools
- Falls back to always-on-top overlay

## Configuration

Electron stores settings in:
- **Windows**: `%APPDATA%\parakeet-electron\config.json`
- **macOS**: `~/Library/Application Support/parakeet-electron/config.json`
- **Linux**: `~/.config/parakeet-electron/config.json`

Default configuration:

```json
{
  "alwaysOnTop": true,
  "screenProtection": true,
  "opacity": 0.95,
  "position": "top-right",
  "width": 400,
  "height": 600
}
```

## Troubleshooting

### Window isn't invisible in screen share

1. Ensure content protection is enabled:
   - Check system tray menu
   - Press `Ctrl+Shift+P` to toggle
   - Restart the app

2. On macOS: Sign the app
   ```bash
   npm run dist
   # Use the signed .dmg file
   ```

3. Test with different screen capture tools:
   - ✅ Zoom: Works
   - ✅ Microsoft Teams: Works
   - ✅ Google Meet: Works
   - ✅ OBS Studio: May show window (intended for privacy)

### Window doesn't stay on top

- Toggle "Always On Top" from tray menu
- Press `Ctrl+Shift+T`
- Restart with admin/sudo privileges (Windows/Linux)

### Frontend doesn't load

- Ensure Next.js dev server is running on port 3000
- Check http://localhost:3000/session/live?id=1 in browser first
- Clear electron cache: Delete config file and restart

### Audio capture not working

- Grant microphone permissions in OS settings
- Restart Electron app after granting permissions
- Check browser console for errors (if DevTools open)

## Building for Production

### macOS Code Signing (Required for Content Protection)

1. Get Apple Developer account
2. Create certificates in Xcode
3. Update `package.json` build config:

```json
"build": {
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

4. Build and sign:
```bash
npm run dist
```

### Windows Code Signing (Optional)

1. Get code signing certificate
2. Configure in `package.json`:

```json
"build": {
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "your-password"
  }
}
```

## Architecture

```
parakeet-electron/
├── electron/
│   ├── main.js          # Main process (window management)
│   ├── preload.js       # IPC bridge (secure API exposure)
│   └── icon.png         # Tray icon
├── package.json         # Dependencies and build config
└── README.md           # This file
```

## Deployment Checklist

- [ ] Backend API is publicly accessible (or running locally)
- [ ] Frontend is built as static export (`npm run export`)
- [ ] Electron package.json points to correct start URL
- [ ] Icons are included (icon.ico, icon.icns, icon.png)
- [ ] App is code-signed (macOS/Windows)
- [ ] Tested on target OS with screen capture tools
- [ ] Global shortcuts work
- [ ] System tray icon appears
- [ ] Content protection verified (window invisible in screen share)

## Next Steps

1. **Customize UI**: Modify electron window chrome (frameless UI)
2. **Add Notifications**: Desktop notifications for AI answers
3. **Voice Commands**: Add hotkeys to trigger specific actions
4. **Multi-Monitor**: Detect screens and allow window placement
5. **Auto-Updater**: Implement electron-updater for OTA updates

## License

MIT License - See LICENSE file

## Support

For issues or questions:
- GitHub Issues: [link]
- Email: support@parakeet.ai
- Documentation: [link]

---

**Built with ❤️ using Electron + Next.js + FastAPI**
