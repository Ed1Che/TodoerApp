// app/(tabs)/leisure.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { storage } from '../../services/storage';

interface Reward {
  id: number;
  name: string;
  cost: number;
  icon: string;
  description: string;
  duration?: number;
}

const REWARDS: Reward[] = [
  { id: 1, name: 'Gaming', cost: 5, icon: '🎮', description: 'Enjoy 30 minutes of gaming time' , duration: 30},
  { id: 2, name: 'Movie Night', cost: 10, icon: '🎬', description: 'Watch your favorite movie', duration: 120 },
  { id: 6, name: 'Rest Day', cost: 50, icon: '😴', description: 'Take a well-deserved rest day' , duration: 660 },
  { id: 8, name: 'Extra Sleep', cost: 6, icon: '🌙', description: 'Sleep in an extra hour', duration: 60 },
];

export default function LeisureShopScreen() {
  const router = useRouter();
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const points = await storage.get('leisurePoints', 0);
      const history = await storage.get('purchaseHistory', []);
      setLeisurePoints(points || 0);
      setPurchaseHistory(history || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Leisure Shop 🛍️</Text>
              <Text style={styles.headerSubtitle}>
                Redeem your points for rewards!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addLeisureButton}
              onPress={() => router.push('../../leisure/add')}
            >
              <Text style={styles.addLeisureButtonText}>+ Add Leisure</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Points */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Your Points</Text>
          <Text style={styles.pointsValue}>{leisurePoints.toFixed(2)}</Text>
          <Text style={styles.pointsSubtext}>
            Complete tasks to earn 0.25 points each
          </Text>
        </View>

        {/* Rewards */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>

          <View style={styles.rewardsGrid}>
            {REWARDS.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDescription}>{reward.description}</Text>
                  {reward.duration && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⏱️</Text>
                       <Text style={styles.metaText}>{reward.duration}m</Text>
                    </View>
                  )}


                <View style={styles.rewardFooter}>
                  <Text style={styles.rewardCost}>{reward.cost} pts</Text>

                  <TouchableOpacity
                    style={[
                      styles.redeemButton,
                      leisurePoints < reward.cost && styles.redeemButtonDisabled,
                    ]}
                    disabled={leisurePoints < reward.cost}
                    onPress={() =>
                      router.push(`../../leisure/redeem?rewardId=${reward.id}`)
                    }
                  >
                    <Text style={styles.redeemButtonText}>Redeem</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Purchases */}
        {purchaseHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Purchases</Text>

            {purchaseHistory.slice(0, 5).map((p) => (
              <View key={p.id} style={styles.historyCard}>
                <Text style={styles.historyIcon}>{p.rewardIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{p.rewardName}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(p.date).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.historyCost}>-{p.cost}</Text>
              </View>
            ))}
          </View>
        )}

        {/* View Purchases */}
        <View style={styles.viewPurchasesContainer}>
          <TouchableOpacity
            style={styles.viewPurchasesButton}
            onPress={() => router.push('../../leisure/purchases')}
          >
            <Text style={styles.viewPurchasesButtonText}>
              View My Purchases
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#2d3436' },
  headerSubtitle: { fontSize: 14, color: '#636e72' },

  addLeisureButton: {
    backgroundColor: '#0984e3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addLeisureButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  pointsCard: {
    backgroundColor: '#e84393',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  pointsLabel: { color: '#fff', opacity: 0.9 },
  pointsValue: { fontSize: 42, color: '#fff', fontWeight: 'bold' },
  pointsSubtext: { color: '#fff', fontSize: 12, opacity: 0.8 },

  rewardsSection: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },

  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rewardCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  rewardIcon: { fontSize: 42, textAlign: 'center' },
  rewardName: { fontWeight: '600', textAlign: 'center' },
  rewardDescription: { fontSize: 12, textAlign: 'center', color: '#636e72' },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#7f8c8d',
  },

  rewardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardCost: { color: '#e84393', fontWeight: '600' },

  redeemButton: {
    backgroundColor: '#e84393',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  redeemButtonDisabled: { backgroundColor: '#dfe6e9' },
  redeemButtonText: { color: '#fff', fontSize: 12 },

  historySection: { padding: 16 },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyIcon: { fontSize: 28, marginRight: 12 },
  historyName: { fontWeight: '600' },
  historyDate: { fontSize: 12, color: '#636e72' },
  historyCost: { color: '#e74c3c', fontWeight: '600' },

  viewPurchasesContainer: { padding: 16 },
  viewPurchasesButton: {
    backgroundColor: '#2d3436',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewPurchasesButtonText: { color: '#fff', fontWeight: '600' },
});
