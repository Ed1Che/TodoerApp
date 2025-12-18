import * as DocumentPicker from 'expo-document-picker';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import TaskCard from '../components/TaskCard';
import { generateDailySchedule } from '../services/scheduler';
import { storage } from '../services/storage';

export function HomeScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, any[]>>({});
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const g = await storage.get('goals', []);
      const wf = await storage.get('weeklyFactors', {});
      setGoals(g || []);
      setWeeklyFactors(wf || {});
    })();
  }, []);

  const generate = async () => {
    const schedule = generateDailySchedule(new Date(), goals, weeklyFactors);
    setDailyTasks(schedule);
    await storage.set('dailyTasks', schedule);
    Alert.alert('Generated', `Created ${schedule.length} tasks for today`);
  };

  const handleComplete = async (task:any) => {
    // ask for proof attachment
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    const uri = !res.canceled ? res.assets?.[0]?.uri : null;

    // update stored dailyTasks
    const stored = (await storage.get('dailyTasks', [])) || [];
    const updated = stored.map((t:any) => t.id === task.id ? { ...t, completed: true, attachments: uri ? [...(t.attachments||[]), uri] : t.attachments } : t);
    await storage.set('dailyTasks', updated);
    setDailyTasks(updated);

    // if goal-step, mark goal step completed
    if (task.type === 'goal-step' && task.goalId != null) {
      const allGoals = (await storage.get('goals', [])) || [];
      const gIndex = allGoals.findIndex((g:any)=> g.id === task.goalId);
      if (gIndex !== -1) {
        allGoals[gIndex].steps[task.stepIndex].completed = true;
        await storage.set('goals', allGoals);
        setGoals(allGoals);
      }
    }

    Alert.alert('Completed', 'Task marked complete and proof attached');
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        <Text style={{ fontSize: 28, fontWeight: '700', marginBottom: 12 }}>ToDoer</Text>

        <Link href="../app/goals/add" asChild>
          <TouchableOpacity style={{ marginBottom: 12, padding: 12, backgroundColor: '#6c5ce7', borderRadius: 10 }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Add Goal</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity onPress={generate} style={{ marginBottom: 12, padding: 12, backgroundColor: '#00b894', borderRadius: 10 }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>Generate Today's Tasks</Text>
        </TouchableOpacity>

        <View>
          {dailyTasks.length === 0 ? (
            <Text style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>No tasks - press Generate</Text>
          ) : (
            dailyTasks.map((t:any) => (
              <TaskCard key={t.id} task={t} onComplete={handleComplete} />
            ))
          )}
        </View>

        <Link href="../app/(tabs)/goals" asChild>
          <TouchableOpacity style={{ marginTop: 20 }}>
            <Text style={{ color: '#0984e3' }}>Review Goals</Text>
          </TouchableOpacity>
        </Link>

        <Link href="../app/(tabs)/weekly" asChild>
          <TouchableOpacity style={{ marginTop: 12 }}>
            <Text style={{ color: '#0984e3' }}>Weekly Factor</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}


export default HomeScreen;
