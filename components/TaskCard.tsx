// components/TaskCard.tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { notificationService } from '../services/notificationService';
import { storage } from '../services/storage';

interface TaskCardProps {
  task: any;
  onComplete: (task: any, proof: string, attachments: string[]) => void;
  onTaskUpdate?: () => void;
}

export default function TaskCard({ task, onComplete, onTaskUpdate }: TaskCardProps) {
  const [showProofModal, setShowProofModal] = useState(false);
  const [showTimeEditModal, setShowTimeEditModal] = useState(false);
  const [proofText, setProofText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [editedTime, setEditedTime] = useState(
    task.startTime ? parseTimeString(task.startTime) : new Date()
  );
  const [editedDuration, setEditedDuration] = useState(
    task.duration?.toString() || '30'
  );
  const [showTimePicker, setShowTimePicker] = useState(false);

  /* ---------------- Utils ---------------- */
  function parseTimeString(timeStr: string): Date {
    const date = new Date();
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      date.setHours(h, m, 0, 0);
    }
    return date;
  }

  function formatTime(date: Date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  const isOverdue = () =>
    task.startTime &&
    parseTimeString(task.startTime) < new Date() &&
    !task.completed;

  const getTaskColor = () => {
    if (task.completed) return '#95a5a6';
    if (isOverdue()) return '#e74c3c';
    if (task.type === 'goal-step') return '#9b59b6';
    if (task.type === 'event-prep') return '#e67e22';
    return '#3498db';
  };

  /* ---------------- Time Edit ---------------- */
  const handleQuickTimeEdit = () => {
    setShowTimeEditModal(true);
  };

  const handleSaveTimeEdit = async () => {
    try {
      const tasks = await storage.get('dailyTasks', []);
      const updated = tasks.map((t: any) =>
        t.id === task.id
          ? { ...t, startTime: formatTime(editedTime), duration: +editedDuration || 30 }
          : t
      );

      await storage.set('dailyTasks', updated);
      
      // Reschedule all To-day notifications
      await notificationService.refreshToDayReminders();

      setShowTimeEditModal(false);
      onTaskUpdate?.();
      Alert.alert('Success', 'Task time updated and notification rescheduled');
    } catch (error) {
      console.error('Error updating task time:', error);
      Alert.alert('Error', 'Failed to update task time');
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEditedTime(selectedTime);
    }
  };

  /* ---------------- Attachments ---------------- */
  const addAttachment = (uris: string[]) =>
    setAttachments(prev => [...prev, ...uris]);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const takePhoto = async () => {
    setUploading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        setUploading(false);
        return;
      }

      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.canceled && res.assets[0]) {
        addAttachment([res.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
    setUploading(false);
  };

  const pickImage = async () => {
    setUploading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        setUploading(false);
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!res.canceled) {
        addAttachment(res.assets.map(a => a.uri));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
    setUploading(false);
  };

  const pickDocument = async () => {
    setUploading(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({ 
        multiple: true,
        type: '*/*',
      });
      if (!res.canceled) {
        addAttachment(res.assets.map(a => a.uri));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
    setUploading(false);
  };

  const handleComplete = () => {
    // Always show proof modal when clicking complete
    setShowProofModal(true);
  };

  const completeTask = () => {
    // Only validate if task explicitly requires proof
    if (task.requiresProof && !proofText.trim() && attachments.length === 0) {
      Alert.alert('Required', 'Please provide proof of completion (text or attachments)');
      return;
    }
    // Otherwise, allow completion with or without proof
    onComplete(task, proofText.trim(), attachments);
    setShowProofModal(false);
    setProofText('');
    setAttachments([]);
  };

  /* ---------------- Render ---------------- */
  return (
    <>
      <View
        style={[
          styles.card,
          { borderLeftColor: getTaskColor(), borderLeftWidth: 4 },
          task.completed && styles.completedCard,
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.taskInfo}>
            <View style={styles.header}>
              <Text style={[styles.taskName, task.completed && styles.completedText]}>
                {task.name}
              </Text>
              {isOverdue() && !task.completed && (
                <Text style={styles.overdueBadge}>⚠️ OVERDUE</Text>
              )}
            </View>

            {task.description && (
              <Text style={styles.description}>{task.description}</Text>
            )}

            <View style={styles.meta}>
              {task.startTime && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>🕐</Text>
                  <Text style={styles.metaText}>{task.startTime}</Text>
                </View>
              )}
              {task.duration && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⏱️</Text>
                  <Text style={styles.metaText}>{task.duration}m</Text>
                </View>
              )}
              {task.type && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>
                    {task.type === 'goal-step' && '🎯'}
                    {task.type === 'event-prep' && '📅'}
                    {task.type === 'weekly-factor' && '📆'}
                    {task.type === 'leisure' && '🎮'}
                    {' '}
                    {task.type.replace('-', ' ')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            {!task.completed && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleQuickTimeEdit}
                >
                  <Text style={styles.actionIcon}>🕐</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={handleComplete}
                >
                  <Text style={styles.actionIcon}>✓</Text>
                </TouchableOpacity>
              </>
            )}
            {task.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>✓ Done</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Time Edit Modal */}
      <Modal
        visible={showTimeEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task Time</Text>

            <View style={styles.editSection}>
              <Text style={styles.label}>Task Name:</Text>
              <Text style={styles.taskNameDisplay}>{task.name}</Text>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.label}>Scheduled Time:</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeButtonText}>
                  🕐 {formatTime(editedTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.label}>Duration (minutes):</Text>
              <TextInput
                style={styles.durationInput}
                value={editedDuration}
                onChangeText={setEditedDuration}
                keyboardType="numeric"
                placeholder="30"
              />
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={editedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTimeEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveTimeEdit}
              >
                <Text style={styles.saveButtonText}>Save & Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Proof Modal (Optional) */}
      <Modal
        visible={showProofModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProofModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Task</Text>
              <Text style={styles.modalSubtitle}>{task.name}</Text>

              <View style={styles.proofSection}>
                <Text style={styles.label}>
                  Proof of completion {task.requiresProof ? '(required)' : '(optional)'}:
                </Text>
                <TextInput
                  style={styles.proofInput}
                  placeholder={
                    task.requiresProof
                      ? "Describe what you accomplished..."
                      : "Add notes or proof (optional)..."
                  }
                  value={proofText}
                  onChangeText={setProofText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Attachments Display */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.label}>Attachments ({attachments.length}):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {attachments.map((uri, index) => (
                      <View key={index} style={styles.attachmentContainer}>
                        <Image source={{ uri }} style={styles.attachment} />
                        <TouchableOpacity
                          style={styles.removeAttachment}
                          onPress={() => removeAttachment(index)}
                        >
                          <Text style={styles.removeText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Attachment Options */}
              <View style={styles.attachmentOptions}>
                <Text style={styles.label}>Add proof (optional):</Text>
                <View style={styles.attachmentButtons}>
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={takePhoto}
                    disabled={uploading}
                  >
                    <Text style={styles.attachmentIcon}>📷</Text>
                    <Text style={styles.attachmentButtonText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    <Text style={styles.attachmentIcon}>🖼️</Text>
                    <Text style={styles.attachmentButtonText}>Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={pickDocument}
                    disabled={uploading}
                  >
                    <Text style={styles.attachmentIcon}>📎</Text>
                    <Text style={styles.attachmentButtonText}>File</Text>
                  </TouchableOpacity>
                </View>

                {uploading && (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#3498db" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowProofModal(false);
                    setProofText('');
                    setAttachments([]);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={completeTask}
                  disabled={uploading}
                >
                  <Text style={styles.saveButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskInfo: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#95a5a6',
  },
  overdueBadge: {
    fontSize: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  typeBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    color: '#3498db',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#27ae60',
  },
  actionIcon: {
    fontSize: 20,
  },
  completedBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  editSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  taskNameDisplay: {
    fontSize: 16,
    color: '#7f8c8d',
    paddingVertical: 8,
  },
  timeButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  durationInput: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  proofSection: {
    marginBottom: 16,
  },
  proofInput: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  attachmentsSection: {
    marginBottom: 16,
  },
  attachmentContainer: {
    position: 'relative',
    marginRight: 12,
  },
  attachment: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  attachmentOptions: {
    marginBottom: 16,
  },
  attachmentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  attachmentButton: {
    flex: 1,
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  attachmentIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  attachmentButtonText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#7f8c8d',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});