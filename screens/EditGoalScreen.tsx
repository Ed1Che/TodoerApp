import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { storage } from '../services/storage';

export default function EditGoalScreen(){
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalId = params.id;
  const [goal, setGoal] = useState<any>(null);
  const [desc, setDesc] = useState('');

  useEffect(()=>{ (async()=>{ const all = await storage.get('goals',[]); const g = (all||[]).find((x:any)=> String(x.id) === String(goalId)); if (g) { setGoal(g); setDesc(g.description); } })(); },[goalId]);

  const save = async () => {
    const all = (await storage.get('goals',[])) || [];
    const idx = all.findIndex((x:any)=> String(x.id) === String(goalId));
    if (idx === -1) { Alert.alert('Not found'); return; }
    all[idx].description = desc;
    await storage.set('goals', all);
    Alert.alert('Saved');
    router.push('/');
  };

  if (!goal) return <SafeAreaView style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex:1, padding:16 }}>
      <ScrollView>
        <Text style={{ fontSize:20, fontWeight:'700', marginBottom:12 }}>Edit Goal</Text>
        <TextInput value={desc} onChangeText={setDesc} style={{ borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginBottom:12 }} />

        <Text style={{ fontWeight:'700', marginTop:12 }}>Steps</Text>
        {goal.steps.map((s:any,i:number)=> (
          <View key={i} style={{ backgroundColor:'#fff', padding:8, borderRadius:8, marginTop:8 }}>
            <TextInput value={s.text} onChangeText={(t)=>{ const copy=[...goal.steps]; copy[i].text = t; setGoal({...goal, steps: copy}); }} style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:6 }} />
            <View style={{ flexDirection:'row', marginTop:8 }}>
              <TouchableOpacity onPress={async ()=>{ const all = (await storage.get('goals',[])) || []; const gi = all.findIndex((x:any)=> x.id===goal.id); if (gi!==-1) { all[gi].steps = goal.steps; await storage.set('goals', all); Alert.alert('Saved steps'); } }} style={{ padding:8, backgroundColor:'#6c5ce7', borderRadius:8, marginRight:8 }}>
                <Text style={{ color:'#fff' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>{ const copy=[...goal.steps]; copy.splice(i,1); setGoal({...goal, steps: copy}); }} style={{ padding:8, backgroundColor:'#d63031', borderRadius:8 }}>
                <Text style={{ color:'#fff' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={save} style={{ marginTop:16, backgroundColor:'#00b894', padding:12, borderRadius:8 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Save Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}