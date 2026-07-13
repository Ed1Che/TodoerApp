// app/(tabs)/leisure.tsx - Leisure Shop: rewards marketplace + purchase drawer (Serene Logic)
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../../components/BottomNav';
import ScreenHeader, { HeaderIconButton } from '../../components/ui/ScreenHeader';
import { Colors, Type } from '../../constants/theme';
import { storage } from '../../services/storage';

interface Reward {
  id: number;
  name: string;
  cost: number;
  icon: string; // emoji, used by the scheduler task title
  iconName: keyof typeof MaterialIcons.glyphMap;
  duration: number;
  custom?: boolean;
}

const DEFAULT_REWARDS: Reward[] = [
  { id: 1, name: 'Gaming Session', cost: 5, icon: '🎮', iconName: 'sports-esports', duration: 30 },
  { id: 2, name: 'Movie Night', cost: 10, icon: '🎬', iconName: 'smart-display', duration: 120 },
  { id: 6, name: 'Rest Day', cost: 50, icon: '😴', iconName: 'hotel', duration: 660 },
  { id: 8, name: 'Extra Sleep', cost: 6, icon: '🌙', iconName: 'bedtime', duration: 60 },
];

// gradient placeholder variants cycled across the grid
const GRADIENTS: [string, string][] = [
  ['#e1e0ff', '#c0c1ff'],
  ['#dde9ff', '#c9e8ea'],
  ['#c9e8ea', '#aeccce'],
  ['#e0e3e5', '#c4c7c9'],
];
const GRADIENT_ICON_COLORS = [
  'rgba(70,72,212,0.4)',
  'rgba(70,98,100,0.4)',
  'rgba(70,98,100,0.5)',
  'rgba(90,93,95,0.5)',
];

