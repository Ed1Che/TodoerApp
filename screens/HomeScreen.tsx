import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
  };

  const generate = async () => {
    const schedule = generateDailySchedule(new Date(), goals, weeklyFactors);
    setDailyTasks(schedule);
    await storage.set('dailyTasks', schedule);
    Alert.alert('Generated', `Created ${schedule.length} tasks for today`);
  };

  const handleComplete = async (task: any, proof: string) => {
    // Update stored dailyTasks
    const stored = (await storage.get('dailyTasks', [])) || [];
    const updated = stored.map((t: any) => 
      t.id === task.id ? { ...t, completed: true, proof } : t
    );
    await storage.set('dailyTasks', updated);
    setDailyTasks(updated);

    // Award 0.25 points
    const newPoints = leisurePoints + 0.25;
    setLeisurePoints(newPoints);
    await storage.set('leisurePoints', newPoints);

    // If goal-step, mark goal step completed
    if (task.type === 'goal-step' && task.goalId != null) {
      const allGoals = (await storage.get('goals', [])) || [];
      const gIndex = allGoals.findIndex((g: any) => g.id === task.goalId);
      if (gIndex !== -1) {
        allGoals[gIndex].steps[task.stepIndex].completed = true;
        const completedCount = allGoals[gIndex].steps.filter((s: any) => s.completed).length;
        allGoals[gIndex].progress = Math.round((completedCount / allGoals[gIndex].steps.length) * 100);
        await storage.set('goals', allGoals);
        setGoals(allGoals);
      }
    }
    Alert.alert('Completed', 'Task marked complete! +0.25 points earned');
  };

  const getEventColor = (eventDate: string) => {
    const today = new Date();
    const event = new Date(eventDate);
    const daysUntil = Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 3) return '#e74c3c'; // red
    if (daysUntil <= 7) return '#e67e22'; // orange
    if (daysUntil <= 14) return '#f39c12'; // yellow
    return '#27ae60'; // green
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
      <ScrollView>
        <Text style={styles.title}>To-doer</Text>

        {/* Events Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📅 Events</Text>
            <Link href="../../app/events/add" asChild>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <View style={styles.eventList}>
            {sortedEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events yet</Text>
            ) : (
              sortedEvents.slice(0, 3).map((event: any) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventCard, { backgroundColor: getEventColor(event.date) }]}
                  onPress={() => router.push(`../app/events/${event.id}`)}
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
              ))
            )}
          </View>
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🕐 To-day</Text>
            <TouchableOpacity onPress={generate} style={styles.generateButton}>
              <Text style={styles.generateButtonText}>Generate</Text>
            </TouchableOpacity>
          </View>
          <View>
            {dailyTasks.length === 0 ? (
              <Text style={styles.emptyText}>Click Generate to create today's tasks</Text>
            ) : (
              dailyTasks.map((t: any) => (
                <TaskCard key={t.id} task={t} onComplete={handleComplete} />
              ))
            )}
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Goals</Text>
          <View style={styles.goalsGrid}>
            <Link href="../app/goals/add" asChild>
              <TouchableOpacity style={styles.goalButton}>
                <Text style={styles.goalButtonText}>+ Add Goal</Text>
              </TouchableOpacity>
            </Link>
            <Link href="../app/(tabs)/goals" asChild>
              <TouchableOpacity style={[styles.goalButton, styles.reviewButton]}>
                <Text style={styles.goalButtonText}>Review →</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <Link href="../app/(tabs)/weekly" asChild>
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionIcon}>📆</Text>
              <Text style={styles.quickActionText}>Weekly Factor</Text>
            </TouchableOpacity>
          </Link>
          <Link href="../app/(tabs)/leisure" asChild>
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionIcon}>🛍️</Text>
              <Text style={styles.quickActionText}>Leisure Shop</Text>
              <Text style={styles.pointsText}>{leisurePoints.toFixed(2)} pts</Text>
            </TouchableOpacity>
          </Link>
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
  eventList: {
    maxHeight: 200,
  },
  eventCard: {
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