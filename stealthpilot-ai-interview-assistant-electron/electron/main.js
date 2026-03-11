/**
 * StealthPilot – Invisible Electron Overlay
 *
 * This window is COMPLETELY invisible to screen capture / screen sharing.
 * It floats above everything, has no taskbar entry, and setContentProtection(true)
 * makes it a black rectangle in any screenshot or OBS / Zoom / Teams share.
 *
 * Keyboard shortcuts (all work globally, even when another app is focused):
 *   Ctrl+Shift+H   – Toggle visibility (show / hide)
 *   Ctrl+Shift+P   – Toggle content protection on / off
 *   Ctrl+Shift+E   – Emergency erase: hide + quit immediately
 *   Ctrl+Shift+M   – Toggle click-through (mouse passes through overlay)
 *   Ctrl+Up/Down    – Move window up / down
 *   Ctrl+Left/Right – Move window left / right
 *   Ctrl+Shift+Plus – Increase opacity
 *   Ctrl+Shift+-    – Decrease opacity
 */

const { app, BrowserWindow, ipcMain, screen, globalShortcut, nativeImage, session, desktopCapturer } = require('electron');
const path = require('path');
const Store = require('electron-store');
const geminiLiveService = require('./geminiLiveService');
const groqService = require('./groqService');

// ─── Crash prevention: catch unhandled errors/rejections in main process ────
process.on('uncaughtException', (error) => {
    console.error('[StealthPilot] Uncaught exception:', error?.message || error);
});
process.on('unhandledRejection', (reason) => {
    console.error('[StealthPilot] Unhandled rejection:', reason?.message || reason);
});

// ─── Chromium flags for media device access & Web Speech API ────────────────
// These MUST be set before app.whenReady()

// GPU / rendering – prevent black screen on Windows
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI,SpeechSynthesisVoices');
app.commandLine.appendSwitch('enable-speech-dispatcher');  // Linux speech

// Force use of Google's speech servers (same as Chrome)
app.commandLine.appendSwitch('enable-speech-input');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

// Media permissions
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');

// Windows: ensure audio devices are accessible
app.commandLine.appendSwitch('disable-features', 'MediaFoundationAsyncCreate');

// Disable web security for localhost development (allows cross-origin)
if (process.env.NODE_ENV === 'development') {
    app.commandLine.appendSwitch('disable-web-security');
    app.commandLine.appendSwitch('allow-running-insecure-content');
}

const store = new Store();
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Initialize API keys from environment if not already set
if (!store.get('geminiApiKey')) {
    const geminiKey = process.env.GEMINI_API_KEY || 'AIzaSyCTTUUdXdW1EJ_T1nQRH6vtPqnxW_Na7Lw';
    store.set('geminiApiKey', geminiKey);
    console.log('[Init] Gemini API key loaded from environment');
}
if (!store.get('groqApiKey')) {
    const groqKey = process.env.GROQ_API_KEY || '';
    if (groqKey) {
        store.set('groqApiKey', groqKey);
        console.log('[Init] Groq API key loaded from environment');
    }
}

let mainWindow = null;
let isVisible = true;
let mousePassThrough = false;

// ─── Configuration ──────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
    alwaysOnTop: true,
    screenProtection: !isDev, // OFF in dev so window is visible; ON in production
    opacity: 1.0,            // full opacity to avoid black-screen appearance
    width: 700,
    height: 800,
    position: 'right', // 'right' | 'left' | 'center'
    moveStep: 60,
};

function getConfig() {
    return { ...DEFAULT_CONFIG, ...store.get('windowConfig', {}) };
}

