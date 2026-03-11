/**
 * Whisper Local Transcription Hook
 * 
 * Uses @xenova/transformers to run Whisper locally in a Web Worker.
 * No API key needed for transcription - 100% offline after model download.
 * Uses Gemini REST API only for AI answers.
 */

import { useCallback, useRef, useState, useEffect } from 'react';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export interface UseWhisperTranscriptionOptions {
    onTranscript?: (text: string, isFinal: boolean) => void;
    onAnswer?: (question: string, answer: string) => void;
    onError?: (error: string) => void;
    onStatus?: (status: string) => void;
}

export interface UseWhisperTranscriptionResult {
    isReady: boolean;
    isRecording: boolean;
    isLoading: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    error: string | null;
}

export function useWhisperTranscription(options: UseWhisperTranscriptionOptions): UseWhisperTranscriptionResult {
    const [isReady, setIsReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isRecordingRef = useRef(false);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    // Get best supported mime type
    const getMimeType = useCallback(() => {
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', ''];
        return types.find((t) => t === '' || MediaRecorder.isTypeSupported(t)) || '';
    }, []);

    // Initialize Whisper Worker
    useEffect(() => {
        console.log('[Whisper] Initializing worker...');
        optionsRef.current.onStatus?.('⏳ Loading Whisper AI model...');
        setIsLoading(true);

        try {
            // Create worker from public folder
            const worker = new Worker('/whisper.worker.js', { type: 'module' });
            workerRef.current = worker;

            worker.onmessage = async (e) => {
                switch (e.data.type) {
                    case 'status':
                        console.log('[Whisper] Status:', e.data.text);
                        optionsRef.current.onStatus?.(e.data.text);
                        break;

                    case 'ready':
                        console.log('[Whisper] Model ready!');
                        setIsReady(true);
                        setIsLoading(false);
                        optionsRef.current.onStatus?.('✅ Ready! Click mic to start.');
                        break;

                    case 'transcript':
                        const transcript = e.data.text;
                        if (transcript) {
                            console.log('[Whisper] Transcript:', transcript);
                            optionsRef.current.onTranscript?.(transcript, true);
                            
                            // Get AI answer for non-trivial transcripts
                            if (transcript.split(/\s+/).length >= 3) {
                                getGeminiAnswer(transcript);
                            }
                        }
                        break;

                    case 'error':
                        console.error('[Whisper] Error:', e.data.text);
                        setError(e.data.text);
                        optionsRef.current.onError?.(e.data.text);
                        setIsLoading(false);
                        break;
                }
            };

            worker.onerror = (e) => {
                console.error('[Whisper] Worker error:', e);
                setError(e.message || 'Worker failed');
                optionsRef.current.onError?.(e.message || 'Worker failed');
                setIsLoading(false);
            };
        } catch (err: any) {
            console.error('[Whisper] Failed to create worker:', err);
            setError(err.message || 'Failed to create worker');
            setIsLoading(false);
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, []);

    // Get Gemini AI answer
    const getGeminiAnswer = useCallback(async (transcript: string) => {
        if (!GEMINI_API_KEY) {
            console.warn('[Gemini] No API key configured');
            return;
        }

        optionsRef.current.onStatus?.('🤖 Getting AI answer...');

        try {
            const res = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are an expert interview assistant. 
                   The interviewer just said: "${transcript}"
                   If this is a question, give a concise, smart, direct answer in 2-3 sentences max.
                   If it's not a question, just say "Not a question" briefly.`,
                                },
                            ],
                        },
                    ],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
                }),
            });

            const data = await res.json();
            const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (answer && !answer.toLowerCase().includes('not a question')) {
                optionsRef.current.onAnswer?.(transcript, answer);
            }
            optionsRef.current.onStatus?.('🎙️ Listening...');
        } catch (err: any) {
            console.error('[Gemini] Error:', err);
            optionsRef.current.onError?.('Gemini error: ' + err.message);
        }
    }, []);

    // Process audio chunk
    const processAudioChunk = useCallback(async (chunks: Blob[], mimeType: string) => {
        if (chunks.length === 0 || !workerRef.current) return;

        try {
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });

            // Convert blob → Float32Array for Whisper
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const float32Audio = audioBuffer.getChannelData(0);

            // Send to Whisper worker (transfer ownership for performance)
            workerRef.current.postMessage({ type: 'transcribe', audio: float32Audio }, [float32Audio.buffer]);

            await audioContext.close();
        } catch (err: any) {
            console.error('[Whisper] Error processing audio:', err);
        }
    }, []);

    // Start a recording chunk
    const startChunk = useCallback(
        (stream: MediaStream, mimeType: string) => {
            const options = mimeType ? { mimeType } : {};
            const recorder = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const chunks = [...audioChunksRef.current];
                audioChunksRef.current = [];

                await processAudioChunk(chunks, mimeType);

                // Restart if still recording
                if (isRecordingRef.current && streamRef.current) {
                    startChunk(streamRef.current, mimeType);
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

            // Auto-stop every 4 seconds to process chunk
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 4000);
        },
        [processAudioChunk]
    );

    // Start recording
    const startRecording = useCallback(async () => {
        if (!isReady) {
            setError('Whisper not ready yet');
            return;
        }

        if (isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            streamRef.current = stream;
            isRecordingRef.current = true;
            setIsRecording(true);
            setError(null);

            const mimeType = getMimeType();
            startChunk(stream, mimeType);

            optionsRef.current.onStatus?.('🎙️ Listening...');
        } catch (err: any) {
            console.error('[Whisper] Mic error:', err);
            setError(err.message || 'Microphone error');
            optionsRef.current.onError?.(err.message || 'Microphone error');
        }
    }, [isReady, isRecording, getMimeType, startChunk]);

    // Stop recording
    const stopRecording = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        optionsRef.current.onStatus?.('⏹ Stopped');
    }, []);

    return {
        isReady,
        isRecording,
        isLoading,
        startRecording,
        stopRecording,
        error,
    };
}
