import { useState, useEffect, useCallback } from 'react';

// IndexedDB wrapper for offline persistence
class VisualSensoryDB {
  private dbName = 'visualSensoryDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('routines')) {
          const routinesStore = db.createObjectStore('routines', { keyPath: 'id' });
          routinesStore.createIndex('userId', 'userId', { unique: false });
          routinesStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('moodEntries')) {
          const moodStore = db.createObjectStore('moodEntries', { keyPath: 'id' });
          moodStore.createIndex('userId', 'userId', { unique: false });
          moodStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('sensoryPreferences')) {
          const sensoryStore = db.createObjectStore('sensoryPreferences', { keyPath: 'id' });
          sensoryStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('entity', 'entity', { unique: false });
        }
      };
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(storeName: string, indexName?: string, indexValue?: any): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest;
      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addToSyncQueue(item: any): Promise<void> {
    await this.put('syncQueue', {
      ...item,
      timestamp: new Date(),
      id: undefined // Let IndexedDB auto-generate
    });
  }

  async getSyncQueue(): Promise<any[]> {
    return this.getAll('syncQueue');
  }

  async clearSyncQueue(): Promise<void> {
    await this.clear('syncQueue');
  }
}

// Singleton instance
const db = new VisualSensoryDB();

export const useOfflineStorage = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        await db.init();
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize offline storage');
      }
    };

    initDB();
  }, []);

  const storeData = useCallback(async <T>(storeName: string, data: T) => {
    try {
      await db.put(storeName, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to store data');
      throw err;
    }
  }, []);

  const getData = useCallback(async <T>(storeName: string, key: string): Promise<T | null> => {
    try {
      return await db.get<T>(storeName, key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve data');
      throw err;
    }
  }, []);

  const getAllData = useCallback(async <T>(
    storeName: string, 
    indexName?: string, 
    indexValue?: any
  ): Promise<T[]> => {
    try {
      return await db.getAll<T>(storeName, indexName, indexValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve data');
      throw err;
    }
  }, []);

  const deleteData = useCallback(async (storeName: string, key: string) => {
    try {
      await db.delete(storeName, key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
      throw err;
    }
  }, []);

  const addToSyncQueue = useCallback(async (item: any) => {
    try {
      await db.addToSyncQueue(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to sync queue');
      throw err;
    }
  }, []);

  const getSyncQueue = useCallback(async () => {
    try {
      return await db.getSyncQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sync queue');
      throw err;
    }
  }, []);

  const clearSyncQueue = useCallback(async () => {
    try {
      await db.clearSyncQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear sync queue');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Sync status detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isReady,
    isOnline,
    error,
    storeData,
    getData,
    getAllData,
    deleteData,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
    clearError
  };
};

// Hook for automatic offline sync
export const useOfflineSync = (
  syncFunction: () => Promise<void>,
  interval: number = 30000 // 30 seconds
) => {
  const { isOnline, getSyncQueue } = useOfflineStorage();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const performSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      const queue = await getSyncQueue();
      
      if (queue.length > 0) {
        await syncFunction();
        setLastSync(new Date());
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, getSyncQueue, syncFunction]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      performSync();
    }
  }, [isOnline, performSync, isSyncing]);

  // Periodic sync
  useEffect(() => {
    if (!isOnline) return;

    const intervalId = setInterval(performSync, interval);
    return () => clearInterval(intervalId);
  }, [isOnline, performSync, interval]);

  return {
    lastSync,
    isSyncing,
    performSync
  };
};