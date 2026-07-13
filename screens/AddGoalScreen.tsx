// screens/AddGoalScreen.tsx - "Create New" hub: Task / Goal / Event forms (Serene Logic)
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Seg from '../components/ui/Seg';
import { Colors, Type } from '../constants/theme';
import { getAttributes, type Attribute } from '../services/attributesService';
import { eventPrepAI, type PrepTask } from '../services/eventPrepAi';
import { githubAI, type GoalBreakdownRequest } from '../services/githubAi';
import { storage } from '../services/storage';

const TABS = ['Task', 'Goal', 'Event'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'week', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/* ── Select field: field-input look, inline expanding option list ──── */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value)?.label ?? value;

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.fieldInputRow}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={styles.fieldInputText}>{current}</Text>
        <MaterialIcons
          name={open ? 'expand-less' : 'expand-more'}
          size={20}
          color={Colors.outline}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownPanel}>
          {options.map(o => (
            <TouchableOpacity
              key={o.value}
              style={styles.dropdownOption}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.fieldInputText}>{o.label}</Text>
              {o.value === value && (
                <MaterialIcons name="check" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function CreateNewScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Task');
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  useEffect(() => {
    getAttributes().then(setAttributes);
  }, []);

  /* ── Task (weekly factor) state ──────────────────────────────────── */
  const [taskName, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDays, setTaskDays] = useState<string[]>(['Monday']);
  const [taskSector, setTaskSector] = useState('Health');
  const [taskFrequency, setTaskFrequency] = useState('week');
  const [taskTime, setTaskTime] = useState('07:00');
  const [taskDuration, setTaskDuration] = useState('30');
  const [showTaskTimePicker, setShowTaskTimePicker] = useState(false);

  /* ── Goal state ──────────────────────────────────────────────────── */
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goalSector, setGoalSector] = useState('Academic');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [goalTime, setGoalTime] = useState('07:00');
  const [showGoalTimePicker, setShowGoalTimePicker] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState('60');
  const [steps, setSteps] = useState<any[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [habitTips, setHabitTips] = useState<string[]>([]);
  const [identityStatement, setIdentityStatement] = useState('');

  /* ── Event state ─────────────────────────────────────────────────── */
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [showEventTimePicker, setShowEventTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'yearly'>('none');
  const [prepSessions, setPrepSessions] = useState('2');
  const [prepTasks, setPrepTasks] = useState<PrepTask[]>([]);
  const [mindsetStatement, setMindsetStatement] = useState('');
  const [prepTips, setPrepTips] = useState<string[]>([]);
  const [showPrep, setShowPrep] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const timeStringToDate = (time: string) => {
    const d = new Date();
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const dateToTimeString = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const addMinutes = (time: string, minutes: number) => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const toggleDay = (day: string) => {
    setTaskDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  /* ── Save: Task ──────────────────────────────────────────────────── */
  const saveTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }
    if (taskDays.length === 0) {
      Alert.alert('Error', 'Select at least one day');
      return;
    }
    const duration = Math.max(5, parseInt(taskDuration) || 30);
    try {
      const wf = (await storage.get('weeklyFactors', {})) || {};
      taskDays.forEach((day, i) => {
        const list = wf[day] || [];
        list.push({
          id: Date.now() + i,
          taskName: taskName.trim(),
          description: taskDesc.trim(),
          startTime: taskTime,
          endTime: addMinutes(taskTime, duration),
          sector: taskSector,
          frequency: taskFrequency,
        });
        list.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
        wf[day] = list;
      });
      await storage.set('weeklyFactors', wf);
      Alert.alert('Task Added ✓', `Scheduled on ${taskDays.length} day(s)`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save task');
    }
  };

  /* ── Goal: AI breakdown + save ───────────────────────────────────── */
  const breakdownGoalWithAI = async () => {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Please enter a goal name first');
      return;
    }

    setLoadingAI(true);
    try {
      const request: GoalBreakdownRequest = {
        goalDescription: [goalName.trim(), goalDesc.trim()].filter(Boolean).join(' — '),
        startTime: goalTime,
        sector: goalSector,
        endDate: endDate.toISOString(),
        timesPerWeek,
        dailyTimeAllocation: Math.max(5, parseInt(dailyMinutes) || 60),
      };

      const response = await githubAI.breakdownGoal(request);

      setSteps(response.steps);
      setHabitTips(response.habitFormationTips);
      setIdentityStatement(response.identityStatement);
      setShowSteps(true);
    } catch (error: any) {
      console.error('AI Breakdown Error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate steps. Please check your internet connection and API key.'
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const editStep = (index: number, newText: string) => {
    setSteps(steps.map((step, idx) =>
      idx === index
        ? typeof step === 'string'
          ? { description: newText, completed: false }
          : { ...step, description: newText, text: newText }
        : step
    ));
  };

  const removeStep = (index: number) => setSteps(steps.filter((_, idx) => idx !== index));

  const saveGoal = async () => {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Please enter a goal name');
      return;
    }
    try {
      const existingGoals = (await storage.get('goals', [])) || [];
      const newGoal = {
        id: Date.now(),
        description: goalName.trim(),
        notes: goalDesc.trim(),
        sector: goalSector,
        endDate: endDate.toISOString(),
        timesPerWeek,
        startTime: goalTime,
        steps: steps.length > 0 ? steps : [{ description: 'Complete goal', completed: false }],
        dailyTimeAllocation: Math.max(5, parseInt(dailyMinutes) || 60),
        progress: 0,
        createdAt: new Date().toISOString(),
        identityStatement,
        habitTips,
      };
      await storage.set('goals', [...existingGoals, newGoal]);
      Alert.alert('Goal Added!', 'Your goal has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save goal');
    }
  };

  /* ── Event: prep plan + save ─────────────────────────────────────── */
  const generatePrepPlan = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name first');
      return;
    }
    const daysUntil = Math.ceil(
      (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 0) {
      Alert.alert('Error', 'Please select a future date');
      return;
    }

    setGeneratingPrep(true);
    try {
      const result = await eventPrepAI.generateEventPrep({
        eventTitle: eventName.trim(),
        eventDescription: eventDesc.trim(),
        eventDate: eventDate.toISOString(),
        priority: 3,
        repetition: Math.max(1, parseInt(prepSessions) || 2),
      });
      setPrepTasks(result.prepTasks);
      setMindsetStatement(result.mindsetStatement);
      setPrepTips(result.prepTips);
      setShowPrep(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate prep tasks');
    } finally {
      setGeneratingPrep(false);
    }
  };

  const saveEvent = async () => {
    if (!eventName.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }

    const baseEvent = {
      id: Date.now(),
      title: eventName.trim(),
      description: eventDesc.trim(),
      date: eventDate.toISOString(),
      priority: 3,
      repetition: Math.max(1, parseInt(prepSessions) || 2),
      recurrence,
      createdAt: new Date().toISOString(),
      prepTasks: showPrep ? prepTasks : [],
      mindsetStatement: showPrep ? mindsetStatement : '',
      prepTips: showPrep ? prepTips : [],
    };

    try {
      const events = (await storage.get('events', [])) || [];

      if (recurrence === 'yearly') {
        const yearsToSchedule = 5;
        const recurringEvents = [];
        for (let y = 0; y < yearsToSchedule; y++) {
          const recurDate = new Date(eventDate);
          recurDate.setFullYear(recurDate.getFullYear() + y);
          recurringEvents.push({
            ...baseEvent,
            id: Date.now() + y,
            date: recurDate.toISOString(),
            recurrenceGroupId: baseEvent.id,
            recurrenceYear: recurDate.getFullYear(),
          });
        }
        events.push(...recurringEvents);
      } else {
        events.push(baseEvent);
      }

      await storage.set('events', events);
      Alert.alert('Success', 'Event added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  /* ── Save dispatcher ─────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'Task') await saveTask();
      else if (tab === 'Goal') await saveGoal();
      else await saveEvent();
    } finally {
      setSaving(false);
    }
  };

  /* ── Renderers ───────────────────────────────────────────────────── */
  const renderTaskForm = () => (
    <View style={styles.form}>
      <View>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Morning Meditation"
          placeholderTextColor={Colors.outlineVariant}
          value={taskName}
          onChangeText={setTaskName}
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.fieldInput, styles.textArea]}
          placeholder="Mindfulness session for 15 minutes…"
          placeholderTextColor={Colors.outlineVariant}
          value={taskDesc}
          onChangeText={setTaskDesc}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map((day, i) => {
            const active = taskDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCircle, active && styles.dayCircleActive]}
                onPress={() => toggleDay(day)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayCircleText, active && styles.dayCircleTextActive]}>
                  {DAY_LETTERS[i]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={styles.gridRow}>
        <SelectField
          label="Attribute"
          value={taskSector}
          options={attributes.map(a => ({ value: a.name, label: a.name }))}
          onChange={setTaskSector}
        />
        <SelectField
          label="Frequency"
          value={taskFrequency}
          options={FREQUENCIES}
          onChange={setTaskFrequency}
        />
      </View>
      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Time</Text>
          <TouchableOpacity
            style={styles.fieldInputRow}
            onPress={() => setShowTaskTimePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldInputText}>{taskTime}</Text>
            <MaterialIcons name="schedule" size={18} color={Colors.outline} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Duration</Text>
          <View style={styles.suffixField}>
            <TextInput
              style={styles.suffixInput}
              placeholder="30"
              placeholderTextColor={Colors.outlineVariant}
              value={taskDuration}
              onChangeText={setTaskDuration}
              keyboardType="numeric"
            />
            <Text style={styles.suffixText}>min</Text>
          </View>
        </View>
      </View>
      {showTaskTimePicker && (
        <DateTimePicker
          value={timeStringToDate(taskTime)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowTaskTimePicker(Platform.OS === 'ios');
            if (d) setTaskTime(dateToTimeString(d));
          }}
        />
      )}
    </View>
  );

  const renderGoalForm = () => (
    <View style={styles.form}>
      <View>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Launch Personal Brand"
          placeholderTextColor={Colors.outlineVariant}
          value={goalName}
          onChangeText={setGoalName}
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.fieldInput, styles.textAreaSm]}
          placeholder="Complete the website and social kit…"
          placeholderTextColor={Colors.outlineVariant}
          value={goalDesc}
          onChangeText={setGoalDesc}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>
      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>End Date</Text>
          <TouchableOpacity
            style={styles.fieldInputRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldInputText}>{endDate.toLocaleDateString()}</Text>
            <MaterialIcons name="event" size={18} color={Colors.outline} />
          </TouchableOpacity>
        </View>
        <SelectField
          label="Attribute"
          value={goalSector}
          options={attributes.map(a => ({ value: a.name, label: a.name }))}
          onChange={setGoalSector}
        />
      </View>
      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Start Time</Text>
          <TouchableOpacity
            style={styles.fieldInputRow}
            onPress={() => setShowGoalTimePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldInputText}>{goalTime}</Text>
            <MaterialIcons name="schedule" size={18} color={Colors.outline} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Times / Week</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTimesPerWeek(Math.max(1, timesPerWeek - 1))}
            >
              <MaterialIcons name="remove" size={18} color={Colors.secondary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{timesPerWeek}×</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={() => setTimesPerWeek(Math.min(7, timesPerWeek + 1))}
            >
              <MaterialIcons name="add" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.gridRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Daily Time</Text>
          <View style={styles.suffixField}>
            <TextInput
              style={styles.suffixInput}
              placeholder="60"
              placeholderTextColor={Colors.outlineVariant}
              value={dailyMinutes}
              onChangeText={setDailyMinutes}
              keyboardType="numeric"
            />
            <Text style={styles.suffixText}>min</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
      </View>

      {/* AI Breakdown */}
      {!showSteps ? (
        <TouchableOpacity
          style={[styles.aiBtn, loadingAI && { opacity: 0.75 }]}
          onPress={breakdownGoalWithAI}
          disabled={loadingAI}
          activeOpacity={0.85}
        >
          {loadingAI ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialIcons name="auto-awesome" size={18} color="#fff" />
          )}
          <Text style={styles.aiBtnText}>{loadingAI ? 'Generating…' : 'Breakdown with AI'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ gap: 12 }}>
          <Text style={styles.fieldLabel}>Generated Steps</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <TextInput
                style={styles.stepInput}
                value={`${step.description ?? step.text ?? step}`}
                onChangeText={t => editStep(i, t)}
                multiline
              />
              <TouchableOpacity onPress={() => removeStep(i)} style={styles.stepDeleteBtn}>
                <MaterialIcons name="delete" size={18} color="rgba(186,26,26,0.6)" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={styles.regenBtn}
            onPress={breakdownGoalWithAI}
            disabled={loadingAI}
          >
            {loadingAI ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <MaterialIcons name="refresh" size={16} color={Colors.primary} />
            )}
            <Text style={styles.regenBtnText}>Regenerate</Text>
          </TouchableOpacity>
          {habitTips.length > 0 && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Habit Tips</Text>
              {habitTips.map((tip, i) => (
                <Text key={i} style={styles.tipText}>• {tip}</Text>
              ))}
            </View>
          )}
          {identityStatement ? (
            <View style={styles.identityCard}>
              <Text style={styles.identityText}>"{identityStatement}"</Text>
            </View>
          ) : null}
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (d) setEndDate(d);
          }}
          minimumDate={new Date()}
        />
      )}
      {showGoalTimePicker && (
        <DateTimePicker
          value={timeStringToDate(goalTime)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowGoalTimePicker(Platform.OS === 'ios');
            if (d) setGoalTime(dateToTimeString(d));
          }}
        />
      )}
    </View>
  );

  const renderEventForm = () => (
    <View style={styles.form}>
      <View>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Quarterly Review"
          placeholderTextColor={Colors.outlineVariant}
          value={eventName}
          onChangeText={setEventName}
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          style={[styles.fieldInput, styles.textAreaSm]}
          placeholder="Event details (helps AI generate better prep)"
          placeholderTextColor={Colors.outlineVariant}
          value={eventDesc}
          onChangeText={setEventDesc}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>
      <View>
        <Text style={styles.fieldLabel}>Date & Time</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity
            style={[styles.fieldInputRow, { flex: 1 }]}
            onPress={() => setShowEventDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldInputText}>{eventDate.toLocaleDateString()}</Text>
            <MaterialIcons name="event" size={18} color={Colors.outline} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fieldInputRow, { flex: 1 }]}
            onPress={() => setShowEventTimePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldInputText}>
              {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <MaterialIcons name="schedule" size={18} color={Colors.outline} />
          </TouchableOpacity>
        </View>
      </View>
      <SelectField
        label="Recurrence"
        value={recurrence}
        options={[
          { value: 'none', label: 'One-time' },
          { value: 'yearly', label: '5-year repeat' },
        ]}
        onChange={v => setRecurrence(v as 'none' | 'yearly')}
      />

      {/* Prep sessions card */}
      <View style={styles.prepCard}>
        <View style={styles.prepCardHeader}>
          <View>
            <Text style={styles.prepCardTitle}>Prep Sessions</Text>
            <Text style={styles.prepCardSub}>Plan ahead for this event</Text>
          </View>
          <TextInput
            style={styles.prepCountInput}
            value={prepSessions}
            onChangeText={setPrepSessions}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity
          style={[styles.prepBtn, showPrep && styles.prepBtnDone]}
          onPress={generatePrepPlan}
          disabled={generatingPrep}
          activeOpacity={0.85}
        >
          {generatingPrep ? (
            <ActivityIndicator color={Colors.onPrimaryFixed} size="small" />
          ) : (
            <MaterialIcons
              name={showPrep ? 'done-all' : 'auto-fix-high'}
              size={18}
              color={showPrep ? Colors.primary : Colors.onPrimaryFixed}
            />
          )}
          <Text style={[styles.prepBtnText, showPrep && { color: Colors.primary }]}>
            {generatingPrep ? 'Creating Plan…' : showPrep ? 'Plan Generated' : 'Generate Prep Plan'}
          </Text>
        </TouchableOpacity>
        {showPrep && (
          <View style={{ gap: 12 }}>
            {prepTasks.map((task, i) => (
              <View key={i} style={styles.prepStep}>
                <MaterialIcons name="check-circle" size={18} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.prepStepTitle}>
                    Session {i + 1} · D-{task.daysBeforeEvent}
                  </Text>
                  <Text style={styles.prepStepText}>{task.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {showEventDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowEventDatePicker(Platform.OS === 'ios');
            if (d) {
              const merged = new Date(d);
              merged.setHours(eventDate.getHours(), eventDate.getMinutes());
              setEventDate(merged);
            }
          }}
          minimumDate={new Date()}
        />
      )}
      {showEventTimePicker && (
        <DateTimePicker
          value={eventDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowEventTimePicker(Platform.OS === 'ios');
            if (d) {
              const merged = new Date(eventDate);
              merged.setHours(d.getHours(), d.getMinutes());
              setEventDate(merged);
            }
          }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Create New"
        right={
          <HeaderIconButton
            icon="close"
            color={Colors.onSurfaceVariant}
            onPress={() => router.back()}
          />
        }
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: 32 }}>
          <Seg options={TABS} value={tab} onChange={setTab} />
        </View>

        {tab === 'Task' && renderTaskForm()}
        {tab === 'Goal' && renderGoalForm()}
        {tab === 'Event' && renderEventForm()}

        <View style={{ height: 180 }} />
      </ScrollView>

      {/* ── Floating Save ──────────────────────────────────────────── */}
      <View style={styles.saveBarWrapper}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.9}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navWrapper}>
        <BottomNav activeTab="create" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  form: { gap: 20 },
  gridRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
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
  dropdownPanel: {
    marginTop: 6,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 18,
    borderTopWidth: 1, borderTopColor: Colors.surfaceContainer,
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  textAreaSm: { minHeight: 68, textAlignVertical: 'top' },
  // ── Day circles
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: Colors.primary },
  dayCircleText: {
    fontSize: 13, color: Colors.onSurfaceVariant,
    fontFamily: Type.geistMedium,
  },
  dayCircleTextActive: { color: '#fff', fontFamily: Type.geistBold },
  // ── Suffix (min) field
  suffixField: { position: 'relative', justifyContent: 'center' },
  suffixInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, paddingRight: 48,
    fontSize: 16, color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  suffixText: {
    position: 'absolute', right: 16,
    fontSize: 12, color: Colors.outline,
    fontFamily: Type.geistBold,
  },
  // ── Counter
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: Colors.surfaceContainer,
    borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12,
  },
  counterBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  counterValue: {
    fontSize: 16, color: Colors.onSurface,
    fontFamily: Type.geistBold,
  },
  // ── AI button + steps
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: Colors.secondary, borderRadius: 999,
    paddingVertical: 16,
    shadowColor: Colors.secondary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  aiBtnText: {
    color: '#fff', fontSize: 14,
    fontFamily: Type.geistSemiBold,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceContainer, borderRadius: 12,
    paddingLeft: 16, paddingRight: 8, paddingVertical: 6,
  },
  stepInput: {
    flex: 1, fontSize: 14, color: Colors.onSurface, paddingVertical: 8,
    fontFamily: 'Inter_400Regular',
  },
  stepDeleteBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(70,98,100,0.2)',
  },
  regenBtnText: {
    fontSize: 13, color: Colors.primary,
    fontFamily: Type.geistSemiBold,
  },
  tipsCard: {
    backgroundColor: Colors.primaryFixed, borderRadius: 14, padding: 16, gap: 6,
  },
  tipsTitle: {
    fontSize: 13, color: Colors.onPrimaryFixed,
    fontFamily: Type.geistBold, marginBottom: 4,
  },
  tipText: {
    fontSize: 13, color: Colors.onPrimaryFixed, fontFamily: 'Inter_400Regular',
  },
  identityCard: {
    backgroundColor: Colors.secondaryFixed, borderRadius: 14, padding: 16,
  },
  identityText: {
    fontSize: 15, color: '#2f2ebe', fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
  // ── Event prep card
  prepCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16, padding: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 20, elevation: 2,
  },
  prepCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  prepCardTitle: {
    fontSize: 15, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  prepCardSub: {
    fontSize: 12, color: Colors.outline, marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  prepCountInput: {
    width: 64, height: 44, textAlign: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceContainer,
    borderWidth: 1, borderColor: 'rgba(193,200,200,0.2)',
    fontSize: 16, color: Colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  prepBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primaryFixed, borderRadius: 999, paddingVertical: 14,
  },
  prepBtnDone: { backgroundColor: Colors.surfaceContainerHigh },
  prepBtnText: {
    fontSize: 14, color: Colors.onPrimaryFixed,
    fontFamily: Type.geistSemiBold,
  },
  prepStep: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  prepStepTitle: {
    fontSize: 14, color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
  prepStepText: {
    fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  // ── Save bar
  saveBarWrapper: {
    position: 'absolute', bottom: 72, left: 24, right: 24,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 999, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 24, elevation: 6,
  },
  saveBtnText: {
    color: '#fff', fontSize: 16,
    fontFamily: Type.geistSemiBold,
  },
  navWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
