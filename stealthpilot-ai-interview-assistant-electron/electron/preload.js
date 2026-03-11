/**
 * StealthPilot - Electron Preload Script
 *
 * Exposes safe APIs to the renderer process via contextBridge.
 * Matches the cheating-daddy IPC surface: Gemini Live audio, Groq/Gemma
 * text responses, image analysis, profiles, and stealth window controls.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // ── Window controls ─────────────────────────────────────────────────
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    setWindowSize: (w, h) => ipcRenderer.invoke('set-window-size', w, h),
    setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', x, y),
    centerWindow: () => ipcRenderer.invoke('center-window'),

    // ── Settings ────────────────────────────────────────────────────────
    getConfig: () => ipcRenderer.invoke('get-config'),
    setConfig: (config) => ipcRenderer.invoke('set-config', config),
    toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
    toggleContentProtection: () => ipcRenderer.invoke('toggle-content-protection'),

    // ── Events from main process ────────────────────────────────────────
    onClickThroughToggled: (callback) => {
        ipcRenderer.on('click-through-toggled', (_event, value) => callback(value));
    },

    // ── Gemini Live Audio — initialization with profiles ────────────────
    geminiLiveInitialize: (apiKey, customPrompt, profile, language) =>
        ipcRenderer.invoke('gemini-live-initialize', apiKey, customPrompt, profile, language),
    geminiSendAudio: (base64Data) => ipcRenderer.invoke('gemini-send-audio', base64Data),
    geminiSendText: (text) => ipcRenderer.invoke('gemini-send-text', text),
    geminiLiveClose: () => ipcRenderer.invoke('gemini-live-close'),
    geminiLiveIsActive: () => ipcRenderer.invoke('gemini-live-is-active'),

    // ── Image / screenshot analysis ─────────────────────────────────────
    sendImageContent: (data, prompt) => ipcRenderer.invoke('send-image-content', { data, prompt }),

    // ── Groq / Gemma settings ───────────────────────────────────────────
    setGroqApiKey: (key) => ipcRenderer.invoke('set-groq-api-key', key),
    setGeminiApiKey: (key) => ipcRenderer.invoke('set-gemini-api-key', key),
    getGeminiApiKey: () => ipcRenderer.invoke('get-gemini-api-key'),
    getGroqApiKey: () => ipcRenderer.invoke('get-groq-api-key'),

    // ── Groq text question (for manual questions via IPC) ───────────────
    sendTextToGroq: (text) => ipcRenderer.invoke('send-text-to-groq', text),

    // ── Profile management ──────────────────────────────────────────────
    setProfile: (profile) => ipcRenderer.invoke('set-profile', profile),

    // ── Gemini Live events (with cleanup support) ───────────────────────
    onGeminiTranscription: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('gemini-transcription', handler);
        return () => ipcRenderer.removeListener('gemini-transcription', handler);
    },
    onGeminiTurnComplete: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('gemini-turn-complete', handler);
        return () => ipcRenderer.removeListener('gemini-turn-complete', handler);
    },
    onGeminiLiveStatus: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('gemini-live-status', handler);
        return () => ipcRenderer.removeListener('gemini-live-status', handler);
    },

    // ── Groq/Gemma streaming response events ────────────────────────────
    onNewResponse: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('new-response', handler);
        return () => ipcRenderer.removeListener('new-response', handler);
    },
    onUpdateResponse: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('update-response', handler);
        return () => ipcRenderer.removeListener('update-response', handler);
    },
    onResponseComplete: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('response-complete', handler);
        return () => ipcRenderer.removeListener('response-complete', handler);
    },
    onUpdateStatus: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('update-status', handler);
        return () => ipcRenderer.removeListener('update-status', handler);
    },
    onReconnectFailed: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('reconnect-failed', handler);
        return () => ipcRenderer.removeListener('reconnect-failed', handler);
    },

    // ── Cleanup helpers ─────────────────────────────────────────────────
    removeAllGeminiListeners: () => {
        ipcRenderer.removeAllListeners('gemini-transcription');
        ipcRenderer.removeAllListeners('gemini-turn-complete');
        ipcRenderer.removeAllListeners('gemini-live-status');
        ipcRenderer.removeAllListeners('new-response');
        ipcRenderer.removeAllListeners('update-response');
        ipcRenderer.removeAllListeners('response-complete');
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.removeAllListeners('reconnect-failed');
    },

    // ── Local Whisper transcription (fallback) ──────────────────────────
    transcribeAudio: (audioBase64, mimeType) => ipcRenderer.invoke('transcribe-audio', audioBase64, mimeType),

    // ── Platform info ───────────────────────────────────────────────────
    platform: process.platform,
    isElectron: true,
});

console.log('[StealthPilot] Preload script loaded (v2 - Gemini Live + Groq)');
