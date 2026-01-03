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
  taskDuration: number;
  scheduledTime: Date;
  notificationId?: string;
  source?: 'to-day' | 'manual' | 'goal' | 'event';
}

interface ToDayTask {
  id: string;
  name: string;
  duration: number;
  startTime?: string; // Format: "HH:mm" or ISO string
  endTime?: string;
  scheduledDate?: string; // ISO date string
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
   * Parse time string to Date object
   * Accepts formats: "HH:mm", "HH:mm:ss", or ISO string
   */
  private parseTimeToDate(timeString: string, baseDate?: Date): Date {
    const base = baseDate || new Date();
    
    // If it's an ISO string, parse directly
    if (timeString.includes('T') || timeString.includes('Z')) {
      return new Date(timeString);
    }

    // Parse HH:mm or HH:mm:ss format
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

    const scheduledDate = new Date(base);
    scheduledDate.setHours(hours, minutes, seconds, 0);

    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate < new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }

    return scheduledDate;
  }

  /**
   * Schedule reminders for To-Day section tasks
   * Reads tasks from storage and schedules notifications based on their times
   */
  async scheduleFromToDaySection(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return;
      }

      // Get to-day tasks from storage (adjust key based on your storage structure)
      const toDayTasks: ToDayTask[] = await storage.get('dailyTasks', []);
      
      if (!toDayTasks || toDayTasks.length === 0) {
        console.log('No to-day tasks found');
        return;
      }

      // Cancel existing to-day reminders before scheduling new ones
      await this.cancelRemindersBySource('to-day');

      let scheduledCount = 0;

      for (const task of toDayTasks) {
        // Only schedule if task has a start time
        if (task.startTime) {
          const scheduledTime = this.parseTimeToDate(
            task.startTime,
            task.scheduledDate ? new Date(task.scheduledDate) : undefined
          );

          // Only schedule future notifications
          if (scheduledTime > new Date()) {
            const notificationId = await this.scheduleTaskReminder(
              task.name,
              task.duration,
              scheduledTime,
              'to-day'
            );

            if (notificationId) {
              scheduledCount++;
              console.log(`Scheduled reminder for "${task.name}" at ${scheduledTime.toLocaleString()}`);
            }
          }
        }
      }

      console.log(`Successfully scheduled ${scheduledCount} to-day reminders`);
    } catch (error) {
      console.error('Error scheduling to-day reminders:', error);
    }
  }

  /**
   * Schedule a task reminder with source tracking
   */
  async scheduleTaskReminder(
    taskName: string,
    taskDuration: number,
    scheduledTime: Date,
    source: 'to-day' | 'manual' | 'goal' | 'event' = 'manual'
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Don't schedule past notifications
      if (scheduledTime <= new Date()) {
        console.log(`Skipping past notification for ${taskName}`);
        return null;
      }

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: source === 'to-day' ? '📅 To-Day Task Reminder' : '⏰ Task Reminder',
          body: `Time to: ${taskName}${taskDuration > 0 ? ` (${taskDuration} min)` : ''}`,
          data: { 
            taskName, 
            taskDuration,
            type: 'task-reminder',
            action: 'start-task',
            source
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
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
        source,
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
   * Cancel reminders by source type
   */
  async cancelRemindersBySource(source: string): Promise<void> {
    try {
      const reminders = await storage.get('taskReminders', []);
      const remindersToCancel = reminders.filter((r: TaskReminder) => r.source === source);
      
      for (const reminder of remindersToCancel) {
        if (reminder.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        }
      }

      // Keep only reminders from other sources
      const remainingReminders = reminders.filter((r: TaskReminder) => r.source !== source);
      await storage.set('taskReminders', remainingReminders);
      
      console.log(`Canceled ${remindersToCancel.length} reminders from source: ${source}`);
    } catch (error) {
      console.error('Error canceling reminders by source:', error);
    }
  }

  /**
   * Schedule multiple reminders for a task
   */
  async scheduleRepeatingReminders(
    taskName: string,
    taskDuration: number,
    times: Date[],
    source: 'to-day' | 'manual' | 'goal' | 'event' = 'manual'
  ): Promise<string[]> {
    const ids: string[] = [];
    
    for (const time of times) {
      const id = await this.scheduleTaskReminder(taskName, taskDuration, time, source);
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
   * Get reminders by source
   */
  async getRemindersBySource(source: string): Promise<TaskReminder[]> {
    try {
      const allReminders = await storage.get('taskReminders', []);
      return allReminders.filter((r: TaskReminder) => r.source === source);
    } catch (error) {
      console.error('Error getting reminders by source:', error);
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

    for (let i = 1; i <= 7; i++) {
      const reminderDate = new Date(now);
      reminderDate.setDate(now.getDate() + i);

      if (preferredTime === 'morning') {
        reminderDate.setHours(7, 0, 0, 0);
      } else if (preferredTime === 'evening') {
        reminderDate.setHours(18, 0, 0, 0);
      } else {
        reminderDate.setHours(20, 0, 0, 0);
      }

      times.push(reminderDate);
    }

    await this.scheduleRepeatingReminders(goalName, duration, times, 'goal');
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

    for (let i = repetitionCount; i > 0; i--) {
      const reminderDate = new Date(eventDate);
      reminderDate.setDate(eventDate.getDate() - i);
      reminderDate.setHours(9, 0, 0, 0);
      times.push(reminderDate);
    }

    const dayOfReminder = new Date(eventDate);
    dayOfReminder.setHours(8, 0, 0, 0);
    times.push(dayOfReminder);

    await this.scheduleRepeatingReminders(eventTitle, 0, times, 'event');
  }

  /**
   * Setup notification listeners
   */
  setupListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    this.notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
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

  /**
   * Refresh to-day reminders (call this when to-day tasks are updated)
   */
  async refreshToDayReminders(): Promise<void> {
    await this.scheduleFromToDaySection();
  }
}

export const notificationService = new NotificationService();