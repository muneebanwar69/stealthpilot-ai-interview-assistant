// Whisper Worker - runs Whisper in background thread so UI doesn't block
import { pipeline, env } from '@xenova/transformers';

// Allow model download from HuggingFace (first run only, cached after)
env.allowRemoteModels = true;

let transcriber = null;

// Load Whisper model once
async function loadModel() {
    self.postMessage({ type: 'status', text: '⏳ Loading Whisper model (first time ~40MB)...' });

    try {
        transcriber = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny.en', // tiny = fastest, smallest (40MB). Use 'Xenova/whisper-base.en' for better accuracy
            {
                chunk_length_s: 10,
                stride_length_s: 2,
            }
        );

        self.postMessage({ type: 'status', text: '✅ Whisper ready!' });
        self.postMessage({ type: 'ready' });
    } catch (err) {
        self.postMessage({ type: 'error', text: 'Failed to load Whisper: ' + err.message });
    }
}

// Transcribe audio
self.onmessage = async (e) => {
    if (e.data.type === 'load') {
        await loadModel();
        return;
    }

    if (e.data.type === 'transcribe') {
        if (!transcriber) {
            self.postMessage({ type: 'error', text: 'Whisper not loaded yet' });
            return;
        }

        try {
            const audioData = e.data.audio; // Float32Array

            const result = await transcriber(audioData, {
                language: 'english',
                task: 'transcribe',
            });

            const text = result.text?.trim() || '';
            if (text) {
                self.postMessage({ type: 'transcript', text: text });
            }
        } catch (err) {
            self.postMessage({ type: 'error', text: err.message });
        }
    }
};

// Start loading immediately
loadModel();
