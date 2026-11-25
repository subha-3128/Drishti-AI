export type AppState =
  | 'idle'
  | 'requesting_permission'
  | 'initializing_models'
  | 'starting_camera'
  | 'active'
  | 'paused'
  | 'camera_error'
  | 'model_error'
  | 'processing_error'
  | 'stopping';

export interface ReadinessFlags {
  cameraRunning: boolean;
  modelLoaded: boolean;
  aiInitialized: boolean;
}

const VALID_TRANSITIONS: Record<AppState, readonly AppState[]> = {
  idle: ['requesting_permission', 'initializing_models', 'camera_error', 'model_error'],
  requesting_permission: ['starting_camera', 'initializing_models', 'camera_error', 'idle', 'stopping'],
  initializing_models: ['starting_camera', 'active', 'model_error', 'camera_error', 'stopping', 'idle'],
  starting_camera: ['active', 'initializing_models', 'camera_error', 'model_error', 'stopping', 'idle'],
  active: ['paused', 'stopping', 'camera_error', 'model_error', 'processing_error'],
  paused: ['starting_camera', 'active', 'stopping', 'camera_error', 'idle'],
  camera_error: ['requesting_permission', 'starting_camera', 'idle', 'stopping'],
  model_error: ['initializing_models', 'idle', 'stopping'],
  processing_error: ['active', 'paused', 'stopping', 'idle', 'camera_error', 'model_error'],
  stopping: ['idle'],
};

export function canTransition(from: AppState, to: AppState): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Transitions the app state safely. Never allows entering 'active' unless
 * camera, model, and AI initialization are all confirmed ready.
 */
export function transitionAppState(
  from: AppState,
  to: AppState,
  readiness?: ReadinessFlags
): { nextState: AppState; accepted: boolean; reason?: string } {
  if (!canTransition(from, to)) {
    return {
      nextState: from,
      accepted: false,
      reason: `Invalid state transition from "${from}" to "${to}".`,
    };
  }

  if (to === 'active') {
    if (!readiness || !readiness.cameraRunning || !readiness.modelLoaded || !readiness.aiInitialized) {
      return {
        nextState: from,
        accepted: false,
        reason: 'Cannot mark assistance active until camera, model, and AI runtime are all ready.',
      };
    }
  }

  return { nextState: to, accepted: true };
}
