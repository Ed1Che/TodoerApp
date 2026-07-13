// services/storage.ts - Updated with Nextcloud keys
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const isInitialized = await this.get('isInitialized', false);

      if (!isInitialized) {
        console.log('First launch detected, initializing empty storage...');

        await this.set('events', []);
        await this.set('eventPrepTasks', []);
        await this.set('goals', []);
        await this.set('weeklyFactors', {});
        await this.set('dailyTasks', []);
        await this.set('leisurePoints', 0);
        await this.set('purchaseHistory', []);
        await this.set('leisureItems', []);
        await this.set('purchases', []);
        await this.set('taskReminders', []);

        // Nextcloud / sync
        await this.set('nc_events', []);
        await this.set('nc_tasks', []);

        await this.set('isInitialized', true);
        console.log('Storage initialized successfully!');
      } else {
        console.log('App already initialized, loading existing data...');
      }
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      await this.clear();
      await this.initializeDefaults();
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

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

storage.initializeDefaults().catch(console.error);