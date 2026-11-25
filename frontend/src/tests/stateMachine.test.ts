import { describe, it, expect } from 'vitest';
import { canTransition, transitionAppState } from '../app/stateMachine';

describe('App State Machine', () => {
  it('blocks invalid transitions such as idle -> active directly', () => {
    expect(canTransition('idle', 'active')).toBe(false);
    const res = transitionAppState('idle', 'active', {
      cameraRunning: true,
      modelLoaded: true,
      aiInitialized: true,
    });
    expect(res.accepted).toBe(false);
    expect(res.nextState).toBe('idle');
  });

  it('refuses active state if camera or model is not ready', () => {
    const res = transitionAppState('starting_camera', 'active', {
      cameraRunning: false,
      modelLoaded: true,
      aiInitialized: true,
    });
    expect(res.accepted).toBe(false);
    expect(res.nextState).toBe('starting_camera');
  });

  it('allows active state only when camera, model, and AI are ready', () => {
    const res = transitionAppState('starting_camera', 'active', {
      cameraRunning: true,
      modelLoaded: true,
      aiInitialized: true,
    });
    expect(res.accepted).toBe(true);
    expect(res.nextState).toBe('active');
  });
});
