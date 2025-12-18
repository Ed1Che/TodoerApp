import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { breakdownGoalWithGitHubAI } from '../services/githubAi';
import { storage } from '../services/storage';

export default function AddGoalScreen(){
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState('3');

  const breakDown = async () => {
    if (!description.trim()) { Alert.alert('Enter goal first'); return; }
    const ai = await breakdownGoalWithGitHubAI(description);
    setSteps(ai);
  };

  const addStepField = () => setSteps(prev => [...prev, '']);
  const updateStep = (i:number, txt:string) => { const copy=[...steps]; copy[i]=txt; setSteps(copy); };

  const submit = async () => {
    if (!description.trim()) { Alert.alert('Goal required'); return; }
    const goals = (await storage.get('goals', [])) || [];
    const newGoal = {
      id: Date.now(),
      description,
      steps: steps.map(s=>({ text: s, completed: false })),
      timesPerWeek: Number(timesPerWeek) || 3
    };
    await storage.set('goals', [...goals, newGoal]);
    Alert.alert('Saved', 'Goal added');
    router.push('/');
  };

  return (
    <SafeAreaView style={{ flex:1, padding:16 }}>
      <ScrollView>
        <Text style={{ fontSize:20, fontWeight:'700', marginBottom:12 }}>Add Goal</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Describe your goal" style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginBottom:12 }} />
        <View style={{ flexDirection:'row', marginBottom:12 }}>
          <TouchableOpacity onPress={breakDown} style={{ flex:1, backgroundColor:'#6c5ce7', padding:12, borderRadius:8, marginRight:8 }}>
            <Text style={{ color:'#fff', textAlign:'center' }}>Break Down with GH AI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addStepField} style={{ width:64, backgroundColor:'#00b894', padding:12, borderRadius:8 }}>
            <Text style={{ color:'#fff', textAlign:'center' }}>+Step</Text>
          </TouchableOpacity>
        </View>

        {steps.map((s,i)=> (
          <View key={i} style={{ marginBottom:8 }}>
            <TextInput value={s} onChangeText={(t)=>updateStep(i,t)} style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:6 }} />
          </View>
        ))}

        <Text style={{ marginTop:8 }}>Times per week</Text>
        <TextInput value={timesPerWeek} onChangeText={setTimesPerWeek} keyboardType="numeric" style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:6, marginBottom:12 }} />

        <TouchableOpacity onPress={submit} style={{ backgroundColor:'#00b894', padding:12, borderRadius:8 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Save Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
