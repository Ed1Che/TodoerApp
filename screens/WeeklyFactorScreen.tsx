// screens/WeeklyFactorScreen.tsx - Personal Identity + weekly schedule manager (Serene Logic)
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNav from '../components/BottomNav';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import { Colors, Type } from '../constants/theme';
import {
  ATTRIBUTE_COLOR_CHOICES,
  ATTRIBUTE_ICON_CHOICES,
  getAttributes,
  saveAttributes,
  type Attribute,
} from '../services/attributesService';
import { getCurrentWeekStats } from '../services/statsService';
import { storage } from '../services/storage';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Frequency = 'once' | 'week' | 'monthly';

type Task = {
  id: number;
  taskName: string;
  startTime: string;
  endTime: string;
  sector: string;
  frequency: Frequency;
};

interface Identity {
  role: string;
  focus: string;
  trait: string;
}

const DEFAULT_IDENTITY: Identity = {
  role: 'Goal-Oriented Explorer',
  focus: 'Health & Mind',
  trait: 'always seeking growth and balance.',
};

const ROLES = ['Insightful Creator', 'Resilient Builder', 'Mindful Strategist', 'Empathetic Leader'];
const FOCUSES = ['Creative Flow', 'Physical Strength', 'Mental Clarity', 'Social Harmony'];
const TRAITS = [
  'finding peace in the chaos.',
  'relentlessly pursuing excellence.',
  'nurturing deep connections.',
  'building a legacy of wisdom.',
];

const CORE_VALUES = ['Mindfulness', 'Discipline', 'Curiosity'];
const MANTRA = '"Progress is a marathon, not a sprint."';

