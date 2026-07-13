// app/events/[id].tsx
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
import { storage } from '../../services/storage';

export default function ViewEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(3);
  const [repetition, setRepetition] = useState(1);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      const events = (await storage.get('events', [])) || [];
      const foundEvent = events.find((e: any) => e.id.toString() === id);
      
      if (foundEvent) {
        setEvent(foundEvent);
        setTitle(foundEvent.title);
        setDescription(foundEvent.description || '');
        setDate(new Date(foundEvent.date));
        setPriority(foundEvent.priority);
        setRepetition(foundEvent.repetition);
      } else {
        Alert.alert('Error', 'Event not found', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    try {
      const events = (await storage.get('events', [])) || [];
      const updatedEvents = events.map((e: any) =>
        e.id.toString() === id
          ? {
              ...e,
              title: title.trim(),
              description: description.trim(),
              date: date.toISOString(),
              priority,
              repetition,
            }
          : e
      );
      
      await storage.set('events', updatedEvents);
      setEditing(false);
      loadEvent();
      Alert.alert('Success', 'Event updated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const events = (await storage.get('events', [])) || [];
              const updatedEvents = events.filter((e: any) => e.id.toString() !== id);
              await storage.set('events', updatedEvents);
              Alert.alert('Success', 'Event deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const getEventColor = () => {
    if (!event) return '#27ae60';
    const today = new Date();
    const eventDate = new Date(event.date);
    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 3) return '#e74c3c';
    if (daysUntil <= 7) return '#e67e22';
    if (daysUntil <= 14) return '#f39c12';
    return '#27ae60';
  };

  const getDaysUntil = () => {
    if (!event) return 0;
    const today = new Date();
    const eventDate = new Date(event.date);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Event Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getEventColor() }]}>
          <Text style={styles.statusText}>
            {getDaysUntil() > 0
              ? `${getDaysUntil()} day${getDaysUntil() === 1 ? '' : 's'} until event`
              : getDaysUntil() === 0
              ? 'Event is today!'
              : 'Event has passed'}
          </Text>
        </View>

        <View style={styles.content}>
          {editing ? (
            // Edit Mode
            <>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Event details"
                  placeholderTextColor="#95a5a6"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>When</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
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
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Priority (1-5)</Text>
                <View style={styles.priorityContainer}>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityButton,
                        priority === p && styles.priorityButtonActive,
                      ]}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Repetition before D-day</Text>
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
                    onPress={() => setRepetition(repetition + 1)}
                  >
                    <Text style={styles.repetitionButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdate}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditing(false);
                    setTitle(event.title);
                    setDescription(event.description || '');
                    setDate(new Date(event.date));
                    setPriority(event.priority);
                    setRepetition(event.repetition);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // View Mode
            <>
              <Text style={styles.eventTitle}>{event.title}</Text>

              <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>
                    {event.description || 'No description'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityBadgeText}>
                      Level {event.priority}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Preparation Reminders</Text>
                  <Text style={styles.detailValue}>
                    {event.repetition} time{event.repetition === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
              {/* AI Preparation Plan */}
              {event.prepTasks && event.prepTasks.length > 0 && (
                <>
                  {/* Mindset */}
                  {event.mindsetStatement ? (
                    <View style={styles.mindsetCard}>
                      <Text style={styles.mindsetLabel}>💪 Mindset</Text>
                      <Text style={styles.mindsetText}>
                        {event.mindsetStatement}
                      </Text>
                    </View>
                  ) : null}

                  {/* Preparation Tasks */}
                  <View style={styles.prepSection}>
                    <Text style={styles.prepSectionTitle}>
                      🎯 Preparation Plan
                    </Text>

                    {event.prepTasks.map((task: any, index: number) => (
                      <View key={index} style={styles.prepTaskCard}>
                        <View style={styles.prepTaskHeader}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor:
                                  CATEGORY_COLORS[task.category] || '#636e72',
                              },
                            ]}
                          >
                            <Text style={styles.categoryBadgeText}>
                              {CATEGORY_ICONS[task.category] || '📌'}{' '}
                              {task.category}
                            </Text>
                          </View>

                          <Text style={styles.prepDaysLabel}>
                            D-{task.daysBeforeEvent} · {task.duration}m
                          </Text>
                        </View>

                        <Text style={styles.prepTaskText}>
                          {task.text}
                        </Text>

                        {task.tip ? (
                          <Text style={styles.tipText}>
                            💡 {task.tip}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  {/* AI Tips */}
                  {event.prepTips && event.prepTips.length > 0 && (
                    <View style={styles.tipsCard}>
                      <Text style={styles.tipsTitle}>
                        📋 Preparation Tips
                      </Text>

                      {event.prepTips.map((tip: string, index: number) => (
                        <Text key={index} style={styles.tipItem}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  )}
                </>
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete Event</Text>
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
    justifyContent: 'space-between',
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
  },
  backButtonText: {
    fontSize: 24,
    color: '#2d3436',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    flex: 1,
    marginLeft: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#636e72',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#2d3436',
    fontWeight: '500',
  },
  priorityBadge: {
    backgroundColor: '#3498db',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priorityBadgeText: {
    color: '#fff',
    fontWeight: '600',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2d3436',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#3498db',
  },
  priorityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636e72',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
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
  repetitionButtonText: {
    fontSize: 24,
    color: '#2d3436',
    fontWeight: '600',
  },
  repetitionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginHorizontal: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mindsetCard: {
  backgroundColor: '#fef9e7',
  borderLeftWidth: 4,
  borderLeftColor: '#f39c12',
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
},

mindsetLabel: {
  fontSize: 13,
  fontWeight: '700',
  color: '#d68910',
  marginBottom: 6,
},

mindsetText: {
  fontSize: 15,
  color: '#7d6608',
  fontStyle: 'italic',
  lineHeight: 22,
},

prepSection: {
  marginBottom: 20,
},

prepSectionTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#2d3436',
  marginBottom: 12,
},

prepTaskCard: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#dee2e6',
},

prepTaskHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
},

categoryBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
},

categoryBadgeText: {
  color: '#fff',
  fontSize: 11,
  fontWeight: '600',
},

prepDaysLabel: {
  fontSize: 12,
  color: '#636e72',
  fontWeight: '600',
},

prepTaskText: {
  fontSize: 15,
  color: '#2d3436',
  lineHeight: 22,
  marginBottom: 8,
},

tipText: {
  fontSize: 12,
  color: '#636e72',
  fontStyle: 'italic',
  backgroundColor: '#fff9e6',
  padding: 8,
  borderRadius: 6,
},

tipsCard: {
  backgroundColor: '#eaf4fb',
  padding: 16,
  borderRadius: 12,
  marginBottom: 20,
},

tipsTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#1a5276',
  marginBottom: 8,
},

tipItem: {
  fontSize: 13,
  color: '#1a5276',
  marginBottom: 6,
  lineHeight: 20,
},
});