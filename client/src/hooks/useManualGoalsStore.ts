import { useCallback, useEffect, useState } from 'react';
import { ManualGoal } from '@/types/goals';

const DB_NAME = 'manual-goals-db';
const DB_VERSION = 1;
const STORE = 'manual-goals';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listAll(): Promise<ManualGoal[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const req = store.getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      db.close();
      resolve((req.result as ManualGoal[]) || []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function saveMany(items: ManualGoal[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  store.clear();
  items.forEach((item) => store.put(item));
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

export function useManualGoalsStore() {
  const [manualGoals, setManualGoals] = useState<ManualGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listAll()
      .then((goals) => setManualGoals(goals))
      .finally(() => setLoaded(true));
  }, []);

  const persistManualGoals = useCallback(async (next: ManualGoal[]) => {
    await saveMany(next);
    setManualGoals(next);
  }, []);

  return {
    manualGoals,
    setManualGoals,
    persistManualGoals,
    loaded,
  };
}