export default function WeeklyFactorScreen() {
  const router = useRouter();
  const [weeklyFactors, setWeeklyFactors] = useState<Record<string, Task[]>>({});
  const [selectedDay, setSelectedDay] = useState(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );
  const [leisurePoints, setLeisurePoints] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);

  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [showEditOverlay, setShowEditOverlay] = useState(false);
  const [editRole, setEditRole] = useState('');
  const [editFocus, setEditFocus] = useState('');
  const [editTrait, setEditTrait] = useState('');

  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrIcon, setNewAttrIcon] = useState<Attribute['icon'] | null>(null);
  const [newAttrColor, setNewAttrColor] = useState<string | null>(null);

  // inline editing of an existing weekly task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('05:00');
  const [editEnd, setEditEnd] = useState('06:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadData = useCallback(async () => {
    const wf: Record<string, Task[]> = await storage.get('weeklyFactors', {});
    setWeeklyFactors(wf || {});

    const savedIdentity = await storage.get('personalIdentity', null);
    if (savedIdentity) setIdentity(savedIdentity);

    const lp = await storage.get('leisurePoints', 0);
    setLeisurePoints(lp || 0);

    const stats = await getCurrentWeekStats();
    setActiveDays(stats.totalByDay.filter(v => v > 0).length);
    setTasksDone(stats.days.reduce((sum, d) => sum + d.completedTasks, 0));

    const attrs = await getAttributes();
    setAttributes(attrs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /* ── Identity ──────────────────────────────────────────────────── */
  const refreshIdentity = async () => {
    const next: Identity = {
      role: ROLES[Math.floor(Math.random() * ROLES.length)],
      focus: FOCUSES[Math.floor(Math.random() * FOCUSES.length)],
      trait: TRAITS[Math.floor(Math.random() * TRAITS.length)],
    };
    setIdentity(next);
    await storage.set('personalIdentity', next);
  };

  const openEditOverlay = () => {
    setEditRole(identity.role);
    setEditFocus(identity.focus);
    setEditTrait(identity.trait);
    setShowEditOverlay(true);
  };

  const saveIdentity = async () => {
    const next: Identity = {
      role: editRole.trim() || DEFAULT_IDENTITY.role,
      focus: editFocus.trim() || DEFAULT_IDENTITY.focus,
      trait: editTrait.trim() || DEFAULT_IDENTITY.trait,
    };
    setIdentity(next);
    await storage.set('personalIdentity', next);
    setShowEditOverlay(false);
  };

  /* ── Attributes ────────────────────────────────────────────────── */
  const deleteAttribute = async (id: string) => {
    if (attributes.length <= 1) return;
    const next = attributes.filter(a => a.id !== id);
    setAttributes(next);
    await saveAttributes(next);
  };

  const openAddAttribute = () => {
    setNewAttrName('');
    setNewAttrIcon(null);
    setNewAttrColor(null);
    setShowAddAttribute(true);
  };

  const saveNewAttribute = async () => {
    const name = newAttrName.trim();
    if (!name || !newAttrIcon || !newAttrColor) return;
    if (attributes.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Duplicate name', 'An attribute with this name already exists.');
      return;
    }
    const next = [...attributes, { id: `attr_${Date.now()}`, name, icon: newAttrIcon, color: newAttrColor }];
    setAttributes(next);
    await saveAttributes(next);
    setShowAddAttribute(false);
  };

  /* ── Weekly schedule ───────────────────────────────────────────── */
  const saveFactors = async (newWF: Record<string, Task[]>) => {
    setWeeklyFactors(newWF);
    await storage.set('weeklyFactors', newWF);
  };

  const removeTask = async (id: number) => {
    Alert.alert('Delete Task', 'Remove this task from your weekly schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = {
            ...weeklyFactors,
            [selectedDay]: (weeklyFactors[selectedDay] || []).filter(t => t.id !== id),
          };
          await saveFactors(updated);
        },
      },
    ]);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setEditName(task.taskName);
    setEditStart(task.startTime);
    setEditEnd(task.endTime);
  };

  const saveEdit = async () => {
    if (!editingTask) return;
    if (!editName.trim()) {
      Alert.alert('Task name required');
      return;
    }
    if (editStart >= editEnd) {
      Alert.alert('Invalid time range');
      return;
    }
    const list = (weeklyFactors[selectedDay] || []).map(t =>
      t.id === editingTask.id
        ? { ...t, taskName: editName.trim(), startTime: editStart, endTime: editEnd }
        : t
    );
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    await saveFactors({ ...weeklyFactors, [selectedDay]: list });
    setEditingTask(null);
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return '--:--';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
  };

  const timeStringToDate = (time: string) => {
    const d = new Date();
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const dateToTimeString = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  /* ── Derived stats ─────────────────────────────────────────────── */
  const streakPct = Math.round((activeDays / 7) * 100);
  const focusLevel = activeDays >= 5 ? 'Peak' : activeDays >= 3 ? 'Solid' : 'Start';
  const rank = leisurePoints >= 100 ? 'Gold' : leisurePoints >= 25 ? 'Silver' : 'Bronze';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Personal Identity"
        onMenuPress={() => router.push('/')}
        right={<HeaderIconButton icon="notifications" />}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* ── Identity card ──────────────────────────────────────────── */}
        <View style={styles.identityCard}>
          <View style={styles.identityTop}>
            <View style={styles.identityAvatar}>
              <MaterialIcons name="face" size={22} color={Colors.primary} />
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={refreshIdentity} activeOpacity={0.7}>
              <MaterialIcons name="refresh" size={20} color={Colors.outline} />
            </TouchableOpacity>
          </View>
          <Text style={styles.identityText}>
            I am a <Text style={styles.identityRole}>{identity.role}</Text> focusing on{' '}
            <Text style={styles.identityFocus}>{identity.focus}</Text>, described as{' '}
            <Text style={styles.identityTrait}>{identity.trait}</Text>
          </Text>
          <View style={styles.identityBadge}>
            <View style={styles.identityBadgeAvatar}>
              <MaterialIcons name="person" size={13} color={Colors.primary} />
            </View>
            <Text style={styles.identityBadgeText}>Verified Persona</Text>
          </View>
        </View>

        {/* ── Stat tiles ─────────────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Streak</Text>
            <Text style={[styles.statTileValue, { color: Colors.primary }]}>{streakPct}%</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Tasks</Text>
            <Text style={[styles.statTileValue, { color: Colors.secondary }]}>{tasksDone}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Focus</Text>
            <Text style={[styles.statTileValue, { color: Colors.tertiary }]}>{focusLevel}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Rank</Text>
            <Text style={[styles.statTileValue, { color: Colors.primary }]}>{rank}</Text>
          </View>
        </View>

        {/* ── Edit CTA ───────────────────────────────────────────────── */}
        <View style={styles.editCtaWrap}>
          <TouchableOpacity style={styles.editCta} onPress={openEditOverlay} activeOpacity={0.85}>
            <MaterialIcons name="edit" size={18} color="#fff" />
            <Text style={styles.editCtaText}>Edit Personal Description</Text>
          </TouchableOpacity>
          <Text style={styles.editCtaCaption}>
            Updating your description adjusts personalized recommendations for the next 30 days.
          </Text>
        </View>

        {/* ── Core values + Mantra ───────────────────────────────────── */}
        <View style={styles.valuesCard}>
          <Text style={styles.valuesTitle}>Core Values</Text>
          <View style={styles.valuesRow}>
            {CORE_VALUES.map(v => (
              <View key={v} style={styles.valueChip}>
                <Text style={styles.valueChipText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Attributes ─────────────────────────────────────────────── */}
        <View style={styles.valuesCard}>
          <Text style={styles.valuesTitle}>Attributes</Text>
          <View style={{ gap: 10 }}>
            {attributes.map(attribute => (
              <View key={attribute.id} style={styles.attributeRow}>
                <View style={[styles.attributeSwatch, { backgroundColor: attribute.color }]}>
                  <MaterialIcons name={attribute.icon} size={16} color="#fff" />
                </View>
                <Text style={styles.attributeName}>{attribute.name}</Text>
                <TouchableOpacity
                  style={[styles.attributeDeleteBtn, attributes.length <= 1 && { opacity: 0.3 }]}
                  onPress={() => deleteAttribute(attribute.id)}
                  disabled={attributes.length <= 1}
                >
                  <MaterialIcons name="delete" size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.addAttributeBtn} onPress={openAddAttribute} activeOpacity={0.85}>
            <MaterialIcons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addAttributeBtnText}>Add Attribute</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mantraCard}>
          <Text style={styles.mantraTitle}>Daily Mantra</Text>
          <Text style={styles.mantraText}>{MANTRA}</Text>
          <MaterialIcons
            name="format-quote"
            size={64}
            color="rgba(1,32,34,0.1)"
            style={styles.mantraQuote}
          />
        </View>

        {/* ── Weekly schedule ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Weekly Schedule</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.daysRow}>
            {DAYS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dayPill, selectedDay === d && styles.dayPillActive]}
                onPress={() => setSelectedDay(d)}
              >
                <Text style={[styles.dayPillText, selectedDay === d && styles.dayPillTextActive]}>
                  {d.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {(weeklyFactors[selectedDay] || []).length === 0 && (
          <Text style={styles.emptyText}>No tasks for {selectedDay} yet</Text>
        )}

        <View style={{ gap: 12 }}>
          {(weeklyFactors[selectedDay] || []).map(t => (
            <View key={t.id} style={styles.taskCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{t.taskName}</Text>
                <Text style={styles.taskTime}>
                  {formatTimeDisplay(t.startTime)} – {formatTimeDisplay(t.endTime)} · {t.sector}
                </Text>
              </View>
              <TouchableOpacity style={styles.taskIconBtn} onPress={() => startEdit(t)}>
                <MaterialIcons name="edit" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.taskIconBtn, { backgroundColor: Colors.errorContainer }]}
                onPress={() => removeTask(t.id)}
              >
                <MaterialIcons name="delete" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.navWrapper}>
        <BottomNav activeTab="profile" />
      </View>

      {/* ── Edit identity overlay ──────────────────────────────────── */}
      <Modal
        visible={showEditOverlay}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditOverlay(false)}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayPanel}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Refine Identity</Text>
              <TouchableOpacity
                style={styles.overlayCloseBtn}
                onPress={() => setShowEditOverlay(false)}
              >
                <MaterialIcons name="close" size={20} color={Colors.outline} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Role</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editRole}
                  onChangeText={setEditRole}
                  placeholder="Goal-Oriented Explorer"
                  placeholderTextColor={Colors.outlineVariant}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Primary Focus</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editFocus}
                  onChangeText={setEditFocus}
                  placeholder="Health & Mind"
                  placeholderTextColor={Colors.outlineVariant}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Core Trait</Text>
                <TextInput
                  style={[styles.fieldInput, { minHeight: 68, textAlignVertical: 'top' }]}
                  value={editTrait}
                  onChangeText={setEditTrait}
                  placeholder="Always seeking growth and balance."
                  placeholderTextColor={Colors.outlineVariant}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
            <TouchableOpacity style={styles.overlaySaveBtn} onPress={saveIdentity} activeOpacity={0.85}>
              <Text style={styles.overlaySaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit weekly task modal ─────────────────────────────────── */}
      <Modal
        visible={editingTask !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTask(null)}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayPanel}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Edit Task</Text>
              <TouchableOpacity style={styles.overlayCloseBtn} onPress={() => setEditingTask(null)}>
                <MaterialIcons name="close" size={20} color={Colors.outline} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Task Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Morning Meditation"
                  placeholderTextColor={Colors.outlineVariant}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start</Text>
                  <TouchableOpacity
                    style={styles.fieldInputRow}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={styles.fieldInputText}>{editStart}</Text>
                    <MaterialIcons name="schedule" size={18} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>End</Text>
                  <TouchableOpacity
                    style={styles.fieldInputRow}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={styles.fieldInputText}>{editEnd}</Text>
                    <MaterialIcons name="schedule" size={18} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.overlaySaveBtn} onPress={saveEdit} activeOpacity={0.85}>
              <Text style={styles.overlaySaveText}>Save Changes</Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={timeStringToDate(editStart)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (d) setEditStart(dateToTimeString(d));
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={timeStringToDate(editEnd)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (d) setEditEnd(dateToTimeString(d));
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Add attribute overlay ──────────────────────────────────── */}
      <Modal
        visible={showAddAttribute}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAttribute(false)}
      >
        <View style={styles.overlayBackdrop}>
          <View style={styles.overlayPanel}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Add Attribute</Text>
              <TouchableOpacity style={styles.overlayCloseBtn} onPress={() => setShowAddAttribute(false)}>
                <MaterialIcons name="close" size={20} color={Colors.outline} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newAttrName}
                  onChangeText={setNewAttrName}
                  placeholder="e.g. Creativity"
                  placeholderTextColor={Colors.outlineVariant}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Icon</Text>
                <View style={styles.attributePickerRow}>
                  {ATTRIBUTE_ICON_CHOICES.map(icon => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.iconChoice, newAttrIcon === icon && styles.iconChoiceActive]}
                      onPress={() => setNewAttrIcon(icon)}
                    >
                      <MaterialIcons name={icon} size={20} color={newAttrIcon === icon ? '#fff' : Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View>
                <Text style={styles.fieldLabel}>Color</Text>
                <View style={styles.attributePickerRow}>
                  {ATTRIBUTE_COLOR_CHOICES.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorChoice,
                        { backgroundColor: color },
                        newAttrColor === color && styles.colorChoiceActive,
                      ]}
                      onPress={() => setNewAttrColor(color)}
                    />
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.overlaySaveBtn, (!newAttrName.trim() || !newAttrIcon || !newAttrColor) && { opacity: 0.5 }]}
              onPress={saveNewAttribute}
              disabled={!newAttrName.trim() || !newAttrIcon || !newAttrColor}
              activeOpacity={0.85}
            >
              <Text style={styles.overlaySaveText}>Save Attribute</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, gap: 24 },
  // ── Identity card
  identityCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(193,200,200,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  identityTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  identityAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  identityText: {
    fontSize: 18, lineHeight: 28, color: Colors.onSurfaceVariant,
    fontFamily: 'Inter_400Regular',
  },
  identityRole: { color: Colors.primary, fontFamily: Type.geistSemiBold },
  identityFocus: { color: Colors.secondary, fontFamily: Type.geistSemiBold },
  identityTrait: { color: Colors.tertiary, fontFamily: Type.geistSemiBold },
  identityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
  },
  identityBadgeAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 2, borderColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  identityBadgeText: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.55,
    color: Colors.outline, fontFamily: Type.geistBold,
  },
  // ── Stats grid
  statsGrid: { flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1, backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(193,200,200,0.15)',
  },
  statTileLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.54,
    color: Colors.outline, marginBottom: 4,
    fontFamily: Type.geistBold,
  },
  statTileValue: {
    fontSize: 22, fontFamily: Type.geistSemiBold,
  },
  // ── Edit CTA
  editCtaWrap: { alignItems: 'center', gap: 12 },
  editCta: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 999,
    paddingVertical: 16, paddingHorizontal: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  editCtaText: {
    color: '#fff', fontSize: 14, letterSpacing: 0.14,
    fontFamily: Type.geistSemiBold,
  },
  editCtaCaption: {
    fontSize: 12, color: Colors.outline, textAlign: 'center',
    lineHeight: 18, maxWidth: 280,
    fontFamily: 'Inter_400Regular',
  },
  // ── Values + mantra
  valuesCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: 16, padding: 20,
  },
  valuesTitle: {
    fontSize: 16, color: Colors.onSurface, marginBottom: 12,
    fontFamily: Type.geistSemiBold,
  },
  valuesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueChip: {
    backgroundColor: Colors.surfaceContainerHigh, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  valueChipText: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.66,
    color: Colors.primary, fontFamily: Type.geistBold,
  },
  attributeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  attributeSwatch: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  attributeName: {
    flex: 1, fontSize: 14, color: Colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  attributeDeleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.errorContainer,
  },
  addAttributeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, paddingVertical: 12, borderRadius: 999,
    borderWidth: 1.5, borderColor: Colors.primaryFixed,
  },
  addAttributeBtnText: {
    fontSize: 13, color: Colors.primary,
    fontFamily: Type.geistSemiBold,
  },
  attributePickerRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  iconChoice: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  iconChoiceActive: { backgroundColor: Colors.primary },
  colorChoice: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorChoiceActive: { borderColor: Colors.onSurface },
  mantraCard: {
    backgroundColor: Colors.primaryFixed, borderRadius: 16, padding: 20,
    overflow: 'hidden', position: 'relative',
  },
  mantraTitle: {
    fontSize: 16, color: Colors.onPrimaryFixed, marginBottom: 8,
    fontFamily: Type.geistSemiBold,
  },
  mantraText: {
    fontSize: 15, lineHeight: 22, color: 'rgba(1,32,34,0.8)',
    fontStyle: 'italic', fontFamily: 'Inter_400Regular',
  },
  mantraQuote: {
    position: 'absolute', bottom: -12, right: -12,
    transform: [{ rotate: '12deg' }],
  },
  // ── Weekly schedule
  sectionTitle: {
    fontSize: 18, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  daysRow: { flexDirection: 'row', gap: 8 },
  dayPill: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.surfaceContainerLow,
  },
  dayPillActive: { backgroundColor: Colors.primary },
  dayPillText: {
    fontSize: 13, color: Colors.outline,
    fontFamily: Type.geistSemiBold,
  },
  dayPillTextActive: { color: '#fff' },
  emptyText: {
    textAlign: 'center', color: Colors.outlineVariant, paddingVertical: 20,
    fontSize: 14, fontFamily: 'Inter_400Regular',
  },
  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  taskTitle: {
    fontSize: 14, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  taskTime: {
    fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  taskIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  navWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  // ── Overlays
  overlayBackdrop: {
    flex: 1, backgroundColor: 'rgba(35,49,68,0.4)', justifyContent: 'flex-end',
  },
  overlayPanel: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24,
  },
  overlayHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  overlayTitle: {
    fontSize: 20, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  overlayCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
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
  fieldInputRow: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  fieldInputText: {
    fontSize: 16, color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  overlaySaveBtn: {
    backgroundColor: Colors.primary, borderRadius: 999,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  overlaySaveText: {
    color: '#fff', fontSize: 14,
    fontFamily: Type.geistSemiBold,
  },
});
