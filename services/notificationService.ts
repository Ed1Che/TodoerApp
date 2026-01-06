// services/notificationService.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { storage } from './storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const NOTIFICATION_CHECK_INTERVAL = 15 * 60; // 15 minutes

/* ============================
   Notification UI Behavior
   ============================ */
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/* ============================
   Types
   ============================ */
interface TaskReminder {
  id: string;
  taskName: string;
  taskDuration: number;
  scheduledTime: Date;
  notificationId?: string;
  source?: 'to-day' | 'manual' | 'goal' | 'event';
  reminderMinutesBefore?: number;
}

interface ToDayTask {
  id: string;
  name: string;
  duration: number;
  startTime?: string;
  scheduledDate?: string;
  completed?: boolean;
}

/* ============================
   Service
   ============================ */
class NotificationService {
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('task-reminders', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Create separate channel for high-priority reminders
        await Notifications.setNotificationChannelAsync('urgent-reminders', {
          name: 'Urgent Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      await this.registerBackgroundTask();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /* ============================
     Background Task Management
     ============================ */
  private async registerBackgroundTask() {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK);
      
      if (!isTaskDefined) {
        TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
          try {
            await this.checkAndSendUpcomingReminders();
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch (error) {
            console.error('Background task error:', error);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_NOTIFICATION_TASK
      );

      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: NOTIFICATION_CHECK_INTERVAL,
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }

  private async checkAndSendUpcomingReminders() {
    const tasks: ToDayTask[] = await storage.get('dailyTasks', []);
    const now = new Date();

    for (const task of tasks) {
      if (task.completed || !task.startTime) continue;

      const taskTime = this.parseTimeToDate(task.startTime);
      const minutesUntil = Math.floor((taskTime.getTime() - now.getTime()) / (1000 * 60));

      // Send reminder if task is 5-15 minutes away and hasn't been reminded yet
      if (minutesUntil > 0 && minutesUntil <= 15) {
        const remindedKey = `reminded_${task.id}_${task.startTime}`;
        const hasReminded = await storage.get(remindedKey, false);

        if (!hasReminded) {
          await this.sendImmediateReminder(task.name, task.duration, minutesUntil);
          await storage.set(remindedKey, true);
        }
      }
    }
  }

  private async sendImmediateReminder(taskName: string, duration: number, minutesUntil: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Upcoming Task',
        body: `"${taskName}" starts in ${minutesUntil} minutes${duration ? ` (${duration}m duration)` : ''}`,
        data: { taskName, type: 'reminder' },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
      },
      trigger: null, // Send immediately
    });
  }

  /* ============================
     Utilities
     ============================ */
  private parseTimeToDate(time: string, baseDate?: Date): Date {
    if (time.includes('T')) return new Date(time);

    const [h, m, s = '0'] = time.split(':');
    const date = new Date(baseDate ?? new Date());
    date.setHours(+h, +m, +s, 0);

    if (date < new Date()) date.setDate(date.getDate() + 1);
    return date;
  }

  /* ============================
     Main Scheduling Logic
     ============================ */
  async scheduleTaskReminder(
    taskName: string,
    taskDuration: number,
    scheduledTime: Date,
    source: TaskReminder['source'] = 'manual',
    reminderMinutesBefore?: number
  ): Promise<string | null> {
    if (!(await this.requestPermissions())) return null;
    if (scheduledTime <= new Date()) return null;

    // Schedule reminder notification if specified
    if (reminderMinutesBefore && reminderMinutesBefore > 0) {
      const reminderTime = new Date(scheduledTime.getTime() - reminderMinutesBefore * 60000);
      
      if (reminderTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 Upcoming Task',
            body: `"${taskName}" in ${reminderMinutesBefore} minutes${taskDuration ? ` (${taskDuration}m duration)` : ''}`,
            data: { taskName, taskDuration, source, type: 'reminder' },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
            channelId: 'urgent-reminders',
          },
        });
      }
    }

    // Schedule main task notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Task Time',
        body: `${taskName}${taskDuration ? ` (${taskDuration} min)` : ''}`,
        data: { taskName, taskDuration, source, type: 'task' },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
        channelId: 'task-reminders',
      },
    });

    const reminders = await storage.get('taskReminders', []);
    reminders.push({
      id: Date.now().toString(),
      taskName,
      taskDuration,
      scheduledTime,
      notificationId,
      source,
      reminderMinutesBefore,
    });

    await storage.set('taskReminders', reminders);
    return notificationId;
  }

  /* ============================
     To-Day Section Integration
     ============================ */
  async refreshToDayReminders(): Promise<void> {
    if (!(await this.requestPermissions())) return;

    try {
      const tasks: ToDayTask[] = await storage.get('dailyTasks', []);
      await this.cancelRemindersBySource('to-day');

      let scheduledCount = 0;

      for (const task of tasks) {
        if (task.completed || !task.startTime) continue;

        const date = this.parseTimeToDate(
          task.startTime,
          task.scheduledDate ? new Date(task.scheduledDate) : undefined
        );

        // Only schedule if in the future
        if (date > new Date()) {
          await this.scheduleTaskReminder(
            task.name, 
            task.duration, 
            date, 
            'to-day',
            5 // 5-minute reminder by default
          );
          scheduledCount++;
        }
      }

      console.log(`Scheduled ${scheduledCount} reminders for To-day tasks`);
    } catch (error) {
      console.error('Error refreshing To-day reminders:', error);
    }
  }

  async scheduleFromToDaySection(): Promise<void> {
    await this.refreshToDayReminders();
  }

  /* ============================
     Cancel / Query Operations
     ============================ */
  async cancelRemindersBySource(source: string) {
    const reminders = await storage.get('taskReminders', []);
    const remaining = [];

    for (const r of reminders) {
      if (r.source === source && r.notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(r.notificationId);
        } catch (error) {
          console.error('Error canceling notification:', error);
        }
      } else {
        remaining.push(r);
      }
    }

    await storage.set('taskReminders', remaining);
  }

  async cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await storage.set('taskReminders', []);
  }

  async getPendingNotifications() {
    return Notifications.getAllScheduledNotificationsAsync();
  }



  /* ============================
     Test Notification
     ============================ */
  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Notifications Working',
        body: 'Your task reminders are set up correctly!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        seconds: 2,
        channelId: 'task-reminders',
      },
    });
  }

  /* ============================
     Listeners
     ============================ */
  setupListeners(
    onReceive?: (n: Notifications.Notification) => void,
    onResponse?: (r: Notifications.NotificationResponse) => void
  ) {
    this.notificationListener?.remove();
    this.responseListener?.remove();

    if (onReceive) {
      this.notificationListener =
        Notifications.addNotificationReceivedListener(onReceive);
    }

    if (onResponse) {
      this.responseListener =
        Notifications.addNotificationResponseReceivedListener(onResponse);
    }
  }

  removeListeners() {
    this.notificationListener?.remove();
    this.responseListener?.remove();
  }
}

export const notificationService = new NotificationService();