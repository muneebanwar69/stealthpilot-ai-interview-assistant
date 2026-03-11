# Audio Handling, Gemini Models & Electron Implementation — `src/utils/`

Comprehensive documentation of how audio is captured, transcribed, how responses are produced, which Gemini models are used, and how Electron is implemented across the `src/utils/` folder.

---

## Table of Contents

1. [Gemini Models Used](#gemini-models-used)
2. [Other AI Providers](#other-ai-providers-non-gemini)
3. [Three Provider Modes](#three-provider-modes)
4. [Audio Capture Pipeline](#audio-capture-pipeline)
5. [Transcription Pipeline](#transcription-pipeline)
6. [Response Generation Pipeline](#response-generation-pipeline)
7. [Screenshot / Image Analysis](#screenshot--image-analysis)
8. [Response Delivery to UI](#response-delivery-to-ui)
9. [Conversation History & Persistence](#conversation-history--persistence)
10. [System Prompts](#system-prompts-promptsjs)
11. [Electron Implementation](#electron-implementation)
12. [File Responsibilities Summary](#file-responsibilities-summary)

---

## Gemini Models Used

| Model | File | Purpose |
|---|---|---|
| **`gemini-2.5-flash-native-audio-preview-09-2025`** | `gemini.js` | Live real-time audio streaming session via `@google/genai` SDK's `client.live.connect()`. This is the primary model — it receives raw PCM audio over a WebSocket, performs server-side transcription with speaker diarization, and triggers `generationComplete` events. |
| **`gemma-3-27b-it`** | `gemini.js` | Fallback text generation model used when **no Groq API key** is configured. Receives transcription text and generates responses via `ai.models.generateContentStream()`. |
| **Rate-limited model** (dynamic via `getAvailableModel()`) | `gemini.js` | Used for screenshot/image analysis via HTTP API (`ai.models.generateContentStream()`). The specific model is selected dynamically based on rate-limit tracking in `storage.js`. |

### How Gemini is Initialized (BYOK Mode)

```js
// gemini.js — initializeGeminiSession()
const client = new GoogleGenAI({
    vertexai: false,
    apiKey: apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
});

const session = await client.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: { onopen, onmessage, onerror, onclose },
    config: {
        responseModalities: [Modality.AUDIO],
        proactivity: { proactiveAudio: true },
        outputAudioTranscription: {},
        tools: enabledTools,          // optional Google Search
        inputAudioTranscription: {
            enableSpeakerDiarization: true,
            minSpeakerCount: 2,
            maxSpeakerCount: 2,
        },
        contextWindowCompression: { slidingWindow: {} },
        speechConfig: { languageCode: language },
        systemInstruction: { parts: [{ text: systemPrompt }] },
    },
});
```

Key config details:
- **Response modality**: AUDIO (Gemini responds with audio; output transcription is disabled in favor of Groq/Gemma for faster text)
- **Proactive audio**: enabled — Gemini can initiate responses
- **Speaker diarization**: 2 speakers (Interviewer + Candidate)
- **Context window compression**: sliding window to handle long sessions
- **Configurable language**: defaults to `en-US`
- **Google Search tool**: optionally enabled based on user setting

---

## Other AI Providers (non-Gemini)

| Provider | Model | File | Purpose |
|---|---|---|---|
| **Groq** | Rotated daily via `getModelForToday()` | `gemini.js` | **Primary** text response generation from transcriptions. Streaming via `POST https://api.groq.com/openai/v1/chat/completions`. Strips `<think>...</think>` tags from reasoning models. |
| **Ollama** (local) | User-configured (default: `llama3.1`) | `localai.js` | Fully local text generation from Whisper transcriptions. Connects to local Ollama server (default: `http://127.0.0.1:11434`). |
| **Whisper** (local) | User-configured (default: `Xenova/whisper-small`) | `localai.js` | Local speech-to-text via `@huggingface/transformers` pipeline. Quantized (`q8`), auto device selection. Models cached in `userData/whisper-models/`. |
| **Cloud** | Server-side (opaque) | `cloud.js` | WebSocket to `wss://api.cheatingdaddy.com/ws` — server handles transcription + response generation. |

---

## Three Provider Modes

The system supports three provider modes, tracked by `currentProviderMode` in `gemini.js`:

| Mode | Value | Audio Handling | Transcription | Text Response |
|---|---|---|---|---|
| **BYOK** | `'byok'` | Sent to Gemini live session as base64 PCM | Gemini server-side (with diarization) | Groq (primary) or Gemma (fallback) |
| **Cloud** | `'cloud'` | Sent as raw PCM binary over WebSocket | Server-side | Server-side |
| **Local** | `'local'` | Processed through VAD → Whisper | Local Whisper model | Local Ollama |

The mode is set when a session is initialized:
- `initialize-gemini` IPC → sets `'byok'`
- `initialize-cloud` IPC → sets `'cloud'`
- `initialize-local` IPC → sets `'local'`

---

## Audio Capture Pipeline

### Step 1: Audio Capture (renderer.js — Renderer Process)

Audio is captured at **24,000 Hz, mono, 16-bit PCM**.

#### Platform-Specific Capture

| Platform | System Audio Method | Microphone |
|---|---|---|
| **Windows** | `navigator.mediaDevices.getDisplayMedia()` with `audio: loopback` (enabled by Electron's `setDisplayMediaRequestHandler`) | `getUserMedia()` (optional) |
| **macOS** | Native **`SystemAudioDump`** binary spawned as child process in main process (`gemini.js`) | `getUserMedia()` (optional) |
| **Linux** | `navigator.mediaDevices.getDisplayMedia()` with audio tracks | `getUserMedia()` (optional) |

#### Audio Modes (user preference)

- `speaker_only` — only system/speaker audio (default)
- `mic_only` — only microphone
- `both` — system audio + microphone on separate IPC channels

#### Audio Processing Chain (Renderer)

```
Raw audio from AudioContext (Float32, 24kHz)
    ↓
convertFloat32ToInt16()          — clamp [-1,1], scale to Int16
    ↓
arrayBufferToBase64()            — encode to Base64 string
    ↓
ipcRenderer.invoke('send-audio-content', { data, mimeType: 'audio/pcm;rate=24000' })
    or
ipcRenderer.invoke('send-mic-audio-content', { data, mimeType: 'audio/pcm;rate=24000' })
```

- **Chunk duration**: 0.1 seconds (2,400 samples at 24kHz)
- **Buffer size**: 4096 samples per `ScriptProcessor` frame
- System audio uses `send-audio-content`, microphone uses `send-mic-audio-content`

#### Audio Processing Functions (Renderer)

| Function | Purpose |
|---|---|
| `setupWindowsLoopbackProcessing()` | ScriptProcessor for Windows loopback system audio |
| `setupLinuxSystemAudioProcessing()` | ScriptProcessor for Linux system audio from getDisplayMedia |
| `setupLinuxMicProcessing(micStream)` | ScriptProcessor for microphone (used on all platforms) |

### Step 2: macOS Native Audio (gemini.js — Main Process)

On macOS, `SystemAudioDump` (a native binary in `src/assets/`) outputs **stereo 24kHz, 16-bit PCM** to stdout:

```
SystemAudioDump stdout (stereo, 24kHz, 16-bit, 2 channels)
    ↓
Buffer accumulation (CHUNK_SIZE = 24000 × 2 bytes × 2 channels × 0.1s = 9600 bytes)
    ↓
convertStereoToMono()            — takes left channel only
    ↓
Route based on currentProviderMode:
    byok:  monoChunk.toString('base64') → sendAudioToGemini()
    cloud: raw PCM buffer → sendCloudAudio()
    local: raw PCM buffer → processLocalAudio()
```

### Step 3: Audio Routing (gemini.js — IPC Handlers)

The `send-audio-content` and `send-mic-audio-content` IPC handlers in `setupGeminiIpcHandlers()` route audio:

| Provider Mode | What Happens |
|---|---|
| `byok` | `geminiSession.sendRealtimeInput({ audio: { data, mimeType } })` — sent to Gemini live session |
| `cloud` | `Buffer.from(data, 'base64')` → `sendCloudAudio(pcmBuffer)` — raw binary over WebSocket |
| `local` | `Buffer.from(data, 'base64')` → `getLocalAi().processLocalAudio(pcmBuffer)` — into VAD pipeline |

---

## Transcription Pipeline

### BYOK Mode (Gemini Live Session)

```
Audio chunks (PCM 24kHz, base64) → Gemini Live WebSocket
    ↓
Server-side transcription with speaker diarization
    ↓
onmessage callback receives:
    - message.serverContent.inputTranscription.results  (with speakerId)
    - message.serverContent.inputTranscription.text     (plain text)
    ↓
formatSpeakerResults():
    speakerId 1 → "[Interviewer]"
    speakerId 2 → "[Candidate]"
    ↓
Accumulated into currentTranscription string
    ↓
On generationComplete event:
    if (hasGroqKey()) → sendToGroq(currentTranscription)
    else              → sendToGemma(currentTranscription)
    currentTranscription = ''
```

**Important**: Gemini's own `outputTranscription` is **DISABLED**. The code explicitly comments: "using Groq for faster responses instead." Gemini is used purely as an audio transcriber in BYOK mode.

### Cloud Mode (cloud.js)

```
Raw PCM audio → WebSocket binary frame → Server
    ↓
Server processes and sends back JSON:
    { type: "transcription", text: "..." }
    { type: "response_start" }
    { type: "response_chunk", text: "..." }
    { type: "response_end" }
```

### Local Mode (localai.js)

```
Audio (PCM 24kHz mono buffer)
    ↓
resample24kTo16k()               — linear interpolation, ratio 2:3
    ↓                              handles remainder samples across calls
processVAD()                     — Voice Activity Detection
    ↓
    calculateRMS()               — energy = sqrt(sum(sample²) / count)
    ↓
    Speech detection state machine:
        if RMS > threshold → speechFrameCount++
        if speechFrameCount >= 2 → isSpeaking = true, start buffering
        if RMS <= threshold → silenceFrameCount++
        if silenceFrameCount >= 15 → speech ended, trigger transcription
    ↓
handleSpeechEnd(audioData)
    ↓
    Minimum length check: audioData.length >= 16000 (~0.5s at 16kHz)
    ↓
transcribeAudio(pcm16kBuffer)
    ↓
    pcm16ToFloat32()             — Int16 → Float32 conversion
    ↓
    whisperPipeline(float32Audio, { sampling_rate: 16000, language: 'en', task: 'transcribe' })
    ↓
    return text
    ↓
sendToOllama(transcription)
```

**VAD Configuration** (VERY_AGGRESSIVE mode, default):

| Parameter | Value |
|---|---|
| Energy threshold | `0.02` RMS |
| Speech frames required | `2` (to confirm speech started) |
| Silence frames required | `15` (to confirm speech ended) |

Other available VAD modes: NORMAL, LOW_BITRATE, AGGRESSIVE.

---

## Response Generation Pipeline

### BYOK Mode

```
Gemini transcribes audio → generationComplete event fires
    ↓
currentTranscription accumulated from inputTranscription callbacks
    ↓
If Groq API key exists:
    sendToGroq(transcription)
        ↓
        POST https://api.groq.com/openai/v1/chat/completions
        model: getModelForToday()    — rotated daily based on usage limits
        messages: [systemPrompt, ...groqConversationHistory]
        stream: true, temperature: 0.7, max_tokens: 1024
        ↓
        Parse SSE chunks, extract delta.content tokens
        stripThinkingTags(fullText)  — remove <think>...</think> blocks
        ↓
        Stream to renderer: 'new-response' (first) / 'update-response' (subsequent)
        ↓
        saveConversationTurn(transcription, cleanedResponse)
        incrementCharUsage('groq', modelKey, chars)
    ↓
Else (no Groq key):
    sendToGemma(transcription)
        ↓
        GoogleGenAI → ai.models.generateContentStream({ model: 'gemma-3-27b-it', contents })
        History trimmed to 42,000 chars max via trimConversationHistoryForGemma()
        System prompt injected as user/model message pair
        ↓
        Stream chunks to renderer
        ↓
        saveConversationTurn(transcription, fullText)
        incrementCharUsage('gemini', 'gemma-3-27b-it', chars)
```

### Cloud Mode

```
Server processes audio internally
    ↓
response_start  → reset currentCloudResponse buffer
response_chunk  → accumulate text, stream to renderer
response_end    → onTurnComplete callback → saveConversationTurn()
```

### Local Mode

```
Whisper transcription text
    ↓
sendToOllama(transcription)
    ↓
    ollamaClient.chat({
        model: ollamaModel,     // user-configured, default 'llama3.1'
        messages: [system, ...localConversationHistory],
        stream: true
    })
    ↓
    Stream tokens to renderer via 'new-response' / 'update-response'
    ↓
    saveConversationTurn(transcription, fullText)
```

---

## Screenshot / Image Analysis

Triggered by **Ctrl+Enter** (or Cmd+Enter) when in live/assistant view.

### Capture (renderer.js)

```
captureManualScreenshot()
    ↓
Hidden <video> element ← mediaStream (from getDisplayMedia)
    ↓
Offscreen <canvas> — downscaled to max 1280px wide
    ↓
canvas.toBlob('image/jpeg', quality)
    quality: high=0.85, medium=0.6, low=0.4
    ↓
FileReader → base64 string
    ↓
ipcRenderer.invoke('send-image-content', { data: base64, prompt: MANUAL_SCREENSHOT_PROMPT })
```

**Default prompt**: "Help me on this page, give me the answer no bs, complete answer..."

### Routing (gemini.js — send-image-content handler)

| Mode | Handling |
|---|---|
| `byok` | `sendImageToGeminiHttp(data, prompt)` → `generateContentStream()` with rate-limited model |
| `cloud` | `sendCloudImage(data)` → JSON `{ type: 'image', image: base64 }` over WebSocket |
| `local` | `sendLocalImage(data, prompt)` → Ollama chat with `images: [base64Data]` |

### Image Response (BYOK)

```
sendImageToGeminiHttp(base64Data, prompt)
    ↓
    model = getAvailableModel()     — dynamic rate-limit selection
    ↓
    ai.models.generateContentStream({
        model: model,
        contents: [{ inlineData: { mimeType: 'image/jpeg', data } }, { text: prompt }]
    })
    ↓
    incrementLimitCount(model)
    Stream chunks to renderer
    saveScreenAnalysis(prompt, fullText, model)
```

---

## Response Delivery to UI

All modes deliver responses to the renderer process via Electron IPC events:

| Event | Direction | Purpose |
|---|---|---|
| `new-response` | Main → Renderer | First chunk of a new AI response — creates new response card |
| `update-response` | Main → Renderer | Subsequent chunks — updates current response with accumulated text |
| `update-status` | Main → Renderer | Status bar text ("Listening...", "Generating response...", "Transcribing...") |
| `session-initializing` | Main → Renderer | `boolean` — show/hide loading spinner |
| `reconnect-failed` | Main → Renderer | Notify UI that max reconnection attempts reached |
| `whisper-downloading` | Main → Renderer | `boolean` — show/hide Whisper model download progress |

In the renderer, these are received by `ipcRenderer.on()` listeners and forwarded to the `cheatingDaddyApp` web component via:
- `cheatingDaddy.setStatus(text)`
- `cheatingDaddy.addNewResponse(response)`
- `cheatingDaddy.updateCurrentResponse(response)`

---

## Conversation History & Persistence

### Session Management

- **Session ID**: `Date.now().toString()` — timestamp-based
- **Initialization**: `initializeNewSession(profile, customPrompt)` resets all state
- **Each turn**: `{ timestamp, transcription, ai_response }`

### History Limits

| Provider | History Cap | Details |
|---|---|---|
| Groq | 20 messages | Sliding window, `groqConversationHistory.slice(-20)` |
| Gemma | 42,000 chars | `trimConversationHistoryForGemma()`, 40 message cap |
| Local (Ollama) | 20 messages | `localConversationHistory.slice(-20)` |

### Persistence Flow

```
Main process saves turn:
    saveConversationTurn(transcription, aiResponse)
    ↓
    sendToRenderer('save-conversation-turn', { sessionId, turn, fullHistory })
    ↓
Renderer receives via ipcRenderer.on():
    storage.saveSession(sessionId, { conversationHistory: fullHistory })
    ↓
    IPC → storage:save-session → file-based storage in main process
```

### Reconnection Context Restoration

On reconnect, `buildContextMessage()` takes the last 20 turns and formats them:
```
Session reconnected. Here's the conversation so far:

[Interviewer]: ...
[Your answer]: ...

Continue from here.
```
This text is sent via `session.sendRealtimeInput({ text: contextMessage })`.

---

## System Prompts (prompts.js)

Profile-based system prompts with modular structure:

| Profile | Use Case |
|---|---|
| `interview` (default) | Job interview assistant — teleprompter style |
| `sales` | Sales call assistant |
| `meeting` | Professional meeting assistant |
| `presentation` | Presentation/pitch coach |
| `negotiation` | Business negotiation assistant |
| `exam` | Exam/test answer assistant |

Each profile has 5 parts assembled by `buildSystemPrompt()`:
1. **intro** — role definition
2. **formatRequirements** — markdown, short/concise responses
3. **searchUsage** — when to use Google Search (only included if search is enabled)
4. **content** — examples and instructions
5. **outputInstructions** — "provide only exact words to say"

Custom user context is injected between content and output instructions:
```
User-provided context
-----
{customPrompt}
-----
```

---

## Electron Implementation

### Architecture: Main vs Renderer Process

| Process | Files | Runs In | Responsibilities |
|---|---|---|---|
| **Main** | `gemini.js`, `cloud.js`, `localai.js`, `window.js` | Node.js | Gemini sessions, IPC handlers, audio routing, macOS native audio, window management, Ollama/Whisper |
| **Renderer** | `renderer.js`, `windowResize.js` | Chromium | Audio capture via Web APIs, screenshot capture, UI rendering, storage API, theme system |

**Important**: The app uses `contextIsolation: false` and `nodeIntegration: true` (marked as TODO to fix). This allows the renderer direct access to Node.js APIs like `require('electron')`.

### Window Configuration (window.js)

```js
const mainWindow = new BrowserWindow({
    width: 1100, height: 800,
    frame: false,              // No title bar
    transparent: true,         // Transparent background
    hasShadow: false,
    alwaysOnTop: true,         // Always visible over other windows
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false,   // Keep audio processing active
        enableBlinkFeatures: 'GetDisplayMedia',
    },
    backgroundColor: '#00000000',      // Fully transparent
});
```

**Stealth properties applied after creation:**

| Property | Method | Purpose |
|---|---|---|
| Content protection | `setContentProtection(true)` | Prevents screen recording of the window |
| Not resizable | `setResizable(false)` | Fixed window size |
| All workspaces | `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` | Visible everywhere |
| Skip taskbar | `setSkipTaskbar(true)` (Windows) | Hidden from taskbar |
| Hide Mission Control | `setHiddenInMissionControl(true)` (macOS) | Hidden from Mission Control |
| Always on top level | `setAlwaysOnTop(true, 'screen-saver', 1)` (Windows) | Highest z-order |

**Window sizing by view:**
- Full view (main, settings, etc.): **1100 × 800**
- Assistant/live view: **850 × 400**
- Position: Centered horizontally, top of screen (y=0)

### Display Media Handler (window.js)

System audio loopback is enabled at the Electron session level — this is what allows `getDisplayMedia()` in the renderer to capture system audio:

```js
session.defaultSession.setDisplayMediaRequestHandler(
    (request, callback) => {
        desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
            callback({ video: sources[0], audio: 'loopback' });
        });
    },
    { useSystemPicker: true }
);
```

### Complete IPC Communication Map

#### Main → Renderer (events via `webContents.send`)

| Channel | Data | Purpose |
|---|---|---|
| `new-response` | `string` | First chunk of new AI response |
| `update-response` | `string` | Updated accumulated response text |
| `update-status` | `string` | Status bar text |
| `session-initializing` | `boolean` | Show/hide loading state |
| `navigate-previous-response` | — | Navigate to previous response |
| `navigate-next-response` | — | Navigate to next response |
| `scroll-response-up` | — | Scroll content up |
| `scroll-response-down` | — | Scroll content down |
| `click-through-toggled` | `boolean` | Click-through mode changed |
| `clear-sensitive-data` | — | Emergency erase — wipe all data |
| `save-conversation-turn` | `{ sessionId, turn, fullHistory }` | Persist conversation turn |
| `save-session-context` | `{ sessionId, profile, customPrompt }` | Persist session profile |
| `save-screen-analysis` | `{ sessionId, analysis, fullHistory, profile }` | Persist screenshot analysis |
| `reconnect-failed` | `{ message }` | Reconnection attempts exhausted |
| `whisper-downloading` | `boolean` | Whisper model download state |

#### Renderer → Main (invoke/handle — request/response)

| Channel | Parameters | Returns | Purpose |
|---|---|---|---|
| `initialize-gemini` | `apiKey, customPrompt, profile, language` | `boolean` | Start Gemini live session |
| `initialize-cloud` | `token, profile, userContext` | `boolean` | Connect to cloud WebSocket |
| `initialize-local` | `ollamaHost, model, whisperModel, profile, customPrompt` | `boolean` | Start Whisper + Ollama |
| `send-audio-content` | `{ data (base64), mimeType }` | `{ success }` | Send system audio chunk |
| `send-mic-audio-content` | `{ data (base64), mimeType }` | `{ success }` | Send microphone audio chunk |
| `send-image-content` | `{ data (base64), prompt? }` | `{ success, text?, model? }` | Send screenshot for analysis |
| `send-text-message` | `string` | `{ success }` | Send text input to AI |
| `close-session` | — | `{ success }` | Close active AI session |
| `start-macos-audio` | — | `{ success }` | Start macOS SystemAudioDump |
| `stop-macos-audio` | — | `{ success }` | Stop macOS SystemAudioDump |
| `get-current-session` | — | `{ success, data }` | Get session ID + history |
| `start-new-session` | — | `{ success, sessionId }` | Start fresh session |
| `update-google-search-setting` | `boolean` | `{ success }` | Toggle Google Search tool |
| `get-app-version` | — | `string` | Get Electron app version |
| `window-minimize` | — | — | Minimize window |
| `toggle-window-visibility` | — | `{ success }` | Show/hide window |
| `update-sizes` | — | `{ success }` | Resize window (no-op currently) |

#### Renderer → Main (send/on — fire-and-forget)

| Channel | Data | Purpose |
|---|---|---|
| `view-changed` | `string` | View switch — resizes window ("assistant" = 850×400, else = 1100×800) |
| `update-keybinds` | keybinds object | Re-register global shortcuts |

#### Storage IPC Channels

| Channel | Purpose |
|---|---|
| `storage:get-config` / `set-config` / `update-config` | App configuration |
| `storage:get-credentials` / `set-credentials` | API keys, tokens |
| `storage:get-api-key` / `set-api-key` | Gemini API key |
| `storage:get-groq-api-key` / `set-groq-api-key` | Groq API key |
| `storage:get-preferences` / `set-preferences` / `update-preference` | User preferences (theme, audio mode, models, etc.) |
| `storage:get-keybinds` / `set-keybinds` | Custom keyboard shortcuts |
| `storage:get-all-sessions` / `get-session` / `save-session` / `delete-session` / `delete-all-sessions` | Conversation history |
| `storage:get-today-limits` | Rate limit tracking |
| `storage:clear-all` | Wipe all stored data |

### Global Keyboard Shortcuts (window.js)

Registered via `globalShortcut.register()` — work system-wide even when the app is not focused:

| Action | Windows/Linux | macOS |
|---|---|---|
| Move Up | `Ctrl+Up` | `Alt+Up` |
| Move Down | `Ctrl+Down` | `Alt+Down` |
| Move Left | `Ctrl+Left` | `Alt+Left` |
| Move Right | `Ctrl+Right` | `Alt+Right` |
| Toggle Visibility | `Ctrl+\` | `Cmd+\` |
| Toggle Click-Through | `Ctrl+M` | `Cmd+M` |
| Next Step (Start/Screenshot) | `Ctrl+Enter` | `Cmd+Enter` |
| Previous Response | `Ctrl+[` | `Cmd+[` |
| Next Response | `Ctrl+]` | `Cmd+]` |
| Scroll Up | `Ctrl+Shift+Up` | `Cmd+Shift+Up` |
| Scroll Down | `Ctrl+Shift+Down` | `Cmd+Shift+Down` |
| Emergency Erase | `Ctrl+Shift+E` | `Cmd+Shift+E` |

- **Move increment**: 10% of the smaller screen dimension
- **Keybinds are customizable**: saved to storage, loaded on startup
- **Next Step** is context-aware: on main view → starts session; on live view → captures screenshot

### Emergency Erase (Ctrl+Shift+E)

```
1. mainWindow.hide()
2. geminiSessionRef.current.close()
3. sendToRenderer('clear-sensitive-data')   → renderer calls storage.clearAll()
4. setTimeout(() => app.quit(), 300)
```

### Session Reconnection (gemini.js)

When the Gemini live WebSocket closes unexpectedly:

| Parameter | Value |
|---|---|
| Max attempts | 3 |
| Delay between attempts | 2,000 ms |
| Context restoration | Last 20 conversation turns sent as text |
| User-initiated close | `isUserClosing = true` → suppresses reconnection |

Flow:
```
onclose fires (not user-initiated)
    ↓
attemptReconnect()
    ↓
    Clear stale buffers (messageBuffer, currentTranscription)
    Preserve groqConversationHistory (for context continuity)
    ↓
    Wait 2 seconds
    ↓
    initializeGeminiSession(..., isReconnect=true)
    ↓
    On success: buildContextMessage() → sendRealtimeInput({ text }) to restore context
    On failure: retry up to 3 times, then send 'reconnect-failed' event
```

### Settings Retrieval Pattern (gemini.js)

The main process reads renderer-side `localStorage` values by executing JavaScript in the BrowserWindow:

```js
const value = await windows[0].webContents.executeJavaScript(`
    localStorage.getItem('${key}') || '${defaultValue}'
`);
```

Used for the Google Search toggle and other settings stored in renderer localStorage.

### Renderer Global API (renderer.js)

The renderer exposes `window.cheatingDaddy` — the central API used by all UI components:

```js
const cheatingDaddy = {
    // Session initialization
    initializeGemini(profile, language),
    initializeCloud(profile),
    initializeLocal(profile),

    // Capture control
    startCapture(screenshotIntervalSeconds, imageQuality),
    stopCapture(),

    // Communication
    sendTextMessage(text),
    handleShortcut(key),

    // UI
    element(),                    // access to <cheating-daddy-app> element
    getCurrentView(),
    getLayoutMode(),
    setStatus(text),
    addNewResponse(response),
    updateCurrentResponse(response),

    // Storage
    storage,                      // full async storage API object

    // Theme
    theme,                        // 9 built-in themes with CSS variable system

    // Utilities
    refreshPreferencesCache(),
    getVersion(),
    isLinux, isMacOS,
};
```

### Theme System (renderer.js)

9 built-in themes: **dark** (default), light, midnight, sepia, catppuccin, gruvbox, rosepine, solarized, tokyonight.

Each theme defines: background, text (primary/secondary/muted), border, accent, button colors, tooltip colors, key background.

Applied via CSS custom properties on `document.documentElement`:
- Background colors support configurable **alpha/transparency** (default 0.8)
- Colors derived dynamically: `lightenColor()` / `darkenColor()` for surface variants

---

## File Responsibilities Summary

| File | Lines | Role |
|---|---|---|
| **gemini.js** | 1139 | Main orchestrator — Gemini live session, Groq/Gemma text generation dispatch, all IPC handlers for audio/image/text/session, macOS SystemAudioDump management, stereo→mono conversion, session reconnection logic, conversation history management |
| **renderer.js** | 1060 | Renderer-side bridge — audio capture via Web Audio API, screenshot capture via Canvas, storage API wrapper, UI integration via `window.cheatingDaddy` global, theme system (9 themes), IPC event listeners for responses/status |
| **cloud.js** | ~180 | WebSocket client to `wss://api.cheatingdaddy.com/ws` — sends audio (binary), text (JSON), images (JSON); receives transcriptions and streamed responses |
| **localai.js** | 438 | Fully local AI pipeline — audio resampling (24kHz→16kHz), Voice Activity Detection (RMS-based, 4 modes), Whisper transcription via `@huggingface/transformers`, Ollama chat with streaming, image analysis via Ollama |
| **prompts.js** | ~300 | System prompt templates for 6 profiles (interview, sales, meeting, presentation, negotiation, exam) with modular assembly and Google Search integration |
| **window.js** | 369 | Electron BrowserWindow creation with stealth overlay properties, display media handler for audio loopback, global keyboard shortcuts (12 actions), window IPC handlers for view switching/resize/minimize |
| **windowResize.js** | ~15 | Simple utility — invokes `update-sizes` IPC to resize window |