// ─── Window Creation ────────────────────────────────────────────────────────
function createWindow() {
    const config = getConfig();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Restore saved position or place at right edge
    let x = store.get('windowConfig.x');
    let y = store.get('windowConfig.y');
    if (x == null || y == null) {
        switch (config.position) {
            case 'left':
                x = 10;
                y = 10;
                break;
            case 'center':
                x = Math.floor((screenWidth - config.width) / 2);
                y = Math.floor((screenHeight - config.height) / 2);
                break;
            default: // right
                x = screenWidth - config.width - 10;
                y = 10;
        }
    }

    // Ensure window is on-screen
    const clampedX = Math.max(0, Math.min(x, screenWidth - 100));
    const clampedY = Math.max(0, Math.min(y, screenHeight - 100));

    mainWindow = new BrowserWindow({
        x: clampedX,
        y: clampedY,
        width: config.width,
        height: config.height,
        frame: false, // frameless – custom title bar in renderer
        transparent: false, // solid bg so content is readable
        hasShadow: true,
        opacity: config.opacity,
        skipTaskbar: isDev ? false : true, // visible in taskbar during dev
        resizable: true,
        minimizable: true,
        maximizable: true,
        focusable: true,
        show: false, // don't show until ready-to-show
        minWidth: 360,
        minHeight: 300,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false, // keep running when blurred
        },
        backgroundColor: '#0a0a0f', // dark bg matching the app theme
    });

    // Show window only after content is painted (avoids flash of black)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
        console.log('[StealthPilot] Window ready-to-show, now visible');
    });

    // ── Permissions — auto-grant microphone, camera, audio ────────────────
    const ses = mainWindow.webContents.session;

    // Grant all media permissions (microphone, camera, screen) automatically
    ses.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = [
            'media',           // microphone + camera
            'audioCapture',    // microphone specifically  
            'videoCapture',    // camera / screen
            'mediaKeySystem',
            'geolocation',
            'notifications',
            'display-capture', // getDisplayMedia
        ];
        console.log(`[StealthPilot] Permission request: ${permission} → ${allowed.includes(permission) ? 'GRANTED' : 'DENIED'}`);
        callback(allowed.includes(permission));
    });

    ses.setPermissionCheckHandler((webContents, permission) => {
        const allowed = ['media', 'audioCapture', 'videoCapture', 'mediaKeySystem', 'display-capture'];
        return allowed.includes(permission);
    });

    // Handle getDisplayMedia requests (for system audio capture)
    ses.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
            if (sources.length > 0) {
                callback({ video: sources[0], audio: 'loopback' });
            } else {
                callback({});
            }
        }).catch(() => callback({}));
    }, { useSystemPicker: false });

    console.log('[StealthPilot] Media permissions configured — microphone auto-granted');

    // ── Stealth settings ───────────────────────────────────────────────────
    // Content protection = invisible in screen capture / share
    // In dev mode this is OFF by default so the window is actually visible
    if (config.screenProtection) {
        mainWindow.setContentProtection(true);
        console.log('[StealthPilot] Content protection: ON (window hidden from capture)');
    } else {
        mainWindow.setContentProtection(false);
        console.log('[StealthPilot] Content protection: OFF (window visible — dev mode)');
    }

    // Always on top — use 'floating' in dev (less aggressive), 'screen-saver' in prod
    const onTopLevel = isDev ? 'floating' : 'screen-saver';
    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(config.alwaysOnTop, onTopLevel, isDev ? 0 : 1);
    } else {
        mainWindow.setAlwaysOnTop(config.alwaysOnTop, onTopLevel);
    }

    // Visible on all virtual desktops / workspaces
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // In production, skip taskbar for stealth; in dev, keep it visible
    if (!isDev) {
        mainWindow.setSkipTaskbar(true);
    }

    // macOS: hide from Mission Control
    if (typeof mainWindow.setHiddenInMissionControl === 'function') {
        mainWindow.setHiddenInMissionControl(true);
    }

    // ── Load the app ───────────────────────────────────────────────────────
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const startUrl = isDev
        ? `http://localhost:${frontendPort}/session/live?id=1`
        : `file://${path.join(__dirname, '../app/index.html')}`;

    // Handle page load failures gracefully
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        console.error(`[StealthPilot] Page failed to load: ${errorCode} ${errorDescription} (${validatedURL})`);
        // Show inline error page so the user sees something instead of black
        mainWindow.webContents.loadURL(`data:text/html;charset=utf-8,
            <html><body style="background:#0a0a0f;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
            <h2 style="color:#7c6aff">StealthPilot</h2>
            <p>Could not load <code>${validatedURL}</code></p>
            <p style="color:#f87171">${errorDescription} (${errorCode})</p>
            <p style="margin-top:20px;color:#888">Make sure the frontend (npm run dev) and backend are running.</p>
            <button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#7c6aff;border:none;color:#fff;border-radius:8px;cursor:pointer;font-size:14px">Retry</button>
            </body></html>`);
    });

    mainWindow.loadURL(startUrl);
    console.log(`[StealthPilot] Loading URL: ${startUrl}`);

    // After the page loads, auto-login as admin and inject the token
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            (async function autoLogin() {
                // If already have a token, skip
                if (localStorage.getItem('token')) {
                    console.log('[StealthPilot] Token already exists');
                    return;
                }
                try {
                    console.log('[StealthPilot] Auto-login as admin...');
                    const res = await fetch('http://localhost:8000/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'username=admin&password=admin123'
                    });
                    if (res.ok) {
                        const data = await res.json();
                        localStorage.setItem('token', data.access_token);
                        console.log('[StealthPilot] Auto-login success, reloading...');
                        window.location.reload();
                    } else {
                        console.error('[StealthPilot] Auto-login failed:', res.status);
                    }
                } catch (e) {
                    console.error('[StealthPilot] Auto-login error:', e);
                }
            })();
        `).catch(e => console.error('[StealthPilot] executeJS error:', e));
    });

    // DevTools (detached so they don't affect layout)
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // ── Window events ──────────────────────────────────────────────────────
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Re-assert always-on-top when focus is lost
    mainWindow.on('blur', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const level = isDev ? 'floating' : 'screen-saver';
            if (process.platform === 'win32') {
                mainWindow.setAlwaysOnTop(true, level, isDev ? 0 : 1);
            } else {
                mainWindow.setAlwaysOnTop(true, level);
            }
        }
    });

    // Persist position on move
    mainWindow.on('move', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const [px, py] = mainWindow.getPosition();
            store.set('windowConfig.x', px);
            store.set('windowConfig.y', py);
        }
    });

    // Persist size on resize
    mainWindow.on('resize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            const [w, h] = mainWindow.getSize();
            store.set('windowConfig.width', w);
            store.set('windowConfig.height', h);
        }
    });

    console.log(`[StealthPilot] Window created – ${config.width}x${config.height} at (${x},${y})`);
    console.log(`[StealthPilot] Content protection: ${config.screenProtection ? 'ON' : 'OFF'}`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function setOpacity(value) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const clamped = Math.max(0.2, Math.min(1.0, value));
    mainWindow.setOpacity(clamped);
    store.set('windowConfig.opacity', clamped);
    console.log(`[StealthPilot] Opacity: ${(clamped * 100).toFixed(0)}%`);
}

function moveWindow(dx, dy) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const [cx, cy] = mainWindow.getPosition();
    mainWindow.setPosition(cx + dx, cy + dy);
}

// ─── Global Shortcuts ───────────────────────────────────────────────────────
function registerGlobalShortcuts() {
    const step = getConfig().moveStep || 60;

    // Toggle visibility
    globalShortcut.register('CommandOrControl+Shift+H', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        if (isVisible) {
            mainWindow.hide();
            isVisible = false;
            console.log('[StealthPilot] Hidden');
        } else {
            mainWindow.showInactive(); // show without stealing focus
            isVisible = true;
            console.log('[StealthPilot] Shown');
        }
    });

    // Toggle content protection
    globalShortcut.register('CommandOrControl+Shift+P', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const current = store.get('windowConfig.screenProtection', true);
        mainWindow.setContentProtection(!current);
        store.set('windowConfig.screenProtection', !current);
        console.log(`[StealthPilot] Content protection: ${!current ? 'ON' : 'OFF'}`);
    });

    // Emergency erase – hide + quit
    globalShortcut.register('CommandOrControl+Shift+E', () => {
        console.log('[StealthPilot] EMERGENCY ERASE');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
            // Purge sensitive data in renderer
            mainWindow.webContents.executeJavaScript(`
                try { document.body.innerHTML = ''; localStorage.clear(); } catch(e) {}
            `).catch(() => {});
        }
        setTimeout(() => app.quit(), 200);
    });

    // Toggle click-through
    globalShortcut.register('CommandOrControl+Shift+M', () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mousePassThrough = !mousePassThrough;
        if (mousePassThrough) {
            mainWindow.setIgnoreMouseEvents(true, { forward: true });
            console.log('[StealthPilot] Click-through: ON');
        } else {
            mainWindow.setIgnoreMouseEvents(false);
            console.log('[StealthPilot] Click-through: OFF');
        }
        // Notify renderer
        mainWindow.webContents.send('click-through-toggled', mousePassThrough);
    });

    // Move window — Ctrl+Arrow keys
    globalShortcut.register('CommandOrControl+Up', () => moveWindow(0, -step));
    globalShortcut.register('CommandOrControl+Down', () => moveWindow(0, step));
    globalShortcut.register('CommandOrControl+Left', () => moveWindow(-step, 0));
    globalShortcut.register('CommandOrControl+Right', () => moveWindow(step, 0));

    // Opacity ± — Ctrl+Shift+Plus / Ctrl+Shift+Minus
    globalShortcut.register('CommandOrControl+Shift+=', () => {
        const current = store.get('windowConfig.opacity', 0.92);
        setOpacity(current + 0.05);
    });
    globalShortcut.register('CommandOrControl+Shift+-', () => {
        const current = store.get('windowConfig.opacity', 0.92);
        setOpacity(current - 0.05);
    });

    console.log('[StealthPilot] Global shortcuts registered');
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
    // Clear stale window position if it might cause off-screen issues
    const savedX = store.get('windowConfig.x');
    const savedY = store.get('windowConfig.y');
    const primary = screen.getPrimaryDisplay().workAreaSize;
    if (savedX != null && (savedX < -50 || savedX > primary.width || savedY < -50 || savedY > primary.height)) {
        console.log('[StealthPilot] Clearing stale window position (was off-screen)');
        store.delete('windowConfig.x');
        store.delete('windowConfig.y');
    }

    createWindow();
    registerGlobalShortcuts();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// ─── IPC Handlers ───────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => getConfig());

ipcMain.handle('set-config', (_event, config) => {
    store.set('windowConfig', { ...store.get('windowConfig', {}), ...config });
    return true;
});

ipcMain.handle('toggle-always-on-top', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const current = mainWindow.isAlwaysOnTop();
    if (current) {
        mainWindow.setAlwaysOnTop(false);
    } else {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
    store.set('windowConfig.alwaysOnTop', !current);
    return !current;
});

ipcMain.handle('toggle-content-protection', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const current = store.get('windowConfig.screenProtection', true);
    mainWindow.setContentProtection(!current);
    store.set('windowConfig.screenProtection', !current);
    return !current;
});

ipcMain.handle('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
});

ipcMain.handle('maximize-window', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        return false;
    } else {
        mainWindow.maximize();
        return true;
    }
});

ipcMain.handle('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('set-window-size', (_event, width, height) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setSize(width, height);
    }
});

ipcMain.handle('set-window-position', (_event, x, y) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setPosition(x, y);
    }
});

ipcMain.handle('center-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.center();
    }
});

// ─── Gemini Live Audio IPC Handlers ────────────────────────────────────────

// Initialize Gemini Live session with profile support
ipcMain.handle('gemini-live-initialize', async (_event, apiKey, customPrompt, profile, language) => {
    try {
        const success = await geminiLiveService.initializeGeminiLive(
            apiKey,
            customPrompt || '',
            profile || 'interview',
            language || 'en-US'
        );
        return { success };
    } catch (error) {
        console.error('[IPC] Gemini Live init error:', error);
        return { success: false, error: error.message };
    }
});

// Send audio chunk to Gemini (24kHz PCM mono)
ipcMain.handle('gemini-send-audio', async (_event, base64Data) => {
    try {
        if (!base64Data || typeof base64Data !== 'string') {
            console.warn('[Audio IPC] Invalid audio data received');
            return { success: false, error: 'Invalid audio data' };
        }
        
        const result = await geminiLiveService.sendAudioToGemini(base64Data);
        return result || { success: true };  // Fallback if no result returned
    } catch (error) {
        console.error('[Audio IPC] Error sending audio:', error?.message || error);
        return { success: false, error: error?.message || 'Unknown error' };
    }
});

// Send text message to Gemini Live session
ipcMain.handle('gemini-send-text', async (_event, text) => {
    return geminiLiveService.sendTextToGemini(text);
});

// Close Gemini Live session
ipcMain.handle('gemini-live-close', async () => {
    geminiLiveService.closeGeminiLive();
    return { success: true };
});

// Check if Gemini Live session is active
ipcMain.handle('gemini-live-is-active', async () => {
    return { active: geminiLiveService.isGeminiLiveActive() };
});

// ─── Image / Screenshot Analysis IPC Handler ──────────────────────────────

ipcMain.handle('send-image-content', async (_event, { data, prompt }) => {
    try {
        if (!data || typeof data !== 'string') {
            return { success: false, error: 'Invalid image data' };
        }
        const buffer = Buffer.from(data, 'base64');
        if (buffer.length < 1000) {
            return { success: false, error: 'Image buffer too small' };
        }
        return await groqService.sendImageToGeminiHttp(data, prompt);
    } catch (error) {
        console.error('[IPC] Image content error:', error);
        return { success: false, error: error.message };
    }
});

// ─── Groq / Gemini API Key Storage ────────────────────────────────────────

ipcMain.handle('set-groq-api-key', (_event, key) => {
    store.set('groqApiKey', key || '');
    return { success: true };
});

ipcMain.handle('set-gemini-api-key', (_event, key) => {
    store.set('geminiApiKey', key || '');
    return { success: true };
});

ipcMain.handle('get-gemini-api-key', () => {
    return store.get('geminiApiKey', '');
});

ipcMain.handle('get-groq-api-key', () => {
    return store.get('groqApiKey', '');
});

// ─── Send text question to Groq/Gemma via IPC ────────────────────────────

ipcMain.handle('send-text-to-groq', async (_event, text) => {
    try {
        const groqService = require('./groqService');
        await groqService.generateTextResponse(text);
        return { success: true };
    } catch (error) {
        console.error('[Groq IPC] Error:', error.message);
        return { success: false, error: error.message };
    }
});

// ─── Set active profile ──────────────────────────────────────────────────

ipcMain.handle('set-profile', (_event, profile) => {
    try {
        const groqService = require('./groqService');
        const { getSystemPrompt } = require('./prompts');
        const prompt = getSystemPrompt(profile);
        groqService.setSystemPrompt(prompt);
        store.set('activeProfile', profile);
        return { success: true, profile };
    } catch (error) {
        console.error('[Profile] Error setting profile:', error.message);
        return { success: false, error: error.message };
    }
});

// ─── Whisper Local Transcription IPC Handler ───────────────────────────────

// Handle audio transcription using local Whisper model (main process)
ipcMain.handle('transcribe-audio', async (_event, audioBase64, mimeType) => {
    try {
        console.log('[Whisper] Transcription request received');
        
        // Dynamically import @xenova/transformers (ESM module)
        const { pipeline } = await import('@xenova/transformers');

        // Load Whisper model once, reuse for all subsequent requests
        if (!global.whisperPipeline) {
            console.log('[Whisper] Loading model for first time...');
            global.whisperPipeline = await pipeline(
                'automatic-speech-recognition',
                'Xenova/whisper-tiny.en',
                {
                    chunk_length_s: 10,
                    stride_length_s: 2,
                }
            );
            console.log('[Whisper] Model loaded successfully');
        }

        // Convert base64 back to Float32Array
        const buffer = Buffer.from(audioBase64, 'base64');
        const float32 = new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.byteLength / 4
        );

        console.log('[Whisper] Processing audio chunk...');
        const result = await global.whisperPipeline(float32, {
            language: 'english',
            task: 'transcribe',
        });

        const text = result.text?.trim() || '';
        console.log('[Whisper] Transcription result:', text);
        
        return { success: true, text: text };
    } catch (error) {
        console.error('[Whisper] Transcription error:', error);
        return { success: false, error: error.message || 'Transcription failed' };
    }
});

// ─── Startup log ────────────────────────────────────────────────────────────
console.log('[StealthPilot] Electron overlay started');
console.log('[StealthPilot] Dev mode:', isDev);
console.log('[StealthPilot] Saved config:', store.get('windowConfig', {}));
