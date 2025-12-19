// app/events/add.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function AddEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priority, setPriority] = useState(3);
  const [repetition, setRepetition] = useState(1);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    const newEvent = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      date: date.toISOString(),
      priority,
      repetition,
      createdAt: new Date().toISOString(),
    };

    try {
      const events = (await storage.get('events', [])) || [];
      events.push(newEvent);
      await storage.set('events', events);
      
      Alert.alert('Success', 'Event added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Event</Text>
        </View>

        <View style={styles.form}>
          {/* Title Input */}
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

          {/* Description Input */}
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

          {/* Date Picker */}
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
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Priority Selector */}
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

          {/* Repetition Input */}
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
            <Text style={styles.helperText}>
              Times this event will appear in your to-do list for preparation
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, !title.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!title.trim()}
          >
            <Text style={styles.submitButtonText}>Submit Event</Text>
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
  helperText: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});