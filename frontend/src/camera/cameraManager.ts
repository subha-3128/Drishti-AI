export type CameraStatus =
  | 'idle'
  | 'requesting_permission'
  | 'starting'
  | 'active'
  | 'permission_denied'
  | 'unavailable'
  | 'interrupted'
  | 'frozen';

export interface CapturedFrame {
  imageData: ImageData;
  width: number;
  height: number;
  timestamp: number;
}

export interface CameraInfo {
  facingMode: string;
  width: number;
  height: number;
}

export interface CameraCallbacks {
  onStatusChange: (status: CameraStatus, detail?: string) => void;
  onError: (message: string) => void;
}

const TARGET_WIDTH = 640;
const TARGET_HEIGHT = 480;
const CAPTURE_MAX_WIDTH = 320;
const FREEZE_TIMEOUT_MS = 3000;

export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private status: CameraStatus = 'idle';
  private startingPromise: Promise<boolean> | null = null;
  private lastVideoTime = -1;
  private lastFrameProgressAt = 0;
  private freezeTimerId: number | null = null;
  private cameraInfo: CameraInfo = { facingMode: 'unknown', width: 0, height: 0 };
  private callbacks: CameraCallbacks;

  constructor(callbacks: CameraCallbacks) {
    this.callbacks = callbacks;
  }

  getStatus(): CameraStatus {
    return this.status;
  }

  getCameraInfo(): CameraInfo {
    return { ...this.cameraInfo };
  }

  private setStatus(status: CameraStatus, detail?: string): void {
    this.status = status;
    this.callbacks.onStatusChange(status, detail);
  }

  async start(videoElement: HTMLVideoElement, signal?: AbortSignal): Promise<boolean> {
    if (signal?.aborted) {
      return false;
    }
    if (this.startingPromise) {
      return this.startingPromise;
    }
    if (this.status === 'active' && this.stream) {
      return true;
    }

    this.startingPromise = this.startInternal(videoElement, signal);
    try {
      return await this.startingPromise;
    } finally {
      this.startingPromise = null;
    }
  }

  private async startInternal(videoElement: HTMLVideoElement, signal?: AbortSignal): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus('unavailable', 'Camera API is not supported in this browser.');
      this.callbacks.onError('Camera is not supported in this browser.');
      return false;
    }

    this.stopStreamOnly();
    this.video = videoElement;
    this.setStatus('requesting_permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: TARGET_WIDTH },
          height: { ideal: TARGET_HEIGHT },
          frameRate: { ideal: 15, max: 24 },
        },
      });

      if (signal?.aborted) {
        for (const t of stream.getTracks()) t.stop();
        this.setStatus('idle');
        return false;
      }

      this.stream = stream;
      this.setStatus('starting');

      const [track] = stream.getVideoTracks();
      if (!track) {
        this.stop();
        this.setStatus('unavailable', 'No rear video track available.');
        this.callbacks.onError('No camera video track found.');
        return false;
      }

      const settings = track.getSettings();
      const actualFacing = settings.facingMode ?? 'unknown';
      const facingWarning =
        actualFacing !== 'unknown' && actualFacing !== 'environment'
          ? `Non-rear camera active (${actualFacing})`
          : undefined;

      track.onended = () => {
        if (this.status === 'active' || this.status === 'starting') {
          this.handleInterruption('Camera stream ended unexpectedly.');
        }
      };

      track.onmute = () => {
        if (this.status === 'active') {
          this.handleInterruption('Camera feed was muted or interrupted.');
        }
      };

      videoElement.srcObject = stream;
      videoElement.playsInline = true;
      videoElement.muted = true;

      await videoElement.play();

      if (signal?.aborted) {
        this.stop();
        return false;
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        await new Promise<void>((resolve) => {
          const onMeta = () => {
            videoElement.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          videoElement.addEventListener('loadedmetadata', onMeta);
          window.setTimeout(() => {
            videoElement.removeEventListener('loadedmetadata', onMeta);
            resolve();
          }, 1500);
        });
      }

      if (signal?.aborted) {
        this.stop();
        return false;
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        this.stop();
        this.setStatus('unavailable', 'Camera stream produced zero-dimension frames.');
        this.callbacks.onError('Camera started without valid video frames.');
        return false;
      }

      this.cameraInfo = {
        facingMode: actualFacing,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      };

      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
      }
      const captureScale = Math.min(1, CAPTURE_MAX_WIDTH / videoElement.videoWidth);
      this.canvas.width = Math.max(1, Math.round(videoElement.videoWidth * captureScale));
      this.canvas.height = Math.max(1, Math.round(videoElement.videoHeight * captureScale));
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.lastVideoTime = videoElement.currentTime;
      this.lastFrameProgressAt = performance.now();
      this.startFreezeMonitor();

      this.setStatus('active', facingWarning);
      return true;
    } catch (err) {
      this.stop();
      if (signal?.aborted) {
        return false;
      }
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.setStatus('permission_denied', 'Camera permission was denied.');
        this.callbacks.onError('Camera permission denied. Please enable camera access in browser settings.');
      } else {
        this.setStatus('unavailable', 'Unable to access rear camera.');
        this.callbacks.onError('Camera unavailable. Assistance cannot start.');
      }
      return false;
    }
  }

  captureNewestFrame(): CapturedFrame | null {
    if (this.status !== 'active' || !this.video || !this.canvas || !this.ctx) {
      return null;
    }
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const srcW = this.video.videoWidth || TARGET_WIDTH;
    const srcH = this.video.videoHeight || TARGET_HEIGHT;
    const scale = Math.min(1, CAPTURE_MAX_WIDTH / srcW);
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.drawImage(this.video, 0, 0, width, height);
    const imageData = this.ctx.getImageData(0, 0, width, height);

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      this.lastFrameProgressAt = performance.now();
    }

    return {
      imageData,
      width,
      height,
      timestamp: performance.now(),
    };
  }

  private startFreezeMonitor(): void {
    this.stopFreezeMonitor();
    this.freezeTimerId = window.setInterval(() => {
      if (this.status !== 'active' || !this.video) return;
      const now = performance.now();
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        this.lastFrameProgressAt = now;
        return;
      }
      if (now - this.lastFrameProgressAt > FREEZE_TIMEOUT_MS) {
        this.setStatus('frozen', 'Camera feed appears frozen.');
        this.callbacks.onError('Camera feed froze. Navigation assistance paused.');
        this.stopStreamOnly();
      }
    }, 1000);
  }

  private stopFreezeMonitor(): void {
    if (this.freezeTimerId !== null) {
      window.clearInterval(this.freezeTimerId);
      this.freezeTimerId = null;
    }
  }

  private handleInterruption(reason: string): void {
    this.stopStreamOnly();
    this.setStatus('interrupted', reason);
    this.callbacks.onError('Camera stopped. Assistance unavailable.');
  }

  private stopStreamOnly(): void {
    this.stopFreezeMonitor();
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.onended = null;
        track.onmute = null;
        track.stop();
      }
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  stop(): void {
    this.stopStreamOnly();
    this.video = null;
    this.cameraInfo = { facingMode: 'unknown', width: 0, height: 0 };
    if (this.status !== 'idle') {
      this.setStatus('idle');
    }
  }
}
