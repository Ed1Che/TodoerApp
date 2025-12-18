import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { storage } from '../services/storage';

const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function WeeklyFactorScreen(){
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, any[]>>({});
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [taskName, setTaskName] = useState('');
  const [startTime, setStartTime] = useState('05:00');
  const [endTime, setEndTime] = useState('06:00');

  useEffect(()=>{ (async()=>{ const wf = await storage.get('weeklyFactors',{}); setWeeklyFactors(wf||{}); })(); },[]);

  const save = async (newWF: Record<string, any[]>) => { setWeeklyFactors(newWF); await storage.set('weeklyFactors', newWF); };

  const add = async () => {
    if (!taskName.trim()) { Alert.alert('Task name required'); return; }
    const list = weeklyFactors[selectedDay] || [];
    const item = { id: Date.now(), taskName, startTime, endTime };
    const updated = { ...weeklyFactors, [selectedDay]: [...list, item] };
    await save(updated);
    setTaskName('');
    Alert.alert('Added');
  };

  const remove = async (id:number) => {
    const updated = { ...weeklyFactors, [selectedDay]: (weeklyFactors[selectedDay]||[]).filter(t=>t.id!==id) };
    await save(updated);
    Alert.alert('Removed');
  };

  const edit = async (id:number) => {
    // rudimentary edit: prefill fields and remove original
    const item = (weeklyFactors[selectedDay]||[]).find(t=>t.id===id);
    if (!item) return;
    setTaskName(item.taskName);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    await remove(id);
  };

  return (
    <SafeAreaView style={{ flex:1, padding:16 }}>
      <ScrollView>
        <Text style={{ fontSize:20, fontWeight:'700', marginBottom:12 }}>Weekly Factor</Text>
        <View style={{ flexDirection:'row', marginBottom:12, flexWrap:'wrap' }}>
          {days.map(d => (
            <TouchableOpacity key={d} onPress={()=>setSelectedDay(d)} style={{ padding:8, backgroundColor: selectedDay===d? '#0984e3':'#fff', marginRight:8, marginBottom:8, borderRadius:8 }}>
              <Text style={{ color: selectedDay===d? '#fff': '#000' }}>{d.slice(0,3)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput value={taskName} onChangeText={setTaskName} placeholder="Task name" style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:8, marginBottom:8 }} />
        <TextInput value={startTime} onChangeText={setStartTime} placeholder="Start (HH:MM)" style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:8, marginBottom:8 }} />
        <TextInput value={endTime} onChangeText={setEndTime} placeholder="End (HH:MM)" style={{ borderWidth:1, borderColor:'#eee', padding:8, borderRadius:8, marginBottom:8 }} />
        <TouchableOpacity onPress={add} style={{ backgroundColor:'#6c5ce7', padding:12, borderRadius:8, marginBottom:12 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Add Weekly Task</Text>
        </TouchableOpacity>

        <Text style={{ fontWeight:'600', marginBottom:8 }}>{selectedDay}'s Tasks</Text>
        {(weeklyFactors[selectedDay]||[]).map((t:any)=> (
          <View key={t.id} style={{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8 }}>
            <Text style={{ fontWeight:'600' }}>{t.taskName}</Text>
            <Text style={{ color:'#666' }}>{t.startTime} - {t.endTime}</Text>
            <View style={{ flexDirection:'row', marginTop:8 }}>
              <TouchableOpacity onPress={()=>edit(t.id)} style={{ marginRight:8, backgroundColor:'#0984e3', padding:8, borderRadius:8 }}>
                <Text style={{ color:'#fff' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>remove(t.id)} style={{ backgroundColor:'#d63031', padding:8, borderRadius:8 }}>
                <Text style={{ color:'#fff' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
