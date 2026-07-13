// components/TaskCard.tsx - Daily Focus task row per Serene Logic design
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
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
import { Colors, Type } from '../constants/theme';
import { notificationService } from '../services/notificationService';
import { storage } from '../services/storage';

interface TaskCardProps {
  task: any;
  onComplete: (task: any, proof: string, attachments: string[]) => void;
  onTaskUpdate?: () => void;
}

const TYPE_META: Record<string, { label: string; bg: string; fg: string; accent: string }> = {
  'weekly-factor': { label: 'Habit', bg: Colors.surfaceContainer, fg: Colors.primary, accent: Colors.primary },
  'goal-step': { label: 'Goal Step', bg: Colors.secondaryFixed, fg: '#2f2ebe', accent: Colors.secondary },
  'event-prep': { label: 'Event Prep', bg: '#e0e3e5', fg: '#444749', accent: Colors.tertiary },
  'leisure': { label: 'Leisure', bg: Colors.primaryFixed, fg: Colors.onPrimaryFixed, accent: Colors.primaryFixedDim },
};

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

  const meta = TYPE_META[task.type] ?? TYPE_META['weekly-factor'];
  const accentColor = task.completed
    ? Colors.outlineVariant
    : isOverdue()
    ? Colors.error
    : meta.accent;

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
    } catch {
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
    } catch {
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
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
    setUploading(false);
  };

  const handleComplete = () => {
    if (task.completed) return;
    setShowProofModal(true);
  };

  const completeTask = () => {
    // Only validate if task explicitly requires proof
    if (task.requiresProof && !proofText.trim() && attachments.length === 0) {
      Alert.alert('Required', 'Please provide proof of completion (text or attachments)');
      return;
    }
    onComplete(task, proofText.trim(), attachments);
    setShowProofModal(false);
    setProofText('');
    setAttachments([]);
  };

  /* ---------------- Render ---------------- */
  return (
    <>
      <View style={[styles.card, task.completed && styles.completedCard]}>
        <View style={[styles.cardContent, { borderLeftColor: accentColor }]}>
          {/* Checkbox */}
          <TouchableOpacity
            style={[styles.checkbox, task.completed && styles.checkboxChecked]}
            onPress={handleComplete}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!task.completed }}
          >
            {task.completed && <MaterialIcons name="check" size={14} color="#fff" />}
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.taskInfo}>
            <Text style={[styles.taskName, task.completed && styles.completedText]}>
              {task.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                <Text style={[styles.chipText, { color: meta.fg }]}>{meta.label}</Text>
              </View>
              {task.startTime ? (
                <Text style={styles.timeText}>
                  {task.startTime}
                  {task.duration ? ` · ${task.duration}m` : ''}
                </Text>
              ) : null}
              {isOverdue() && !task.completed && (
                <Text style={styles.overdueText}>Overdue</Text>
              )}
            </View>
          </View>

          {/* Time edit */}
          {!task.completed && (
            <TouchableOpacity
              style={styles.trailingBtn}
              onPress={handleQuickTimeEdit}
              activeOpacity={0.6}
            >
              <MaterialIcons name="schedule" size={18} color="rgba(193,200,200,0.9)" />
            </TouchableOpacity>
          )}
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
              <Text style={styles.label}>Task Name</Text>
              <Text style={styles.taskNameDisplay}>{task.name}</Text>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.label}>Scheduled Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <MaterialIcons name="schedule" size={18} color="#fff" />
                <Text style={styles.timeButtonText}>{formatTime(editedTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.durationInput}
                value={editedDuration}
                onChangeText={setEditedDuration}
                keyboardType="numeric"
                placeholder="30"
                placeholderTextColor={Colors.outlineVariant}
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
                  Proof of completion {task.requiresProof ? '(required)' : '(optional)'}
                </Text>
                <TextInput
                  style={styles.proofInput}
                  placeholder={
                    task.requiresProof
                      ? 'Describe what you accomplished...'
                      : 'Add notes or proof (optional)...'
                  }
                  placeholderTextColor={Colors.outlineVariant}
                  value={proofText}
                  onChangeText={setProofText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Attachments Display */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.label}>Attachments ({attachments.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {attachments.map((uri, index) => (
                      <View key={index} style={styles.attachmentContainer}>
                        <Image source={{ uri }} style={styles.attachment} />
                        <TouchableOpacity
                          style={styles.removeAttachment}
                          onPress={() => removeAttachment(index)}
                        >
                          <MaterialIcons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Attachment Options */}
              <View style={styles.attachmentOptions}>
                <Text style={styles.label}>Add proof (optional)</Text>
                <View style={styles.attachmentButtons}>
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={takePhoto}
                    disabled={uploading}
                  >
                    <MaterialIcons name="photo-camera" size={22} color={Colors.primary} />
                    <Text style={styles.attachmentButtonText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    <MaterialIcons name="image" size={22} color={Colors.primary} />
                    <Text style={styles.attachmentButtonText}>Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={pickDocument}
                    disabled={uploading}
                  >
                    <MaterialIcons name="attach-file" size={22} color={Colors.primary} />
                    <Text style={styles.attachmentButtonText}>File</Text>
                  </TouchableOpacity>
                </View>

                {uploading && (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color={Colors.secondary} />
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
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  completedCard: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderLeftWidth: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 16,
    fontFamily: Type.geistBold,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(65,72,72,0.7)',
    fontFamily: Type.geistMedium,
  },
  overdueText: {
    fontSize: 10,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Type.geistBold,
  },
  trailingBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Modals ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35,49,68,0.4)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 8,
    color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.outline,
    marginBottom: 16,
    fontFamily: 'Inter_400Regular',
  },
  editSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: Colors.outline,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: Type.geistBold,
  },
  taskNameDisplay: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    paddingVertical: 8,
    fontFamily: 'Inter_400Regular',
  },
  timeButton: {
    backgroundColor: Colors.secondary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  timeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Type.geistSemiBold,
  },
  durationInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
    color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  proofSection: {
    marginBottom: 16,
  },
  proofInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
    color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
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
    borderRadius: 12,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  attachmentButtonText: {
    fontSize: 12,
    color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
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
    color: Colors.outline,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surfaceContainer,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.outline,
    fontSize: 15,
    fontFamily: Type.geistSemiBold,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Type.geistSemiBold,
  },
});
