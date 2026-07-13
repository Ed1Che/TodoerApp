// screens/GoalReviewScreen.tsx - Review & Manage with Tasks / Goals / Events tabs (Serene Logic)
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import Chip from '../components/ui/Chip';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import Seg from '../components/ui/Seg';
import { Colors, Type } from '../constants/theme';
import { storage } from '../services/storage';

interface Goal {
  id: number;
  description: string;
  sector: string;
  endDate: string;
  steps: { completed: boolean; description?: string; text?: string }[];
  timesPerWeek: number;
  startTime: string;
  dailyTimeAllocation?: number;
  lastProgressReset?: string;
  createdAt: string;
}

interface WeeklyTask {
  id: number;
  taskName: string;
  startTime: string;
  endTime: string;
  sector: string;
  frequency: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TABS = ['Tasks', 'Goals', 'Events'];

const SECTOR_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Academic: 'school',
  Finance: 'payments',
  Social: 'groups',
  Cyber: 'computer',
  Health: 'fitness-center',
  Hobbies: 'palette',
  Career: 'work',
};

export default function GoalsReviewScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Tasks');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, WeeklyTask[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const g = await storage.get('goals', []);
      const processedGoals = await processGoals(g);
      setGoals(processedGoals);
      await storage.set('goals', processedGoals);

      const e = await storage.get('events', []);
      setEvents(e || []);

      const wf = await storage.get('weeklyFactors', {});
      setWeeklyFactors(wf || {});
    } catch (error) {
      console.error('Error loading review data:', error);
    }
  }, []);

  const processGoals = async (goals: Goal[]): Promise<Goal[]> => {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');

    return goals.map(goal => {
      const goalEndDate = new Date(goal.endDate);
      goalEndDate.setHours(0, 0, 0, 0);

      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isGoalDue = goalEndDate <= todayMidnight;

      const lastResetStr = goal.lastProgressReset
        ? new Date(goal.lastProgressReset).toLocaleDateString('en-CA')
        : null;

      const needsReset = !lastResetStr || todayStr !== lastResetStr;

      if (isGoalDue) {
        return {
          ...goal,
          steps: goal.steps.map(step => ({ ...step, completed: true })),
          lastProgressReset: now.toISOString(),
        };
      } else if (needsReset && !isGoalDue) {
        return {
          ...goal,
          steps: goal.steps.map(step => ({ ...step, completed: false })),
          lastProgressReset: now.toISOString(),
        };
      }
      return goal;
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ── Goals helpers ─────────────────────────────────────────────── */
  const deleteGoal = (goalId: number) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedGoals = goals.filter(g => g.id !== goalId);
              await storage.set('goals', updatedGoals);
              setGoals(updatedGoals);
            } catch {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const goalMenu = (goal: Goal) => {
    Alert.alert(goal.description, undefined, [
      { text: 'View Steps', onPress: () => router.push(`/goals/steps/${goal.id}`) },
      { text: 'Edit', onPress: () => router.push(`/goals/edit/${goal.id}`) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(goal.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getDaysUntilDue = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  /* ── Weekly task helpers ───────────────────────────────────────── */
  const deleteWeeklyTask = (day: string, id: number) => {
    Alert.alert('Delete Task', 'Remove this task from your weekly schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = {
            ...weeklyFactors,
            [day]: (weeklyFactors[day] || []).filter(t => t.id !== id),
          };
          await storage.set('weeklyFactors', updated);
          setWeeklyFactors(updated);
        },
      },
    ]);
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return '--:--';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  /* ── Render tabs ───────────────────────────────────────────────── */
  const renderTasks = () => {
    const daysWithTasks = DAYS.filter(d => (weeklyFactors[d] || []).length > 0);

    if (daysWithTasks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="event-note" size={44} color={Colors.outlineVariant} />
          <Text style={styles.emptyTitle}>No Scheduled Tasks</Text>
          <Text style={styles.emptyText}>Create recurring tasks from the + button below.</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 32 }}>
        {daysWithTasks.map(day => (
          <View key={day}>
            <View style={styles.dayHeader}>
              <View
                style={[
                  styles.dayDot,
                  { backgroundColor: day === todayName ? Colors.secondary : Colors.outlineVariant },
                ]}
              />
              <Text style={styles.dayTitle}>{day}</Text>
            </View>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {(weeklyFactors[day] || []).map(task => (
                <View key={task.id} style={styles.timelineRow}>
                  <View style={styles.timelineNode}>
                    <View style={styles.timelineNodeInner} />
                  </View>
                  <TouchableOpacity
                    style={styles.timelineCard}
                    activeOpacity={0.8}
                    onLongPress={() => deleteWeeklyTask(day, task.id)}
                  >
                    <View style={styles.timelineCardHeader}>
                      <Text style={styles.timelineCardTitle}>{task.taskName}</Text>
                      <Text style={styles.timelineCardTime}>{formatTimeDisplay(task.startTime)}</Text>
                    </View>
                    <Text style={styles.timelineCardDesc}>
                      {task.sector} · until {formatTimeDisplay(task.endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGoals = () => {
    if (goals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="flag" size={44} color={Colors.outlineVariant} />
          <Text style={styles.emptyTitle}>No Goals Yet</Text>
          <Text style={styles.emptyText}>Create your first goal to get started.</Text>
        </View>
      );
    }

    return (
      <View style={{ gap: 16 }}>
        {goals.map(goal => {
          const completedSteps = goal.steps.filter(s => s.completed).length;
          const totalSteps = goal.steps.length;
          const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
          const nextStep = goal.steps.find(s => !s.completed);
          const daysLeft = getDaysUntilDue(goal.endDate);

          return (
            <TouchableOpacity
              key={goal.id}
              style={styles.goalCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/goals/steps/${goal.id}`)}
              onLongPress={() => goalMenu(goal)}
            >
              <View style={styles.goalTop}>
                <View style={styles.goalIconCircle}>
                  <MaterialIcons
                    name={SECTOR_ICONS[goal.sector] ?? 'flag'}
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalSectorLabel}>{goal.sector}</Text>
                  <Text style={styles.goalTitle} numberOfLines={2}>{goal.description}</Text>
                </View>
                <Chip
                  label={daysLeft < 0 ? 'Done' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                  background={daysLeft <= 3 && daysLeft >= 0 ? Colors.errorContainer : Colors.surfaceContainer}
                  color={daysLeft <= 3 && daysLeft >= 0 ? Colors.onErrorContainer : Colors.primary}
                />
              </View>

              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.nextStepSection}>
                <Text style={styles.nextStepLabel}>Next Step</Text>
                <Text style={styles.nextStepText} numberOfLines={2}>
                  {nextStep
                    ? (nextStep as any).description || (nextStep as any).text || 'Continue your plan'
                    : 'All steps complete — great work!'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderEvents = () => {
    if (events.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="event" size={44} color={Colors.outlineVariant} />
          <Text style={styles.emptyTitle}>No Events</Text>
          <Text style={styles.emptyText}>Add an event to start preparing for it.</Text>
        </View>
      );
    }

    const sorted = [...events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
      <View style={{ gap: 12 }}>
        {sorted.map(event => {
          const d = new Date(event.date);
          const prepTotal = event.prepTasks?.length ?? 0;
          const prepDone = event.prepTasks?.filter((t: any) => t.completed).length ?? 0;
          const isPast = d.getTime() < Date.now();
          const hasPrep = prepTotal > 0;

          return (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventCard, isPast && { opacity: 0.75 }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/events/${event.id}`)}
            >
              <View style={styles.eventDate}>
                <Text style={styles.eventMonth}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </Text>
                <Text style={styles.eventDay}>
                  {String(d.getDate()).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                {!!event.description && (
                  <Text style={styles.eventDesc} numberOfLines={1}>{event.description}</Text>
                )}
                <Chip
                  label={hasPrep ? `${prepDone}/${prepTotal} Prep Done` : 'Preparation Pending'}
                  background={hasPrep && prepDone > 0 ? Colors.primaryFixed : Colors.surfaceContainer}
                  color={hasPrep && prepDone > 0 ? Colors.onPrimaryFixed : Colors.outline}
                  style={{ marginTop: 6 }}
                  leading={
                    <View
                      style={[
                        styles.chipDot,
                        {
                          backgroundColor:
                            hasPrep && prepDone > 0 ? Colors.primary : Colors.outlineVariant,
                        },
                      ]}
                    />
                  }
                />
              </View>
              <MaterialIcons name="chevron-right" size={20} color="rgba(193,200,200,0.7)" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Review & Manage"
        onMenuPress={() => router.push('/')}
        right={<HeaderIconButton icon="notifications" />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={{ marginBottom: 32 }}>
          <Seg options={TABS} value={tab} onChange={setTab} />
        </View>

        {tab === 'Tasks' && renderTasks()}
        {tab === 'Goals' && renderGoals()}
        {tab === 'Events' && renderEvents()}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.navWrapper}>
        <BottomNav activeTab="review" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  // ── Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8,
  },
  emptyTitle: {
    fontSize: 18, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold, marginTop: 8,
  },
  emptyText: {
    fontSize: 14, color: Colors.outline, textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  // ── Tasks timeline
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  dayTitle: {
    fontSize: 18, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  timeline: { position: 'relative', gap: 12 },
  timelineLine: {
    position: 'absolute', left: 11, top: 16, bottom: 16, width: 1,
    backgroundColor: 'rgba(193,200,200,0.4)',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineNode: {
    width: 22, height: 22, borderRadius: 11, marginTop: 8,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1.5, borderColor: 'rgba(193,200,200,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineNodeInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },
  timelineCard: {
    flex: 1, marginLeft: 10,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
    borderWidth: 1, borderColor: 'transparent',
  },
  timelineCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  timelineCardTitle: {
    flex: 1, fontSize: 14, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  timelineCardTime: {
    fontSize: 11, color: 'rgba(65,72,72,0.6)', marginLeft: 12,
    fontFamily: Type.geistMedium,
  },
  timelineCardDesc: {
    fontSize: 14, color: Colors.onSurfaceVariant, lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  // ── Goals
  goalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  goalTop: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16,
  },
  goalIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  goalSectorLabel: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7,
    color: 'rgba(65,72,72,0.7)', marginBottom: 2,
    fontFamily: Type.geistBold,
  },
  goalTitle: {
    fontSize: 15, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12, color: Colors.onSurfaceVariant,
    fontFamily: Type.geistMedium,
  },
  progressPct: {
    fontSize: 14, color: Colors.secondary,
    fontFamily: Type.geistBold,
  },
  progressTrack: {
    height: 6, backgroundColor: Colors.surfaceContainer,
    borderRadius: 999, overflow: 'hidden',
  },
  progressFill: {
    height: 6, backgroundColor: Colors.secondary, borderRadius: 999,
  },
  nextStepSection: {
    marginTop: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.surfaceContainerLow,
  },
  nextStepLabel: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.55,
    color: 'rgba(65,72,72,0.6)', marginBottom: 4,
    fontFamily: Type.geistBold,
  },
  nextStepText: {
    fontSize: 14, color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  // ── Events
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  eventDate: { width: 44, alignItems: 'center' },
  eventMonth: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
    color: 'rgba(65,72,72,0.6)',
    fontFamily: Type.geistBold,
  },
  eventDay: {
    fontSize: 22, color: Colors.onSurface, lineHeight: 26,
    fontFamily: Type.geistSemiBold,
  },
  eventBody: {
    flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(193,200,200,0.3)',
    paddingLeft: 16,
  },
  eventTitle: {
    fontSize: 14, color: Colors.onSurface, marginBottom: 2,
    fontFamily: Type.geistSemiBold,
  },
  eventDesc: {
    fontSize: 13, color: Colors.onSurfaceVariant,
    fontFamily: 'Inter_400Regular',
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  navWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
