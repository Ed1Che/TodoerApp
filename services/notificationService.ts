// services/notificationService.ts
// Updated:
// ✅ Fixed Expo notification errors
// ✅ Added persistent "appear on top" notifications
// ✅ Added Snooze + Complete actions
// ✅ Handles notification responses properly
// ✅ Fixed Android sticky notification config
// ✅ Removed invalid properties causing TS/runtime errors
// ✅ ADDED: Specialized isolation for today's generated task notification refresh

import * as BackgroundFetch from 'expo-background-fetch';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { storage } from './storage';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';
const NOTIFICATION_CHECK_INTERVAL = 15 * 60;

// Notification action identifiers
const SNOOZE_ACTION = 'SNOOZE_ACTION';
const COMPLETE_ACTION = 'COMPLETE_ACTION';

/* =====================================================
   Notification Handler
===================================================== */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,

    // iOS
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* =====================================================
   Types
===================================================== */
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
  scheduledDate?: string; // Expecting ISO string or YYYY-MM-DD
  completed?: boolean;
}

/* =====================================================
   Service
===================================================== */
class NotificationService {
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /* =====================================================
     Initialize
  ===================================================== */
  private async initialize() {
    if (this.initialized) return;

    try {
      // Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('task-reminders', {
          name: 'Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
          sound: 'default',
          showBadge: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        await Notifications.setNotificationChannelAsync('urgent-reminders', {
          name: 'Urgent Task Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          enableVibrate: true,
          sound: 'default',
          showBadge: true,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // Notification categories (buttons/actions)
      await Notifications.setNotificationCategoryAsync('task-actions', [
        {
          identifier: SNOOZE_ACTION,
          buttonTitle: 'Snooze 5m',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: COMPLETE_ACTION,
          buttonTitle: 'Complete',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      this.setupActionHandler();
      await this.registerBackgroundTask();
      this.initialized = true;
    } catch (error) {
      console.error('Notification init error:', error);
    }
  }

  /* =====================================================
     Permissions
  ===================================================== */
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /* =====================================================
     Background Task
  ===================================================== */
  private async registerBackgroundTask() {
    try {
      const isDefined = TaskManager.isTaskDefined(
        BACKGROUND_NOTIFICATION_TASK
      );

      if (!isDefined) {
        TaskManager.defineTask(
          BACKGROUND_NOTIFICATION_TASK,
          async () => {
            try {
              await this.checkAndSendUpcomingReminders();
              return BackgroundFetch.BackgroundFetchResult.NewData;
            } catch (error) {
              console.error('Background task error:', error);
              return BackgroundFetch.BackgroundFetchResult.Failed;
            }
          }
        );
      }

      const isRegistered =
        await TaskManager.isTaskRegisteredAsync(
          BACKGROUND_NOTIFICATION_TASK
        );

      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(
          BACKGROUND_NOTIFICATION_TASK,
          {
            minimumInterval: NOTIFICATION_CHECK_INTERVAL,
            stopOnTerminate: false,
            startOnBoot: true,
          }
        );
      }
    } catch (error) {
      console.error('Register background task error:', error);
    }
  }

  /* =====================================================
     Reminder Checker
  ===================================================== */
  private async checkAndSendUpcomingReminders() {
    const tasks: ToDayTask[] =
      await storage.get('dailyTasks', []);

    const now = new Date();

    for (const task of tasks) {
      if (task.completed || !task.startTime) continue;

      const taskTime =
        this.parseTimeToDate(task.startTime);

      const minutesUntil = Math.floor(
        (taskTime.getTime() - now.getTime()) /
          (1000 * 60)
      );

      if (minutesUntil > 0 && minutesUntil <= 15) {
        const remindedKey =
          `reminded_${task.id}_${task.startTime}`;

        const hasReminded =
          await storage.get(remindedKey, false);

        if (!hasReminded) {
          await this.sendImmediateReminder(
            task.name,
            task.duration,
            minutesUntil
          );

          await storage.set(remindedKey, true);
        }
      }
    }
  }

  /* =====================================================
     Immediate Reminder
  ===================================================== */
  private async sendImmediateReminder(
    taskName: string,
    duration: number,
    minutesUntil: number
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Upcoming Task',
        body: `"${taskName}" starts in ${minutesUntil} minute${
          minutesUntil !== 1 ? 's' : ''
        }${duration ? ` (${duration}m)` : ''}`,

        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'task-actions',
        sticky: true,
        data: {
          taskName,
          duration,
          type: 'reminder',
        },
      },
      trigger: null,
    });
  }

  /* =====================================================
     Main Task Reminder
  ===================================================== */
  async scheduleTaskReminder(
    taskName: string,
    taskDuration: number,
    scheduledTime: Date,
    source: TaskReminder['source'] = 'manual',
    reminderMinutesBefore?: number
  ): Promise<string | null> {
    if (!(await this.requestPermissions())) {
      return null;
    }

    if (scheduledTime <= new Date()) {
      console.log(
        `[NotificationService] Skipped overdue task: ${taskName}`
      );
      return null;
    }

    // Pre-reminder
    if (
      reminderMinutesBefore &&
      reminderMinutesBefore > 0
    ) {
      const reminderTime = new Date(
        scheduledTime.getTime() -
          reminderMinutesBefore * 60000
      );

      if (reminderTime > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 Upcoming Task',
            body: `"${taskName}" in ${reminderMinutesBefore} min`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'task-actions',
            sticky: true,
            data: {
              taskName,
              taskDuration,
              source,
              type: 'reminder',
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
          },
        });
      }
    }

