/**
 * React hook for WebSocket connection to real-time transcription service.
 *
 * Architecture (matching cheating-daddy):
 * - Electron path: Gemini Live Audio at 24kHz for transcription + diarization,
 *   Groq (primary) / Gemma (fallback) for fast text answers via IPC streaming.
 * - Browser path: Web Speech API for transcription, backend WebSocket for AI answers.
 * - Profile-based system prompts (interview, sales, meeting, presentation, negotiation, exam).
 */
import { useEffect, useRef, useState, useCallback } from 'react';

/* ---------- Audio processing constants (Gemini Live requires 24kHz) ------ */
const SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

/* ---------- Audio utility functions ----------------------------------- */
function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/* ---------- message types ------------------------------------------- */

export interface TranscriptMessage {
    type: 'transcript';
    text: string;
    is_final: boolean;
    timestamp: string;
}

export interface AnswerMessage {
    type: 'answer';
    question: string;
    answer: string;
    confidence: number;
    timestamp: string;
}

export interface ErrorMessage {
    type: 'error';
    message: string;
}

export interface ThinkingMessage {
    type: 'thinking';
    message: string;
}

export interface ConnectedMessage {
    type: 'connected';
    message: string;
    session_id: number;
    provider?: string;
    groq_ready?: boolean;
    gemma_ready?: boolean;
}

export interface ProfileUpdatedMessage {
    type: 'profile_updated';
    profile: string;
    timestamp: string;
}

export type WebSocketMessage =
    | TranscriptMessage
    | AnswerMessage
    | ErrorMessage
    | ThinkingMessage
    | ConnectedMessage
    | ProfileUpdatedMessage
    | { type: 'pong'; timestamp: string };

/* ---------- hook options & result ----------------------------------- */

export interface UseWebSocketLiveSessionOptions {
    sessionId: number;
    token: string;
    profile?: string;
    customPrompt?: string;
    language?: string;
    onTranscript?: (text: string, isFinal: boolean) => void;
    onAnswer?: (question: string, answer: string, confidence: number) => void;
    onError?: (error: string) => void;
    onConnected?: () => void;
    onThinking?: (message: string) => void;
    /** Called when Groq/Gemma streaming text arrives (Electron only) */
    onStreamingResponse?: (text: string, isComplete: boolean) => void;
    autoStartAudio?: boolean;
}

export interface UseWebSocketLiveSessionResult {
    connected: boolean;
    connecting: boolean;
    startAudioCapture: () => Promise<void>;
    stopAudioCapture: () => void;
    startSystemAudioCapture: () => Promise<void>;
    sendManualQuestion: (question: string) => void;
    sendTextToGemini: (text: string) => void;
    setProfile: (profile: string) => void;
    disconnect: () => void;
    audioCapturing: boolean;
    audioMode: 'none' | 'mic' | 'system';
    error: string | null;
    currentProfile: string;
}

/* ---------- hook implementation ------------------------------------- */

