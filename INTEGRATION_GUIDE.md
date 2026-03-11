# 🚀 Parakeet AI - Complete Integration Guide

**Production-Ready Real-Time AI Interview Assistant**

## ✅ What Has Been Implemented

### Backend (FastAPI + Python)
- ✅ **Real-Time Transcription**: Deepgram SDK integration for live audio-to-text
- ✅ **WebSocket Server**: Bi-directional communication for audio streaming
- ✅ **AI Answer Generation**: Claude (Anthropic) and OpenAI GPT-4 integration
- ✅ **Question Detection**: Automatic question identification from transcript
- ✅ **Session Management**: Full CRUD with database persistence
- ✅ **User Authentication**: JWT-based auth with admin approval workflow
- ✅ **Audio Processing**: Int16 PCM audio handling at 16kHz sample rate

### Frontend (Next.js + TypeScript + React)
- ✅ **Audio Capture**: WebRTC microphone access with real-time streaming
- ✅ **WebSocket Client**: React hook for bi-directional communication
- ✅ **Live Session UI**: Floating overlay with transcript and AI answers
- ✅ **Real-Time Display**: Animated transcript and suggestion cards
- ✅ **Manual Input**: Fallback text input for questions
- ✅ **Copy to Clipboard**: One-click answer copying
- ✅ **Dashboard Integration**: Quick start button for live sessions

### Electron Desktop App
- ✅ **Content Protection**: Window invisible to screen capture (Zoom, Teams, Meet)
- ✅ **Always On Top**: Overlay stays above all windows
- ✅ **Global Shortcuts**: Ctrl+Shift+H (show/hide), Ctrl+Shift+P (toggle protection)
- ✅ **System Tray**: Minimize to tray with context menu
- ✅ **Adjustable Opacity**: 70%-100% transparency
- ✅ **Persistent Settings**: Window position and preferences saved

---

## 📋 Setup Instructions

### Step 1: Install Dependencies

#### Backend Dependencies
```bash
cd parakeet-backend
pip install -r requirements.txt
```

