import type { PedidoCRM } from '@/types/goals';

const DB_NAME = 'pipeline-analytics-cache';
const DB_VERSION = 1;
const STORE_NAME = 'processed-data';
const CACHE_KEY = 'last-upload';
const CACHE_SCHEMA_VERSION = 4;

export interface CacheEntry {
  key: string;
  schemaVersion: number;
  result: unknown;
  timestamp: number;
  oppFileName: string;
  actFileName: string;
  oppCount: number;
  actCount: number;
  pedidoFileName?: string;
  pedidos: PedidoCRM[];
  selectedPeriod?: string;
}

interface LegacyCacheEntry {
  key: string;
  schemaVersion?: number;
  result: unknown;
  timestamp: number;
  oppFileName?: string;
  actFileName?: string;
  oppCount?: number;
  actCount?: number;
  pedidoFileName?: string;
  pedidos?: PedidoCRM[];
  selectedPeriod?: string;
}

export interface SaveToCacheInput {
  result: unknown;
  oppFileName: string;
  actFileName: string;
  oppCount: number;
  actCount: number;
  pedidoFileName?: string;
  pedidos: PedidoCRM[];
  selectedPeriod?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const toCurrentEntry = (entry: LegacyCacheEntry | CacheEntry): CacheEntry => ({
  key: entry.key,
  schemaVersion: CACHE_SCHEMA_VERSION,
  result: entry.result,
  timestamp: entry.timestamp,
  oppFileName: entry.oppFileName || '',
  actFileName: entry.actFileName || '',
  oppCount: entry.oppCount || 0,
  actCount: entry.actCount || 0,
  pedidoFileName: entry.pedidoFileName,
  pedidos: Array.isArray(entry.pedidos) ? entry.pedidos : [],
  selectedPeriod: entry.selectedPeriod,
});

export async function saveToCache(input: SaveToCacheInput): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const entry: CacheEntry = {
    key: CACHE_KEY,
    schemaVersion: CACHE_SCHEMA_VERSION,
    result: input.result,
    timestamp: Date.now(),
    oppFileName: input.oppFileName,
    actFileName: input.actFileName,
    oppCount: input.oppCount,
    actCount: input.actCount,
    pedidoFileName: input.pedidoFileName,
    pedidos: input.pedidos,
    selectedPeriod: input.selectedPeriod,
  };

  store.put(entry);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadFromCache(): Promise<CacheEntry | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(CACHE_KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        const raw = request.result as CacheEntry | LegacyCacheEntry | null;
        resolve(raw ? toCurrentEntry(raw) : null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(CACHE_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getCacheInfo(): Promise<{
  exists: boolean;
  timestamp?: number;
  oppFileName?: string;
  actFileName?: string;
  pedidoFileName?: string;
  oppCount?: number;
  actCount?: number;
} | null> {
  try {
    const entry = await loadFromCache();
    if (!entry) return { exists: false };
    return {
      exists: true,
      timestamp: entry.timestamp,
      oppFileName: entry.oppFileName,
      actFileName: entry.actFileName,
      pedidoFileName: entry.pedidoFileName,
      oppCount: entry.oppCount,
      actCount: entry.actCount,
    };
  } catch {
    return { exists: false };
  }
}
