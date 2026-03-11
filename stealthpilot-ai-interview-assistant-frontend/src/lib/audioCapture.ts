/**
 * WebRTC audio capture utility for microphone and system audio
 */

export interface AudioStreamConfig {
  sampleRate?: number;
  channels?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioData: ((audioData: Int16Array) => void) | null = null;
  private isCapturing = false;

  /**
   * Start capturing audio from microphone
   */
  async startMicrophoneCapture(
    config: AudioStreamConfig  = {},
    onData: (audioData: Int16Array) => void
  ): Promise<void> {
    this.onAudioData = onData;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: config.sampleRate || 24000,
          channelCount: config.channels || 1,
          echoCancellation: config.echoCancellation ?? true,
          noiseSuppression: config.noiseSuppression ?? true,
          autoGainControl: config.autoGainControl ?? true,
        },
        video: false,
      });

      this.setupAudioProcessing(config.sampleRate || 24000);
      this.isCapturing = true;
    } catch (error: any) {
      console.error('Failed to access microphone:', error);
      throw new Error(`Microphone access denied: ${error.message}`);
    }
  }

  /**
   * Start capturing system audio (screen/tab audio)
   * Note: This requires user to select which tab/screen to share.
   * Chrome requires video to be included in getDisplayMedia; we stop
   * the video track immediately so only audio is processed.
   */
  async startSystemAudioCapture(
    config: AudioStreamConfig = {},
    onData: (audioData: Int16Array) => void
  ): Promise<void> {
    this.onAudioData = onData;

    try {
      // Chrome needs video:true for getDisplayMedia, we stop the video track right after
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          sampleRate: config.sampleRate || 24000,
          channelCount: config.channels || 1,
          echoCancellation: false,
          noiseSuppression: false,
        },
        video: true, // required by Chrome, we discard it immediately
      } as any);

      // Drop the video track — we only need audio
      this.mediaStream.getVideoTracks().forEach((track) => track.stop());

      // Verify we actually got an audio track
      if (this.mediaStream.getAudioTracks().length === 0) {
        throw new Error('No audio track found. Please select a tab or screen that has audio.');
      }

      this.setupAudioProcessing(config.sampleRate || 24000);
      this.isCapturing = true;
    } catch (error: any) {
      console.error('Failed to capture system audio:', error);
      throw new Error(`System audio capture failed: ${error.message}`);
    }
  }

  /**
   * Setup audio processing pipeline
   */
  private setupAudioProcessing(sampleRate: number): void {
    if (!this.mediaStream) return;

    // Create audio context
    this.audioContext = new AudioContext({ sampleRate });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create processor node (deprecated but works cross-browser)
    // Buffer size: 4096 samples = ~170ms at 24kHz
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isCapturing || !this.onAudioData) return;

      const inputData = event.inputBuffer.getChannelData(0);
      
      // Convert Float32Array [-1, 1] to Int16Array [-32768, 32767]
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.onAudioData(int16Data);
    };

    // Connect nodes: source -> processor -> destination
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Stop audio capture and cleanup resources
   */
  stop(): void {
    this.isCapturing = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioData = null;
  }

  /**
   * Check if currently capturing
   */
  get capturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Get current audio stream
   */
  getStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Check if browser supports audio capture
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  }

  /**
   * Request permission for microphone access
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const audioCapture = new AudioCapture();
