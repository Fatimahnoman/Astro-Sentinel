import type {
  BlackBoxLog,
  ConnectivityMode,
  DsnSyncResult,
} from '../types/telemetry';

const STORAGE_KEY = 'astro_sentinel_blackbox_logs';
const MAX_LOGS = 500;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidLog(value: unknown): value is BlackBoxLog {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.type === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.synced === 'boolean'
  );
}

function clonePayload(payload: unknown): unknown {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(payload);
    } catch {
      return payload;
    }
  }

  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return payload;
  }
}

function readQueue(): BlackBoxLog[] {
  const storage = getStorage();

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      storage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed.filter(isValidLog);
  } catch {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      return [];
    }

    return [];
  }
}

function writeQueue(logs: BlackBoxLog[]): boolean {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  const capped = logs.slice(0, MAX_LOGS);

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(capped));
    return true;
  } catch {
    const trimmed = capped.slice(0, Math.floor(capped.length / 2));

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch {
      return false;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function saveLogToBlackBox(
  entry: Omit<BlackBoxLog, 'id' | 'timestamp' | 'synced'>
): BlackBoxLog | null {
  if (!getStorage()) {
    return null;
  }

  const record: BlackBoxLog = {
    id: makeId(),
    type: entry.type,
    timestamp: new Date().toISOString(),
    payload: clonePayload(entry.payload),
    synced: false,
  };

  const nextQueue = [record, ...readQueue()].slice(0, MAX_LOGS);

  if (!writeQueue(nextQueue)) {
    return null;
  }

  return record;
}

export function getBlackBoxLogs(): BlackBoxLog[] {
  return readQueue().map((log) => ({
    ...log,
    payload: clonePayload(log.payload),
  }));
}

export async function syncLogsWithEarthDSN(
  mode: ConnectivityMode
): Promise<DsnSyncResult> {
  if (!getStorage()) {
    return {
      status: 'QUEUED',
      mode,
      syncedCount: 0,
      pendingCount: 0,
      timestamp: new Date().toISOString(),
      message: 'Black box storage unavailable (SSR).',
    };
  }

  const currentLogs = readQueue();
  const pendingCount = currentLogs.filter((log) => !log.synced).length;

  if (mode === 'OFFLINE_EDGE') {
    return {
      status: 'OFFLINE',
      mode,
      syncedCount: 0,
      pendingCount,
      timestamp: new Date().toISOString(),
      message: 'Offline: logs retained in the black box queue.',
    };
  }

  try {
    await delay(700);

    const latestLogs = readQueue();
    let syncedCount = 0;

    const updatedLogs = latestLogs.map((log) => {
      if (log.synced) {
        return log;
      }

      syncedCount += 1;
      return { ...log, synced: true };
    });

    if (!writeQueue(updatedLogs)) {
      throw new Error('Unable to persist DSN sync state.');
    }

    return {
      status: 'SYNCED',
      mode,
      syncedCount,
      pendingCount: updatedLogs.filter((log) => !log.synced).length,
      timestamp: new Date().toISOString(),
      message:
        'Deep Space Network relay acknowledged the black box logs.',
    };
  } catch {
    return {
      status: 'ERROR',
      mode,
      syncedCount: 0,
      pendingCount: readQueue().filter((log) => !log.synced).length,
      timestamp: new Date().toISOString(),
      message: 'DSN sync failed; logs retained locally.',
    };
  }
}
