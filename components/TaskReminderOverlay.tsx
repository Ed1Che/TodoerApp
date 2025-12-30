import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Props {
  visible: boolean;
  taskName: string;
  taskDuration: number; // minutes
  onDismiss: () => void;
}

export default function TaskReminderOverlay({
  visible,
  taskName,
  taskDuration,
  onDismiss,
}: Props) {
  const router = useRouter();
  const intervalRef = useRef<number | null>(null);

  const [timeRemaining, setTimeRemaining] = useState(taskDuration * 60);
  const [timerActive, setTimerActive] = useState(false);

  /* Reset timer when modal opens */
  useEffect(() => {
    if (visible) {
      setTimeRemaining(taskDuration * 60);
      setTimerActive(false);
    }
  }, [visible, taskDuration]);

  /* Countdown logic */
  useEffect(() => {
    if (!timerActive) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimerActive(false);
          onDismiss();
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [timerActive]);

  const startTask = () => {
    if (!timerActive) {
      setTimerActive(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>⏰ Task Reminder</Text>

          <Text style={styles.taskName}>{taskName}</Text>
          <Text style={styles.duration}>
            Duration: {taskDuration} minutes
          </Text>

          {timerActive && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                {formatTime(timeRemaining)}
              </Text>
              <Text style={styles.timerLabel}>remaining</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Exit Reminder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                timerActive && { backgroundColor: '#b2bec3' },
              ]}
              disabled={timerActive}
              onPress={startTask}
            >
              <Text style={styles.startButtonText}>
                {timerActive ? 'In Progress...' : 'Do Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: Dimensions.get('window').width - 48,
    elevation: 8,
  },
  reminderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  taskName: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    color: '#2d3436',
  },
  duration: {
    fontSize: 14,
    textAlign: 'center',
    color: '#636e72',
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3498db',
  },
  timerLabel: {
    fontSize: 14,
    color: '#636e72',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
