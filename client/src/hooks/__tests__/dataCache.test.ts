import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFromCache, saveToCache } from '@/hooks/useDataCache';

class FakeIDBRequest {
  onsuccess: ((this: IDBRequest, ev: Event) => any) | null = null;
  onerror: ((this: IDBRequest, ev: Event) => any) | null = null;
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => any) | null = null;
  result: any;
  error: any = null;
}

const createFakeIndexedDB = () => {
  const dbData = new Map<string, any>();

  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore: () => undefined,
    close: () => undefined,
    transaction: () => {
      const tx = {
        oncomplete: null as any,
        onerror: null as any,
        objectStore: () => ({
        put: (value: any) => {
          dbData.set(value.key, value);
        },
        get: (key: string) => {
          const req = new FakeIDBRequest();
          queueMicrotask(() => {
            req.result = dbData.get(key);
            req.onsuccess?.call(req as any, {} as Event);
          });
          return req;
        },
        delete: (key: string) => {
          dbData.delete(key);
        },
        }),
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
  };

  return {
    open: () => {
      const req = new FakeIDBRequest();
      queueMicrotask(() => {
        req.result = db;
        req.onupgradeneeded?.call(req as any, {} as IDBVersionChangeEvent);
        req.onsuccess?.call(req as any, {} as Event);
      });
      return req;
    },
  };
};

describe('useDataCache', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB());
  });

  it('preserva goals/pedidos/result no save/load com payload enxuto', async () => {
    await saveToCache({
      result: { records: [{ oppId: '1' }] },
      oppFileName: 'opp.csv',
      actFileName: 'act.csv',
      oppCount: 1,
      actCount: 1,
      goals: [{ produto: 'x', idUsuario: '1', rubrica: 'Setup + Licenças', marco: 100 } as any],
      pedidos: [{ idOportunidade: '1', dataFechamento: '01/03/2025' } as any],
    });

    const cached = await loadFromCache();
    expect(cached).not.toBeNull();
    expect(cached?.result.records).toHaveLength(1);
    expect(cached?.goals).toHaveLength(1);
    expect(cached?.pedidos).toHaveLength(1);
  });
});
