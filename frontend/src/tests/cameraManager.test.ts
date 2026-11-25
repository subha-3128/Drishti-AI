import { describe, it, expect, vi } from 'vitest';
import { CameraManager } from '../camera/cameraManager';

describe('CameraManager Lifecycle & Cancellation', () => {
  it('stops acquired tracks and stays idle when aborted during getUserMedia', async () => {
    const stopTrack = vi.fn();
    const controller = new AbortController();

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockImplementation(async () => {
          controller.abort();
          return {
            getVideoTracks: () => [{ stop: stopTrack, getSettings: () => ({ facingMode: 'environment' }) }],
            getTracks: () => [{ stop: stopTrack }],
          };
        }),
      },
    });

    const onError = vi.fn();
    const cam = new CameraManager({
      onStatusChange: vi.fn(),
      onError,
    });

    const fakeVideo = document.createElement('video');
    const started = await cam.start(fakeVideo, controller.signal);

    expect(started).toBe(false);
    expect(stopTrack).toHaveBeenCalled();
    expect(cam.getStatus()).toBe('idle');
    expect(onError).not.toHaveBeenCalled();
  });
});
