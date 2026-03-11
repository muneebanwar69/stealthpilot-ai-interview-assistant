"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWebSocketLiveSession } from '@/lib/useWebSocketLiveSession';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Monitor, Copy, CheckCircle, Send, Volume2, Camera, Loader2, EyeOff, Eye, Minus, X, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { screenshotAPI } from '@/lib/api';
import { stealthMode } from '@/lib/stealthMode';

interface TranscriptEntry {
    text: string;
    timestamp: string;
    isFinal: boolean;
}

interface AnswerEntry {
    question: string;
    answer: string;
    confidence: number;
    timestamp: string;
    copied: boolean;
}

function LiveSessionPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = parseInt(searchParams.get('id') || '0');

    const [token, setToken] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [answers, setAnswers] = useState<AnswerEntry[]>([]);
    const [currentInterim, setCurrentInterim] = useState<string>('');
    const [manualQuestion, setManualQuestion] = useState('');
    const [thinking, setThinking] = useState(false);
    const [thinkingMessage, setThinkingMessage] = useState('');
    const [screenshotLoading, setScreenshotLoading] = useState(false);
    const [stealthModeActive, setStealthModeActive] = useState(false);
    const [isElectron, setIsElectron] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState('interview');
    const [streamingText, setStreamingText] = useState('');

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const answersEndRef = useRef<HTMLDivElement>(null);

    // Combined auth + Electron detection (single effect avoids blank flash)
    useEffect(() => {
        const inElectron = !!(window as any).electron?.isElectron;
        setIsElectron(inElectron);

        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            if (inElectron) {
                // Main process will auto-login and reload — just show loading state
                console.log('[Electron] No token yet — waiting for auto-login...');
                setAuthChecked(true);
                return;
            }
            setAuthChecked(true);
            router.push('/sign-in');
            return;
        }
        setToken(storedToken);
        setAuthChecked(true);
    }, [router]);

    // WebSocket connection
    const {
        connected,
        connecting,
        startAudioCapture,
        stopAudioCapture,
        startSystemAudioCapture,
        sendManualQuestion,
        sendTextToGemini: _sendTextToGemini,
        setProfile,
        audioCapturing,
        audioMode,
        error,
        currentProfile,
    } = useWebSocketLiveSession({
        sessionId,
        token: token || '',
        profile: selectedProfile,
        onTranscript: (text, isFinal) => {
            if (isFinal) {
                setTranscript((prev) => [...prev, { text, timestamp: new Date().toISOString(), isFinal: true }]);
                setCurrentInterim('');
            } else {
                setCurrentInterim(text);
            }
        },
        onAnswer: (question, answer, confidence) => {
            setAnswers((prev) => [...prev, { question, answer, confidence, timestamp: new Date().toISOString(), copied: false }]);
            setThinking(false);
            setThinkingMessage('');
            setStreamingText('');
            
            // Send to stealth mode window if active
            if (stealthMode.isOpen()) {
                stealthMode.updateAnswer(question, answer, confidence);
            }
        },
        onError: (err) => {
            console.error('Session error:', err);
            setThinking(false);
        },
        onConnected: () => {
            console.log('Connected to live session');
        },
        onThinking: (msg) => {
            setThinking(true);
            setThinkingMessage(msg);
        },
        onStreamingResponse: (text, isComplete) => {
            if (isComplete) {
                // Convert streaming text to a full answer
                setAnswers((prev) => [...prev, {
                    question: '[AI Response]',
                    answer: text,
                    confidence: 0.9,
                    timestamp: new Date().toISOString(),
                    copied: false,
                }]);
                setStreamingText('');
                setThinking(false);
            } else {
                setStreamingText(text);
            }
        },
        autoStartAudio: false,
    });

    // Auto-scroll
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, currentInterim]);

    useEffect(() => {
        answersEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [answers]);

    // Copy answer to clipboard
    const copyAnswer = async (index: number) => {
        const answer = answers[index];
        await navigator.clipboard.writeText(answer.answer);
        setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, copied: true } : a)));
        setTimeout(() => {
            setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, copied: false } : a)));
        }, 2000);
    };

    // Handle screenshot capture → Gemini vision analysis
    const handleScreenshotCapture = async () => {
        try {
            setScreenshotLoading(true);
            setThinking(true);
            setThinkingMessage('Capturing screen...');

            // Request screen capture
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'monitor' } as MediaTrackConstraints,
                audio: false,
            });

            // Grab a single frame from the video track
            const track = stream.getVideoTracks()[0];
            const videoEl = document.createElement('video');
            videoEl.srcObject = stream;
            videoEl.muted = true;

            await new Promise<void>((resolve) => {
                videoEl.onloadedmetadata = () => {
                    videoEl.play();
                    resolve();
                };
            });

            // Small delay to ensure the frame is rendered
            await new Promise((r) => setTimeout(r, 300));

            // Draw to canvas and extract base64
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth;
            canvas.height = videoEl.videoHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(videoEl, 0, 0);

            // Stop the stream immediately – user sees the share dialog only briefly
            track.stop();
            stream.getTracks().forEach((t) => t.stop());

            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1]; // strip "data:image/png;base64,"

            setThinkingMessage('Analyzing screenshot with AI...');

            // Add a transcript entry so the user knows what happened
            setTranscript((prev) => [
                ...prev,
                { text: '[Screenshot captured — analyzing with AI...]', timestamp: new Date().toISOString(), isFinal: true },
            ]);

            // Send to backend
            const response = await screenshotAPI.analyze(base64, 'image/png');
            const data = response.data;

            if (data.detected) {
                const questionText = data.questions.length > 0 ? data.questions.join(' | ') : 'Screen content';
                const answerEntry = {
                    question: `[Screenshot] ${questionText}`,
                    answer: data.answer,
                    confidence: 0.95,
                    timestamp: new Date().toISOString(),
                    copied: false,
                };
                setAnswers((prev) => [...prev, answerEntry]);
                
                // Send to stealth mode if active
                if (stealthMode.isOpen()) {
                    stealthMode.updateAnswer(answerEntry.question, answerEntry.answer, answerEntry.confidence);
                }
                
                setTranscript((prev) => [
                    ...prev,
                    { text: `[AI detected: ${data.questions.length} question(s) on screen]`, timestamp: new Date().toISOString(), isFinal: true },
                ]);
            } else {
                setTranscript((prev) => [
                    ...prev,
                    { text: `[No questions detected on screen] ${data.raw_text}`, timestamp: new Date().toISOString(), isFinal: true },
                ]);
            }
        } catch (err: any) {
            // User cancelled the screen picker — not an error
            if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
                setTranscript((prev) => [
                    ...prev,
                    { text: '[Screenshot cancelled by user]', timestamp: new Date().toISOString(), isFinal: true },
                ]);
            } else {
                console.error('Screenshot capture failed:', err);
                setTranscript((prev) => [
                    ...prev,
                    { text: `[Screenshot error: ${err?.message || 'Unknown error'}]`, timestamp: new Date().toISOString(), isFinal: true },
                ]);
            }
        } finally {
            setScreenshotLoading(false);
            setThinking(false);
            setThinkingMessage('');
        }
    };

    // Handle manual question
    const handleManualQuestion = () => {
        if (manualQuestion.trim() && connected) {
            sendManualQuestion(manualQuestion.trim());
            // Add the question to transcript so user sees it
            setTranscript((prev) => [
                ...prev,
                { text: `[You asked]: ${manualQuestion.trim()}`, timestamp: new Date().toISOString(), isFinal: true },
            ]);
            setManualQuestion('');
            setThinking(true);
            setThinkingMessage('Generating answer...');
        }
    };

    // Toggle stealth mode
    const toggleStealthMode = () => {
        if (stealthMode.isOpen()) {
            stealthMode.close();
            setStealthModeActive(false);
        } else {
            const opened = stealthMode.open();
            if (opened) {
                setStealthModeActive(true);
                // Show instructions
                alert('✅ Stealth Mode Active!\n\n' +
                      '💡 Tips:\n' +
                      '• Move the popup window to your second monitor\n' +
                      '• Or minimize this main tab (Alt+Tab to switch back)\n' +
                      '• Share only your meeting screen, NOT the popup\n' +
                      '• AI answers will appear in the popup window\n' +
                      '• Press Ctrl+Shift+H to quickly minimize this tab');
            } else {
                alert('❌ Failed to open stealth window. Please allow popups for this site.');
            }
        }
    };

    // Keyboard shortcut to minimize (Ctrl+Shift+H)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
                e.preventDefault();
                window.blur(); // Minimize/lose focus
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Show loading while we haven't checked auth yet (prevents blank screen on first render)
    if (!authChecked) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-white/60 text-sm animate-pulse">Initializing StealthPilot...</div>
            </div>
        );
    }

    if (!token) {
        // In Electron, show a loading indicator instead of blank
        if (isElectron) {
            return (
                <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                    <div className="text-white/60 text-sm animate-pulse">Connecting to StealthPilot...</div>
                </div>
            );
        }
        return null;
    }

    const latestQuestion = answers.length > 0 ? answers[answers.length - 1] : null;

    // Electron window control handlers
    const electronAPI = (window as any).electron;
    const handleMinimize = () => electronAPI?.minimizeWindow?.();
    const handleMaximize = () => electronAPI?.maximizeWindow?.();
    const handleClose = () => electronAPI?.closeWindow?.();

    return (
        <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#111118] to-[#0a0a0f] flex flex-col overflow-hidden">
            {/* Top bar — draggable title bar with window controls */}
            <div 
                className="border-b border-white/10 bg-black/60 backdrop-blur px-3 py-1.5 flex items-center justify-between shrink-0 select-none"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : connecting ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-medium text-white/80">
                        {connecting ? 'Connecting...' : connected ? 'Live' : 'Offline'}
                    </span>
                    {audioCapturing && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            {audioMode === 'system' ? <Monitor size={10} /> : <Mic size={10} />}
                            {audioMode === 'system' ? 'System Audio' : 'Mic'}
                        </span>
                    )}
                    {stealthModeActive && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <EyeOff size={10} />
                            Stealth
                        </span>
                    )}
                </div>

                {/* Window controls — minimize / maximize / close */}
                <div className="flex items-center gap-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    {!isElectron && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-white/50 hover:text-white hover:bg-white/10"
                            onClick={() => router.push('/dashboard')}
                        >
                            Dashboard
                        </Button>
                    )}
                    {isElectron && (
                        <>
                            <button
                                onClick={handleMinimize}
                                className="w-8 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Hide (Ctrl+Shift+H to show again)"
                            >
                                <Minus size={14} />
                            </button>
                            <button
                                onClick={handleMaximize}
                                className="w-8 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                title="Maximize / Restore"
                            >
                                <Maximize2 size={12} />
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-8 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500/80 transition-colors rounded-tr"
                                title="Close"
                            >
                                <X size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main content — responsive: stacked on small screens, side-by-side on wide */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Left column — Transcript & controls */}
                <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/10 min-w-0">
                    {/* Audio controls */}
                    <div className="p-3 border-b border-white/10 space-y-2 shrink-0">
                        <div className="flex gap-2 flex-wrap">
                            {/* System Audio (Interviewer) — primary action */}
                            <Button
                                size="sm"
                                onClick={audioCapturing && audioMode === 'system' ? stopAudioCapture : startSystemAudioCapture}
                                className={`text-xs ${
                                    audioCapturing && audioMode === 'system'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-[#7c6aff] hover:bg-[#6b59ee]'
                                }`}
                                disabled={!connected || (audioCapturing && audioMode !== 'system')}
                            >
                                {audioCapturing && audioMode === 'system' ? (
                                    <>
                                        <Volume2 size={16} className="mr-2 animate-pulse" /> Stop System Audio
                                    </>
                                ) : (
                                    <>
                                        <Monitor size={16} className="mr-2" /> Capture Interviewer Audio
                                    </>
                                )}
                            </Button>

                            {/* Microphone — secondary */}
                            <Button
                                size="sm"
                                onClick={audioCapturing && audioMode === 'mic' ? stopAudioCapture : startAudioCapture}
                                variant="outline"
                                className={`text-xs border-white/20 ${
                                    audioCapturing && audioMode === 'mic' ? 'bg-red-600/20 border-red-500 text-red-400' : ''
                                }`}
                                disabled={!connected || (audioCapturing && audioMode !== 'mic')}
                            >
                                {audioCapturing && audioMode === 'mic' ? (
                                    <>
                                        <MicOff size={14} className="mr-1" /> Stop Mic
                                    </>
                                ) : (
                                    <>
                                        <Mic size={14} className="mr-1" /> Mic
                                    </>
                                )}
                            </Button>

                            {/* Screenshot */}
                            <Button
                                size="sm"
                                onClick={handleScreenshotCapture}
                                variant="outline"
                                className={`text-xs border-white/20 ${screenshotLoading ? 'bg-amber-600/20 border-amber-500 text-amber-400' : ''}`}
                                disabled={screenshotLoading}
                            >
                                {screenshotLoading ? (
                                    <Loader2 size={14} className="mr-1 animate-spin" />
                                ) : (
                                    <Camera size={14} className="mr-1" />
                                )}
                                {screenshotLoading ? 'Analyzing...' : 'Screenshot'}
                            </Button>

                            {/* Stealth Mode Toggle (hide in Electron since the whole app is stealth) */}
                            {!isElectron && (
                                <Button
                                    size="sm"
                                    onClick={toggleStealthMode}
                                    variant="outline"
                                    className={`text-xs border-white/20 ${
                                        stealthModeActive 
                                            ? 'bg-green-600/20 border-green-500 text-green-400' 
                                            : ''
                                    }`}
                                >
                                    {stealthModeActive ? (
                                        <><EyeOff size={14} className="mr-1" /> Stealth</>
                                    ) : (
                                        <><Eye size={14} className="mr-1" /> Stealth</>
                                    )}
                                </Button>
                            )}
                        </div>

                        {/* Profile selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/50 uppercase tracking-wide">Profile:</span>
                            <select
                                value={currentProfile}
                                onChange={(e) => {
                                    setSelectedProfile(e.target.value);
                                    setProfile(e.target.value);
                                }}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#7c6aff] appearance-none cursor-pointer"
                            >
                                <option value="interview" className="bg-[#111118]">Interview</option>
                                <option value="sales" className="bg-[#111118]">Sales Call</option>
                                <option value="meeting" className="bg-[#111118]">Meeting</option>
                                <option value="presentation" className="bg-[#111118]">Presentation</option>
                                <option value="negotiation" className="bg-[#111118]">Negotiation</option>
                                <option value="exam" className="bg-[#111118]">Exam / Quiz</option>
                            </select>
                        </div>

                        {error && <div className="text-[11px] text-red-400 bg-red-500/10 p-1.5 rounded">{error}</div>}

                        {/* Manual question input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a question..."
                                value={manualQuestion}
                                onChange={(e) => setManualQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualQuestion()}
                                className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#7c6aff]"
                            />
                            <Button size="sm" onClick={handleManualQuestion} disabled={!manualQuestion.trim() || !connected} className="bg-[#7c6aff] hover:bg-[#6b59ee]">
                                <Send size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Transcript area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Live Transcript</h2>
                        {transcript.length === 0 && !currentInterim && (
                            <div className="text-white/30 text-sm italic">
                                {connected
                                    ? 'Waiting for audio... Click "Capture Interviewer Audio" or type a question.'
                                    : 'Connecting to server...'}
                            </div>
                        )}
                        <div className="space-y-2">
                            {transcript.map((entry, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-white/80 bg-white/5 rounded px-3 py-2">
                                    {entry.text}
                                </motion.div>
                            ))}
                            {currentInterim && <div className="text-sm text-white/40 italic bg-white/5 rounded px-3 py-2 animate-pulse">{currentInterim}</div>}
                        </div>
                        <div ref={transcriptEndRef} />
                    </div>
                </div>

                {/* Right column — AI Answers */}
                <div className="flex-1 md:max-w-[50%] flex flex-col bg-black/20">
                    <div className="p-2 border-b border-white/10 shrink-0">
                        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">AI Answers</h2>
                    </div>

                    {/* Latest answer — prominent */}
                    {(thinking || streamingText || latestQuestion) && (
                        <div className="p-3 border-b border-white/10 bg-gradient-to-br from-[#7c6aff]/10 to-[#2dd4bf]/10 shrink-0">
                            {streamingText ? (
                                <div>
                                    <span className="text-xs font-semibold text-[#7c6aff] uppercase mb-1 block">Streaming...</span>
                                    <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{streamingText}</div>
                                </div>
                            ) : thinking ? (
                                <div className="flex items-center gap-2 text-[#7c6aff]">
                                    <div className="w-2 h-2 rounded-full bg-[#7c6aff] animate-ping" />
                                    <span className="text-xs font-medium">{thinkingMessage || 'Generating answer...'}</span>
                                </div>
                            ) : latestQuestion ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-[#2dd4bf] uppercase">Latest Answer</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyAnswer(answers.length - 1)}
                                            className="h-6 text-xs text-white/60 hover:text-white"
                                        >
                                            {latestQuestion.copied ? (
                                                <>
                                                    <CheckCircle size={12} className="mr-1" /> Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} className="mr-1" /> Copy
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="text-sm font-medium text-[#2dd4bf] mb-2">Q: {latestQuestion.question}</div>
                                    <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{latestQuestion.answer}</div>
                                    <div className="mt-2 text-[10px] text-white/40">
                                        Confidence: {(latestQuestion.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Previous answers */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {answers.length === 0 && !thinking && (
                            <div className="text-white/30 text-sm italic text-center mt-8">
                                Questions &amp; answers will appear here in real-time.
                            </div>
                        )}
                        <AnimatePresence>
                            {answers
                                .slice(0, -1)
                                .reverse()
                                .map((answer, revIdx) => {
                                    const idx = answers.length - 2 - revIdx;
                                    return (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 bg-white/5 border border-white/10 rounded-lg"
                                        >
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="text-xs font-semibold text-[#2dd4bf]">Q: {answer.question}</div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyAnswer(idx)}
                                                    className="h-5 text-[10px] text-white/40 hover:text-white shrink-0"
                                                >
                                                    {answer.copied ? <CheckCircle size={10} /> : <Copy size={10} />}
                                                </Button>
                                            </div>
                                            <div className="text-xs text-white/80 whitespace-pre-wrap">{answer.answer}</div>
                                            <div className="mt-1 text-[10px] text-white/30">
                                                {(answer.confidence * 100).toFixed(0)}% confidence
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </AnimatePresence>
                        <div ref={answersEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LiveSessionPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                    <div className="text-white/60 text-sm animate-pulse">Loading session...</div>
                </div>
            }
        >
            <LiveSessionPageInner />
        </Suspense>
    );
}