export default function LeisureShopScreen() {
  const router = useRouter();
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [customRewards, setCustomRewards] = useState<Reward[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // add-reward form
  const [formOpen, setFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newDuration, setNewDuration] = useState('');

  // purchase drawer
  const [drawerReward, setDrawerReward] = useState<Reward | null>(null);
  const [scheduleDay, setScheduleDay] = useState(0); // days from today
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const points = await storage.get('leisurePoints', 0);
      const items = await storage.get('leisureItems', []);
      setLeisurePoints(points || 0);
      setCustomRewards(
        (items || []).map((r: any) => ({
          iconName: 'card-giftcard' as const,
          icon: '🎁',
          duration: 60,
          ...r,
          custom: true,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ── Create reward ─────────────────────────────────────────────── */
  const createReward = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter an activity name');
      return;
    }
    const reward = {
      id: Date.now(),
      name: newName.trim(),
      cost: Math.max(0, parseInt(newCost) || 0),
      duration: Math.max(5, parseInt(newDuration) || 60),
      icon: '🎁',
    };
    const items = (await storage.get('leisureItems', [])) || [];
    items.push(reward);
    await storage.set('leisureItems', items);
    setNewName('');
    setNewCost('');
    setNewDuration('');
    setFormOpen(false);
    await loadData();
  };

  /* ── Drawer ────────────────────────────────────────────────────── */
  const openDrawer = (reward: Reward) => {
    setScheduleDay(0);
    setCustomDate(null);
    setScheduleTime('18:00');
    setDrawerReward(reward);
  };

  const closeDrawer = () => setDrawerReward(null);

  const scheduledDate = () => {
    if (customDate) return customDate;
    const d = new Date();
    d.setDate(d.getDate() + scheduleDay);
    return d;
  };

  const dayChipLabel = (offset: number) => {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const purchaseAndSchedule = async () => {
    if (!drawerReward) return;
    try {
      const currentPoints = await storage.get('leisurePoints', 0);
      if (currentPoints < drawerReward.cost) {
        Alert.alert('Insufficient Points', `You need ${drawerReward.cost} points for this reward.`);
        return;
      }

      const newPoints = currentPoints - drawerReward.cost;
      await storage.set('leisurePoints', newPoints);
      setLeisurePoints(newPoints);

      const date = scheduledDate();
      const purchases = (await storage.get('purchases', [])) || [];
      const newPurchase = {
        id: Date.now(),
        rewardId: drawerReward.id,
        rewardName: drawerReward.name,
        rewardIcon: drawerReward.icon,
        cost: drawerReward.cost,
        duration: drawerReward.duration,
        scheduledDate: date.toISOString().split('T')[0],
        scheduledTime: scheduleTime,
        purchaseDate: new Date().toISOString(),
        status: 'scheduled',
      };
      await storage.set('purchases', [newPurchase, ...purchases]);

      const history = (await storage.get('purchaseHistory', [])) || [];
      history.unshift({
        name: drawerReward.name,
        icon: drawerReward.icon,
        cost: drawerReward.cost,
        date: new Date().toLocaleDateString(),
      });
      await storage.set('purchaseHistory', history);

      closeDrawer();
      Alert.alert('Success 🎉', 'Leisure scheduled!');
    } catch {
      Alert.alert('Error', 'Failed to complete purchase');
    }
  };

  const deleteReward = async () => {
    if (!drawerReward) return;
    if (!drawerReward.custom) {
      Alert.alert('Built-in Reward', 'Default rewards cannot be deleted.');
      return;
    }
    Alert.alert('Delete Reward', 'Are you sure you want to delete this reward?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const items = (await storage.get('leisureItems', [])) || [];
          await storage.set(
            'leisureItems',
            items.filter((r: any) => r.id !== drawerReward.id)
          );
          closeDrawer();
          await loadData();
        },
      },
    ]);
  };

  const allRewards = [...customRewards, ...DEFAULT_REWARDS];

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <ScreenHeader
        title="Leisure Shop"
        onMenuPress={() => router.push('/')}
        right={
          <>
            <View style={styles.pointsPill}>
              <MaterialIcons name="stars" size={16} color={Colors.primary} />
              <Text style={styles.pointsText}>{leisurePoints.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            </View>
            <HeaderIconButton icon="notifications" />
          </>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Add new reward ─────────────────────────────────────────── */}
        <View style={styles.addCard}>
          <TouchableOpacity
            style={styles.addCardHeader}
            onPress={() => setFormOpen(o => !o)}
            activeOpacity={0.8}
          >
            <View style={styles.addCardLeft}>
              <View style={styles.addIconCircle}>
                <MaterialIcons name="add-circle" size={20} color={Colors.secondary} />
              </View>
              <View>
                <Text style={styles.addCardTitle}>Add New Reward</Text>
                <Text style={styles.addCardSub}>Create a custom leisure activity</Text>
              </View>
            </View>
            <MaterialIcons
              name={formOpen ? 'expand-less' : 'expand-more'}
              size={20}
              color={Colors.outline}
            />
          </TouchableOpacity>

          {formOpen && (
            <View style={styles.addForm}>
              <View>
                <Text style={styles.fieldLabel}>Activity Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. Play PlayStation"
                  placeholderTextColor={Colors.outlineVariant}
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>
              <View style={styles.gridRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Cost (Points)</Text>
                  <View style={styles.prefixField}>
                    <MaterialIcons name="stars" size={18} color={Colors.outline} style={styles.prefixIcon} />
                    <TextInput
                      style={styles.prefixInput}
                      placeholder="100"
                      placeholderTextColor={Colors.outlineVariant}
                      value={newCost}
                      onChangeText={setNewCost}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Duration (Min)</Text>
                  <View style={styles.prefixField}>
                    <MaterialIcons name="schedule" size={18} color={Colors.outline} style={styles.prefixIcon} />
                    <TextInput
                      style={styles.prefixInput}
                      placeholder="60"
                      placeholderTextColor={Colors.outlineVariant}
                      value={newDuration}
                      onChangeText={setNewDuration}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={createReward} activeOpacity={0.85}>
                <Text style={styles.createBtnText}>Create Reward</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Marketplace ────────────────────────────────────────────── */}
        <View style={styles.marketHeader}>
          <Text style={styles.sectionTitle}>Leisure Marketplace</Text>
          <TouchableOpacity onPress={() => router.push('/leisure/purchases')}>
            <Text style={styles.sectionAction}>History</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {allRewards.map((reward, i) => (
            <TouchableOpacity
              key={reward.id}
              style={styles.rewardCard}
              onPress={() => openDrawer(reward)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS[i % GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rewardImage}
              >
                <MaterialIcons
                  name={reward.iconName}
                  size={48}
                  color={GRADIENT_ICON_COLORS[i % GRADIENT_ICON_COLORS.length]}
                />
              </LinearGradient>
              <View style={styles.rewardBody}>
                <View style={styles.rewardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rewardName} numberOfLines={2}>{reward.name}</Text>
                    <View style={styles.rewardMeta}>
                      <MaterialIcons name="schedule" size={14} color={Colors.outline} />
                      <Text style={styles.rewardDuration}>{reward.duration} mins</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.costChip,
                      reward.cost === 0 && { backgroundColor: Colors.surfaceContainer },
                    ]}
                  >
                    <Text
                      style={[
                        styles.costChipText,
                        reward.cost === 0 && { color: Colors.primary },
                      ]}
                    >
                      {reward.cost === 0 ? 'Free' : `${reward.cost} pts`}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.navWrapper}>
        <BottomNav activeTab="shop" />
      </View>

      {/* ── Purchase drawer ────────────────────────────────────────── */}
      <Modal
        visible={drawerReward !== null}
        transparent
        animationType="slide"
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeDrawer} />
        <View style={styles.drawer}>
          <View style={styles.drawerHandle} />
          {drawerReward && (
            <View style={styles.drawerContent}>
              <Text style={styles.drawerTitle}>{drawerReward.name}</Text>
              <View style={styles.drawerMetaRow}>
                <View style={styles.drawerMetaItem}>
                  <MaterialIcons name="stars" size={18} color={Colors.primary} />
                  <Text style={styles.drawerCost}>
                    {drawerReward.cost === 0 ? 'Free' : `${drawerReward.cost} pts`}
                  </Text>
                </View>
                <View style={styles.drawerMetaItem}>
                  <MaterialIcons name="schedule" size={18} color={Colors.outline} />
                  <Text style={styles.drawerDuration}>{drawerReward.duration} mins</Text>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 20, marginBottom: 12 }]}>
                Schedule for
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dateChipsRow}>
                  {[0, 1, 2].map(offset => {
                    const active = !customDate && scheduleDay === offset;
                    return (
                      <TouchableOpacity
                        key={offset}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                        onPress={() => {
                          setCustomDate(null);
                          setScheduleDay(offset);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
                          {dayChipLabel(offset)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.dateChip, !!customDate && styles.dateChipActive]}
                    onPress={() => setShowCustomDate(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.dateChipText, !!customDate && styles.dateChipTextActive]}>
                      {customDate ? customDate.toLocaleDateString() : 'Custom'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateChip}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="schedule" size={14} color={Colors.onSurfaceVariant} />
                    <Text style={styles.dateChipText}> {scheduleTime}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.drawerActions}>
                <TouchableOpacity
                  style={styles.purchaseBtn}
                  onPress={purchaseAndSchedule}
                  activeOpacity={0.85}
                >
                  <Text style={styles.purchaseBtnText}>Purchase & Schedule</Text>
                </TouchableOpacity>
                {drawerReward.custom && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={deleteReward} activeOpacity={0.85}>
                    <MaterialIcons name="delete" size={18} color={Colors.onErrorContainer} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {showCustomDate && (
            <DateTimePicker
              value={customDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, d) => {
                setShowCustomDate(Platform.OS === 'ios');
                if (d) setCustomDate(d);
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const d = new Date();
                const [h, m] = scheduleTime.split(':').map(Number);
                d.setHours(h, m, 0, 0);
                return d;
              })()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (d) {
                  setScheduleTime(
                    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                  );
                }
              }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryFixed, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pointsText: {
    fontSize: 13, color: Colors.onPrimaryFixed,
    fontFamily: Type.geistBold,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  // ── Add card
  addCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16, marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(193,200,200,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  addCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 20,
  },
  addCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  addCardTitle: {
    fontSize: 16, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  addCardSub: {
    fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 1,
    fontFamily: 'Inter_400Regular',
  },
  addForm: {
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 20, gap: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(193,200,200,0.2)',
  },
  gridRow: { flexDirection: 'row', gap: 16 },
  fieldLabel: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.77,
    color: Colors.outline, marginBottom: 6, paddingLeft: 2,
    fontFamily: Type.geistBold,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18,
    fontSize: 16, color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  prefixField: { position: 'relative', justifyContent: 'center' },
  prefixIcon: { position: 'absolute', left: 14, zIndex: 1 },
  prefixInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12, paddingVertical: 14, paddingLeft: 44, paddingRight: 16,
    fontSize: 16, color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  createBtn: {
    backgroundColor: Colors.primary, borderRadius: 999, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  createBtnText: {
    color: '#fff', fontSize: 14,
    fontFamily: Type.geistSemiBold,
  },
  // ── Marketplace
  marketHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  sectionAction: {
    fontSize: 13, color: Colors.secondary,
    fontFamily: Type.geistSemiBold,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
  },
  rewardCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  rewardImage: {
    aspectRatio: 16 / 9, width: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  rewardBody: { padding: 16 },
  rewardRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 8,
  },
  rewardName: {
    fontSize: 15, color: Colors.onSurface, lineHeight: 20,
    fontFamily: Type.geistSemiBold,
  },
  rewardMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
  },
  rewardDuration: {
    fontSize: 12, color: Colors.onSurfaceVariant,
    fontFamily: Type.geistMedium,
  },
  costChip: {
    backgroundColor: Colors.primaryContainer, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0,
  },
  costChipText: {
    fontSize: 10, color: '#fdffff', textTransform: 'uppercase',
    letterSpacing: 0.6, fontFamily: Type.geistBold,
  },
  navWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  // ── Drawer
  drawerBackdrop: {
    flex: 1, backgroundColor: 'rgba(35,49,68,0.4)',
  },
  drawer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  drawerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(193,200,200,0.3)',
    alignSelf: 'center', marginTop: 16, marginBottom: 8,
  },
  drawerContent: { paddingHorizontal: 24, paddingBottom: 40 },
  drawerTitle: {
    fontSize: 26, letterSpacing: -0.39, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  drawerMetaRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  drawerMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  drawerCost: {
    fontSize: 15, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  drawerDuration: {
    fontSize: 15, color: Colors.onSurfaceVariant,
    fontFamily: Type.geistMedium,
  },
  dateChipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999,
    backgroundColor: Colors.surfaceContainer,
  },
  dateChipActive: { backgroundColor: Colors.secondary },
  dateChipText: {
    fontSize: 13, color: Colors.onSurfaceVariant,
    fontFamily: Type.geistSemiBold,
  },
  dateChipTextActive: { color: '#fff' },
  drawerActions: { gap: 12, marginTop: 24 },
  purchaseBtn: {
    backgroundColor: Colors.primary, borderRadius: 999, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  purchaseBtnText: {
    color: '#fff', fontSize: 14,
    fontFamily: Type.geistSemiBold,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorContainer, borderRadius: 999, paddingVertical: 16,
  },
  deleteBtnText: {
    color: Colors.onErrorContainer, fontSize: 14,
    fontFamily: Type.geistSemiBold,
  },
});
