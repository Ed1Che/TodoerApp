// services/notificationService.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from './storage';



// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

interface TaskReminder {
  id: string;
  taskName: string;
  taskDuration: number; // in minutes
  scheduledTime: Date;
  notificationId?: string;
}

class NotificationService {
  private notificationListener: any;
  private responseListener: any;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('task-reminders', {
        name: 'Task Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  /**
   * Schedule a task reminder
   */
  async scheduleTaskReminder(
    taskName: string,
    taskDuration: number,
    scheduledTime: Date
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE, // Explicitly state the type
        date: scheduledTime,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Reminder',
          body: `Time to: ${taskName} (${taskDuration} min)`,
          data: { 
            taskName, 
            taskDuration,
            type: 'task-reminder',
            action: 'start-task'
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true, // Keeps notification visible
        },
        trigger,
      });

      // Save reminder to storage
      const reminders = await storage.get('taskReminders', []);
      const newReminder: TaskReminder = {
        id: Date.now().toString(),
        taskName,
        taskDuration,
        scheduledTime,
        notificationId,
      };
      reminders.push(newReminder);
      await storage.set('taskReminders', reminders);

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule multiple reminders for a task
   */
  async scheduleRepeatingReminders(
    taskName: string,
    taskDuration: number,
    times: Date[]
  ): Promise<string[]> {
    const ids: string[] = [];
    
    for (const time of times) {
      const id = await this.scheduleTaskReminder(taskName, taskDuration, time);
      if (id) ids.push(id);
    }

    return ids;
  }

  /**
   * Cancel a specific reminder
   */
  async cancelReminder(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      
      // Remove from storage
      const reminders = await storage.get('taskReminders', []);
      const updated = reminders.filter((r: TaskReminder) => r.notificationId !== notificationId);
      await storage.set('taskReminders', updated);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all reminders
   */
  async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await storage.set('taskReminders', []);
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled reminders
   */
  async getAllScheduledReminders(): Promise<TaskReminder[]> {
    try {
      return await storage.get('taskReminders', []);
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  }

  /**
   * Schedule daily goal reminders based on preferred time
   */
  async scheduleDailyGoalReminders(
    goalName: string,
    preferredTime: 'morning' | 'evening' | 'night',
    duration: number
  ): Promise<void> {
    const times: Date[] = [];
    const now = new Date();

    // Schedule for next 7 days
    for (let i = 1; i <= 7; i++) {
      const reminderDate = new Date(now);
      reminderDate.setDate(now.getDate() + i);

      // Set time based on preference
      if (preferredTime === 'morning') {
        reminderDate.setHours(7, 0, 0, 0);
      } else if (preferredTime === 'evening') {
        reminderDate.setHours(18, 0, 0, 0);
      } else {
        reminderDate.setHours(20, 0, 0, 0);
      }

      times.push(reminderDate);
    }

    await this.scheduleRepeatingReminders(goalName, duration, times);
  }

  /**
   * Schedule event reminder
   */
  async scheduleEventReminder(
    eventTitle: string,
    eventDate: Date,
    repetitionCount: number
  ): Promise<void> {
    const times: Date[] = [];

    // Schedule reminders before the event
    for (let i = repetitionCount; i > 0; i--) {
      const reminderDate = new Date(eventDate);
      reminderDate.setDate(eventDate.getDate() - i);
      reminderDate.setHours(9, 0, 0, 0); // 9 AM reminder
      times.push(reminderDate);
    }

    // Day-of reminder
    const dayOfReminder = new Date(eventDate);
    dayOfReminder.setHours(8, 0, 0, 0);
    times.push(dayOfReminder);

    await this.scheduleRepeatingReminders(eventTitle, 0, times);
  }

  /**
   * Setup notification listeners
   */
  setupListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    // Clean up existing listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);

    // Notification tapped/interacted with
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  }

  /**
   * Remove listeners
   */
  removeListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Get all pending notifications (for debugging)
   */
  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Clear all badge count
   */
  async clearBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}

export const notificationService = new NotificationService();
