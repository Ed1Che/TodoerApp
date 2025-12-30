import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { storage } from '../../services/storage';

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

export default function PurchasesScreen() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    const data = await storage.get('purchases', []);
    setPurchases(data);
  };

  const editPurchase = (purchase: Purchase) => {
    router.push(`../leisure/edit/${purchase.id}`);
  };

  const deletePurchase = (purchaseId: number) => {
    Alert.alert(
      'Delete Purchase',
      'Are you sure you want to delete this scheduled leisure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = purchases.filter(p => p.id !== purchaseId);
            await storage.set('purchases', updated);
            setPurchases(updated);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Purchases</Text>

      {purchases.length === 0 && (
        <Text style={styles.emptyText}>No purchases yet.</Text>
      )}

      {purchases.map((purchase) => (
        <View key={purchase.id} style={styles.card}>
          <Text style={styles.icon}>{purchase.rewardIcon}</Text>

          <View style={styles.info}>
            <Text style={styles.name}>{purchase.rewardName}</Text>
            <Text style={styles.date}>
              📅 {new Date(purchase.scheduledDate).toLocaleDateString()}
            </Text>
            <Text style={styles.time}>
              ⏰ {new Date(purchase.scheduledTime).toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => editPurchase(purchase)}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deletePurchase(purchase.id)}
            >
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2d3436',
  },
  emptyText: {
    textAlign: 'center',
    color: '#636e72',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#2d3436',
  },
  date: {
    fontSize: 12,
    color: '#636e72',
  },
  time: {
    fontSize: 12,
    color: '#636e72',
  },
  actions: {
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: '#0984e3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
