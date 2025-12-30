// components/TaskCard.tsx - Updated with file and photo attachment
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    startTime?: string;
    endTime?: string;
    type: string;
    completed: boolean;
    proof?: string;
    attachments?: string[];
    goalId?: string;
    stepIndex?: number;
    duration?: number;
  };
  onComplete: (task: any, proof: string, attachments: string[]) => void;
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [showProof, setShowProof] = useState(false);
  const [proofText, setProofText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take photos'
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Media library permission is needed to select photos'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      setUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachments([...attachments, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setAttachments([...attachments, ...newUris]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    } finally {
      setUploading(false);
    }
  };

  const pickDocument = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map(asset => asset.uri);
        setAttachments([...attachments, ...newUris]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Add Proof',
      'Choose an option to add proof of completion',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Attach File',
          onPress: pickDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleComplete = () => {
    if (!proofText.trim() && attachments.length === 0) {
      Alert.alert(
        'Proof Required',
        'Please add notes or attach proof of completion'
      );
      return;
    }
    onComplete(task, proofText, attachments);
    setShowProof(false);
    setProofText('');
    setAttachments([]);
  };

  const getFileType = (uri: string) => {
    const extension = uri.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    return 'file';
  };

  const getFileName = (uri: string) => {
    return uri.split('/').pop() || 'File';
  };

  return (
    <View
      style={[
        styles.container,
        task.completed ? styles.completedContainer : styles.pendingContainer,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskName,
              task.completed && styles.completedText,
            ]}
          >
            {task.name}
          </Text>
          
          {task.startTime && task.endTime && (
            <Text style={styles.timeText}>
              {task.startTime} - {task.endTime}
            </Text>
          )}
          
          {task.duration && (
            <Text style={styles.durationText}>
              ⏱️ {task.duration} minutes
            </Text>
          )}
          
          <View style={styles.badges}>
            {task.type === 'goal-step' && (
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>Goal Task</Text>
              </View>
            )}
            
            {task.type === 'weekly-factor' && (
              <View style={styles.weeklyBadge}>
                <Text style={styles.weeklyBadgeText}>Weekly Task</Text>
              </View>
            )}
            
            {task.completed && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsBadgeText}>+0.25 pts</Text>
              </View>
            )}
          </View>
        </View>

        {!task.completed && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => setShowProof(!showProof)}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>

      {showProof && !task.completed && (
        <View style={styles.proofSection}>
          {/* Text Input */}
          <TextInput
            style={styles.proofInput}
            placeholder="Add notes about completion..."
            placeholderTextColor="#95a5a6"
            value={proofText}
            onChangeText={setProofText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Attachments Display */}
          {attachments.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.attachmentsScroll}
            >
              {attachments.map((uri, index) => (
                <View key={index} style={styles.attachmentItem}>
                  {getFileType(uri) === 'image' ? (
                    <Image 
                      source={{ uri }} 
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.fileAttachment}>
                      <Text style={styles.fileIcon}>📄</Text>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {getFileName(uri)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={() => removeAttachment(index)}
                  >
                    <Text style={styles.removeAttachmentText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Add Attachment Button */}
          <TouchableOpacity
            style={styles.addAttachmentButton}
            onPress={showAttachmentOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#3498db" size="small" />
            ) : (
              <>
                <Text style={styles.addAttachmentIcon}>📎</Text>
                <Text style={styles.addAttachmentText}>
                  Add Photo or File
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleComplete}
            disabled={uploading}
          >
            <Text style={styles.confirmButtonText}>
              Confirm Completion (+0.25 pts)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowProof(false);
              setProofText('');
              setAttachments([]);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {task.completed && (
        <View style={styles.completedProofSection}>
          {task.proof && (
            <>
              <Text style={styles.proofLabel}>Notes:</Text>
              <Text style={styles.proofText}>{task.proof}</Text>
            </>
          )}
          
          {task.attachments && task.attachments.length > 0 && (
            <>
              <Text style={styles.proofLabel}>Attachments:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.completedAttachmentsScroll}
              >
                {task.attachments.map((uri, index) => (
                  <View key={index} style={styles.completedAttachmentItem}>
                    {getFileType(uri) === 'image' ? (
                      <Image 
                        source={{ uri }} 
                        style={styles.completedAttachmentImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.completedFileAttachment}>
                        <Text style={styles.fileIcon}>📄</Text>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {getFileName(uri)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  pendingContainer: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  completedContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#636e72',
  },
  timeText: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 2,
  },
  durationText: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalBadge: {
    backgroundColor: '#e8daef',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalBadgeText: {
    fontSize: 10,
    color: '#6c3483',
    fontWeight: '600',
  },
  weeklyBadge: {
    backgroundColor: '#d6eaf8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weeklyBadgeText: {
    fontSize: 10,
    color: '#1f618d',
    fontWeight: '600',
  },
  pointsBadge: {
    backgroundColor: '#d5f4e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pointsBadgeText: {
    fontSize: 10,
    color: '#0e6251',
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  proofSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  proofInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2d3436',
    minHeight: 80,
    marginBottom: 12,
  },
  attachmentsScroll: {
    marginBottom: 12,
  },
  attachmentItem: {
    position: 'relative',
    marginRight: 8,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
  },
  fileAttachment: {
    width: 100,
    height: 100,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  fileIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 10,
    color: '#636e72',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#e74c3c',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAttachmentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addAttachmentButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addAttachmentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addAttachmentText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  completedProofSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#c3e6cb',
  },
  proofLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },
  proofText: {
    fontSize: 12,
    color: '#155724',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 8,
  },
  completedAttachmentsScroll: {
    marginTop: 4,
  },
  completedAttachmentItem: {
    marginRight: 8,
  },
  completedAttachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#d4edda',
  },
  completedFileAttachment: {
    width: 80,
    height: 80,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
});