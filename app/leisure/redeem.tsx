import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { storage } from '../../services/storage';

export default function RedeemScreen() {
  const { rewardId } = useLocalSearchParams<{ rewardId: string }>();
  const router = useRouter();

  const [reward, setReward] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadReward();
  }, []);

  const loadReward = async () => {
    const leisureItems = await storage.get('leisureItems', []);
    const found = leisureItems.find(
      (r: any) => r.id.toString() === rewardId
    );

    if (!found) {
      Alert.alert('Error', 'Reward not found', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    setReward(found);
  };

  const finishPurchase = async () => {
    try {
      const currentPoints = await storage.get('leisurePoints', 0);

      if (currentPoints < reward.cost) {
        Alert.alert('Insufficient Points');
        return;
      }

      // Deduct points
      const newPoints = currentPoints - reward.cost;
      await storage.set('leisurePoints', newPoints);

      // Save purchase
      const purchases = await storage.get('purchases', []);
      const newPurchase = {
        id: Date.now(),
        rewardId: reward.id,
        rewardName: reward.name,
        rewardIcon: reward.icon,
        cost: reward.cost,
        scheduledDate: selectedDate.toISOString(),
        scheduledTime: selectedTime.toISOString(),
        purchaseDate: new Date().toISOString(),
        status: 'scheduled',
      };

      await storage.set('purchases', [newPurchase, ...purchases]);

      Alert.alert('Success 🎉', 'Leisure scheduled!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete purchase');
    }
  };

  if (!reward) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule Your Leisure</Text>

      <Text style={styles.rewardText}>
        {reward.icon} {reward.name} ({reward.cost} pts)
      </Text>

      {/* Date */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.pickerText}>
          📅 Date: {selectedDate.toLocaleDateString()}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Time */}
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.pickerText}>
          ⏰ Time: {selectedTime.toLocaleTimeString()}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          onChange={(_, time) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (time) setSelectedTime(time);
          }}
        />
      )}

      {/* Finish */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={finishPurchase}
      >
        <Text style={styles.confirmText}>Finish Purchase</Text>
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
    marginBottom: 12,
    color: '#2d3436',
  },
  rewardText: {
    fontSize: 16,
    marginBottom: 24,
    color: '#636e72',
  },
  pickerButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#2d3436',
  },
  confirmButton: {
    backgroundColor: '#e84393',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
