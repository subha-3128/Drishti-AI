export interface ModelManifestEntry {
  id: string;
  name: string;
  version: string;
  task: string;
  url: string;
  fileSizeBytes: number;
  sha256: string;
  source: string;
  license: string;
  inputSize: [number, number];
  runtime: string;
  supportedClasses: string[];
  status: string;
}

export interface ModelManifest {
  manifestVersion: string;
  models: ModelManifestEntry[];
}

const MODEL_CACHE_NAME = 'drishti-models-v1';

export function validateManifest(data: unknown): data is ModelManifest {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<ModelManifest>;
  if (typeof obj.manifestVersion !== 'string' || !Array.isArray(obj.models) || obj.models.length === 0) {
    return false;
  }
  return obj.models.every(
    (m) =>
      m &&
      typeof m.id === 'string' &&
      typeof m.name === 'string' &&
      typeof m.url === 'string' &&
      typeof m.sha256 === 'string' &&
      /^[0-9a-f]{64}$/i.test(m.sha256) &&
      typeof m.fileSizeBytes === 'number' &&
      m.fileSizeBytes > 0
  );
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function loadManifest(url = '/models/model-manifest.json'): Promise<ModelManifest> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch model manifest (${res.status}).`);
  }
  const json: unknown = await res.json();
  if (!validateManifest(json)) {
    throw new Error('Model manifest is invalid or corrupted.');
  }
  return json;
}

export async function isModelCached(modelUrl: string): Promise<boolean> {
  if (!('caches' in window)) return false;
  const cache = await caches.open(MODEL_CACHE_NAME);
  const match = await cache.match(modelUrl);
  return Boolean(match);
}

export async function clearModelCache(): Promise<void> {
  if (!('caches' in window)) return;
  await caches.delete(MODEL_CACHE_NAME);
}

/**
 * Loads the verified model bytes from Cache API if valid, otherwise fetches,
 * verifies SHA-256 integrity, and only then updates the cache.
 */
export async function loadVerifiedModelBytes(entry: ModelManifestEntry): Promise<ArrayBuffer> {
  if ('caches' in window) {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const cached = await cache.match(entry.url);
    if (cached) {
      const buf = await cached.arrayBuffer();
      const digest = await sha256Hex(buf);
      if (buf.byteLength === entry.fileSizeBytes && digest === entry.sha256) {
        return buf;
      }
      // Corrupted cache entry; fall through to re-fetch before deleting.
    }
  }

  let response: Response;
  try {
    response = await fetch(entry.url);
  } catch {
    throw new Error(
      'Model is not cached and device appears offline. Connect to the internet once to cache the AI model.'
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to download AI model (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== entry.fileSizeBytes) {
    throw new Error('AI model size mismatch. Existing cache preserved.');
  }
  const digest = await sha256Hex(buffer);
  if (digest !== entry.sha256) {
    throw new Error('AI model checksum verification failed. Existing cache preserved.');
  }

  if ('caches' in window) {
    const cache = await caches.open(MODEL_CACHE_NAME);
    await cache.put(
      entry.url,
      new Response(buffer.slice(0), {
        headers: { 'Content-Type': 'application/octet-stream' },
      })
    );
  }

  return buffer;
}
