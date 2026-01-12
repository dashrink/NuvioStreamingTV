/**
 * MMKV Storage Service
 *
 * Wrapper for MMKV storage (react-native-mmkv)
 * Provides async interface for storing and retrieving data
 *
 * MMKV is a high-performance key-value storage framework
 * that's faster than AsyncStorage.
 */

// In-memory storage fallback for development/testing when MMKV is not available
const inMemoryStorage = new Map<string, string>();

/**
 * MMKV Storage interface
 */
export interface MMKVStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

// Try to import MMKV - will be undefined if not installed
let MMKV: any;
let mmkvInstance: any;
try {
  // @ts-ignore - dynamic import
  MMKV = require('react-native-mmkv').MMKV;
  if (MMKV) {
    mmkvInstance = new MMKV();
    console.log('[MMKVStorage] ✅ Using react-native-mmkv for persistent storage');
  }
} catch (error) {
  console.warn('[MMKVStorage] ⚠️  react-native-mmkv not available, falling back to in-memory storage');
  console.warn('[MMKVStorage] 🔴 WARNING: Profile data will NOT persist across app restarts!');
  console.warn('[MMKVStorage] 📦 Install react-native-mmkv: npm install react-native-mmkv');
}

/**
 * MMKV Storage implementation
 * Automatically uses react-native-mmkv if available, falls back to in-memory storage
 */
class MMKVStorageService implements MMKVStorage {
  private storage: Map<string, string> | any;
  private isUsingMMKV: boolean;

  constructor() {
    if (mmkvInstance) {
      // Use actual MMKV for persistent storage
      this.storage = mmkvInstance;
      this.isUsingMMKV = true;
    } else {
      // Fallback to in-memory storage (data will NOT persist)
      this.storage = inMemoryStorage;
      this.isUsingMMKV = false;
    }
  }

  /**
   * Store a value
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isUsingMMKV) {
        // MMKV API: storage.set(key, value)
        this.storage.set(key, value);
      } else {
        // Map API: storage.set(key, value)
        this.storage.set(key, value);
      }
    } catch (error) {
      console.error('[MMKVStorage] Error setting item:', error);
      throw error;
    }
  }

  /**
   * Retrieve a value
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isUsingMMKV) {
        // MMKV API: storage.getString(key) returns string | undefined
        return this.storage.getString(key) || null;
      } else {
        // Map API: storage.get(key) returns value | undefined
        return this.storage.get(key) || null;
      }
    } catch (error) {
      console.error('[MMKVStorage] Error getting item:', error);
      return null;
    }
  }

  /**
   * Remove a value
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (this.isUsingMMKV) {
        // MMKV API: storage.delete(key)
        this.storage.delete(key);
      } else {
        // Map API: storage.delete(key)
        this.storage.delete(key);
      }
    } catch (error) {
      console.error('[MMKVStorage] Error removing item:', error);
      throw error;
    }
  }

  /**
   * Get all keys
   */
  async getAllKeys(): Promise<string[]> {
    try {
      if (this.isUsingMMKV) {
        // MMKV API: storage.getAllKeys() returns string[]
        return this.storage.getAllKeys();
      } else {
        // Map API: storage.keys() returns iterator
        return Array.from(this.storage.keys());
      }
    } catch (error) {
      console.error('[MMKVStorage] Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      if (this.isUsingMMKV) {
        // MMKV API: storage.clearAll()
        this.storage.clearAll();
      } else {
        // Map API: storage.clear()
        this.storage.clear();
      }
    } catch (error) {
      console.error('[MMKVStorage] Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get all items (for debugging)
   */
  async getAllItems(): Promise<Record<string, string>> {
    const items: Record<string, string> = {};
    try {
      if (this.isUsingMMKV) {
        // MMKV: Get all keys and retrieve each value
        const keys = this.storage.getAllKeys();
        for (const key of keys) {
          const value = this.storage.getString(key);
          if (value) {
            items[key] = value;
          }
        }
      } else {
        // Map: Iterate entries
        for (const [key, value] of this.storage.entries()) {
          items[key] = value;
        }
      }
    } catch (error) {
      console.error('[MMKVStorage] Error getting all items:', error);
    }
    return items;
  }
}

// Export singleton instance
export const mmkvStorage = new MMKVStorageService();

export default mmkvStorage;
