// app/(tabs)/leisure.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { storage } from '../../services/storage';

interface Reward {
  id: number;
  name: string;
  cost: number;
  icon: string;
  description: string;
}

const REWARDS: Reward[] = [
  {
    id: 1,
    name: '30min Gaming',
    cost: 5,
    icon: '🎮',
    description: 'Enjoy 30 minutes of gaming time',
  },
  {
    id: 2,
    name: 'Movie Night',
    cost: 10,
    icon: '🎬',
    description: 'Watch your favorite movie',
  },
  {
    id: 3,
    name: 'Dessert Treat',
    cost: 7.5,
    icon: '🍰',
    description: 'Indulge in a sweet treat',
  },
  {
    id: 4,
    name: 'Social Outing',
    cost: 15,
    icon: '🎉',
    description: 'Hang out with friends',
  },
  {
    id: 5,
    name: 'Hobby Time',
    cost: 8,
    icon: '🎨',
    description: 'Spend time on your favorite hobby',
  },
  {
    id: 6,
    name: 'Rest Day',
    cost: 20,
    icon: '😴',
    description: 'Take a well-deserved rest day',
  },
  {
    id: 7,
    name: 'Shopping Spree',
    cost: 25,
    icon: '🛍️',
    description: 'Treat yourself to some shopping',
  },
  {
    id: 8,
    name: 'Extra Sleep',
    cost: 6,
    icon: '🌙',
    description: 'Sleep in an extra hour',
  },
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
    } catch (error) {
      console.error('Error loading leisure data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePurchase = (reward: Reward) => {
    if (leisurePoints >= reward.cost) {
      Alert.alert(
        'Redeem Reward',
        `Redeem "${reward.name}" for ${reward.cost} points?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Redeem',
            onPress: async () => {
              try {
                const newPoints = leisurePoints - reward.cost;
                await storage.set('leisurePoints', newPoints);
                
                // Add to purchase history
                const purchase = {
                  id: Date.now(),
                  rewardName: reward.name,
                  rewardIcon: reward.icon,
                  cost: reward.cost,
                  date: new Date().toISOString(),
                };
                const updatedHistory = [purchase, ...purchaseHistory];
                await storage.set('purchaseHistory', updatedHistory);
                
                setLeisurePoints(newPoints);
                setPurchaseHistory(updatedHistory);
                
                Alert.alert(
                  'Success! 🎉',
                  `Redeemed: ${reward.name}!\n\nEnjoy your reward! You now have ${newPoints.toFixed(2)} points remaining.`
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to redeem reward');
              }
            },
          },
        ]
      );
    } else {
      const needed = (reward.cost - leisurePoints).toFixed(2);
      Alert.alert(
        'Not Enough Points',
        `You need ${needed} more points to redeem this reward.\n\nComplete more tasks to earn points!`
      );
    }
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
          <Text style={styles.headerTitle}>Leisure Shop 🛍️</Text>
          <Text style={styles.headerSubtitle}>
            Redeem your points for rewards!
          </Text>
        </View>

        {/* Points Display */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Your Points</Text>
          <Text style={styles.pointsValue}>{leisurePoints.toFixed(2)}</Text>
          <Text style={styles.pointsSubtext}>
            Complete tasks to earn 0.25 points each!
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoBold}>Tip:</Text> Complete daily tasks consistently to accumulate points and unlock amazing rewards!
          </Text>
        </View>

        {/* Rewards Grid */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          <View style={styles.rewardsGrid}>
            {REWARDS.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDescription}>
                  {reward.description}
                </Text>
                <View style={styles.rewardFooter}>
                  <Text style={styles.rewardCost}>{reward.cost} pts</Text>
                  <TouchableOpacity
                    style={[
                      styles.redeemButton,
                      leisurePoints < reward.cost && styles.redeemButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(reward)}
                  >
                    <Text
                      style={[
                        styles.redeemButtonText,
                        leisurePoints < reward.cost &&
                          styles.redeemButtonTextDisabled,
                      ]}
                    >
                      Redeem
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Purchase History */}
        {purchaseHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Purchases</Text>
            {purchaseHistory.slice(0, 5).map((purchase) => (
              <View key={purchase.id} style={styles.historyCard}>
                <Text style={styles.historyIcon}>{purchase.rewardIcon}</Text>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{purchase.rewardName}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(purchase.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={styles.historyCost}>-{purchase.cost} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* Earn More Points Section */}
        <View style={styles.earnMoreCard}>
          <Text style={styles.earnMoreTitle}>Want More Points?</Text>
          <Text style={styles.earnMoreText}>
            Complete your daily tasks to earn 0.25 points for each task finished!
          </Text>
          <TouchableOpacity
            style={styles.earnMoreButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.earnMoreButtonText}>View Today's Tasks</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#636e72',
  },
  pointsCard: {
    backgroundColor: '#e84393',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  pointsSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  infoCard: {
    backgroundColor: '#fff3cd',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
  },
  rewardsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 16,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rewardCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 12,
    minHeight: 32,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e84393',
  },
  redeemButton: {
    backgroundColor: '#e84393',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  redeemButtonDisabled: {
    backgroundColor: '#dfe6e9',
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  redeemButtonTextDisabled: {
    color: '#95a5a6',
  },
  historySection: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#636e72',
  },
  historyCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
  },
  earnMoreCard: {
    backgroundColor: '#74b9ff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  earnMoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  earnMoreText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  earnMoreButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  earnMoreButtonText: {
    color: '#0984e3',
    fontSize: 14,
    fontWeight: '600',
  },
});