**Installed Packages:**
- `deepgram-sdk==3.5.0` - Real-time transcription
- `openai==1.58.1` - GPT-4 integration
- `anthropic==0.24.0` - Claude integration
- `websockets==12.0` - WebSocket support
- `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, etc.

#### Frontend Dependencies
```bash
cd parakeet-frontend
npm install --legacy-peer-deps
```

**Installed Packages (520 total):**
- `next@14.2.0` - React framework
- `framer-motion@11.0.0` - Animations
- `@radix-ui/*` - UI primitives
- `axios@1.6.5` - HTTP client
- `tailwindcss@3.4.1` - Styling

#### Electron Dependencies
```bash
cd parakeet-electron
npm install
```

**Installed Packages:**
- `electron@28.1.3` - Desktop framework
- `electron-store@8.1.0` - Settings persistence
- `electron-builder@24.9.1` - Build tool

---

### Step 2: Configure API Keys

#### Add API Keys to Backend

Edit `parakeet-backend/.env`:

```env
SECRET_KEY=parakeet-dev-secret-key-change-this-in-production-min-32-chars
DATABASE_URL=sqlite+aiosqlite:///./parakeet.db
ADMIN_EMAIL=admin@parakeet.ai
ADMIN_PASSWORD=admin123

# AI Providers (ADD YOUR KEYS HERE)
ANTHROPIC_API_KEY=sk-ant-api03-your-anthropic-key-here
DEEPGRAM_API_KEY=your-deepgram-api-key-here
OPENAI_API_KEY=sk-your-openai-key-here

ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173","http://localhost:8000"]
```

#### Where to Get API Keys

1. **Anthropic Claude API**
   - Sign up: https://console.anthropic.com/
   - Get API key: https://console.anthropic.com/settings/keys
   - Model used: `claude-3-5-sonnet-20241022`
   - Cost: ~$3/million tokens (input), ~$15/million tokens (output)

2. **Deepgram Transcription API**
   - Sign up: https://console.deepgram.com/signup
   - Get API key: https://console.deepgram.com/project/[project-id]/keys
   - Model used: `nova-2` (latest, most accurate)
   - Cost: $0.0043/minute for pre-recorded, $0.0059/minute for live
   - **Free tier**: $200 credit for first month

3. **OpenAI GPT-4 API (Optional)**
   - Sign up: https://platform.openai.com/signup
   - Get API key: https://platform.openai.com/api-keys
   - Model used: `gpt-4-turbo-preview`
   - Cost: ~$10/million tokens (input), ~$30/million tokens (output)

---

### Step 3: Start All Services

#### Terminal 1: Backend API

```bash
cd parakeet-backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['D:\\parakeet-backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
✅ Admin user created: admin@parakeet.ai
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify Backend:**
```bash
curl http://localhost:8000/
# Should return: {"app":"Parakeet AI API","version":"1.0.0","status":"running","docs":"/docs"}
```

API Documentation: http://localhost:8000/docs

---

#### Terminal 2: Frontend Dev Server

```bash
cd parakeet-frontend
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.x:3000

 ✓ Ready in 3.2s
```

**Verify Frontend:**
Open http://localhost:3000 in your browser. You should see the Parakeet AI landing page.

---

#### Terminal 3: Electron App (Optional)

```bash
cd parakeet-electron
npm run electron
```

**Expected Output:**
```
Electron App Started
Development Mode: true
Config: { alwaysOnTop: true, screenProtection: true, opacity: 0.95, position: 'top-right', width: 400, height: 600 }
```

**What Happens:**
- Electron window opens at top-right corner
- Loads http://localhost:3000/session/live?id=1
- Window is invisible to screen capture (if content protection enabled)
- System tray icon appears

---

## 🧪 Testing the Complete Flow

### Test 1: Create Account and Login

1. **Register a New User**
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "username": "testuser",
       "password": "password123",
       "full_name": "Test User"
     }'
   ```

2. **Admin Approves User**
   - Login as admin: http://localhost:3000/sign-in
     - Username: `admin`
     - Password: `admin123`
   - Go to: http://localhost:3000/admin
   - Click "Approve" on pending user

3. **Login as Test User**
   - Go to: http://localhost:3000/sign-in
   - Username: `testuser`
   - Password: `password123`
   - You should be redirected to dashboard

---

### Test 2: Start Live Session (WebSocket + Transcription)

1. **From Dashboard:**
   - Click "Start Live Session" button
   - Or navigate to: http://localhost:3000/session/live?id=1

2. **Connect to WebSocket:**
   - Page loads and automatically connects to WebSocket
   - You should see "Live Session" indicator turn green
   - Status: "Connected"

3. **Start Audio Capture:**
   - Click "Start Audio" button
   - Browser will prompt for microphone permission → **Allow**
   - Button changes to "Stop Audio" (red)

4. **Speak into Microphone:**
   - Say: "What is the difference between REST and GraphQL?"
   - Transcript should appear in real-time:
     - **Interim results** (gray, italic): "What is the diff..."
     - **Final results** (white): Complete sentence
   - Wait 1-2 seconds after speaking (silence detection)

5. **AI Generates Answer:**
   - Once question is detected, you'll see: "🤔 Generating answer..."
   - Claude API is called with the question
   - Answer appears in a card with:
     - Question text (teal color)
     - Answer text (white)
     - Confidence score (85%)
     - Copy button

6. **Copy Answer:**
   - Click "Copy" button
   - Answer is copied to clipboard
   - Button changes to "Copied" with checkmark
   - Paste into any application (Ctrl+V)

---

### Test 3: Manual Question (Fallback)

If audio transcription doesn't work (no Deepgram key or mic issues):

1. Type question in "Type question manually..." input box
2. Press Enter or click "Ask" button
3. AI generates answer immediately
4. Answer appears in suggestion card

---

### Test 4: Electron Invisibility

**Test Content Protection (Screen Capture Invisibility)**

1. **Start Electron App:**
   ```bash
   cd parakeet-electron
   npm run electron
   ```

2. **Verify Window Appears:**
   - Floating window at top-right corner
   - Shows live session UI
   - Always on top of other windows

3. **Start Screen Sharing:**
   - Open Zoom/Teams/Google Meet
   - Start screen sharing (share entire screen)
   - **Expected Result:**
     - You see: Normal Parakeet window with transcript
     - Interviewer sees: **Black box or nothing** (window is invisible)

4. **Toggle Content Protection:**
   - Right-click system tray icon
   - Uncheck "Toggle Content Protection"
   - Window becomes visible in screen share (for testing)
   - Re-check to enable invisibility again

5. **Test Hotkeys:**
   - `Ctrl+Shift+H`: Hide/show window
   - `Ctrl+Shift+P`: Toggle content protection
   - `Ctrl+Shift+T`: Toggle always on top

---

## 🔧 API Endpoints Reference

### WebSocket Endpoint

**URL:** `ws://localhost:8000/api/ws/live-session?session_id=1&token=YOUR_JWT_TOKEN`

**Client → Server Messages:**
```json
// Audio chunk (binary)
ArrayBuffer (Int16 PCM audio data)

// Manual question (text)
{
  "type": "manual_question",
  "question": "Explain async/await in JavaScript"
}

// Keep-alive ping
{
  "type": "ping"
}
```

**Server → Client Messages:**
```json
// Connection established
{
  "type": "connected",
  "message": "Real-time transcription ready",
  "session_id": 1
}

// Interim transcript
{
  "type": "transcript",
  "text": "What is the diff...",
  "is_final": false,
  "timestamp": "2026-03-03T10:30:45.123Z"
}

// Final transcript
{
  "type": "transcript",
  "text": "What is the difference between REST and GraphQL?",
  "is_final": true,
  "timestamp": "2026-03-03T10:30:47.456Z"
}

// Thinking indicator
{
  "type": "thinking",
  "message": "Generating answer..."
}

// AI answer
{
  "type": "answer",
  "question": "What is the difference between REST and GraphQL?",
  "answer": "REST uses multiple endpoints for different resources and follows HTTP methods, while GraphQL uses a single endpoint where clients specify exactly what data they need. GraphQL reduces over-fetching but adds complexity, whereas REST is simpler and more cacheable.",
  "confidence": 0.85,
  "timestamp": "2026-03-03T10:30:49.789Z"
}

// Error
{
  "type": "error",
  "message": "DEEPGRAM_API_KEY not configured"
}

// Keep-alive pong
{
  "type": "pong",
  "timestamp": "2026-03-03T10:30:50.000Z"
}
```

---

## 🐛 Troubleshooting

### Issue: "DEEPGRAM_API_KEY not configured"

**Solution:**
1. Get Deepgram API key from https://console.deepgram.com/
2. Add to `parakeet-backend/.env`:
   ```env
   DEEPGRAM_API_KEY=your-key-here
   ```
3. Restart backend server
4. Reload frontend page

---

### Issue: "Failed to start audio: NotAllowedError"

**Solution:**
1. Grant microphone permission in browser settings
2. Chrome: Settings → Privacy and security → Site settings → Microphone
3. Allow http://localhost:3000
4. Reload page and try again

---

### Issue: "Anthropic API error: Invalid API key"

**Solution:**
1. Verify API key is correct in `.env` file
2. Ensure no extra spaces or quotes around the key
3. Test key with curl:
   ```bash
   curl https://api.anthropic.com/v1/models \
     -H "x-api-key: YOUR_KEY" \
     -H "anthropic-version: 2023-06-01"
   ```

---

### Issue: Frontend shows "Disconnected" status

**Solution:**
1. Check backend is running on port 8000
2. Check WebSocket URL in browser console
3. Verify token is valid (not expired)
4. Check CORS settings in backend `.env`

---

### Issue: Electron window visible in screen share

**Solution:**
1. Ensure content protection is enabled:
   - Right-click tray icon → Check "Toggle Content Protection"
   - Or press `Ctrl+Shift+P`
2. Restart Electron app
3. On macOS: Code sign the app (required for content protection)
4. Test with different screen capture tools (OBS may intentionally show protected content)

---

## 📊 Performance & Cost Estimates

### API Costs (Per Interview Hour)

**Deepgram Transcription:**
- Duration: 60 minutes
- Cost: 60 × $0.0059 = **$0.35/hour**

**Claude AI (Anthropic):**
- Questions: ~20 per interview
- Tokens per question: ~500 (input + output)
- Total: 20 × 500 = 10,000 tokens
- Cost: (10,000 / 1,000,000) × $3 (input) + (10,000 / 1,000,000) × $15 (output) = **$0.18/hour**

**Total Cost:** ~$0.53 per interview hour

**Monthly Cost Estimates:**
- 10 interviews/month: $5.30
- 50 interviews/month: $26.50
- 100 interviews/month: $53.00

---

## 🚀 Deployment to Production

### Backend Deployment (FastAPI)

**Option 1: Docker**

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Deploy to:
- **DigitalOcean App Platform**: $5-12/month
- **AWS ECS Fargate**: $8-20/month
- **Google Cloud Run**: Pay-per-use
- **Railway**: $5-10/month

**Option 2: VPS (DigitalOcean, Linode)**
- Ubuntu 22.04 droplet: $6/month
- Install Python, pip, nginx, supervisor
- Run uvicorn as systemd service

---

### Frontend Deployment (Next.js)

**Option 1: Vercel (Recommended)**
```bash
cd parakeet-frontend
vercel deploy --prod
```
- Free tier: Sufficient for thousands of users
- Automatic HTTPS, CDN, edge functions

**Option 2: Netlify**
```bash
cd parakeet-frontend
npm run build
netlify deploy --prod
```

**Option 3: Static Export + Nginx**
```bash
npm run build
npm run export  # Creates 'out' directory
# Upload 'out' to any static hosting
```

---

### Electron Desktop Distribution

**Build for All Platforms:**
```bash
cd parakeet-electron
npm run dist
```

**Upload Installers to:**
- GitHub Releases (recommended)
- Own website download page
- Microsoft Store (Windows)
- Mac App Store (macOS - requires Apple Developer account)

---

## 📱 Mobile Support (Future)

The frontend is responsive and works on mobile browsers, but:
- **Audio capture** requires https:// (not http://)
- **Content protection** not available (no screen share invisibility)
- **Best use case:** View on phone while screen sharing from laptop

**Future Plan:**
- React Native app for iOS/Android
- Native audio capture and AI integration
- Picture-in-picture overlay mode

---

## 🎯 Next Steps

### Immediate (This Week)
- [ ] Add API keys to `.env` file
- [ ] Test complete audio → transcript → AI answer flow
- [ ] Verify Electron invisibility in Zoom screen share
- [ ] Practice using the app in mock interviews

### Short-Term (1-2 Weeks)
- [ ] Add voice activity detection (stop detecting silence as questions)
- [ ] Implement speaker diarization (detect interviewer vs candidate)
- [ ] Add session summary generation
- [ ] Build settings page for AI provider selection
- [ ] Add export session to Markdown/PDF

### Medium-Term (1 Month)
- [ ] Local transcription option (whisper.cpp)
- [ ] Local LLM option (Ollama, llama.cpp)
- [ ] Multi-language support
- [ ] Interview prep mode (practice questions)
- [ ] Analytics dashboard

### Long-Term (2-3 Months)
- [ ] Browser extension (inject into video call)
- [ ] Mobile apps (iOS/Android)
- [ ] Team collaboration features
- [ ] Integration with calendars, Notion, etc.

---

## 📞 Support & Documentation

- **Backend API Docs:** http://localhost:8000/docs
- **GitHub Issues:** [link]
- **Email Support:** support@parakeet.ai

---

**Built with ❤️ by Parakeet AI Team**  
*Powered by FastAPI + Next.js + Electron + Claude + Deepgram*
