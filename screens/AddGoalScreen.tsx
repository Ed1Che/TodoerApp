// app/goals/add.tsx - Updated with AI Integration
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { githubAI, type GoalBreakdownRequest } from '../services/githubAi';
import { storage } from '../services/storage';

export default function AddGoalScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState<'morning' | 'evening' | 'night'>('morning');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sector, setSector] = useState('Academic');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [steps, setSteps] = useState<any[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [habitTips, setHabitTips] = useState<string[]>([]);
  const [identityStatement, setIdentityStatement] = useState('');

  const sectors = ['Academic', 'Finance', 'Social', 'Cyber', 'Health', 'Hobbies'];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const breakdownGoalWithAI = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a goal description first');
      return;
    }

    setLoading(true);
    try {
      const request: GoalBreakdownRequest = {
        goalDescription: description,
        sector,
        preferredTime,
        endDate: endDate.toISOString(),
        timesPerWeek,
      };

      // Call the AI service
      const response = await githubAI.breakdownGoal(request);

      // Set the generated steps and tips
      setSteps(response.steps);
      setHabitTips(response.habitFormationTips);
      setIdentityStatement(response.identityStatement);
      setShowSteps(true);

      Alert.alert(
        'Success! 🎯',
        `Generated ${response.steps.length} atomic habit steps based on Atomic Habits principles!`
      );
    } catch (error: any) {
      console.error('AI Breakdown Error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate steps. Please check your internet connection and API key.'
      );
    } finally {
      setLoading(false);
    }
  };

  const editStep = (index: number, newText: string) => {
    const updatedSteps = steps.map((step, idx) =>
      idx === index ? { ...step, text: newText } : step
    );
    setSteps(updatedSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const addStep = () => {
    setSteps([...steps, { text: '', completed: false }]);
  };

  const submitGoal = async () => {
    if (!description.trim() || steps.length === 0) {
      Alert.alert('Error', 'Please complete all fields and generate steps');
      return;
    }

    try {
      const newGoal = {
        id: Date.now(),
        description: description.trim(),
        preferredTime,
        endDate: endDate.toISOString(),
        sector,
        timesPerWeek,
        steps,
        progress: 0,
        createdAt: new Date().toISOString(),
        identityStatement,
        habitTips,
      };

      const goals = (await storage.get('goals', [])) || [];
      goals.push(newGoal);
      await storage.set('goals', goals);

      Alert.alert('Success', 'Goal created with AI-powered habit steps!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Goal</Text>
        </View>

        <View style={styles.form}>
          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Goal Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your goal in detail..."
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
              {(['morning', 'evening', 'night'] as const).map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeButton,
                    preferredTime === time && styles.timeButtonActive,
                  ]}
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

          {/* AI Breakdown Button */}
          {!showSteps ? (
            <TouchableOpacity
              style={[styles.aiButton, loading && styles.aiButtonDisabled]}
              onPress={breakdownGoalWithAI}
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.aiButtonText}>  Generating Atomic Habits...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.aiButtonIcon}>🤖</Text>
                  <Text style={styles.aiButtonText}>Break Down with AI</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {/* Identity Statement */}
              {identityStatement && (
                <View style={styles.identityCard}>
                  <Text style={styles.identityLabel}>Your New Identity:</Text>
                  <Text style={styles.identityText}>{identityStatement}</Text>
                </View>
              )}

              {/* Generated Steps */}
              <View style={styles.stepsSection}>
                <View style={styles.stepsSectionHeader}>
                  <Text style={styles.stepsSectionTitle}>Atomic Habit Steps</Text>
                  <TouchableOpacity onPress={addStep} style={styles.addStepButton}>
                    <Text style={styles.addStepButtonText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {steps.map((step, idx) => (
                  <View key={idx} style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <Text style={styles.stepNumber}>Step {idx + 1}</Text>
                      {step.habitType && (
                        <View style={styles.habitTypeBadge}>
                          <Text style={styles.habitTypeText}>
                            {step.habitType}
                          </Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.stepInput}
                      value={step.text}
                      onChangeText={(text) => editStep(idx, text)}
                      multiline
                      placeholder="Step description..."
                      placeholderTextColor="#95a5a6"
                    />
                    {step.cueStackingIdea && (
                      <Text style={styles.cueText}>💡 {step.cueStackingIdea}</Text>
                    )}
                    {step.estimatedDuration && (
                      <Text style={styles.durationText}>
                        ⏱️ ~{step.estimatedDuration} min
                      </Text>
                    )}
                    <TouchableOpacity
                      onPress={() => removeStep(idx)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Habit Formation Tips */}
              {habitTips.length > 0 && (
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>💪 Habit Formation Tips:</Text>
                  {habitTips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitGoal}
              >
                <Text style={styles.submitButtonText}>Create Goal</Text>
              </TouchableOpacity>

              {/* Regenerate Button */}
              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={breakdownGoalWithAI}
              >
                <Text style={styles.regenerateButtonText}>
                  🔄 Regenerate Steps
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#2d3436',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2d3436',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  timeButton: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeButtonActive: {
    backgroundColor: '#9b59b6',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636e72',
  },
  timeButtonTextActive: {
    color: '#fff',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#2d3436',
  },
  sectorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sectorButton: {
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sectorButtonActive: {
    backgroundColor: '#9b59b6',
  },
  sectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636e72',
  },
  sectorButtonTextActive: {
    color: '#fff',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 8,
  },
  counterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    color: '#2d3436',
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginHorizontal: 30,
  },
  aiButton: {
    backgroundColor: '#5f27cd',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  aiButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  aiButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityCard: {
    backgroundColor: '#e8daef',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  identityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c3483',
    marginBottom: 4,
  },
  identityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c3483',
    fontStyle: 'italic',
  },
  stepsSection: {
    marginTop: 16,
  },
  stepsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  addStepButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addStepButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  habitTypeBadge: {
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  habitTypeText: {
    fontSize: 10,
    color: '#636e72',
    fontWeight: '600',
  },
  stepInput: {
    fontSize: 14,
    color: '#2d3436',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cueText: {
    fontSize: 12,
    color: '#636e72',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 4,
  },
  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  removeButtonText: {
    fontSize: 12,
    color: '#e74c3c',
  },
  tipsCard: {
    backgroundColor: '#d5f4e6',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0e6251',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#0e6251',
    marginBottom: 6,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  regenerateButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#5f27cd',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  regenerateButtonText: {
    color: '#5f27cd',
    fontSize: 14,
    fontWeight: '600',
  },
});