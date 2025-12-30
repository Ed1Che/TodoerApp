import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import TaskCard from '../components/TaskCard';
import { generateDailySchedule } from '../services/scheduler';
import { storage } from '../services/storage';

export function HomeScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, any[]>>({});
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    loadData();
  });
  return unsubscribe;
}, [navigation]);


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
    Alert.alert('Generated', `Created ${schedule.length} tasks for today`);
  };

const handleComplete = async (task: any, proof: string, attachments: string[]) => {
    try {
      // Update stored dailyTasks with proof and attachments
      const stored = (await storage.get('dailyTasks', [])) || [];
      const updated = stored.map((t: any) =>
        t.id === task.id 
          ? { ...t, completed: true, proof, attachments } 
          : t
      );
      await storage.set('dailyTasks', updated);
      setDailyTasks(updated);

      // Award 0.25 points
      const newPoints = leisurePoints + 0.25;
      setLeisurePoints(newPoints);
      await storage.set('leisurePoints', newPoints);

      // If it's a goal-step, mark goal step completed
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

      Alert.alert(
        'Completed! 🎉',
        `Task marked complete! +0.25 points earned\n${attachments.length > 0 ? `${attachments.length} file(s) attached` : ''}`
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>To-doer</Text>

        {/* Events Section - Scrollable */}
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.eventScrollContainer}
          >
            {sortedEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              <View style={styles.eventRow}>
                {sortedEvents.map((event: any) => (
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
          {sortedEvents.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('../(tabs)/events')}
            >
              <Text style={styles.viewAllText}>View All Events →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's Tasks Section - Scrollable with Black Text */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}> To-day</Text>
            <TouchableOpacity onPress={generate} style={styles.generateButton}>
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            style={styles.taskScrollContainer}
            nestedScrollEnabled={true}
          >
            {dailyTasks.length === 0 ? (
              <Text style={styles.emptyText}>
                Click Generate to create today's tasks
              </Text>
            ) : (
              dailyTasks.map((t: any) => (
                <TaskCard key={t.id} task={t} onComplete={handleComplete} />
              ))
            )}
          </ScrollView>
        </View>

        {/* Goals Section */}
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

        {/* Quick Actions Grid */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3436',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3436',
  },
  cardTitleBlack: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000', // Changed to pure black
  },
  addButton: {
    backgroundColor: '#3498db',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventScrollContainer: {
    maxHeight: 180,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
  },
  eventCard: {
    width: 280,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  eventDate: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  priorityBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  taskScrollContainer: {
    maxHeight: 400,
  },
  generateButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#95a5a6',
    textAlign: 'center',
    paddingVertical: 20,
  },
  goalsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  goalButton: {
    flex: 1,
    backgroundColor: '#9b59b6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reviewButton: {
    backgroundColor: '#5f27cd',
  },
  goalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3436',
    textAlign: 'center',
  },
  pointsText: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 4,
  },
});

export default HomeScreen;