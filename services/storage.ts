// services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultLeisureItems = [
  { id: 1, name: '30min Gaming', cost: 5, icon: '🎮', description: 'Enjoy 30 minutes of gaming time' },
  { id: 2, name: 'Movie Night', cost: 10, icon: '🎬', description: 'Watch your favorite movie' },
  { id: 3, name: 'Dessert Treat', cost: 7.5, icon: '🍰', description: 'Indulge in a sweet treat' },
  { id: 4, name: 'Social Outing', cost: 15, icon: '🎉', description: 'Hang out with friends' },
  { id: 5, name: 'Hobby Time', cost: 8, icon: '🎨', description: 'Spend time on your favorite hobby' },
  { id: 6, name: 'Rest Day', cost: 20, icon: '😴', description: 'Take a well-deserved rest day' },
  { id: 7, name: 'Shopping Spree', cost: 25, icon: '🛍️', description: 'Treat yourself to some shopping' },
  { id: 8, name: 'Extra Sleep', cost: 6, icon: '🌙', description: 'Sleep in an extra hour' },
];

interface StorageInterface {
  get(key: string, defaultValue?: any): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  initializeDefaults(): Promise<void>;
}

class Storage implements StorageInterface {
  async get(key: string, defaultValue: any = null): Promise<any> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return defaultValue;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

async initializeDefaults(): Promise<void> {
  try {
    // Check if this is the first launch
    const isInitialized = await this.get('isInitialized', false);

    if (!isInitialized) {
      console.log('First launch detected, initializing empty storage...');

      // Initialize with empty arrays/objects
      await this.set('events', []);
      await this.set('goals', []);
      await this.set('weeklyFactors', {});
      await this.set('dailyTasks', []);
      await this.set('leisurePoints', 0);
      await this.set('purchaseHistory', []);

      // ✅ Newly added defaults
      await this.set('leisureItems', defaultLeisureItems);
      await this.set('purchases', []);
      await this.set('taskReminders', []);

      await this.set('isInitialized', true);

      console.log('Storage initialized successfully with empty data!');
    } else {
      console.log('App already initialized, loading existing data...');
    }
  } catch (error) {
    console.error('Error initializing defaults:', error);
  }
}


  // Helper method to reset all data (useful for testing)
  async resetToDefaults(): Promise<void> {
    try {
      await this.clear();
      await this.initializeDefaults();
      console.log('Storage reset to defaults successfully!');
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      throw error;
    }
  }

  // Get all storage keys (for debugging)
  async getAllKeys(): Promise<string[]> {
    try {
      return [...await AsyncStorage.getAllKeys()];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // Get all data (for debugging/export)
  async getAllData(): Promise<Record<string, any>> {
    try {
      const keys = await this.getAllKeys();
      const data: Record<string, any> = {};
      
      for (const key of keys) {
        data[key] = await this.get(key);
      }
      
      return data;
    } catch (error) {
      console.error('Error getting all data:', error);
      return {};
    }
  }
}

export const storage = new Storage();

// Initialize defaults on import
storage.initializeDefaults().catch(console.error);