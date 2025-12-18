import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { DailyTask } from '../types';

type Props = {
  task: DailyTask;
  onComplete?: (task: DailyTask) => void;
};

export default function TaskCard({ task, onComplete }: Props) {
  return (
    <View style={{ padding: 12, backgroundColor: '#fff', marginBottom: 8, borderRadius: 10 }}>
      <Text style={{ fontWeight: '600' }}>{task.name}</Text>
      {task.startTime && (
        <Text style={{ color: '#666' }}>{task.startTime} - {task.endTime}</Text>
      )}
      <TouchableOpacity onPress={() => onComplete?.(task)} style={{ marginTop: 8, backgroundColor: '#2ecc71', padding: 8, borderRadius: 8 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Complete</Text>
      </TouchableOpacity>
    </View>
  );
}