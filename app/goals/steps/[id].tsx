import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { storage } from '../../../services/storage';

interface Step {
  text: string;
  duration: number;
  completed: boolean;
  cueStackingIdea?: string;
}

interface Goal {
  id: string | number;
  description: string;
  sector: string;
  progress: number;
  steps: Step[];
}

export default function ViewStepsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadGoal();
  }, [id]);

  const loadGoal = async () => {
    try {
      const goals = await storage.get('goals', []) as Goal[];
      const found = goals.find((g) => g.id.toString() === id);
      if (found) setGoal(found);
    } catch (error) {
      console.error("Failed to load goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStepDuration = async (index: number, text: string) => {
    if (!goal) return;

    const newDuration = parseInt(text) || 0;
    const updatedSteps = [...goal.steps];
    updatedSteps[index].duration = newDuration;

    // Update Local State for UI responsiveness
    const updatedGoal = { ...goal, steps: updatedSteps };
    setGoal(updatedGoal);

    // Update Storage
    const goals = await storage.get('goals', []) as Goal[];
    const goalIdx = goals.findIndex((g) => g.id.toString() === id);
    if (goalIdx !== -1) {
      goals[goalIdx] = updatedGoal;
      await storage.set('goals', goals);
    }
  };

  if (loading) return <ActivityIndicator style={styles.centered} />;
  if (!goal) return <Text style={styles.errorText}>Goal not found.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{goal.description}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{goal.sector}</Text></View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Progress: {goal.progress}%</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${goal.progress}%` }]} />
        </View>
      </View>

      {/* Steps List */}
      <Text style={styles.sectionTitle}>Steps</Text>
      {goal.steps.map((step, index) => (
        <View key={index} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepNumber}>Step {index + 1}</Text>
            <Text style={[styles.status, step.completed ? styles.completed : styles.pending]}>
              {step.completed ? '✓ Completed' : 'Pending'}
            </Text>
          </View>

          <Text style={styles.stepText}>{step.text}</Text>

          <View style={styles.durationRow}>
            <Text style={styles.label}>Duration: </Text>
            {editingIndex === index ? (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.durationInput}
                  value={step.duration.toString()}
                  keyboardType="number-pad"
                  autoFocus
                  onBlur={() => setEditingIndex(null)}
                  onChangeText={(text) => updateStepDuration(index, text)}
                />
                <Text> minutes</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingIndex(index)}>
                <Text style={styles.editableValue}>{step.duration} minutes (tap to edit)</Text>
              </TouchableOpacity>
            )}
          </View>

          {step.cueStackingIdea && (
            <Text style={styles.cueText}>💡 {step.cueStackingIdea}</Text>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Goals</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center' },
  errorText: { textAlign: 'center', marginTop: 50, color: 'red' },
  
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  badge: { backgroundColor: '#e9ecef', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginTop: 8 },
  badgeText: { fontSize: 12, color: '#6c757d', fontWeight: '600' },

  progressSection: { marginBottom: 24 },
  progressLabel: { fontSize: 14, color: '#495057', marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#dee2e6', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#4dabf7', borderRadius: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  stepCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepNumber: { fontWeight: 'bold', color: '#495057' },
  status: { fontSize: 12, fontWeight: '600' },
  completed: { color: '#40c057' },
  pending: { color: '#fab005' },
  stepText: { fontSize: 16, color: '#212529', marginBottom: 12 },

  durationRow: { flexDirection: 'row', alignItems: 'center' },
  label: { color: '#868e96' },
  editableValue: { color: '#228be6', textDecorationLine: 'underline' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  durationInput: { borderBottomWidth: 1, borderColor: '#228be6', padding: 0, minWidth: 30, textAlign: 'center', fontWeight: 'bold' },
  
  cueText: { marginTop: 12, fontSize: 14, fontStyle: 'italic', color: '#495057', backgroundColor: '#fff9db', padding: 8, borderRadius: 6 },
  
  backButton: { marginTop: 20, padding: 16, alignItems: 'center' },
  backButtonText: { color: '#495057', fontWeight: '600' }
});