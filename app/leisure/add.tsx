import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { storage } from '../../services/storage';

export default function AddLeisureScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [icon, setIcon] = useState('🎮');
  const [durationInput, setDurationInput] = useState('');

  const saveLeisure = async () => {
    if (!name.trim() || !cost.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const parsedCost = Number(cost);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      Alert.alert('Error', 'Cost must be a valid number');
      return;
    }

    try {
      const leisureItems = await storage.get('leisureItems', []);

      const newItem = {
        id: Date.now(),
        name: name.trim(),
        cost: parsedCost,
        icon,
        custom: true,
        duration: durationInput ? Number(durationInput) : undefined,
      };

      await storage.set('leisureItems', [...leisureItems, newItem]);

      Alert.alert('Success 🎉', 'Leisure item added!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save leisure item');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Custom Leisure</Text>

      <TextInput
        style={styles.input}
        placeholder="Leisure name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Cost (points)"
        keyboardType="numeric"
        value={cost}
        onChangeText={setCost}
      />

      <TextInput
        style={styles.input}
        placeholder="Icon (emoji)"
        value={icon}
        onChangeText={setIcon}
      />

      <TextInput
        style={styles.input}
        placeholder="Cost (points)"
        keyboardType="numeric"
        value={cost}
        onChangeText={setCost}
      />

      <TextInput
        style={styles.input}
        placeholder="Duration (minutes)"
        keyboardType="numeric"
        value={durationInput}
        onChangeText={setDurationInput}
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveLeisure}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2d3436',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#0984e3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
