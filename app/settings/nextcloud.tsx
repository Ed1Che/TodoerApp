// app/settings/nextcloud.tsx
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    InvalidServerUrlError,
    nextcloudService,
    type NCCalendarEvent,
    type NCTask,
    type NextcloudConfig,
    type PushRecord,
} from '../../services/nextcloudService';
import { storage } from '../../services/storage';

/* ─────────────────────────────────────────────────────
   Small reusable components
───────────────────────────────────────────────────── */
function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Pill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: color + '22' }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────
   Main screen
───────────────────────────────────────────────────── */
type Tab = 'credentials' | 'push' | 'pull' | 'history';

export default function NextcloudSettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('credentials');

  /* Credential state */
  const [serverUrl, setServerUrl]   = useState('');
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [testing,  setTesting]      = useState(false);
  const [saving,   setSaving]       = useState(false);
  const [connected, setConnected]   = useState(false);

  /* Local data */
  const [localEvents, setLocalEvents]     = useState<any[]>([]);
  const [localGoals,  setLocalGoals]      = useState<any[]>([]);
  const [localTasks,  setLocalTasks]      = useState<any[]>([]);

  /* Selection for push */
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [selectedGoals,  setSelectedGoals]  = useState<Set<number>>(new Set());
  const [selectedTasks,  setSelectedTasks]  = useState<Set<string>>(new Set());

  /* Push options */
  const [includePrepTasks, setIncludePrepTasks] = useState(true);
  const [onlyPending,      setOnlyPending]      = useState(true);

  /* Push / sync state */
  const [pushing,  setPushing]  = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pushMsg,  setPushMsg]  = useState('');

  /* Pull data */
  const [ncEvents, setNcEvents] = useState<NCCalendarEvent[]>([]);
  const [ncTasks,  setNcTasks]  = useState<NCTask[]>([]);

  /* Push history */
  const [pushRecords, setPushRecords] = useState<PushRecord[]>([]);

  /* ── Load on mount ───────────────────────────────────────────────────────── */
  useEffect(() => { bootstrap(); }, []);

  const bootstrap = async () => {
    await nextcloudService.loadConfig();
    const cfg = nextcloudService.config;
    if (cfg) {
      setServerUrl(cfg.serverUrl ?? '');
      setUsername(cfg.username  ?? '');
      setPassword(cfg.password  ?? '');
      setConnected(true);
    }

    const [events, goals, tasks, sync, ncEvs, ncTsks, records] = await Promise.all([
      storage.get('events',     []),
      storage.get('goals',      []),
      storage.get('dailyTasks', []),
      nextcloudService.getLastSyncTime(),
      nextcloudService.getCachedEvents(),
      nextcloudService.getCachedTasks(),
      nextcloudService.getPushRecords(),
    ]);

    setLocalEvents(events  ?? []);
    setLocalGoals(goals    ?? []);
    setLocalTasks(tasks    ?? []);
    setLastSync(sync);
    setNcEvents(ncEvs);
    setNcTasks(ncTsks);
    setPushRecords(records);

    // Default: select all
    setSelectedEvents(new Set((events ?? []).map((e: any) => e.id)));
    setSelectedGoals(new Set((goals  ?? []).map((g: any) => g.id)));
    setSelectedTasks(new Set(
      (tasks ?? []).filter((t: any) => !t.completed).map((t: any) => t.id)
    ));
  };

  /* ── Credentials tab ─────────────────────────────────────────────────────── */
  const handleTest = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields first.');
      return;
    }
    try {
      await nextcloudService.saveConfig({ serverUrl: serverUrl.trim(), username: username.trim(), password: password.trim() });
    } catch (err) {
      if (err instanceof InvalidServerUrlError) { Alert.alert('Invalid Server URL', err.message); return; }
      throw err;
    }
    setTesting(true);
    const result = await nextcloudService.testConnection();
    setTesting(false);
    if (result.ok) { setConnected(true); Alert.alert('✅ Connected', result.message); }
    else           { setConnected(false); Alert.alert('❌ Failed', result.message); }
  };

  const handleSave = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    setSaving(true);
    const cfg: NextcloudConfig = { serverUrl: serverUrl.trim(), username: username.trim(), password: password.trim() };
    try {
      await nextcloudService.saveConfig(cfg);
    } catch (err) {
      setSaving(false);
      if (err instanceof InvalidServerUrlError) { Alert.alert('Invalid Server URL', err.message); return; }
      throw err;
    }
    setSaving(false);
    Alert.alert('Saved ✓', 'Nextcloud credentials saved.');
  };

  const handleDisconnect = () =>
    Alert.alert('Disconnect', 'Clear your Nextcloud credentials?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive',
        onPress: async () => {
          await nextcloudService.clearConfig();
          setServerUrl(''); setUsername(''); setPassword('');
          setConnected(false); setNcEvents([]); setNcTasks([]);
        },
      },
    ]);

  /* ── Push helpers ────────────────────────────────────────────────────────── */
  const toggleEvent = (id: number) =>
    setSelectedEvents((s) => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const toggleGoal  = (id: number) =>
    setSelectedGoals((s)  => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const toggleTask  = (id: string) =>
    setSelectedTasks((s)  => { const n = new Set(s); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });

  const alreadyPushed = (id: string | number, type: PushRecord['type']) =>
    pushRecords.some((r) => r.localId === String(id) && r.type === type) ||
    pushRecords.some((r) => r.localId === id          && r.type === type);

  const handlePushSelected = async () => {
    if (!nextcloudService.isConfigured()) {
      Alert.alert('Not Connected', 'Save your Nextcloud credentials first.'); return;
    }
    if (selectedEvents.size === 0 && selectedGoals.size === 0 && selectedTasks.size === 0) {
      Alert.alert('Nothing Selected', 'Select at least one item to push.'); return;
    }

    setPushing(true);
    setPushMsg('Pushing…');

    let evPushed = 0, evErr = 0;
    let goalPushed = 0, goalErr = 0;
    let taskPushed = 0, taskErr = 0;

    // Push events
    for (const ev of localEvents.filter((e) => selectedEvents.has(e.id))) {
      const r = await nextcloudService.pushEvent({
        id: ev.id, title: ev.title, description: ev.description,
        date: ev.date, priority: ev.priority,
        prepTasks: includePrepTasks ? ev.prepTasks : undefined,
      });
      if (r.ok) { evPushed++; } else { evErr++; }
    }

    // Push goals
    for (const goal of localGoals.filter((g) => selectedGoals.has(g.id))) {
      const steps = onlyPending ? goal.steps.filter((s: any) => !s.completed) : goal.steps;
      const r = await nextcloudService.pushGoal({ ...goal, steps });
      goalPushed += r.pushed; goalErr += r.failed;
    }

    // Push daily tasks
    const tasksToPush = localTasks.filter(
      (t) => selectedTasks.has(t.id) && (!onlyPending || !t.completed)
    );
    if (tasksToPush.length > 0) {
      const r = await nextcloudService.pushDailyTasks(tasksToPush);
      taskPushed += r.pushed; taskErr += r.failed;
    }

    // Refresh records
    const records = await nextcloudService.getPushRecords();
    setPushRecords(records);
    setPushing(false);
    setPushMsg('');

    const total   = evPushed + goalPushed + taskPushed;
    const errors  = evErr + goalErr + taskErr;
    Alert.alert(
      errors === 0 ? '✅ Push Complete' : '⚠️ Push Finished with Errors',
      `Pushed ${total} item${total !== 1 ? 's' : ''} to Nextcloud.\n` +
      `📅 Events: ${evPushed}  🎯 Goal steps: ${goalPushed}  ✅ Tasks: ${taskPushed}` +
      (errors > 0 ? `\n❌ Errors: ${errors}` : '')
    );
  };

  const handleBulkPushAll = () =>
    Alert.alert(
      'Push Everything',
      'This will push ALL local events, goal steps, and pending tasks to Nextcloud. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Push All', onPress: async () => {
            setPushing(true);
            const r = await nextcloudService.pushAll();
            const records = await nextcloudService.getPushRecords();
            setPushRecords(records);
            setPushing(false);
            Alert.alert(
              '✅ Bulk Push Done',
              `Events: ${r.eventsPushed}  Goal steps: ${r.goalTasksPushed}  Tasks: ${r.dailyTasksPushed}\n` +
              (r.errors > 0 ? `Errors: ${r.errors}` : 'No errors')
            );
          },
        },
      ]
    );

  /* ── Pull tab ────────────────────────────────────────────────────────────── */
  const handleSync = async () => {
    if (!nextcloudService.isConfigured()) {
      Alert.alert('Not Connected', 'Save your Nextcloud credentials first.'); return;
    }
    setSyncing(true);
    try {
      const result = await nextcloudService.syncAll();
      setNcEvents(result.events);
      setNcTasks(result.tasks);
      setLastSync(result.syncedAt);
      Alert.alert('✅ Synced', `Fetched ${result.events.length} events and ${result.tasks.length} tasks.`);
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    } finally { setSyncing(false); }
  };

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : 'Never';

  /* ═══════════════════════════════════════════════════
     Render
  ═══════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>☁️ Nextcloud Sync</Text>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#27ae60' : '#e74c3c' }]} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['credentials', 'push', 'pull', 'history'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'credentials' ? '🔑 Login' :
               t === 'push'        ? '⬆️ Push'  :
               t === 'pull'        ? '⬇️ Pull'  : '📋 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ══════════════════════ CREDENTIALS ══════════════════════ */}
        {activeTab === 'credentials' && (
          <>
            <View style={[styles.statusBanner, connected ? styles.bannerGreen : styles.bannerRed]}>
              <Text style={styles.bannerText}>{connected ? '● Connected to Nextcloud' : '● Not Connected'}</Text>
              {lastSync && <Text style={styles.bannerSub}>Last sync: {fmt(lastSync)}</Text>}
            </View>

            <SectionCard>
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>📖 How to set up</Text>
                <Text style={styles.infoText}>
                  1. Open your Nextcloud web interface{'\n'}
                  2. Settings → Security → App passwords{'\n'}
                  3. Create an app password for {'"'}TodoerApp{'"'}{'\n'}
                  4. Paste your server URL, username and app password below
                </Text>
              </View>

              <Text style={styles.label}>Server URL</Text>
              <TextInput style={styles.input} placeholder="https://cloud.example.com" value={serverUrl} onChangeText={setServerUrl} autoCapitalize="none" keyboardType="url" />

              <Text style={styles.label}>Username</Text>
              <TextInput style={styles.input} placeholder="your_username" value={username} onChangeText={setUsername} autoCapitalize="none" />

              <Text style={styles.label}>App Password</Text>
              <TextInput style={styles.input} placeholder="App password (not your main password)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, styles.btnBlue, { flex: 1 }]} onPress={handleTest} disabled={testing}>
                  {testing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Test Connection</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnGreen, { flex: 1 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Save</Text>}
                </TouchableOpacity>
              </View>

              {connected && (
                <TouchableOpacity style={[styles.btn, styles.btnRed, { marginTop: 12 }]} onPress={handleDisconnect}>
                  <Text style={styles.btnText}>Disconnect Nextcloud</Text>
                </TouchableOpacity>
              )}
            </SectionCard>
          </>
        )}

        {/* ══════════════════════ PUSH ══════════════════════ */}
        {activeTab === 'push' && (
          <>
            {/* Push options */}
            <SectionCard>
              <SectionTitle>Push Options</SectionTitle>
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Include prep tasks in event description</Text>
                  <Text style={styles.optionSub}>Appends AI prep plan to Nextcloud event notes</Text>
                </View>
                <Switch value={includePrepTasks} onValueChange={setIncludePrepTasks} trackColor={{ true: '#9b59b6' }} />
              </View>
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Only push pending items</Text>
                  <Text style={styles.optionSub}>Skips already-completed tasks and goal steps</Text>
                </View>
                <Switch value={onlyPending} onValueChange={setOnlyPending} trackColor={{ true: '#9b59b6' }} />
              </View>
            </SectionCard>

            {/* Events */}
            <SectionCard>
              <View style={styles.sectionHeaderRow}>
                <SectionTitle>📅 Events ({localEvents.length})</SectionTitle>
                <TouchableOpacity onPress={() =>
                  selectedEvents.size === localEvents.length
                    ? setSelectedEvents(new Set())
                    : setSelectedEvents(new Set(localEvents.map((e) => e.id)))
                }>
                  <Text style={styles.selectAll}>
                    {selectedEvents.size === localEvents.length ? 'Deselect all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              </View>

              {localEvents.length === 0 ? (
                <Text style={styles.emptyText}>No events to push</Text>
              ) : localEvents.map((ev) => {
                const pushed = alreadyPushed(ev.id, 'event');
                const selected = selectedEvents.has(ev.id);
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.itemRow, selected && styles.itemRowSelected]}
                    onPress={() => toggleEvent(ev.id)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{ev.title}</Text>
                      <Text style={styles.itemSub}>
                        📅 {new Date(ev.date).toLocaleDateString()}
                        {ev.prepTasks?.length > 0 ? `  ·  ${ev.prepTasks.length} prep tasks` : ''}
                      </Text>
                    </View>
                    {pushed && <Pill label="Pushed" color="#27ae60" />}
                  </TouchableOpacity>
                );
              })}
            </SectionCard>

            {/* Goals */}
            <SectionCard>
              <View style={styles.sectionHeaderRow}>
                <SectionTitle>🎯 Goals ({localGoals.length})</SectionTitle>
                <TouchableOpacity onPress={() =>
                  selectedGoals.size === localGoals.length
                    ? setSelectedGoals(new Set())
                    : setSelectedGoals(new Set(localGoals.map((g) => g.id)))
                }>
                  <Text style={styles.selectAll}>
                    {selectedGoals.size === localGoals.length ? 'Deselect all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              </View>

              {localGoals.length === 0 ? (
                <Text style={styles.emptyText}>No goals to push</Text>
              ) : localGoals.map((g) => {
                const selected = selectedGoals.has(g.id);
                const pendingCount = (g.steps ?? []).filter((s: any) => !s.completed).length;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.itemRow, selected && styles.itemRowSelected]}
                    onPress={() => toggleGoal(g.id)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{g.description}</Text>
                      <Text style={styles.itemSub}>
                        {g.sector}  ·  {onlyPending ? pendingCount : (g.steps ?? []).length} step{(g.steps ?? []).length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Pill label={g.sector ?? ''} color="#9b59b6" />
                  </TouchableOpacity>
                );
              })}
            </SectionCard>

            {/* Daily tasks */}
            <SectionCard>
              <View style={styles.sectionHeaderRow}>
                <SectionTitle>✅ Today{"'"}s Tasks ({localTasks.filter((t) => !onlyPending || !t.completed).length})</SectionTitle>
                <TouchableOpacity onPress={() => {
                  const candidates = localTasks.filter((t) => !onlyPending || !t.completed);
                  const allSelected = candidates.every((t) => selectedTasks.has(t.id));
                  setSelectedTasks(allSelected ? new Set() : new Set(candidates.map((t) => t.id)));
                }}>
                  <Text style={styles.selectAll}>Toggle all</Text>
                </TouchableOpacity>
              </View>

              {localTasks.filter((t) => !onlyPending || !t.completed).length === 0 ? (
                <Text style={styles.emptyText}>No tasks to push</Text>
              ) : localTasks.filter((t) => !onlyPending || !t.completed).map((t) => {
                const selected = selectedTasks.has(t.id);
                const pushed = alreadyPushed(t.id, 'daily-task');
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.itemRow, selected && styles.itemRowSelected]}
                    onPress={() => toggleTask(t.id)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.itemSub}>{t.startTime ?? '–'}  ·  {t.duration ?? 0}m  ·  {t.type}</Text>
                    </View>
                    {pushed && <Pill label="Pushed" color="#27ae60" />}
                    {t.completed && <Pill label="Done" color="#95a5a6" />}
                  </TouchableOpacity>
                );
              })}
            </SectionCard>

            {/* Push actions */}
            <SectionCard>
              <TouchableOpacity
                style={[styles.btn, styles.btnPurple, pushing && styles.btnDisabled]}
                onPress={handlePushSelected}
                disabled={pushing}
              >
                {pushing
                  ? <View style={styles.row}><ActivityIndicator color="#fff" size="small" /><Text style={[styles.btnText, { marginLeft: 8 }]}>{pushMsg || 'Pushing…'}</Text></View>
                  : <Text style={styles.btnText}>
                      ⬆️ Push Selected ({selectedEvents.size + selectedGoals.size + selectedTasks.size})
                    </Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnDark, { marginTop: 10 }, pushing && styles.btnDisabled]}
                onPress={handleBulkPushAll}
                disabled={pushing}
              >
                <Text style={styles.btnText}>⬆️⬆️ Push Everything to Nextcloud</Text>
              </TouchableOpacity>

              <Text style={styles.pushNote}>
                Items are created via CalDAV PUT. Re-pushing an item updates it on Nextcloud.
              </Text>
            </SectionCard>
          </>
        )}

        {/* ══════════════════════ PULL ══════════════════════ */}
        {activeTab === 'pull' && (
          <>
            <SectionCard>
              <SectionTitle>Pull from Nextcloud</SectionTitle>
              <Text style={styles.syncNote}>
                Fetches events (next 90 days) and tasks from your Nextcloud calendar. Data is stored locally for offline viewing.
              </Text>
              <Text style={styles.lastSyncRow}>Last synced: {fmt(lastSync)}</Text>

              <TouchableOpacity
                style={[styles.btn, styles.btnPurple, syncing && styles.btnDisabled]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing
                  ? <View style={styles.row}><ActivityIndicator color="#fff" size="small" /><Text style={[styles.btnText, { marginLeft: 8 }]}>Fetching…</Text></View>
                  : <Text style={styles.btnText}>🔄 Sync Now</Text>
                }
              </TouchableOpacity>
            </SectionCard>

            {ncEvents.length > 0 && (
              <SectionCard>
                <SectionTitle>📅 Nextcloud Events ({ncEvents.length})</SectionTitle>
                {ncEvents.map((ev) => (
                  <View key={ev.uid} style={styles.previewCard}>
                    <Text style={styles.previewTitle}>{ev.title}</Text>
                    <Text style={styles.previewSub}>📅 {new Date(ev.dtstart).toLocaleDateString()}</Text>
                    {ev.description ? <Text style={styles.previewDesc} numberOfLines={2}>{ev.description}</Text> : null}
                  </View>
                ))}
              </SectionCard>
            )}

            {ncTasks.length > 0 && (
              <SectionCard>
                <SectionTitle>✅ Nextcloud Tasks ({ncTasks.length})</SectionTitle>
                {ncTasks.map((t) => (
                  <View key={t.uid} style={styles.previewCard}>
                    <View style={styles.row}>
                      <Text style={styles.previewTitle}>{t.summary}</Text>
                      <Pill
                        label={t.status === 'COMPLETED' ? '✅ Done' : `⏳ ${t.status}`}
                        color={t.status === 'COMPLETED' ? '#27ae60' : '#e67e22'}
                      />
                    </View>
                    {t.due && <Text style={styles.previewSub}>Due: {new Date(t.due).toLocaleDateString()}</Text>}
                  </View>
                ))}
              </SectionCard>
            )}

            {ncEvents.length === 0 && ncTasks.length === 0 && (
              <SectionCard>
                <Text style={styles.emptyText}>No Nextcloud data yet. Tap {'"'}Sync Now{'"'} to fetch.</Text>
              </SectionCard>
            )}
          </>
        )}

        {/* ══════════════════════ HISTORY ══════════════════════ */}
        {activeTab === 'history' && (
          <SectionCard>
            <SectionTitle>Push History ({pushRecords.length})</SectionTitle>

            {pushRecords.length === 0 ? (
              <Text style={styles.emptyText}>Nothing pushed yet. Use the Push tab to send items to Nextcloud.</Text>
            ) : [...pushRecords].reverse().map((r, i) => (
              <View key={i} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Text style={styles.historyIconText}>
                    {r.type === 'event' ? '📅' : r.type === 'goal-task' ? '🎯' : '✅'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{r.title}</Text>
                  <Text style={styles.historySub}>
                    {r.type.replace('-', ' ')}  ·  {new Date(r.pushedAt).toLocaleString()}
                  </Text>
                </View>
                <Pill
                  label={r.type === 'event' ? 'Calendar' : 'Tasks'}
                  color={r.type === 'event' ? '#3498db' : '#9b59b6'}
                />
              </View>
            ))}
          </SectionCard>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f4f6f8' },

  header:           { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  backBtn:          { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backBtnText:      { fontSize: 24, color: '#2d3436' },
  headerTitle:      { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#2d3436' },
  statusDot:        { width: 12, height: 12, borderRadius: 6 },

  tabBar:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  tab:              { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:        { borderBottomWidth: 3, borderBottomColor: '#9b59b6' },
  tabText:          { fontSize: 11, color: '#636e72', fontWeight: '500' },
  tabTextActive:    { color: '#9b59b6', fontWeight: '700' },

  scroll:           { padding: 16, paddingBottom: 40 },

  statusBanner:     { borderRadius: 12, padding: 14, marginBottom: 16 },
  bannerGreen:      { backgroundColor: '#d4edda' },
  bannerRed:        { backgroundColor: '#f8d7da' },
  bannerText:       { fontWeight: '700', fontSize: 15, color: '#2d3436' },
  bannerSub:        { fontSize: 12, color: '#636e72', marginTop: 4 },

  section:          { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: '#2d3436', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  infoBox:          { backgroundColor: '#eaf4fb', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoTitle:        { fontWeight: '700', color: '#1a5276', marginBottom: 6 },
  infoText:         { fontSize: 13, color: '#2c3e50', lineHeight: 20 },

  label:            { fontSize: 13, fontWeight: '600', color: '#636e72', marginBottom: 6 },
  input:            { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ced4da', borderRadius: 10, padding: 12, fontSize: 15, color: '#2d3436', marginBottom: 14 },

  row:              { flexDirection: 'row', alignItems: 'center', gap: 10 },

  btn:              { paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText:          { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnBlue:          { backgroundColor: '#3498db' },
  btnGreen:         { backgroundColor: '#27ae60' },
  btnRed:           { backgroundColor: '#e74c3c' },
  btnPurple:        { backgroundColor: '#9b59b6' },
  btnDark:          { backgroundColor: '#2d3436' },
  btnDisabled:      { opacity: 0.55 },

  optionRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  optionInfo:       { flex: 1, marginRight: 12 },
  optionLabel:      { fontSize: 14, fontWeight: '600', color: '#2d3436' },
  optionSub:        { fontSize: 12, color: '#636e72', marginTop: 2 },

  selectAll:        { fontSize: 12, color: '#9b59b6', fontWeight: '600' },

  itemRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', gap: 10 },
  itemRowSelected:  { backgroundColor: '#f5eefb' },
  checkbox:         { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#ced4da', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked:  { backgroundColor: '#9b59b6', borderColor: '#9b59b6' },
  checkmark:        { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemTitle:        { fontSize: 14, fontWeight: '600', color: '#2d3436' },
  itemSub:          { fontSize: 11, color: '#636e72', marginTop: 2 },

  emptyText:        { fontSize: 13, color: '#95a5a6', textAlign: 'center', paddingVertical: 16 },

  pushNote:         { fontSize: 11, color: '#95a5a6', textAlign: 'center', marginTop: 10, lineHeight: 16 },
  syncNote:         { fontSize: 13, color: '#636e72', marginBottom: 12, lineHeight: 18 },
  lastSyncRow:      { fontSize: 12, color: '#9b59b6', fontWeight: '600', marginBottom: 14 },

  previewCard:      { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 8 },
  previewTitle:     { fontWeight: '600', color: '#2d3436', flex: 1 },
  previewSub:       { fontSize: 12, color: '#636e72', marginTop: 4 },
  previewDesc:      { fontSize: 12, color: '#95a5a6', marginTop: 4, fontStyle: 'italic' },

  historyRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', gap: 10 },
  historyIcon:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f3f5', alignItems: 'center', justifyContent: 'center' },
  historyIconText:  { fontSize: 18 },
  historyTitle:     { fontSize: 14, fontWeight: '600', color: '#2d3436' },
  historySub:       { fontSize: 11, color: '#636e72', marginTop: 2 },

  pill:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText:         { fontSize: 10, fontWeight: '700' },
});