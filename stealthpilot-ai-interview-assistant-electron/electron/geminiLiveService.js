/**
 * Gemini Live Audio Service (v2)
 *
 * Uses the @google/genai SDK (client.live.connect) with:
 *   - gemini-2.5-flash-native-audio-preview-09-2025
 *   - 24 kHz PCM mono audio input
 *   - Speaker diarization (2 speakers — Interviewer / Candidate)
 *   - Audio response modality (Gemini handles transcription)
 *   - Context window compression (sliding window)
 *
 * Transcription from Gemini is forwarded to Groq/Gemma for the text answer
 * (matching the cheating-daddy architecture).
 */

const { BrowserWindow } = require('electron');
const { getSystemPrompt } = require('./prompts');
const groqService = require('./groqService');

let session = null;
let isLive = false;
let isSettingUp = false;
let currentTranscription = '';
let currentProfile = null;
let currentCustomPrompt = null;

// Reconnection state
let sessionParams = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000;
let isUserClosing = false;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function formatSpeakerResults(results) {
    let text = '';
    for (const result of results) {
        if (result.transcript && result.speakerId) {
            const speakerLabel = result.speakerId === 1 ? 'Interviewer' : 'Candidate';
            text += `[${speakerLabel}]: ${result.transcript}\n`;
        }
    }
    return text;
}

/**
 * Initialize a Gemini Live session using the @google/genai SDK
 */
