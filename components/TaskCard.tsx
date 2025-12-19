import React, { useState } from 'react';
import {
  Alert,
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
    goalId?: string;
    stepIndex?: number;
  };
  onComplete: (task: any, proof: string) => void;
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
  const [showProof, setShowProof] = useState(false);
  const [proofText, setProofText] = useState('');

  const handleComplete = () => {
    if (proofText.trim() === '') {
      Alert.alert('Proof Required', 'Please add notes or proof of completion');
      return;
    }
    onComplete(task, proofText);
    setShowProof(false);
    setProofText('');
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
          <TextInput
            style={styles.proofInput}
            placeholder="Add notes or proof of completion..."
            placeholderTextColor="#95a5a6"
            value={proofText}
            onChangeText={setProofText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleComplete}
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
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {task.completed && task.proof && (
        <View style={styles.completedProofSection}>
          <Text style={styles.proofLabel}>Proof:</Text>
          <Text style={styles.proofText}>{task.proof}</Text>
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
    marginBottom: 8,
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
  },
});