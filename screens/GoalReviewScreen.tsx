
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
import { storage } from '../services/storage';

interface Goal {
  id: number;
  description: string;
  sector: string;
  endDate: string;
  steps: { completed: boolean }[];
  timesPerWeek: number;
  preferredTime: string;
  dailyTimeAllocation?: number;
}

export default function GoalsReviewScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSector, setSelectedSector] = useState('All');

  const sectors = ['All', 'Academic', 'Finance', 'Social', 'Cyber', 'Health', 'Hobbies'];

  const loadGoals = useCallback(async () => {
    try {
      const g = await storage.get('goals', []);
      setGoals(g || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const calculateProgress = (goal: Goal) => {
    if (!goal.steps || goal.steps.length === 0) return 0;
    const completed = goal.steps.filter(s => s.completed).length;
    return Math.round((completed / goal.steps.length) * 100);
  };

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
              Alert.alert('Success', 'Goal deleted successfully');
            } catch {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const editGoal = (goalId: number) => {
    router.push(`/goals/edit/${goalId}`);
  };

  const sectorGoals = selectedSector === 'All' ? goals : goals.filter(g => g.sector === selectedSector);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Goal Review</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/goals/add')}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Sector Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.sectorScrollView, { maxHeight: 48 }]}
        contentContainerStyle={styles.sectorContainer}
      >
        {sectors.map(sector => (
          <TouchableOpacity
            key={sector}
            style={[styles.sectorButton, selectedSector === sector && styles.sectorButtonActive]}
            onPress={() => setSelectedSector(sector)}
          >
            <Text style={[styles.sectorButtonText, selectedSector === sector && styles.sectorButtonTextActive]}>
              {sector}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Goals List */}
      <ScrollView
        style={styles.goalsScrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sectorGoals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>No Goals Yet</Text>
            <Text style={styles.emptyText}>
              {selectedSector === 'All'
                ? 'Create your first goal to get started!'
                : `No goals in ${selectedSector} sector`}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/goals/add')}>
              <Text style={styles.emptyButtonText}>+ Add Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {sectorGoals.map(goal => {
              const progress = calculateProgress(goal);
              return (
                <View key={goal.id} style={styles.goalCard}>
                  {/* Goal Header */}
                  <View style={styles.goalHeader}>
                    <View style={styles.goalHeaderLeft}>
                      <Text style={styles.goalTitle} numberOfLines={2}>{goal.description}</Text>
                      <View style={styles.goalMetaTags}>
                        <View style={styles.sectorBadge}>
                          <Text style={styles.sectorBadgeText}>{goal.sector}</Text>
                        </View>
                        <Text style={styles.goalDate}>
                          Due: {new Date(goal.endDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={styles.progressPercentage}>{progress}%</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{goal.steps.filter(s => s.completed).length}/{goal.steps.length}</Text>
                      <Text style={styles.statLabel}>Steps</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{goal.timesPerWeek}x</Text>
                      <Text style={styles.statLabel}>Per Week</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{goal.preferredTime}</Text>
                      <Text style={styles.statLabel}>Time</Text>
                    </View>
                    {goal.dailyTimeAllocation && (
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{goal.dailyTimeAllocation}m</Text>
                        <Text style={styles.statLabel}>Daily</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.viewStepsButton} onPress={() => router.push(`/goals/steps/${goal.id}`)}>
                      <Text style={styles.viewStepsButtonText}>📋 View Steps</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editButton} onPress={() => editGoal(goal.id)}>
                      <Text style={styles.editButtonText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteGoal(goal.id)}>
                      <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3436' },
  addButton: { backgroundColor: '#9b59b6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sectorScrollView: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#dee2e6' },
  sectorContainer: { paddingVertical: 4, paddingHorizontal: 0, gap: 6 },
  sectorButton: { backgroundColor: '#f1f3f5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  sectorButtonActive: { backgroundColor: '#9b59b6' },
  sectorButtonText: { fontSize: 14, fontWeight: '600', color: '#636e72' },
  sectorButtonTextActive: { color: '#fff' },
  goalsScrollView: { flex: 1 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 80, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3436', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#636e72', textAlign: 'center', marginBottom: 24 },
  emptyButton: { backgroundColor: '#9b59b6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  goalsList: { padding: 16 },
  goalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  goalHeaderLeft: { flex: 1 },
  goalTitle: { fontSize: 18, fontWeight: '600', color: '#2d3436', marginBottom: 8 },
  goalMetaTags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectorBadge: { backgroundColor: '#e8daef', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sectorBadgeText: { fontSize: 12, fontWeight: '600', color: '#6c3483' },
  goalDate: { fontSize: 12, color: '#636e72' },
  progressSection: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#636e72' },
  progressPercentage: { fontSize: 14, fontWeight: 'bold', color: '#9b59b6' },
  progressBarContainer: { height: 8, backgroundColor: '#f1f3f5', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#9b59b6', borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, paddingVertical: 12, backgroundColor: '#f8f9fa', borderRadius: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#2d3436', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#636e72' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  viewStepsButton: { flex: 2, backgroundColor: '#3498db', padding: 12, borderRadius: 10, alignItems: 'center' },
  viewStepsButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  editButton: { flex: 1, backgroundColor: '#f39c12', padding: 12, borderRadius: 10, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  deleteButton: { flex: 1, backgroundColor: '#e74c3c', padding: 12, borderRadius: 10, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});