/**
 * Groq / Gemma Response Generation Service
 *
 * Primary: Groq API with daily model rotation and streaming SSE
 * Fallback: Gemma-3-27b-it via Google GenAI SDK
 *
 * Mirrors the cheating-daddy approach — Gemini Live handles audio transcription,
 * then we send the transcribed text to Groq (or Gemma) for a fast text response.
 */

const { BrowserWindow } = require('electron');
const Store = require('electron-store');

const store = new Store();

// Conversation history for multi-turn context
let groqConversationHistory = [];
let currentSystemPrompt = 'You are a helpful assistant.';

/* ── helpers ───────────────────────────────────────────────────────────────── */

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function stripThinkingTags(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/* ── Groq daily model rotation ────────────────────────────────────────────── */

const GROQ_MODELS = [
    'qwen-qwq-32b',
    'deepseek-r1-distill-llama-70b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'meta-llama/llama-4-scout-17b-16e-instruct',
];

function getModelForToday() {
    const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return GROQ_MODELS[dayOfYear % GROQ_MODELS.length];
}

function getGroqApiKey() {
    return store.get('groqApiKey', '') || '';
}

function getGeminiApiKey() {
    return store.get('geminiApiKey', '') || '';
}

function hasGroqKey() {
    const key = getGroqApiKey();
    return key && key.trim() !== '';
}

/* ── Groq streaming SSE ───────────────────────────────────────────────────── */

async function sendToGroq(transcription) {
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
        console.log('[Groq] No API key, skipping');
        return;
    }
    if (!transcription || transcription.trim() === '') return;

    const modelToUse = getModelForToday();
    console.log(`[Groq] Sending to ${modelToUse}:`, transcription.substring(0, 100) + '...');

    groqConversationHistory.push({ role: 'user', content: transcription.trim() });
    if (groqConversationHistory.length > 20) {
        groqConversationHistory = groqConversationHistory.slice(-20);
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [
                    { role: 'system', content: currentSystemPrompt },
                    ...groqConversationHistory,
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Groq] API error:', response.status, errText);
            sendToRenderer('update-status', `Groq error: ${response.status}`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((l) => l.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            const display = stripThinkingTags(fullText);
                            if (display) {
                                sendToRenderer(isFirst ? 'new-response' : 'update-response', display);
                                isFirst = false;
                            }
                        }
                    } catch (_) {
                        /* skip invalid JSON chunks */
                    }
                }
            }
        }

        const cleaned = stripThinkingTags(fullText);
        if (cleaned) {
            groqConversationHistory.push({ role: 'assistant', content: cleaned });
        }

        // Notify renderer of completed response for session storage
        sendToRenderer('response-complete', {
            transcription: transcription.trim(),
            response: cleaned,
            model: modelToUse,
            provider: 'groq',
        });

        console.log(`[Groq] Response completed (${modelToUse})`);
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('[Groq] Error:', error);
        sendToRenderer('update-status', 'Groq error: ' + error.message);
    }
}

/* ── Gemma fallback via Google GenAI ──────────────────────────────────────── */

function trimConversationHistoryForGemma(history, maxChars = 42000) {
    if (!history || history.length === 0) return [];
    let totalChars = 0;
    const trimmed = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const turnChars = (turn.content || '').length;
        if (totalChars + turnChars > maxChars) break;
        totalChars += turnChars;
        trimmed.unshift(turn);
    }
    return trimmed;
}

async function sendToGemma(transcription) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        console.log('[Gemma] No Gemini API key, skipping');
        return;
    }
    if (!transcription || transcription.trim() === '') return;

    console.log('[Gemma] Sending:', transcription.substring(0, 100) + '...');

    groqConversationHistory.push({ role: 'user', content: transcription.trim() });
    const trimmedHistory = trimConversationHistoryForGemma(groqConversationHistory, 42000);

    try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const messages = trimmedHistory.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const messagesWithSystem = [
            { role: 'user', parts: [{ text: currentSystemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
            ...messages,
        ];

        const response = await ai.models.generateContentStream({
            model: 'gemma-3-27b-it',
            contents: messagesWithSystem,
        });

        let fullText = '';
        let isFirst = true;

        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        if (fullText.trim()) {
            groqConversationHistory.push({ role: 'assistant', content: fullText.trim() });
            if (groqConversationHistory.length > 40) {
                groqConversationHistory = groqConversationHistory.slice(-40);
            }
        }

        sendToRenderer('response-complete', {
            transcription: transcription.trim(),
            response: fullText.trim(),
            model: 'gemma-3-27b-it',
            provider: 'gemma',
        });

        console.log('[Gemma] Response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('[Gemma] Error:', error);
        sendToRenderer('update-status', 'Gemma error: ' + error.message);
    }
}

/* ── Image analysis via Gemini HTTP ───────────────────────────────────────── */

async function sendImageToGeminiHttp(base64Data, prompt) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return { success: false, error: 'No Gemini API key' };

    try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const contents = [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: prompt },
        ];

        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents,
        });

        let fullText = '';
        let isFirst = true;

        for await (const chunk of response) {
            const ct = chunk.text;
            if (ct) {
                fullText += ct;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        console.log('[Gemini HTTP] Image response completed');
        return { success: true, text: fullText };
    } catch (error) {
        console.error('[Gemini HTTP] Error:', error);
        return { success: false, error: error.message };
    }
}

/* ── Public API ────────────────────────────────────────────────────────────── */

function setSystemPrompt(prompt) {
    currentSystemPrompt = prompt || 'You are a helpful assistant.';
}

function getConversationHistory() {
    return groqConversationHistory;
}

function resetConversationHistory() {
    groqConversationHistory = [];
}

/**
 * Generate a text response – picks Groq (primary) or Gemma (fallback).
 */
async function generateTextResponse(transcription) {
    if (hasGroqKey()) {
        await sendToGroq(transcription);
    } else {
        await sendToGemma(transcription);
    }
}

/**
 * Build a context restoration message from conversation history.
 */
function buildContextMessage() {
    const lastTurns = groqConversationHistory.slice(-20);
    // filter paired user/assistant turns
    const pairs = [];
    for (let i = 0; i < lastTurns.length - 1; i++) {
        if (lastTurns[i].role === 'user' && lastTurns[i + 1].role === 'assistant') {
            pairs.push({ user: lastTurns[i].content, assistant: lastTurns[i + 1].content });
        }
    }
    if (pairs.length === 0) return null;

    const lines = pairs.map((p) => `[Interviewer]: ${p.user}\n[Your answer]: ${p.assistant}`);
    return `Session reconnected. Here's the conversation so far:\n\n${lines.join('\n\n')}\n\nContinue from here.`;
}

module.exports = {
    sendToGroq,
    sendToGemma,
    sendImageToGeminiHttp,
    generateTextResponse,
    hasGroqKey,
    getGroqApiKey,
    getGeminiApiKey,
    setSystemPrompt,
    getConversationHistory,
    resetConversationHistory,
    buildContextMessage,
    sendToRenderer,
    getModelForToday,
};
