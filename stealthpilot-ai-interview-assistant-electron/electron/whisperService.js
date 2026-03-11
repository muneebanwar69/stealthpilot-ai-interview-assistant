/**
 * Whisper.cpp Service for Local Speech Recognition
 * 
 * Provides offline speech-to-text transcription using OpenAI's Whisper model.
 * Uses the tiny.en model (75MB) for fast, real-time transcription.
 */

const { nodewhisper } = require('nodejs-whisper');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

class WhisperService {
    constructor() {
        this.initialized = false;
        this.modelName = 'tiny.en'; // Fast, 75MB, good accuracy
        this.modelPath = null;
        this.isTranscribing = false;
    }

    /**
     * Initialize Whisper service and verify model exists
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Check for model in multiple locations
            const possiblePaths = [
                path.join(__dirname, '..', 'models', `ggml-${this.modelName}.bin`),
                path.join(process.resourcesPath || '', 'models', `ggml-${this.modelName}.bin`),
                path.join(os.homedir(), '.stealthpilot', 'models', `ggml-${this.modelName}.bin`)
            ];

            // Find existing model
            for (const modelPath of possiblePaths) {
                if (fs.existsSync(modelPath)) {
                    this.modelPath = modelPath;
                    console.log('[Whisper] Model found at:', modelPath);
                    this.initialized = true;
                    return true;
                }
            }

            console.warn('[Whisper] Model not found. Will download on first use.');
            // Set default path for download
            this.modelPath = possiblePaths[0];
            const modelDir = path.dirname(this.modelPath);
            if (!fs.existsSync(modelDir)) {
                fs.mkdirSync(modelDir, { recursive: true });
            }
            return false;
        } catch (error) {
            console.error('[Whisper] Initialization error:', error);
            return false;
        }
    }

    /**
     * Check if model exists
     */
    isModelDownloaded() {
        return this.modelPath && fs.existsSync(this.modelPath);
    }

    /**
     * Get model download status
     */
    getModelInfo() {
        return {
            name: this.modelName,
            path: this.modelPath,
            downloaded: this.isModelDownloaded(),
            size: '75MB',
            url: `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${this.modelName}.bin`
        };
    }

    /**
     * Transcribe audio buffer to text
     * @param {Buffer} audioBuffer - Audio data (WAV format, 16kHz recommended)
     * @returns {Promise<string>} Transcribed text
     */
    async transcribe(audioBuffer) {
        if (this.isTranscribing) {
            console.warn('[Whisper] Already transcribing, skipping...');
            return '';
        }

        if (!this.isModelDownloaded()) {
            throw new Error('Whisper model not downloaded or initialized');
        }

        this.isTranscribing = true;

        try {
            // Save audio buffer to temporary file
            const tempDir = path.join(os.tmpdir(), 'stealthpilot-audio');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFile = path.join(tempDir, `audio-${Date.now()}.wav`);
            fs.writeFileSync(tempFile, audioBuffer);

            console.log('[Whisper] Transcribing audio file:', tempFile);

            // Transcribe with nodejs-whisper
            const transcript = await nodewhisper(tempFile, {
                modelName: this.modelName,
                modelPath: path.dirname(this.modelPath),
                whisperOptions: {
                    outputInText: true,
                    language: 'en',
                    wordTimestamps: false
                }
            });

            // Clean up temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore cleanup errors
            }

            const text = typeof transcript === 'string' ? transcript.trim() : '';
            console.log('[Whisper] Transcription result:', text);
            return text;

        } catch (error) {
            console.error('[Whisper] Transcription error:', error);
            throw new Error(`Transcription failed: ${error.message}`);
        } finally {
            this.isTranscribing = false;
        }
    }

    /**
     * Download Whisper model
     * @param {Function} progressCallback - Called with {downloaded, total, percentage}
     */
    async downloadModel(progressCallback) {
        if (this.isModelDownloaded()) {
            console.log('[Whisper] Model already downloaded');
            return true;
        }

        const modelUrl = this.getModelInfo().url;

        return new Promise((resolve, reject) => {
            console.log('[Whisper] Downloading model from:', modelUrl);

            https.get(modelUrl, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Follow redirect
                    https.get(response.headers.location, (redirectResponse) => {
                        this._downloadStream(redirectResponse, progressCallback, resolve, reject);
                    }).on('error', reject);
                } else if (response.statusCode === 200) {
                    this._downloadStream(response, progressCallback, resolve, reject);
                } else {
                    reject(new Error(`Failed to download model: HTTP ${response.statusCode}`));
                }
            }).on('error', reject);
        });
    }

    _downloadStream(response, progressCallback, resolve, reject) {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        const modelDir = path.dirname(this.modelPath);
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }

        const fileStream = fs.createWriteStream(this.modelPath);

        response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const percentage = Math.floor((downloadedSize / totalSize) * 100);
            
            if (progressCallback) {
                progressCallback({
                    downloaded: downloadedSize,
                    total: totalSize,
                    percentage: percentage
                });
            }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            console.log('[Whisper] Model downloaded successfully');
            this.initialized = true;
            resolve(true);
        });

        fileStream.on('error', (error) => {
            try {
                fs.unlinkSync(this.modelPath);
            } catch(e) {}
            reject(error);
        });
    }
}

// Singleton instance
const whisperService = new WhisperService();

module.exports = whisperService;
