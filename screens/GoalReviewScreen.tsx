import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { storage } from '../services/storage';

export default function GoalReviewScreen(){
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(()=>{ (async()=>{ const g = await storage.get('goals',[]); setGoals(g||[]); })(); },[]);

  return (
    <SafeAreaView style={{ flex:1, padding:16 }}>
      <ScrollView>
        <Text style={{ fontSize:20, fontWeight:'700', marginBottom:12 }}>Goals</Text>
        {goals.map(g=> (
          <View key={g.id} style={{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8 }}>
            <Text style={{ fontWeight:'600' }}>{g.description}</Text>
            <Text style={{ color:'#666', marginTop:6 }}>Steps: {g.steps?.length || 0}</Text>
            <View style={{ flexDirection:'row', marginTop:8 }}>
              <Link href={`../goals/${g.id}`} asChild>
                <TouchableOpacity style={{ padding:8, backgroundColor:'#6c5ce7', borderRadius:8, marginRight:8 }}>
                  <Text style={{ color:'#fff' }}>Edit</Text>
                </TouchableOpacity>
              </Link>
              <TouchableOpacity onPress={() => {
                // show steps inline modal style (simple alert for now)
                alert(g.steps.map((s:any,i:number)=>`${i+1}. ${s.text}${s.completed? ' ✅':''}`).join(''))
              }} style={{ padding:8, backgroundColor:'#0984e3', borderRadius:8 }}>
                <Text style={{ color:'#fff' }}>View Steps</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
