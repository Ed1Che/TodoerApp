import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { storage } from '../../../services/storage';

interface Purchase {
  id: number;
  rewardId: number;
  rewardName: string;
  rewardIcon: string;
  cost: number;
  scheduledDate: string;
  scheduledTime: string;
  purchaseDate: string;
  status: string;
}

export default function EditLeisureScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const toDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
    };

    const toISODate = (displayDate: string) => {
    const [day, month, year] = displayDate.split('-');
    if (!day || !month || !year) return '';
    return `${year}-${month}-${day}`;
    };


    const toDisplayTime = (isoTime: string) => {
    if (!isoTime) return '';
    const d = new Date(isoTime);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
    };

    const toISOTime = (displayTime: string, baseDate: string) => {
    const [hours, minutes] = displayTime.split(':');
    if (!hours || !minutes) return '';

    // keep original date to avoid timezone shifts
    const date = new Date(baseDate);
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.toISOString();
    };

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    loadPurchase();
  }, []);

  const loadPurchase = async () => {
    const purchases: Purchase[] = await storage.get('purchases', []);
    const found = purchases.find(p => p.id === Number(id));

    if (!found) {
      Alert.alert('Error', 'Purchase not found');
      router.back();
      return;
    }

    setPurchase(found);
    setScheduledDate(toDisplayDate(found.scheduledDate));
    setScheduledTime(toDisplayTime(found.scheduledTime));

  };

const saveChanges = async () => {
  if (!purchase) return;

  // --- DATE VALIDATION (DD-MM-YYYY) ---
  const isoDate = toISODate(scheduledDate);
  if (!isoDate) {
    Alert.alert('Error', 'Invalid date format. Use DD-MM-YYYY');
    return;
  }

  // --- TIME VALIDATION (HH:mm) ---
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(scheduledTime)) {
    Alert.alert('Error', 'Invalid time format. Use HH:mm');
    return;
  }

  const isoTime = toISOTime(scheduledTime, isoDate);
  if (!isoTime) {
    Alert.alert('Error', 'Invalid time value');
    return;
  }

  try {
    const purchases = await storage.get('purchases', []);

    const updatedPurchases = purchases.map((p: any) =>
      p.id === purchase.id
        ? {
            ...p,
            scheduledDate: isoDate,
            scheduledTime: isoTime,
          }
        : p
    );

    await storage.set('purchases', updatedPurchases);

    Alert.alert('Success 🎉', 'Leisure updated successfully!', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  } catch {
    Alert.alert('Error', 'Failed to update leisure');
  }
};


  if (!purchase) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Leisure</Text>

      <View style={styles.preview}>
        <Text style={styles.icon}>{purchase.rewardIcon}</Text>
        <Text style={styles.name}>{purchase.rewardName}</Text>
        <Text style={styles.cost}>Cost: {purchase.cost} pts</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Scheduled date (DD-MM-YYYY)"
        value={scheduledDate}
        onChangeText={setScheduledDate}
      />

      <TextInput
        style={styles.input}
        placeholder="Scheduled time (HH:MM)"
        value={scheduledTime}
        onChangeText={setScheduledTime}
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveText}>Save Changes</Text>
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
  preview: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  cost: {
    fontSize: 13,
    color: '#636e72',
    marginTop: 4,
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