async function initializeGeminiLive(
    apiKey,
    customPrompt = '',
    profile = 'interview',
    language = 'en-US',
    isReconnect = false
) {
    if (isSettingUp) {
        console.log('[GeminiLive] Session init already in progress');
        return false;
    }

    if (!apiKey || apiKey.trim() === '') {
        console.error('[GeminiLive] No API key provided');
        sendToRenderer('gemini-live-status', { status: 'error', error: 'No Gemini API key configured' });
        return false;
    }

    isSettingUp = true;
    if (!isReconnect) {
        sendToRenderer('gemini-live-status', { status: 'connecting' });
        sessionParams = { apiKey, customPrompt, profile, language };
        reconnectAttempts = 0;
        currentProfile = profile;
        currentCustomPrompt = customPrompt;
    }

    try {
        const { GoogleGenAI, Modality } = require('@google/genai');

        const client = new GoogleGenAI({
            vertexai: false,
            apiKey: apiKey,
            httpOptions: { apiVersion: 'v1alpha' },
        });

        // Build system prompt from profile
        const systemPrompt = getSystemPrompt(profile, customPrompt, true);
        groqService.setSystemPrompt(systemPrompt);

        if (!isReconnect) {
            groqService.resetConversationHistory();
        }

        const enabledTools = [{ googleSearch: {} }];

        session = await client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: function () {
                    console.log('[GeminiLive] Live session connected');
                    isLive = true;
                    isSettingUp = false;
                    sendToRenderer('gemini-live-status', { status: 'connected' });
                },
                onmessage: function (message) {
                    // Handle input transcription (what was spoken) with diarization
                    if (message.serverContent?.inputTranscription?.results) {
                        const formatted = formatSpeakerResults(message.serverContent.inputTranscription.results);
                        if (formatted) currentTranscription += formatted;
                    } else if (message.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text.trim() !== '') {
                            currentTranscription += text;
                        }
                    }

                    // Send interim transcription to renderer for visual feedback
                    if (currentTranscription.trim()) {
                        sendToRenderer('gemini-transcription', {
                            text: currentTranscription.trim(),
                            fullText: currentTranscription.trim(),
                        });
                    }

                    // When Gemini finishes processing audio input → send to Groq/Gemma
                    if (message.serverContent?.generationComplete) {
                        if (currentTranscription.trim() !== '') {
                            console.log('[GeminiLive] Generation complete, sending to text model:', currentTranscription.substring(0, 80));
                            sendToRenderer('gemini-turn-complete', {
                                transcription: currentTranscription.trim(),
                            });
                            // Generate text response via Groq or Gemma
                            groqService.generateTextResponse(currentTranscription.trim());
                            currentTranscription = '';
                        }
                    }

                    if (message.serverContent?.turnComplete) {
                        sendToRenderer('gemini-live-status', { status: 'listening' });
                    }
                },
                onerror: function (e) {
                    console.error('[GeminiLive] Session error:', e.message);
                    sendToRenderer('gemini-live-status', { status: 'error', error: e.message });
                },
                onclose: function (e) {
                    console.log('[GeminiLive] Session closed:', e.reason);
                    isLive = false;
                    session = null;

                    if (isUserClosing) {
                        isUserClosing = false;
                        sendToRenderer('gemini-live-status', { status: 'closed', reason: 'User closed session' });
                        return;
                    }

                    // Attempt reconnection
                    if (sessionParams && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        attemptReconnect();
                    } else {
                        sendToRenderer('gemini-live-status', { status: 'closed', reason: e.reason });
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                proactivity: { proactiveAudio: true },
                outputAudioTranscription: {},
                tools: enabledTools,
                inputAudioTranscription: {
                    enableSpeakerDiarization: true,
                    minSpeakerCount: 2,
                    maxSpeakerCount: 2,
                },
                contextWindowCompression: { slidingWindow: {} },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        isSettingUp = false;
        console.log('[GeminiLive] Session created successfully');
        return true;
    } catch (error) {
        console.error('[GeminiLive] Failed to initialize:', error?.message || error);
        isSettingUp = false;
        isLive = false;
        sendToRenderer('gemini-live-status', { status: 'error', error: error?.message || 'Initialization failed' });
        return false;
    }
}

/**
 * Attempt to reconnect with context preservation
 */
async function attemptReconnect() {
    reconnectAttempts++;
    console.log(`[GeminiLive] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    currentTranscription = '';
    sendToRenderer('gemini-live-status', {
        status: 'reconnecting',
        attempt: reconnectAttempts,
        maxAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));

    try {
        const success = await initializeGeminiLive(
            sessionParams.apiKey,
            sessionParams.customPrompt,
            sessionParams.profile,
            sessionParams.language,
            true
        );

        if (success && session) {
            // Restore conversation context
            const contextMessage = groqService.buildContextMessage();
            if (contextMessage) {
                try {
                    console.log('[GeminiLive] Restoring conversation context...');
                    await session.sendRealtimeInput({ text: contextMessage });
                } catch (err) {
                    console.error('[GeminiLive] Context restore failed:', err);
                }
            }
            sendToRenderer('gemini-live-status', { status: 'connected' });
            console.log('[GeminiLive] Reconnected successfully');
            return true;
        }
    } catch (error) {
        console.error(`[GeminiLive] Reconnect attempt ${reconnectAttempts} failed:`, error);
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        return attemptReconnect();
    }

    console.log('[GeminiLive] Max reconnect attempts reached');
    sendToRenderer('reconnect-failed', {
        message: 'Tried 3 times to reconnect. Must be upstream/network issues. Try restarting.',
    });
    sessionParams = null;
    return false;
}

/**
 * Send audio data to Gemini (24kHz PCM mono, base64)
 */
/**
 * Audio input handling
 */
let lastAudioSampleRate = 24000;

async function sendAudioToGemini(base64Data) {
    if (!session) {
        return { success: false, error: 'No active Gemini session' };
    }

    try {
        // Decode base64 to bytes
        const buffer = Buffer.from(base64Data, 'base64');
        const uint8Array = new Uint8Array(buffer);

        // Try to send audio - use the expected 24kHz rate
        await session.sendRealtimeInput({
            audio: {
                data: uint8Array,
                mimeType: `audio/pcm;rate=${lastAudioSampleRate}`,
            },
        });
        return { success: true };
    } catch (error) {
        console.error('[GeminiLive] Error sending audio:', error?.message);
        return { success: false, error: error?.message || 'Unknown error' };
    }
}

/**
 * Send a text message into the live session
 */
async function sendTextToGemini(text) {
    if (!session) {
        return { success: false, error: 'No active Gemini session' };
    }

    try {
        // Also generate response via Groq/Gemma
        groqService.generateTextResponse(text.trim());
        await session.sendRealtimeInput({ text: text.trim() });
        return { success: true };
    } catch (error) {
        console.error('[GeminiLive] Error sending text:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Close the session
 */
function closeGeminiLive() {
    isUserClosing = true;
    sessionParams = null;
    currentTranscription = '';

    if (session) {
        try {
            session.close();
        } catch (e) {
            console.error('[GeminiLive] Error closing session:', e);
        }
        session = null;
    }
    isSettingUp = false;
    isLive = false;
}

/**
 * Check if active
 */
function isGeminiLiveActive() {
    return isLive && session !== null;
}

function getCurrentTranscription() {
    return currentTranscription;
}

module.exports = {
    initializeGeminiLive,
    sendAudioToGemini,
    sendTextToGemini,
    closeGeminiLive,
    isGeminiLiveActive,
    getCurrentTranscription,
    formatSpeakerResults,
    sendToRenderer,
};
