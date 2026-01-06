// app/goals/edit/[id].tsx - Complete edit goal screen
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { githubAI } from '../../../services/githubAi';
import { storage } from '../../../services/storage';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Goal data
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState<'morning-early' |'morning-mid'|'morning-late'|'afternoon-early'|'afternoon-mid'|'afternoon-late'| 'evening-early' | 'evening-mid' | 'evening-late'>('morning-early');
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sector, setSector] = useState('Academic');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [dailyHours, setDailyHours] = useState(1);
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const [identityStatement, setIdentityStatement] = useState('');
  const [habitTips, setHabitTips] = useState<string[]>([]);

  const sectors = ['Academic', 'Finance', 'Social', 'Career', 'Health', 'Hobbies'];

  useEffect(() => {
    loadGoal();
  }, [id]);

  const loadGoal = async () => {
    try {
      const goals = await storage.get('goals', []);
      const goal = goals.find((g: any) => g.id.toString() === id);
      
      if (goal) {
        setDescription(goal.description);
        setPreferredTime(goal.preferredTime);
        setEndDate(new Date(goal.endDate));
        setSector(goal.sector);
        setTimesPerWeek(goal.timesPerWeek);
        setSteps(goal.steps || []);
        setIdentityStatement(goal.identityStatement || '');
        setHabitTips(goal.habitTips || []);
        
        // Parse daily time allocation
        const totalMinutes = goal.dailyTimeAllocation || 60;
        setDailyHours(Math.floor(totalMinutes / 60));
        setDailyMinutes(totalMinutes % 60);
      } else {
        Alert.alert('Error', 'Goal not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const regenerateSteps = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a goal description first');
      return;
    }

    Alert.alert(
      'Regenerate Steps',
      'This will replace all existing steps with new AI-generated steps. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            setRegenerating(true);
            try {
              const dailyTimeAllocation = dailyHours * 60 + dailyMinutes;
              const response = await githubAI.breakdownGoal({
                goalDescription: description,
                sector,
                preferredTime,
                endDate: endDate.toISOString(),
                timesPerWeek,
                dailyTimeAllocation,
              });

              setSteps(response.steps);
              setHabitTips(response.habitFormationTips);
              setIdentityStatement(response.identityStatement);

              Alert.alert('Success', 'Steps regenerated successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to regenerate steps');
            } finally {
              setRegenerating(false);
            }
          }
        }
      ]
    );
  };

  const editStep = (index: number, field: 'text' | 'duration', value: any) => {
    const updatedSteps = steps.map((step, idx) =>
      idx === index ? { ...step, [field]: value } : step
    );
    setSteps(updatedSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      Alert.alert('Error', 'Goals must have at least one step');
      return;
    }
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        text: '',
        duration: 15,
        completed: false,
        habitType: 'process',
      }
    ]);
  };

  const saveGoal = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a goal description');
      return;
    }

    if (steps.length === 0) {
      Alert.alert('Error', 'Please add at least one step');
      return;
    }

    const emptySteps = steps.filter(s => !s.text.trim());
    if (emptySteps.length > 0) {
      Alert.alert('Error', 'Please fill in all step descriptions');
      return;
    }

    setSaving(true);
    try {
      const goals = await storage.get('goals', []);
      const goalIndex = goals.findIndex((g: any) => g.id.toString() === id);

      if (goalIndex === -1) {
        throw new Error('Goal not found');
      }

      // Calculate progress
      const completedCount = steps.filter(s => s.completed).length;
      const progress = Math.round((completedCount / steps.length) * 100);

      // Update goal
      goals[goalIndex] = {
        ...goals[goalIndex],
        description: description.trim(),
        preferredTime,
        endDate: endDate.toISOString(),
        sector,
        timesPerWeek,
        dailyTimeAllocation: dailyHours * 60 + dailyMinutes,
        steps,
        progress,
        identityStatement,
        habitTips,
      };

      await storage.set('goals', goals);

      Alert.alert('Success', 'Goal updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9b59b6" />
          <Text style={styles.loadingText}>Loading goal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dailyTimeAllocation = dailyHours * 60 + dailyMinutes;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Goal</Text>
        </View>

        <View style={styles.form}>
          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Goal Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your goal..."
              placeholderTextColor="#95a5a6"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Preferred Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Time</Text>
            <View style={styles.timeButtonGroup}>
              {/* Morning */}
              <View style={styles.timeSection}>
                {(['morning-early', 'morning-mid', 'morning-late'] as const).map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeButton, preferredTime === time && styles.timeButtonActive]}
                    onPress={() => setPreferredTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        preferredTime === time && styles.timeButtonTextActive,
                      ]}
                    >
                      {time.charAt(0).toUpperCase() + time.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Afternoon */}
              <View style={styles.timeSection}>
                {(['afternoon-early', 'afternoon-mid', 'afternoon-late'] as const).map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeButton, preferredTime === time && styles.timeButtonActive]}
                    onPress={() => setPreferredTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        preferredTime === time && styles.timeButtonTextActive,
                      ]}
                    >
                      {time.charAt(0).toUpperCase() + time.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Evening */}
              <View style={styles.timeSection}>
                {(['evening-early', 'evening-mid', 'evening-late'] as const).map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeButton, preferredTime === time && styles.timeButtonActive]}
                    onPress={() => setPreferredTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeButtonText,
                        preferredTime === time && styles.timeButtonTextActive,
                      ]}
                    >
                      {time.charAt(0).toUpperCase() + time.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>


          {/* End Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Goal End Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {endDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Sector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Life Sector</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sectorContainer}>
                {sectors.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.sectorButton,
                      sector === s && styles.sectorButtonActive,
                    ]}
                    onPress={() => setSector(s)}
                  >
                    <Text
                      style={[
                        styles.sectorButtonText,
                        sector === s && styles.sectorButtonTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Times per Week */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Times per Week</Text>
            <View style={styles.counterContainer}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setTimesPerWeek(Math.max(1, timesPerWeek - 1))}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{timesPerWeek}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setTimesPerWeek(Math.min(7, timesPerWeek + 1))}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Time Allocation */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Daily Time Dedication</Text>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Hours</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setDailyHours(Math.max(0, dailyHours - 1))}
                  >
                    <Text style={styles.counterButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{dailyHours}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setDailyHours(Math.min(8, dailyHours + 1))}
                  >
                    <Text style={styles.counterButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Minutes</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setDailyMinutes(Math.max(0, dailyMinutes - 15))}
                  >
                    <Text style={styles.counterButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{dailyMinutes}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setDailyMinutes(Math.min(45, dailyMinutes + 15))}
                  >
                    <Text style={styles.counterButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={styles.helperText}>
              Total: {dailyTimeAllocation} minutes per day
            </Text>
          </View>

          {/* Identity Statement */}
          {identityStatement && (
            <View style={styles.identityCard}>
              <Text style={styles.identityLabel}>Your Identity:</Text>
              <Text style={styles.identityText}>{identityStatement}</Text>
            </View>
          )}

          {/* Steps Section */}
          <View style={styles.stepsSection}>
            <View style={styles.stepsSectionHeader}>
              <Text style={styles.stepsSectionTitle}>Steps ({steps.length})</Text>
              <View style={styles.stepsActions}>
                <TouchableOpacity
                  onPress={regenerateSteps}
                  style={styles.regenerateButton}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.regenerateButtonText}>🔄 Regenerate</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={addStep} style={styles.addStepButton}>
                  <Text style={styles.addStepButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {steps.map((step, idx) => (
              <View key={idx} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>Step {idx + 1}</Text>
                  {step.completed && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Completed</Text>
                    </View>
                  )}
                </View>

                <TextInput
                  style={styles.stepInput}
                  value={step.text}
                  onChangeText={(text) => editStep(idx, 'text', text)}
                  placeholder={`Step ${idx + 1} description...`}
                  placeholderTextColor="#95a5a6"
                  multiline
                />

                <View style={styles.stepDurationRow}>
                  <Text style={styles.durationLabel}>Duration:</Text>
                  <View style={styles.durationControls}>
                    <TouchableOpacity
                      onPress={() => editStep(idx, 'duration', Math.max(5, step.duration - 5))}
                      style={styles.durationButton}
                    >
                      <Text style={styles.durationButtonText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.durationValue}>{step.duration} min</Text>
                    <TouchableOpacity
                      onPress={() => editStep(idx, 'duration', step.duration + 5)}
                      style={styles.durationButton}
                    >
                      <Text style={styles.durationButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {step.cueStackingIdea && (
                  <Text style={styles.cueText}>💡 {step.cueStackingIdea}</Text>
                )}

                <TouchableOpacity
                  onPress={() => removeStep(idx)}
                  style={styles.removeStepButton}
                >
                  <Text style={styles.removeStepButtonText}>🗑️ Remove Step</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Habit Tips */}
          {habitTips.length > 0 && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💪 Habit Formation Tips:</Text>
              {habitTips.map((tip, idx) => (
                <Text key={idx} style={styles.tipText}>• {tip}</Text>
              ))}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveGoal}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#636e72' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backButtonText: { fontSize: 24, color: '#2d3436' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3436' },
  form: { padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#2d3436', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 12, padding: 14, fontSize: 16, color: '#2d3436' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  timeButtonGroup: { flexDirection: 'column', gap: 12 },
  timeButton: { flex: 1, backgroundColor: '#f1f3f5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  timeButtonActive: { backgroundColor: '#9b59b6' },
  timeButtonText: { fontSize: 14, fontWeight: '600', color: '#636e72' },
  timeButtonTextActive: { color: '#fff' },
  dateButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 12, padding: 14 },
  dateButtonText: { fontSize: 14, color: '#2d3436' },
  sectorContainer: { flexDirection: 'row', gap: 8 },
  sectorButton: { backgroundColor: '#f1f3f5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sectorButtonActive: { backgroundColor: '#9b59b6' },
  sectorButtonText: { fontSize: 14, fontWeight: '600', color: '#636e72' },
  sectorButtonTextActive: { color: '#fff' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 12, padding: 8 },
  counterButton: { width: 40, height: 40, backgroundColor: '#f1f3f5', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  counterButtonText: { fontSize: 24, color: '#2d3436', fontWeight: '600' },
  counterValue: { fontSize: 24, fontWeight: 'bold', color: '#2d3436', marginHorizontal: 30 },
  timePickerContainer: { flexDirection: 'row', gap: 12 },
  timePicker: { flex: 1 },
  timeLabel: { fontSize: 12, color: '#636e72', marginBottom: 8, textAlign: 'center' },
  helperText: { fontSize: 12, color: '#636e72', marginTop: 6 },
  identityCard: { backgroundColor: '#e8daef', padding: 16, borderRadius: 12, marginBottom: 16 },
  identityLabel: { fontSize: 12, fontWeight: '600', color: '#6c3483', marginBottom: 4 },
  identityText: { fontSize: 16, fontWeight: 'bold', color: '#6c3483', fontStyle: 'italic' },
  stepsSection: { marginTop: 16 },
  stepsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stepsSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  stepsActions: { flexDirection: 'row', gap: 8 },
  regenerateButton: { backgroundColor: '#5f27cd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  regenerateButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  addStepButton: { backgroundColor: '#9b59b6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addStepButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  stepCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#dee2e6' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepNumber: { fontSize: 12, fontWeight: 'bold', color: '#9b59b6' },
  completedBadge: { backgroundColor: '#d4edda', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  completedBadgeText: { fontSize: 10, color: '#155724', fontWeight: '600' },
  stepInput: { fontSize: 14, color: '#2d3436', minHeight: 60, textAlignVertical: 'top', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 8, marginBottom: 8 },
  stepDurationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  durationLabel: { fontSize: 12, fontWeight: '600', color: '#636e72' },
  durationControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationButton: { width: 30, height: 30, backgroundColor: '#f1f3f5', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  durationButtonText: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  durationValue: { fontSize: 14, fontWeight: 'bold', color: '#2d3436', minWidth: 60, textAlign: 'center' },
  cueText: { fontSize: 12, color: '#636e72', fontStyle: 'italic', marginTop: 4, backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6 },
  removeStepButton: { marginTop: 8, alignSelf: 'flex-end' },
  removeStepButtonText: { fontSize: 12, color: '#e74c3c' },
  tipsCard: { backgroundColor: '#d5f4e6', padding: 16, borderRadius: 12, marginTop: 16 },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: '#0e6251', marginBottom: 8 },
  tipText: { fontSize: 12, color: '#0e6251', marginBottom: 6, lineHeight: 18 },
  saveButton: { backgroundColor: '#27ae60', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  saveButtonDisabled: { backgroundColor: '#95a5a6' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    timeSection: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  padding: 10,
  marginVertical: 8,
  borderRadius: 12,
  backgroundColor: '#F3F4F6', // light container background
},
});