    // Main notification
    const notificationId =
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Time',
          body: `${taskName}${
            taskDuration
              ? ` (${taskDuration} min)`
              : ''
          }`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'task-actions',
          sticky: true,
          data: {
            taskName,
            taskDuration,
            source,
            type: 'task',
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledTime,
        },
      });

    const reminders: TaskReminder[] =
      await storage.get('taskReminders', []);

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

  /* =====================================================
     Handle Notification Actions
  ===================================================== */
  private setupActionHandler() {
    Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data ?? {};

        const taskName =
          typeof data.taskName === 'string'
            ? data.taskName
            : '';

        // Snooze
        if (actionId === SNOOZE_ACTION) {
          const snoozeTime = new Date(
            Date.now() + 5 * 60 * 1000
          );

          await Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Snoozed Task',
              body: `${taskName} reminder again in 5 minutes`,
              sound: 'default',
              categoryIdentifier: 'task-actions',
              sticky: true,
              data,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: snoozeTime,
            },
          });

          console.log(`Snoozed: ${taskName}`);
        }

        // Complete
        if (actionId === COMPLETE_ACTION) {
          const tasks: ToDayTask[] =
            await storage.get('dailyTasks', []);

          const updatedTasks = tasks.map((task) =>
            task.name === taskName
              ? { ...task, completed: true }
              : task
          );

          await storage.set(
            'dailyTasks',
            updatedTasks
          );

          console.log(`Completed: ${taskName}`);
        }
      }
    );
  }

  /* =====================================================
     Utilities
  ===================================================== */
  private parseTimeToDate(
    time: string,
    baseDate?: Date
  ): Date {
    if (time.includes('T')) {
      return new Date(time);
    }

    const [h, m, s = '0'] = time.split(':');
    const date = new Date(baseDate ?? new Date());
    date.setHours(+h, +m, +s, 0);
    return date;
  }

  isOverdue(startTime: string): boolean {
    const taskDate =
      this.parseTimeToDate(startTime);

    return taskDate < new Date();
  }

  /* =====================================================
     To-Day Integration
  ===================================================== */
  
  /**
   * Refreshes reminders ONLY for tasks scheduled for today.
   * Clears old automated 'to-day' tasks, then schedules today's explicit tasks.
   */
  async refreshTodayOnlyReminders(): Promise<void> {
    if (!(await this.requestPermissions())) {
      return;
    }

    try {
      const tasks: ToDayTask[] = await storage.get('dailyTasks', []);
      
      // Clear existing automated to-day reminders first
      await this.cancelRemindersBySource('to-day');

      const now = new Date();
      const todayString = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      for (const task of tasks) {
        if (task.completed || !task.startTime) continue;

        // Isolate logic strictly for today's generated task calendar date
        const taskScheduledDateStr = task.scheduledDate 
          ? new Date(task.scheduledDate).toISOString().split('T')[0]
          : todayString; // Default to today if omitted

        if (taskScheduledDateStr !== todayString) {
          continue; // Skips tasks assigned to any other day
        }

        const taskDate = this.parseTimeToDate(
          task.startTime,
          task.scheduledDate ? new Date(task.scheduledDate) : undefined
        );

        if (taskDate <= now) continue; // Skip if already passed

        // Schedule notification for today's task
        await this.scheduleTaskReminder(
          task.name,
          task.duration,
          taskDate,
          'to-day',
          5
        );
      }
    } catch (error) {
      console.error('Refresh today-only reminders error:', error);
    }
  }

  async refreshToDayReminders(): Promise<void> {
    // Falls back to global routine or call the scoped variant depending on intent
    await this.refreshTodayOnlyReminders();
  }

  async scheduleFromToDaySection() {
    await this.refreshTodayOnlyReminders();
  }

  /* =====================================================
     Cancel Operations
  ===================================================== */
  async cancelRemindersBySource(source: string) {
    const reminders: TaskReminder[] =
      await storage.get('taskReminders', []);

    const remaining: TaskReminder[] = [];

    for (const reminder of reminders) {
      if (
        reminder.source === source &&
        reminder.notificationId
      ) {
        try {
          await Notifications.cancelScheduledNotificationAsync(
            reminder.notificationId
          );
        } catch (error) {
          console.error(
            'Cancel notification error:',
            error
          );
        }
      } else {
        remaining.push(reminder);
      }
    }

    await storage.set(
      'taskReminders',
      remaining
    );
  }

  async cancelAllReminders() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await storage.set('taskReminders', []);
  }

  async getPendingNotifications() {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /* =====================================================
     Test Notification
  ===================================================== */
  async sendTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Notifications Working',
        body: 'Persistent notifications are active',
        sound: 'default',
        categoryIdentifier: 'task-actions',
        sticky: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  }

  /* =====================================================
     Listeners
  ===================================================== */
  setupListeners(
    onReceive?: (
      n: Notifications.Notification
    ) => void,

    onResponse?: (
      r: Notifications.NotificationResponse
    ) => void
  ) {
    this.notificationListener?.remove();
    this.responseListener?.remove();

    if (onReceive) {
      this.notificationListener =
        Notifications.addNotificationReceivedListener(
          onReceive
        );
    }

    if (onResponse) {
      this.responseListener =
        Notifications.addNotificationResponseReceivedListener(
          onResponse
        );
    }
  }

  removeListeners() {
    this.notificationListener?.remove();
    this.responseListener?.remove();
  }
}

export const notificationService =
  new NotificationService();