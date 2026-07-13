// app/events/add.tsx - Add Event with AI-powered preparation breakdown + yearly recurrence
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
import { eventPrepAI, type PrepTask } from '../../services/eventPrepAi';
import { storage } from '../../services/storage';

type RecurrenceType = 'none' | 'yearly';

export default function AddEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(3);
  const [repetition, setRepetition] = useState(3);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');

  // AI prep state
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [mindsetStatement, setMindsetStatement] = useState('');
  const [prepTips, setPrepTips] = useState<string[]>([]);
  const [showPrep, setShowPrep] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const generatePrepTasks = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title first');
      return;
    }
    const daysUntil = Math.ceil(
      (date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 0) {
      Alert.alert('Error', 'Please select a future date');
      return;
    }

    setGeneratingPrep(true);
    try {
      const result = await eventPrepAI.generateEventPrep({
        eventTitle: title.trim(),
        eventDescription: description.trim(),
        eventDate: date.toISOString(),
        priority,
        repetition,
      });
      setPrepTasks(result.prepTasks);
      setMindsetStatement(result.mindsetStatement);
      setPrepTips(result.prepTips);
      setShowPrep(true);
      Alert.alert('Ready! 🎯', `Generated ${result.prepTasks.length} prep tasks for "${title}"`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate prep tasks');
    } finally {
      setGeneratingPrep(false);
    }
  };

  const editPrepTask = (index: number, text: string) => {
    setPrepTasks((prev) => prev.map((t, i) => (i === index ? { ...t, text } : t)));
  };

  const removePrepTask = (index: number) => {
    if (prepTasks.length <= 1) {
      Alert.alert('', 'Must keep at least one prep task');
      return;
    }
    setPrepTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addPrepTask = () => {
    setPrepTasks((prev) => [
      ...prev,
      { text: '', daysBeforeEvent: 1, duration: 20, category: 'review' },
    ]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    const baseEvent = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      date: date.toISOString(),
      priority,
      repetition,
      recurrence,
      createdAt: new Date().toISOString(),
      prepTasks: showPrep ? prepTasks : [],
      mindsetStatement: showPrep ? mindsetStatement : '',
      prepTips: showPrep ? prepTips : [],
    };

    try {
      const events = (await storage.get('events', [])) || [];

      if (recurrence === 'yearly') {
        // Create events for the next 5 years
        const yearsToSchedule = 5;
        const recurringEvents = [];
        for (let y = 0; y < yearsToSchedule; y++) {
          const recurDate = new Date(date);
          recurDate.setFullYear(recurDate.getFullYear() + y);
          recurringEvents.push({
            ...baseEvent,
            id: Date.now() + y,
            date: recurDate.toISOString(),
            recurrenceGroupId: baseEvent.id,
            recurrenceYear: recurDate.getFullYear(),
          });
        }
        events.push(...recurringEvents);
        Alert.alert(
          'Success 🎉',
          `Created ${yearsToSchedule} yearly occurrences of "${title}"!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        events.push(baseEvent);
        Alert.alert('Success', 'Event added successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }

      await storage.set('events', events);
    } catch {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    logistics: '#3498db',
    mental: '#9b59b6',
    material: '#27ae60',
    communication: '#e67e22',
    review: '#e74c3c',
  };

  const CATEGORY_ICONS: Record<string, string> = {
    logistics: '🔧',
    mental: '🧠',
    material: '📄',
    communication: '📬',
    review: '✅',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Event</Text>
        </View>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Event title"
              placeholderTextColor="#95a5a6"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Event details (helps AI generate better prep tasks)"
              placeholderTextColor="#95a5a6"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>When</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                📅{' '}
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Recurrence */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Recurrence</Text>
            <View style={styles.recurrenceContainer}>
              {/* One-time */}
              <TouchableOpacity
                style={[
                  styles.recurrenceCard,
                  recurrence === 'none' && styles.recurrenceCardActive,
                ]}
                onPress={() => setRecurrence('none')}
              >
                <Text style={styles.recurrenceIcon}>📌</Text>
                <Text style={[
                  styles.recurrenceLabel,
                  recurrence === 'none' && styles.recurrenceLabelActive,
                ]}>One-time</Text>
                <Text style={styles.recurrenceDesc}>Single occurrence</Text>
              </TouchableOpacity>

              {/* Yearly */}
              <TouchableOpacity
                style={[
                  styles.recurrenceCard,
                  styles.recurrenceCardYearly,
                  recurrence === 'yearly' && styles.recurrenceCardYearlyActive,
                ]}
                onPress={() => setRecurrence('yearly')}
              >
                <Text style={styles.recurrenceIcon}>🗓️</Text>
                <Text style={[
                  styles.recurrenceLabel,
                  recurrence === 'yearly' && styles.recurrenceLabelYearlyActive,
                ]}>Every Year</Text>
                <Text style={styles.recurrenceDesc}>Repeats for 5 years</Text>
              </TouchableOpacity>
            </View>

            {recurrence === 'yearly' && (
              <View style={styles.recurrenceBanner}>
                <Text style={styles.recurrenceBannerIcon}>🗓️</Text>
                <View>
                  <Text style={styles.recurrenceBannerTitle}>Yearly Event</Text>
                  <Text style={styles.recurrenceBannerText}>
                    This will create {5} events — one for each of the next 5 years on{' '}
                    {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Priority */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority (1–5)</Text>
            <View style={styles.priorityContainer}>
              {[1, 2, 3, 4, 5].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityButton, priority === p && styles.priorityButtonActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === p && styles.priorityButtonTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Prep Sessions */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preparation Sessions</Text>
            <View style={styles.repetitionContainer}>
              <TouchableOpacity
                style={styles.repetitionButton}
                onPress={() => setRepetition(Math.max(1, repetition - 1))}
              >
                <Text style={styles.repetitionButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.repetitionValue}>{repetition}</Text>
              <TouchableOpacity
                style={styles.repetitionButton}
                onPress={() => setRepetition(Math.min(14, repetition + 1))}
              >
                <Text style={styles.repetitionButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              Number of AI-generated preparation sessions before the event
            </Text>
          </View>

          {/* AI Prep Button */}
          {!showPrep ? (
            <TouchableOpacity
              style={[styles.aiButton, (generatingPrep || !title.trim()) && styles.aiButtonDisabled]}
              onPress={generatePrepTasks}
              disabled={generatingPrep || !title.trim()}
            >
              {generatingPrep ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.aiButtonText}>  Generating Prep Plan...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.aiButtonIcon}>🤖</Text>
                  <Text style={styles.aiButtonText}>Generate Prep Plan with AI</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {/* Mindset Statement */}
              {mindsetStatement ? (
                <View style={styles.mindsetCard}>
                  <Text style={styles.mindsetLabel}>💪 Your Mindset:</Text>
                  <Text style={styles.mindsetText}>{mindsetStatement}</Text>
                </View>
              ) : null}

              {/* Prep Tasks */}
              <View style={styles.prepSection}>
                <View style={styles.prepSectionHeader}>
                  <Text style={styles.prepSectionTitle}>Preparation Plan ({prepTasks.length})</Text>
                  <View style={styles.prepHeaderActions}>
                    <TouchableOpacity style={styles.regenerateButton} onPress={generatePrepTasks} disabled={generatingPrep}>
                      {generatingPrep ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.regenerateButtonText}>🔄</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addPrepButton} onPress={addPrepTask}>
                      <Text style={styles.addPrepButtonText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {prepTasks.map((task, idx) => (
                  <View key={idx} style={styles.prepTaskCard}>
                    <View style={styles.prepTaskHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[task.category] || '#636e72' }]}>
                        <Text style={styles.categoryBadgeText}>
                          {CATEGORY_ICONS[task.category] || '📌'} {task.category}
                        </Text>
                      </View>
                      <Text style={styles.prepDaysLabel}>
                        D-{task.daysBeforeEvent} · {task.duration}m
                      </Text>
                    </View>

                    <TextInput
                      style={styles.prepTaskInput}
                      value={task.text}
                      onChangeText={(t) => editPrepTask(idx, t)}
                      placeholder="Preparation task..."
                      placeholderTextColor="#95a5a6"
                      multiline
                    />

                    {task.tip ? (
                      <Text style={styles.tipText}>💡 {task.tip}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePrepTask(idx)}
                    >
                      <Text style={styles.removeButtonText}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Prep Tips */}
              {prepTips.length > 0 && (
                <View style={styles.tipsCard}>
                  <Text style={styles.tipsTitle}>📋 Preparation Tips:</Text>
                  {prepTips.map((tip, i) => (
                    <Text key={i} style={styles.tipItem}>• {tip}</Text>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, !title.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!title.trim()}
          >
            <Text style={styles.submitButtonText}>
              {recurrence === 'yearly'
                ? '🗓️ Save Yearly Event (5 years)'
                : showPrep
                ? '🎯 Save Event + Prep Plan'
                : 'Save Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backButtonText: { fontSize: 24, color: '#2d3436' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#2d3436' },
  form: { padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#2d3436', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2d3436',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: { fontSize: 16, color: '#2d3436' },

  // Recurrence
  recurrenceContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  recurrenceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  recurrenceCardActive: {
    borderColor: '#3498db',
    backgroundColor: '#eaf4fb',
  },
  recurrenceCardYearly: {},
  recurrenceCardYearlyActive: {
    borderColor: '#9b59b6',
    backgroundColor: '#f0e8f8',
  },
  recurrenceIcon: { fontSize: 28, marginBottom: 6 },
  recurrenceLabel: { fontSize: 13, fontWeight: '700', color: '#636e72', marginBottom: 3 },
  recurrenceLabelActive: { color: '#3498db' },
  recurrenceLabelYearlyActive: { color: '#9b59b6' },
  recurrenceDesc: { fontSize: 10, color: '#95a5a6', textAlign: 'center' },

  recurrenceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0e8f8',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
  },
  recurrenceBannerIcon: { fontSize: 22 },
  recurrenceBannerTitle: { fontSize: 13, fontWeight: '700', color: '#6c3483', marginBottom: 2 },
  recurrenceBannerText: { fontSize: 12, color: '#7d3c98', lineHeight: 18 },

  priorityContainer: { flexDirection: 'row', gap: 8 },
  priorityButton: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: { backgroundColor: '#e67e22' },
  priorityButtonText: { fontSize: 16, fontWeight: '600', color: '#636e72' },
  priorityButtonTextActive: { color: '#fff' },
  repetitionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 8,
  },
  repetitionButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repetitionButtonText: { fontSize: 24, color: '#2d3436', fontWeight: '600' },
  repetitionValue: { fontSize: 24, fontWeight: 'bold', color: '#2d3436', marginHorizontal: 30 },
  helperText: { fontSize: 12, color: '#636e72', marginTop: 6 },
  aiButton: {
    backgroundColor: '#e67e22',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiButtonDisabled: { backgroundColor: '#95a5a6' },
  aiButtonIcon: { fontSize: 20, marginRight: 8 },
  aiButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  mindsetCard: {
    backgroundColor: '#fef9e7',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  mindsetLabel: { fontSize: 12, fontWeight: '700', color: '#d68910', marginBottom: 4 },
  mindsetText: { fontSize: 15, fontStyle: 'italic', color: '#7d6608', lineHeight: 22 },
  prepSection: { marginBottom: 16 },
  prepSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prepSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3436' },
  prepHeaderActions: { flexDirection: 'row', gap: 8 },
  regenerateButton: {
    backgroundColor: '#e67e22',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regenerateButtonText: { fontSize: 16 },
  addPrepButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPrepButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  prepTaskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  prepTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  prepDaysLabel: { fontSize: 12, color: '#636e72', fontWeight: '600' },
  prepTaskInput: {
    fontSize: 14,
    color: '#2d3436',
    minHeight: 50,
    textAlignVertical: 'top',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#636e72',
    fontStyle: 'italic',
    backgroundColor: '#fff9e6',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  removeButton: { alignSelf: 'flex-end' },
  removeButtonText: { fontSize: 12, color: '#e74c3c' },
  tipsCard: {
    backgroundColor: '#eaf4fb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: '#1a5276', marginBottom: 8 },
  tipItem: { fontSize: 12, color: '#1a5276', marginBottom: 6, lineHeight: 18 },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonDisabled: { backgroundColor: '#95a5a6' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});