// app/(tabs)/index.tsx
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import TaskCard from '../components/TaskCard';
import { notificationService } from '../services/notificationService';
import { generateDailySchedule } from '../services/scheduler';
import { storage } from '../services/storage';

export function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [goals, setGoals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, any[]>>({});
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScheduleReminders, setAutoScheduleReminders] = useState(true);
  const [pendingNotificationsCount, setPendingNotificationsCount] = useState(0);

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      await loadData();
      if (autoScheduleReminders) {
        await notificationService.refreshToDayReminders();
      }
    });

    return unsubscribe;
  }, [navigation, autoScheduleReminders]);

  const loadSettings = async () => {
    const setting = await storage.get('autoScheduleReminders', true);
    setAutoScheduleReminders(setting);
  };

  const saveSettings = async (value: boolean) => {
    setAutoScheduleReminders(value);
    await storage.set('autoScheduleReminders', value);
    if (value) {
      await notificationService.refreshToDayReminders();
    }
  };


  const loadData = async () => {
    try {
      const g = await storage.get('goals', []);
      const e = await storage.get('events', []);
      const wf = await storage.get('weeklyFactors', {});
      const dt = await storage.get('dailyTasks', []);
      const lp = await storage.get('leisurePoints', 0);

      setGoals(g || []);
      setEvents(e || []);
      setWeeklyFactors(wf || {});
      setDailyTasks(dt || []);
      setLeisurePoints(lp || 0);

          } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const generate = async () => {
    const schedule = generateDailySchedule(new Date(), goals, weeklyFactors);
    setDailyTasks(schedule);
    await storage.set('dailyTasks', schedule);

    if (autoScheduleReminders) {
      await notificationService.refreshToDayReminders();
    }

    Alert.alert('Generated', `Created ${schedule.length} tasks for today`);
  };

  const handleComplete = async (task: any, proof: string, attachments: string[]) => {
    try {
      const stored = (await storage.get('dailyTasks', [])) || [];
      const updated = stored.map((t: any) =>
        t.id === task.id
          ? { ...t, completed: true, proof, attachments }
          : t
      );

      await storage.set('dailyTasks', updated);
      setDailyTasks(updated);

      const newPoints = leisurePoints + 0.25;
      setLeisurePoints(newPoints);
      await storage.set('leisurePoints', newPoints);

      if (task.type === 'goal-step' && task.goalId != null) {
        const allGoals = (await storage.get('goals', [])) || [];
        const gIndex = allGoals.findIndex((g: any) => g.id === task.goalId);

        if (gIndex !== -1) {
          allGoals[gIndex].steps[task.stepIndex].completed = true;
          const completedCount = allGoals[gIndex].steps.filter(
            (s: any) => s.completed
          ).length;

          allGoals[gIndex].progress = Math.round(
            (completedCount / allGoals[gIndex].steps.length) * 100
          );

          await storage.set('goals', allGoals);
          setGoals(allGoals);
        }
      }

      // Refresh reminders to remove completed task notifications
      if (autoScheduleReminders) {
        await notificationService.refreshToDayReminders();
      }

      Alert.alert(
        'Completed! 🎉',
        `Task marked complete! +0.25 points earned`
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleTaskUpdate = async () => {
    await loadData();
  };

  const testNotifications = async () => {
    await notificationService.sendTestNotification();
    Alert.alert('Test Sent', 'Check your notifications in 2 seconds!');
  };

  const getEventColor = (eventDate: string) => {
    const today = new Date();
    const event = new Date(eventDate);
    const daysUntil = Math.ceil(
      (event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil <= 3) return '#e74c3c';
    if (daysUntil <= 7) return '#e67e22';
    if (daysUntil <= 14) return '#f39c12';
    return '#27ae60';
  };

  const sortEventsByPriority = (events: any[]) => {
    return [...events].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const sortedEvents = sortEventsByPriority(events);
  const incompleteTasks = dailyTasks.filter(t => !t.completed);
  const completedTasks = dailyTasks.filter(t => t.completed);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>To-doer</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Events */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📅 Events</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/events/add')}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sortedEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              <View style={styles.eventRow}>
                {sortedEvents.map(event => (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventCard,
                      { backgroundColor: getEventColor(event.date) },
                    ]}
                    onPress={() => router.push(`/events/${event.id}`)}
                  >
                    <View>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventDate}>
                        {new Date(event.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>P{event.priority}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Today's Tasks */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>✅ To-day</Text>
            <TouchableOpacity onPress={generate} style={styles.generateButton}>
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>

          {incompleteTasks.length > 0 && (
            <View style={styles.taskSection}>
              <Text style={styles.sectionLabel}>Pending ({incompleteTasks.length})</Text>
              <ScrollView style={styles.taskScrollContainer} nestedScrollEnabled>
                {incompleteTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onTaskUpdate={handleTaskUpdate}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {completedTasks.length > 0 && (
            <View style={styles.taskSection}>
              <Text style={styles.sectionLabel}>Completed ({completedTasks.length})</Text>
              <ScrollView style={styles.taskScrollContainer} nestedScrollEnabled>
                {completedTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onTaskUpdate={handleTaskUpdate}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {dailyTasks.length === 0 && (
            <Text style={styles.emptyText}>
              Click Generate to create today's tasks
            </Text>
          )}
        </View>

        {/* Goals */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Goals</Text>
          <View style={styles.goalsGrid}>
            <TouchableOpacity
              style={styles.goalButton}
              onPress={() => router.push('/goals/add')}
            >
              <Text style={styles.goalButtonText}>+ Add Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.goalButton, styles.reviewButton]}
              onPress={() => router.push('/(tabs)/goals')}
            >
              <Text style={styles.goalButtonText}>Review →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/weekly')}
          >
            <Text style={styles.quickActionIcon}>📆</Text>
            <Text style={styles.quickActionText}>Weekly Factor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(tabs)/leisure')}
          >
            <Text style={styles.quickActionIcon}>🛍️</Text>
            <Text style={styles.quickActionText}>Leisure Shop</Text>
            <Text style={styles.pointsText}>
              {leisurePoints.toFixed(2)} pts
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Schedule Reminders</Text>
                <Text style={styles.settingDescription}>
                  Automatically create notifications for To-day tasks
                </Text>
              </View>
              <Switch
                value={autoScheduleReminders}
                onValueChange={saveSettings}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={autoScheduleReminders ? '#007AFF' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity
              style={styles.testButton}
              onPress={testNotifications}
            >
              <Text style={styles.testButtonText}>🔔 Test Notifications</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoSubtext}>
                Reminders appear 5 minutes before task time
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: 'bold' },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsIcon: { fontSize: 24 },
  notificationBanner: {
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notificationBannerText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
    textAlign: 'center',
  },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '600' },
  addButton: { backgroundColor: '#3498db', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontSize: 24 },
  eventRow: { flexDirection: 'row', gap: 12 },
  eventCard: { width: 280, padding: 12, borderRadius: 12 },
  eventTitle: { color: '#fff', fontWeight: '600' },
  eventDate: { color: '#fff', fontSize: 12 },
  priorityBadge: { backgroundColor: 'rgba(255,255,255,0.3)', padding: 6, borderRadius: 8, marginTop: 8 },
  priorityText: { color: '#fff' },
  taskSection: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  taskScrollContainer: { maxHeight: 400 },
  generateButton: { backgroundColor: '#27ae60', padding: 8, borderRadius: 16 },
  generateButtonText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#95a5a6', paddingVertical: 20 },
  goalsGrid: { flexDirection: 'row', gap: 8 },
  goalButton: { flex: 1, backgroundColor: '#9b59b6', padding: 16, borderRadius: 12 },
  reviewButton: { backgroundColor: '#5f27cd' },
  goalButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  quickActionsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  quickActionCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center' },
  quickActionIcon: { fontSize: 40 },
  quickActionText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  pointsText: { fontSize: 10, color: '#95a5a6', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  testButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  closeButton: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
});