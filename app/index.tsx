// app/index.tsx - Home screen per Serene Logic "Growth" design
import { MaterialIcons } from '@expo/vector-icons';
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
import BottomNav from '../components/BottomNav';
import TaskCard from '../components/TaskCard';
import ProgressRing from '../components/ui/ProgressRing';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import { Colors, Type } from '../constants/theme';
import { getAttributes, type Attribute } from '../services/attributesService';
import { notificationService } from '../services/notificationService';
import { generateDailySchedule } from '../services/scheduler';
import {
  getCurrentWeekStats,
  recordTaskCompletion,
  type WeekStats,
} from '../services/statsService';
import { storage } from '../services/storage';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [goals, setGoals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, any[]>>({});
  const [purchasedLeisure, setPurchasedLeisure] = useState<any[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScheduleReminders, setAutoScheduleReminders] = useState(true);

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
      const pl = await storage.get('purchases', []);
      const dt = await storage.get('dailyTasks', []);
      const lp = await storage.get('leisurePoints', 0);
      const ws = await getCurrentWeekStats();
      const attrs = await getAttributes();

      setGoals(g || []);
      setEvents(e || []);
      setWeeklyFactors(wf || {});
      setPurchasedLeisure(pl || []);
      setDailyTasks(dt || []);
      setLeisurePoints(lp || 0);
      setWeekStats(ws);
      setAttributes(attrs);
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
    const schedule = generateDailySchedule(
      new Date(),
      goals,
      weeklyFactors,
      events,
      purchasedLeisure
    );

    setDailyTasks(schedule);
    await storage.set('dailyTasks', schedule);

    if (autoScheduleReminders) {
      await notificationService.refreshToDayReminders();
    }

    const eventTasks = schedule.filter(t => t.type === 'event-prep').length;
    const leisureTasks = schedule.filter(t => t.type === 'leisure').length;
    const weeklyTasks = schedule.filter(t => t.type === 'weekly-factor').length;
    const goalTasks = schedule.filter(t => t.type === 'goal-step').length;

    Alert.alert(
      'Schedule Generated! 🎯',
      `Created ${schedule.length} tasks for today:\n` +
      `📅 Events: ${eventTasks}\n` +
      `🎮 Leisure: ${leisureTasks}\n` +
      `📆 Weekly: ${weeklyTasks}\n` +
      `🎯 Goals: ${goalTasks}`
    );
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

      // ── Earn leisure points ────────────────────────────────────────────────
      const newPoints = leisurePoints + 0.25;
      setLeisurePoints(newPoints);
      await storage.set('leisurePoints', newPoints);

      // ── Record in weekly stats ────────────────────────────────────────────
      const sectorMap: Record<string, string> = {
        'goal-step': task.sector,
        'weekly-factor': task.sector ?? 'Career',
        'event-prep': 'Career',
        'leisure': 'Hobbies',
      };
      const sector = (sectorMap[task.type] as any) ?? undefined;
      await recordTaskCompletion(sector, task.duration ?? 30);
      setWeekStats(await getCurrentWeekStats());

      // ── Update goal progress ───────────────────────────────────────────────
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

      if (autoScheduleReminders) {
        await notificationService.refreshToDayReminders();
      }

      Alert.alert('Completed! 🎉', `+0.25 points earned`);
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

  const incompleteTasks = dailyTasks.filter(t => !t.completed);
  const completedTasks = dailyTasks.filter(t => t.completed);

  const eventTasks = incompleteTasks.filter(t => t.type === 'event-prep');
  const leisureTasks = incompleteTasks.filter(t => t.type === 'leisure');
  const weeklyTasks = incompleteTasks.filter(t => t.type === 'weekly-factor');
  const goalTasks = incompleteTasks.filter(t => t.type === 'goal-step');

  const getWeekNumber = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  };

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const todayPct = dailyTasks.length > 0
    ? Math.round((completedTasks.length / dailyTasks.length) * 100)
    : 0;

  const attributeTaskSector = (task: any): string => {
    if (task.type === 'event-prep') return 'Career';
    if (task.type === 'leisure') return 'Hobbies';
    return task.sector ?? 'Career';
  };

  const attributeProgress = (attribute: Attribute) => {
    const tasks = dailyTasks.filter(t => attributeTaskSector(t) === attribute.name);
    if (tasks.length === 0) return 0;
    return tasks.filter(t => t.completed).length / tasks.length;
  };

  const totalByDay = weekStats?.totalByDay ?? [0, 0, 0, 0, 0, 0, 0];
  const maxDayMinutes = Math.max(...totalByDay);
  const strongDays = totalByDay.filter(v => v > 0).length;
  const todayIndex = (new Date().getDay() + 6) % 7;

  const streak = (() => {
    let s = 0;
    for (let i = todayIndex; i >= 0; i--) {
      if (totalByDay[i] > 0) s++;
      else if (i !== todayIndex) break;
    }
    return s;
  })();

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <ScreenHeader
        title="Growth"
        wordmark
        onMenuPress={() => setShowSettings(true)}
        right={
          <>
            <HeaderIconButton
              icon="notifications"
              color={Colors.onSurfaceVariant}
              onPress={testNotifications}
            >
              <View style={styles.notifDot} />
            </HeaderIconButton>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('../settings/nextcloud')}
            >
              <MaterialIcons name="cloud" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · Week {getWeekNumber()}
            </Text>
            <Text style={styles.greetingTitle}>Good {getTimeOfDay()}</Text>
            <Text style={styles.greetingSub}>
              {dailyTasks.length > 0
                ? `Your journey is ${todayPct}% complete today.`
                : 'Generate your schedule to start the day.'}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={20} color={Colors.primary} />
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakLabel}>streak</Text>
          </View>
        </View>

        {/* ── Domain progress rings ─────────────────────────────────────── */}
        <View style={styles.ringsGrid}>
          {attributes.map(attribute => {
            const progress = attributeProgress(attribute);
            return (
              <View key={attribute.id} style={styles.ringTile}>
                <ProgressRing size={60} progress={progress} color={attribute.color}>
                  <MaterialIcons name={attribute.icon} size={20} color={attribute.color} />
                </ProgressRing>
                <Text style={[styles.ringLabel, { color: attribute.color }]}>{attribute.name}</Text>
                <Text style={styles.ringPct}>{Math.round(progress * 100)}%</Text>
              </View>
            );
          })}
        </View>

        {/* ── Daily Focus ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Focus</Text>
            <TouchableOpacity onPress={generate}>
              <Text style={styles.sectionAction}>Generate</Text>
            </TouchableOpacity>
          </View>

          {dailyTasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Tap Generate to build today&apos;s schedule</Text>
            </View>
          )}

          {incompleteTasks.length > 0 && (
            <>
              {eventTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} onTaskUpdate={handleTaskUpdate} />
              ))}
              {leisureTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} onTaskUpdate={handleTaskUpdate} />
              ))}
              {weeklyTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} onTaskUpdate={handleTaskUpdate} />
              ))}
              {goalTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} onTaskUpdate={handleTaskUpdate} />
              ))}
            </>
          )}

          {completedTasks.length > 0 && (
            <View style={styles.completedSection}>
              <Text style={styles.completedLabel}>✓ Completed ({completedTasks.length})</Text>
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} onTaskUpdate={handleTaskUpdate} />
              ))}
            </View>
          )}
        </View>

        {/* ── Weekly Momentum ────────────────────────────────────────────── */}
        <View style={styles.momentumCard}>
          <View style={styles.momentumHeader}>
            <View>
              <Text style={styles.momentumLabel}>Weekly Momentum</Text>
              <Text style={styles.momentumTitle}>{strongDays} of 7 days strong</Text>
            </View>
            <View style={styles.momentumChip}>
              <MaterialIcons name="trending-up" size={16} color={Colors.primary} />
              <Text style={styles.momentumChipText}>{strongDays > 0 ? `${strongDays}d` : '—'}</Text>
            </View>
          </View>
          <View style={styles.barsRow}>
            {totalByDay.map((minutes, i) => {
              const isToday = i === todayIndex;
              const height = maxDayMinutes > 0 && minutes > 0
                ? Math.max(15, Math.round((minutes / maxDayMinutes) * 98))
                : 15;
              const barColor = isToday && minutes > 0
                ? Colors.primary
                : minutes > 0
                ? 'rgba(70,98,100,0.25)'
                : 'rgba(70,98,100,0.12)';
              return (
                <View key={i} style={styles.barDay}>
                  <View style={styles.barColWrap}>
                    <View style={[styles.barCol, { height: `${height}%`, backgroundColor: barColor }]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                    {DAY_LETTERS[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.navWrapper}>
        <BottomNav activeTab="home" />
      </View>

      {/* ── Settings Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={styles.settingLabel}>Auto-Schedule Reminders</Text>
                <Text style={styles.settingDesc}>Create notifications for today&apos;s tasks</Text>
              </View>
              <Switch
                value={autoScheduleReminders}
                onValueChange={saveSettings}
                trackColor={{ false: Colors.outlineVariant, true: Colors.primaryFixed }}
                thumbColor={autoScheduleReminders ? Colors.primary : Colors.surface}
              />
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={testNotifications}>
              <MaterialIcons name="notifications" size={18} color={Colors.primary} />
              <Text style={styles.actionBtnText}>Test Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.secondaryFixed }]}
              onPress={() => { setShowSettings(false); router.push('../settings/nextcloud'); }}
            >
              <MaterialIcons name="cloud" size={18} color={Colors.secondary} />
              <Text style={[styles.actionBtnText, { color: Colors.secondary }]}>Nextcloud Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.surfaceContainer, marginTop: 8 }]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 2, borderColor: Colors.surface,
  },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primaryFixed,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  // ── Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  greetingText: { flex: 1 },
  greetingDate: {
    fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 0.77, color: 'rgba(65,72,72,0.6)', marginBottom: 4,
    fontFamily: Type.geistBold,
  },
  greetingTitle: {
    fontSize: 26, letterSpacing: -0.39, lineHeight: 32,
    color: Colors.onSurface, fontFamily: Type.geistBold,
  },
  greetingSub: {
    fontSize: 15, color: Colors.onSurfaceVariant, marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  streakBadge: {
    backgroundColor: 'rgba(201,232,234,0.6)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', marginLeft: 16,
  },
  streakCount: {
    fontSize: 13, color: Colors.primary,
    fontFamily: Type.geistBold,
  },
  streakLabel: {
    fontSize: 9, textTransform: 'uppercase',
    color: 'rgba(70,98,100,0.7)', letterSpacing: 0.5,
    fontFamily: Type.geistBold,
  },
  // ── Domain rings
  ringsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40,
  },
  ringTile: {
    flexBasis: '22%', flexGrow: 1, minWidth: 70,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  ringLabel: {
    fontSize: 11, marginTop: 8,
    fontFamily: Type.geistBold,
  },
  ringPct: {
    fontSize: 10, fontWeight: '600', color: Colors.onSurfaceVariant, marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
  },
  // ── Sections
  section: { marginBottom: 40 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  sectionAction: {
    fontSize: 13, color: Colors.secondary,
    fontFamily: Type.geistSemiBold,
  },
  emptyState: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  emptyText: {
    color: Colors.outlineVariant, fontSize: 14, textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  completedSection: { marginTop: 8 },
  completedLabel: {
    fontSize: 12, color: Colors.outline,
    marginBottom: 8, fontFamily: Type.geistSemiBold,
  },
  // ── Weekly momentum
  momentumCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
    overflow: 'hidden',
  },
  momentumHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  momentumLabel: {
    fontSize: 10, textTransform: 'uppercase',
    letterSpacing: 0.7, color: 'rgba(70,98,100,0.7)', marginBottom: 2,
    fontFamily: Type.geistBold,
  },
  momentumTitle: {
    fontSize: 18, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  momentumChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(201,232,234,0.5)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  momentumChipText: {
    fontSize: 12, color: Colors.primary,
    fontFamily: Type.geistBold,
  },
  barsRow: {
    flexDirection: 'row', gap: 6, height: 80, alignItems: 'flex-end',
  },
  barDay: { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  barColWrap: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barCol: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 9, color: 'rgba(65,72,72,0.5)',
    fontFamily: Type.geistBold,
  },
  barLabelToday: { color: Colors.primary },
  navWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  // ── Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(35,49,68,0.4)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24,
  },
  modalTitle: {
    fontSize: 20, color: Colors.onSurface,
    marginBottom: 20, fontFamily: Type.geistSemiBold,
  },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainer,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 15, color: Colors.onSurface,
    marginBottom: 3, fontFamily: 'Inter_600SemiBold',
  },
  settingDesc: {
    fontSize: 12, color: Colors.outline, fontFamily: 'Inter_400Regular',
  },
  actionBtn: {
    backgroundColor: Colors.primaryFixed, borderRadius: 999,
    paddingVertical: 14, alignItems: 'center', marginTop: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  actionBtnText: {
    color: Colors.primary, fontSize: 15,
    fontFamily: Type.geistSemiBold,
  },
});