export function useWebSocketLiveSession(options: UseWebSocketLiveSessionOptions): UseWebSocketLiveSessionResult {
    const { sessionId, token, profile = 'interview', customPrompt = '', language = 'en', autoStartAudio = false } = options;

    // Store callbacks in refs so changing them never triggers reconnects
    const cbRefs = useRef(options);
    cbRefs.current = options;

    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [audioCapturing, setAudioCapturing] = useState(false);
    const [audioMode, setAudioMode] = useState<'none' | 'mic' | 'system'>('none');
    const [error, setError] = useState<string | null>(null);
    const [currentProfile, setCurrentProfile] = useState(profile);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnects = 5;
    const intentionalClose = useRef(false);
    const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ---- helpers ---- */
    const clearTimers = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
    }, []);

    /* ---- connect ---- */
    const connect = useCallback(() => {
        // Only use sessionId & token for deps (primitives, stable)
        if (!token || !sessionId) return;
        if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

        intentionalClose.current = false;
        setConnecting(true);
        setError(null);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = 'localhost:8000';
        if (process.env.NEXT_PUBLIC_API_URL) {
            host = process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        }
        const wsUrl = `${protocol}//${host}/api/ws/live-session?session_id=${sessionId}&token=${encodeURIComponent(token)}`;
        console.log('[WS] Connecting to', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WS] Connected');
            setConnected(true);
            setConnecting(false);
            reconnectAttempts.current = 0;

            // Keep-alive pings every 25s
            pingInterval.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 25_000);
        };

        ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);

                switch (message.type) {
                    case 'connected':
                        cbRefs.current.onConnected?.();
                        break;
                    case 'transcript':
                        cbRefs.current.onTranscript?.(message.text, message.is_final);
                        break;
                    case 'answer':
                        cbRefs.current.onAnswer?.(message.question, message.answer, message.confidence);
                        break;
                    case 'error': {
                        const errMsg = message.message;
                        setError(errMsg);
                        cbRefs.current.onError?.(errMsg);
                        break;
                    }
                    case 'thinking':
                        cbRefs.current.onThinking?.(message.message);
                        break;
                    case 'profile_updated':
                        setCurrentProfile(message.profile);
                        break;
                    case 'pong':
                        break;
                }
            } catch (err) {
                console.error('[WS] Failed to parse message:', err);
            }
        };

        ws.onerror = () => {
            console.error('[WS] Connection error');
            setError('WebSocket connection error');
            cbRefs.current.onError?.('Connection error occurred');
        };

        ws.onclose = (ev) => {
            console.log('[WS] Disconnected', ev.code, ev.reason);
            setConnected(false);
            setConnecting(false);
            wsRef.current = null;
            clearTimers();

            if (intentionalClose.current) return;

            // Auto-reconnect with exponential backoff
            if (reconnectAttempts.current < maxReconnects) {
                reconnectAttempts.current++;
                const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 10_000);
                console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
                reconnectTimeout.current = setTimeout(connect, delay);
            } else {
                const msg = 'Connection lost. Please refresh the page.';
                setError(msg);
                cbRefs.current.onError?.(msg);
            }
        };
    }, [sessionId, token, clearTimers]); // only primitives + stable ref

    /* ---- disconnect ---- */
    const disconnect = useCallback(async () => {
        intentionalClose.current = true;
        clearTimers();
        
        // Stop speech recognition (browser)
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        
        // Stop MediaRecorder (legacy)
        if (mediaRecorderRef.current) {
            try {
                if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
                mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.warn('[Audio] Error stopping MediaRecorder:', e);
            }
            mediaRecorderRef.current = null;
        }
        
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
        
        // Stop Web Audio API (Electron/Gemini)
        if (micProcessorRef.current) {
            micProcessorRef.current.disconnect();
            micProcessorRef.current = null;
        }
        if (micAudioContextRef.current) {
            try { await micAudioContextRef.current.close(); } catch {}
            micAudioContextRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }
        if (audioContextRef.current) {
            try { await audioContextRef.current.close(); } catch {}
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Clean up Electron audio capture resources
        const inElectron = !!(window as any).electron?.isElectron;
        if (inElectron) {
            // Stop Whisper recording flag
            whisperRecordingRef.current = false;
            
            // Clean up Gemini IPC listeners (legacy)
            geminiListenerCleanupRef.current.forEach(cleanup => cleanup?.());
            geminiListenerCleanupRef.current = [];
            const electronAPI = (window as any).electron;
            if (electronAPI?.removeAllGeminiListeners) {
                electronAPI.removeAllGeminiListeners();
            }
            if (geminiInitializedRef.current) {
                try {
                    await electronAPI.geminiLiveClose();
                    geminiInitializedRef.current = false;
                } catch {}
            }
        }
        
        audioChunksRef.current = [];
        setAudioCapturing(false);
        setAudioMode('none');

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
        setConnecting(false);
    }, [clearTimers]);

    /* ---- auto-connect on mount / token change ---- */
    useEffect(() => {
        connect();
        return () => { disconnect(); };
    }, [connect, disconnect]);

    // Speech recognition instance ref
    const recognitionRef = useRef<any>(null);
    const networkErrorCount = useRef(0);
    const MAX_NETWORK_RETRIES = 5;
    
    // MediaRecorder refs (legacy - kept for browser fallback)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // Web Audio API refs for Electron/Gemini Live
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const micAudioContextRef = useRef<AudioContext | null>(null);
    const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const geminiInitializedRef = useRef(false);
    const geminiListenerCleanupRef = useRef<(() => void)[]>([]);
    
    // Whisper refs for Electron (using backend REST API)
    const whisperRecordingRef = useRef(false);
    
    // Guard to prevent multiple audio captures
    const audioInitInProgressRef = useRef(false);

    /* ---- start microphone capture ---- */
    const startAudioCapture = useCallback(async () => {
        // Prevent multiple simultaneous initializations
        if (audioInitInProgressRef.current) {
            console.warn('[Audio] Initialization already in progress');
            return;
        }
        
        if (audioCapturing || !connected) return;
        
        audioInitInProgressRef.current = true;
        
        try {
            const inElectron = !!(window as any).electron?.isElectron;
            if (inElectron) {
                console.log('[Audio] Starting Electron Gemini Live audio capture...');
                cbRefs.current.onThinking?.('Initializing Gemini Live...');
                
                const electronAPI = (window as any).electron;
                
                // Get API key from Electron store
                const apiKey = await electronAPI.getGeminiApiKey?.() || '';
                if (!apiKey) {
                    const msg = 'Gemini API key not set. Please configure it in settings.';
                    setError(msg);
                    cbRefs.current.onError?.(msg);
                    throw new Error(msg);
                }
                
                // Clean up any previous listeners
                if (electronAPI.removeAllGeminiListeners) {
                    electronAPI.removeAllGeminiListeners();
                }
                
                // Set up IPC event listeners for Gemini Live transcription events
                const cleanups: (() => void)[] = [];
                
                // Transcription from Gemini Live (audio → text)
                if (electronAPI.onGeminiTranscription) {
                    const cleanup = electronAPI.onGeminiTranscription((data: { text: string }) => {
                        cbRefs.current.onTranscript?.(data.text, false); // interim
                    });
                    cleanups.push(cleanup);
                }
                
                // Turn complete from Gemini Live (final transcript)
                if (electronAPI.onGeminiTurnComplete) {
                    const cleanup = electronAPI.onGeminiTurnComplete(() => {
                        // Mark last transcript as final
                    });
                    cleanups.push(cleanup);
                }
                
                // Streaming text response from Groq/Gemma (via main process)
                if (electronAPI.onNewResponse) {
                    const cleanup = electronAPI.onNewResponse(() => {
                        cbRefs.current.onThinking?.('💬 Generating answer...');
                    });
                    cleanups.push(cleanup);
                }
                
                if (electronAPI.onUpdateResponse) {
                    const cleanup = electronAPI.onUpdateResponse((data: { text: string }) => {
                        cbRefs.current.onStreamingResponse?.(data.text, false);
                    });
                    cleanups.push(cleanup);
                }
                
                if (electronAPI.onResponseComplete) {
                    const cleanup = electronAPI.onResponseComplete((data: { text: string }) => {
                        cbRefs.current.onStreamingResponse?.(data.text, true);
                        cbRefs.current.onThinking?.('🎙️ Listening...');
                    });
                    cleanups.push(cleanup);
                }
                
                // Status updates from Gemini Live (connection state, etc.)
                if (electronAPI.onUpdateStatus) {
                    const cleanup = electronAPI.onUpdateStatus((data: { text: string }) => {
                        console.log('[Gemini Status]', data.text);
                        cbRefs.current.onThinking?.(data.text);
                    });
                    cleanups.push(cleanup);
                }
                
                // Reconnection failure
                if (electronAPI.onReconnectFailed) {
                    const cleanup = electronAPI.onReconnectFailed(() => {
                        cbRefs.current.onError?.('Gemini Live connection lost after max retries');
                    });
                    cleanups.push(cleanup);
                }
                
                geminiListenerCleanupRef.current = cleanups;
                
                // Initialize Gemini Live session with profile
                await electronAPI.geminiLiveInitialize(apiKey, customPrompt, currentProfile, language);
                geminiInitializedRef.current = true;
                console.log('[Audio] Gemini Live session initialized');
                
                // Get microphone stream at 24kHz (with fallback to system defaults)
                let micStream;
                try {
                    // Try 24kHz first (Gemini Live requirement)
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            channelCount: 1,
                            sampleRate: { ideal: SAMPLE_RATE },
                            echoCancellation: true,
                            noiseSuppression: true,
                        },
                        video: false,
                    });
                } catch (e) {
                    console.warn('[Audio] 24kHz request failed, trying without sample rate constraint:', e);
                    // Fallback: let browser choose sample rate
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                        },
                        video: false,
                    });
                }
                
                micStreamRef.current = micStream;
                const actualSampleRate = micStream.getAudioTracks()[0]?.getSettings?.()?.sampleRate || SAMPLE_RATE;
                console.log(`[Audio] Microphone stream acquired at ${actualSampleRate}Hz`);
                
                // Set up Web Audio API to capture PCM and send to Gemini Live
                // Use smaller buffer size for more responsive, less blocking processing
                const bufferSize = 2048;  // Smaller than default BUFFER_SIZE to reduce blocking
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
                    sampleRate: actualSampleRate 
                });
                micAudioContextRef.current = audioCtx;
                
                // Resume audio context (required for user interaction)
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }
                
                const source = audioCtx.createMediaStreamSource(micStream);
                const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
                micProcessorRef.current = processor;
                
                let audioQueue: Float32Array[] = [];
                let processingAudio = false;
                
                processor.onaudioprocess = (event) => {
                    try {
                        const inputData = event.inputBuffer.getChannelData(0);
                        // Queue audio chunks instead of processing immediately
                        audioQueue.push(new Float32Array(inputData));
                    } catch (err) {
                        console.error('[Audio] Error queuing audio:', err);
                    }
                };
                
                // Process queued audio asynchronously to avoid blocking
                const audioProcessInterval = setInterval(() => {
                    if (processingAudio || audioQueue.length === 0) return;
                    
                    processingAudio = true;
                    try {
                        // Process all queued chunks at once
                        let totalSamples = 0;
                        for (const chunk of audioQueue) {
                            totalSamples += chunk.length;
                        }
                        
                        // Combine all chunks
                        const combined = new Float32Array(totalSamples);
                        let offset = 0;
                        for (const chunk of audioQueue) {
                            combined.set(chunk, offset);
                            offset += chunk.length;
                        }
                        audioQueue = [];
                        
                        // Convert Float32 to Int16 PCM
                        const int16Data = convertFloat32ToInt16(combined);
                        
                        // Convert to base64 and send to Gemini Live via IPC
                        const base64 = arrayBufferToBase64(int16Data.buffer as ArrayBuffer);
                        if (electronAPI.geminiSendAudio) {
                            // Send asynchronously and don't wait
                            electronAPI.geminiSendAudio(base64).catch((err: any) => {
                                console.error('[Audio] Error sending audio to Gemini:', err);
                            });
                        }
                    } catch (err) {
                        console.error('[Audio] Error processing queued audio:', err);
                    } finally {
                        processingAudio = false;
                    }
                }, 100);  // Process every 100ms
                
                // Store cleanup for this interval
                if (!recordingIntervalRef.current) {
                    recordingIntervalRef.current = audioProcessInterval;
                }
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
                
                setAudioCapturing(true);
                setAudioMode('mic');
                cbRefs.current.onThinking?.('🎙️ Listening via Gemini Live...');
                console.log('[Audio] Electron Gemini Live audio capture started');
                return;
            }

            // BROWSER PATH: Use Web Speech API
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            console.log('[Audio] Microphone permission granted');

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('Web Speech API not supported in this browser. Please use Chrome or Edge.');
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                networkErrorCount.current = 0;
                const results = event.results;
                const lastResult = results[results.length - 1];
                const transcript = lastResult[0].transcript.trim();
                const isFinal = lastResult.isFinal;

                cbRefs.current.onTranscript?.(transcript, isFinal);

                if (isFinal && transcript && wsRef.current?.readyState === WebSocket.OPEN) {
                    const wordCount = transcript.split(/\s+/).length;
                    if (wordCount >= 3) {
                        wsRef.current.send(JSON.stringify({
                            type: 'transcript',
                            text: transcript,
                            is_final: true
                        }));
                    }
                }
            };

            recognition.onerror = (event: any) => {
                console.error('[SpeechRecognition] Error:', event.error);
                if (event.error === 'no-speech') return;
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied. Please grant microphone permission.');
                    cbRefs.current.onError?.('Microphone access denied');
                    return;
                }
                if (event.error === 'network') {
                    networkErrorCount.current++;
                    if (networkErrorCount.current >= MAX_NETWORK_RETRIES) {
                        setError('Speech recognition unavailable (network). Use the manual question box to type your questions.');
                        cbRefs.current.onError?.('Speech recognition network error — use manual input');
                        recognitionRef.current = null;
                        setAudioCapturing(false);
                        setAudioMode('none');
                        return;
                    }
                    console.warn(`[SpeechRecognition] Network error ${networkErrorCount.current}/${MAX_NETWORK_RETRIES} — will retry`);
                    return;
                }
                if (event.error === 'service-not-allowed') {
                    setError('Speech service unavailable. Use the manual question box below to type questions.');
                    cbRefs.current.onError?.('Speech service not available — use manual input');
                    recognitionRef.current = null;
                    setAudioCapturing(false);
                    setAudioMode('none');
                    return;
                }
                if (event.error === 'aborted') return;
                setError(`Speech recognition error: ${event.error}`);
                cbRefs.current.onError?.(`Speech recognition error: ${event.error}`);
            };

            recognition.onend = () => {
                if (recognitionRef.current === recognition) {
                    console.log('[SpeechRecognition] Ended, auto-restarting...');
                    try {
                        setTimeout(() => {
                            if (recognitionRef.current === recognition) {
                                try {
                                    recognition.start();
                                } catch (e) {
                                    console.warn('[SpeechRecognition] Restart failed, retrying in 1s...', e);
                                    setTimeout(() => {
                                        if (recognitionRef.current === recognition) {
                                            try { recognition.start(); } catch (_) {}
                                        }
                                    }, 1000);
                                }
                            }
                        }, 300);
                    } catch (e) {
                        console.warn('[SpeechRecognition] Failed to restart:', e);
                    }
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
            setAudioCapturing(true);
            setAudioMode('mic');
        } catch (err: any) {
            console.error('[Audio] Detailed error:', err);
            
            let msg = `Failed to start mic audio: ${err.message}`;
            
            // Provide helpful suggestions for common errors
            if (err.message?.includes('Requested device not found')) {
                msg = '🎤 Microphone not found. Please check:\n1. Microphone is connected\n2. Browser has microphone permission\n3. No other app is using the mic';
            } else if (err.message?.includes('Permission denied')) {
                msg = '🔒 Microphone permission denied. Please allow microphone access in browser settings.';
            } else if (err.message?.includes('NotAllowedError')) {
                msg = '⚠️ Microphone access not allowed. Check your browser permissions.';
            }
            
            setError(msg);
            cbRefs.current.onError?.(msg);
        } finally {
            audioInitInProgressRef.current = false;
        }
    }, [audioCapturing, connected]);

    /* ---- start system (interviewer) audio capture ---- */
    const startSystemAudioCapture = useCallback(async () => {
        if (audioCapturing || !connected) return;
        try {
            // For system audio, we still need getDisplayMedia
            // But we'll use Web Speech API on the captured audio
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('Web Speech API not supported in this browser. Please use Chrome or Edge.');
            }

            // Request screen capture with audio
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // Chrome requires video
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                } as MediaTrackConstraints,
            });

            // Check if audio track exists
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                stream.getTracks().forEach(t => t.stop());
                throw new Error('No audio track available. Make sure to share tab audio when prompted.');
            }

            // Create Web Speech recognition on the audio stream
            // NOTE: Web Speech API doesn't directly support MediaStream input in most browsers
            // So we'll use microphone recognition as a workaround
            // For proper system audio transcription, you would need a server-side solution
            
            // Stop the display media stream (we can't use it with Web Speech API)
            stream.getTracks().forEach(t => t.stop());

            // Fall back to microphone with a warning
            const msg = 'System audio transcription via Web Speech API is limited. Using microphone. For interviewer audio, consider using a virtual audio cable.';
            console.warn(msg);
            cbRefs.current.onError?.(msg);

            // Start mic recognition instead
            await startAudioCapture();
            setAudioMode('system'); // Keep the mode indicator

        } catch (err: any) {
            const msg = `Failed to capture system audio: ${err.message}`;
            setError(msg);
            cbRefs.current.onError?.(msg);
        }
    }, [audioCapturing, connected, startAudioCapture]);

    /* ---- stop audio capture ---- */
    const stopAudioCapture = useCallback(async () => {
        // Stop Web Speech API (browser)
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        // Stop MediaRecorder (legacy fallback)
        if (mediaRecorderRef.current) {
            try {
                if (mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
                // Stop all tracks
                mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
            } catch (e) {
                console.warn('[Audio] Error stopping MediaRecorder:', e);
            }
            mediaRecorderRef.current = null;
        }

        // Clear recording interval
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }

        // Stop Web Audio API (Electron/Gemini)
        if (micProcessorRef.current) {
            micProcessorRef.current.disconnect();
            micProcessorRef.current = null;
        }
        if (micAudioContextRef.current) {
            try {
                await micAudioContextRef.current.close();
            } catch (e) {
                console.warn('[Audio] Error closing mic audio context:', e);
            }
            micAudioContextRef.current = null;
        }
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                await audioContextRef.current.close();
            } catch (e) {
                console.warn('[Audio] Error closing audio context:', e);
            }
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Clean up Gemini IPC listeners
        geminiListenerCleanupRef.current.forEach(cleanup => cleanup?.());
        geminiListenerCleanupRef.current = [];
        const electronAPI = (window as any).electron;
        if (electronAPI?.removeAllGeminiListeners) {
            electronAPI.removeAllGeminiListeners();
        }

        // Close Gemini Live session if active
        const inElectron = !!electronAPI?.isElectron;
        if (inElectron && geminiInitializedRef.current) {
            try {
                await electronAPI.geminiLiveClose();
                geminiInitializedRef.current = false;
            } catch (e) {
                console.warn('[Audio] Error closing Gemini Live:', e);
            }
        }

        audioChunksRef.current = [];
        setAudioCapturing(false);
        setAudioMode('none');
    }, []);

    /* ---- send manual question ---- */
    const sendManualQuestion = useCallback((question: string) => {
        const inElectron = !!(window as any).electron?.isElectron;
        
        // In Electron, send directly to Groq/Gemma via IPC for streaming response
        if (inElectron) {
            const electronAPI = (window as any).electron;
            if (electronAPI?.sendTextToGroq) {
                electronAPI.sendTextToGroq(question);
                return;
            }
        }
        
        // Browser: send via WebSocket to backend
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'manual_question', question }));
        }
    }, []);

    /* ---- send text to Gemini Live (for injecting text context) ---- */
    const sendTextToGemini = useCallback((text: string) => {
        const electronAPI = (window as any).electron;
        if (electronAPI?.geminiSendText) {
            electronAPI.geminiSendText(text);
        }
    }, []);

    /* ---- set active profile ---- */
    const setProfile = useCallback((newProfile: string) => {
        setCurrentProfile(newProfile);
        
        // Update Electron-side profile
        const electronAPI = (window as any).electron;
        if (electronAPI?.setProfile) {
            electronAPI.setProfile(newProfile);
        }
        
        // Update backend profile via WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'set_profile', profile: newProfile }));
        }
    }, []);

    /* ---- auto-start audio ---- */
    useEffect(() => {
        if (connected && autoStartAudio && !audioCapturing) {
            startAudioCapture();
        }
    }, [connected, autoStartAudio, audioCapturing, startAudioCapture]);

    return {
        connected,
        connecting,
        startAudioCapture,
        stopAudioCapture,
        startSystemAudioCapture,
        sendManualQuestion,
        sendTextToGemini,
        setProfile,
        disconnect,
        audioCapturing,
        audioMode,
        error,
        currentProfile,
    };
}
