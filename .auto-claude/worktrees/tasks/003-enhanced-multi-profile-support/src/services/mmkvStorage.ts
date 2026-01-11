/**
 * MMKV Storage Service
 *
 * Wrapper for MMKV storage (react-native-mmkv)
 * Provides async interface for storing and retrieving data
 *
 * MMKV is a high-performance key-value storage framework
 * that's faster than AsyncStorage.
 */

// In-memory storage for development/testing when MMKV is not available
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

/**
 * MMKV Storage implementation
 */
class MMKVStorageService implements MMKVStorage {
  private storage: Map<string, string>;

  constructor() {
    // Try to use react-native-mmkv if available
    // For now, use in-memory storage for testing
    this.storage = inMemoryStorage;
  }

  /**
   * Store a value
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      this.storage.set(key, value);
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
      return this.storage.get(key) || null;
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
      this.storage.delete(key);
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
      return Array.from(this.storage.keys());
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
      this.storage.clear();
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
    for (const [key, value] of this.storage.entries()) {
      items[key] = value;
    }
    return items;
  }
}

// Export singleton instance
export const mmkvStorage = new MMKVStorageService();

export default mmkvStorage;
