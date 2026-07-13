// services/nextcloudService.ts - Full CalDAV push/pull with status tracking
import * as SecureStore from 'expo-secure-store';
import { storage } from './storage';

/* ═══════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════ */
export interface NextcloudConfig {
  serverUrl: string;
  username: string;
  password: string;
  calendarPath?: string;
  tasksPath?: string;
}

export interface NCCalendarEvent {
  uid: string;
  title: string;
  description?: string;
  dtstart: string;
  dtend?: string;
  priority?: number;
  source: 'nextcloud';
}

export interface NCTask {
  uid: string;
  summary: string;
  description?: string;
  due?: string;
  status: 'NEEDS-ACTION' | 'COMPLETED' | 'IN-PROCESS' | 'CANCELLED';
  percentComplete?: number;
  source: 'nextcloud';
}

/** Record of every local item that has been pushed to Nextcloud */
export interface PushRecord {
  localId: string | number;
  uid: string;
  type: 'event' | 'goal-task' | 'daily-task';
  pushedAt: string;
  title: string;
}

export interface PushResult {
  ok: boolean;
  uid?: string;
  error?: string;
}

/* ═══════════════════════════════════════════════════════
   Storage keys
═══════════════════════════════════════════════════════ */
const CONFIG_KEY       = 'nextcloud_config';
const LAST_SYNC_KEY    = 'nextcloud_last_sync';
const PUSH_RECORDS_KEY = 'nextcloud_push_records';

/* ═══════════════════════════════════════════════════════
   URL validation

   Credentials are sent via HTTP Basic auth, so the transport
   MUST be encrypted. Reject anything that isn't https:// —
   except plain-HTTP loopback, which stays on-device.
═══════════════════════════════════════════════════════ */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export class InvalidServerUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidServerUrlError';
  }
}

/** Returns a normalized https URL, or throws InvalidServerUrlError. */
export function normalizeServerUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) throw new InvalidServerUrlError('Server URL is required.');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidServerUrlError('Enter a valid URL, e.g. https://cloud.example.com');
  }

  const isLoopback = LOOPBACK_HOSTS.has(url.hostname.toLowerCase());

  if (url.protocol === 'http:' && !isLoopback) {
    throw new InvalidServerUrlError(
      'Insecure http:// is not allowed — use https:// so your password is not sent in cleartext.'
    );
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new InvalidServerUrlError('Only https:// URLs are supported.');
  }

  // Drop trailing slash for consistent path building downstream.
  return trimmed.replace(/\/$/, '');
}

/* ═══════════════════════════════════════════════════════
   iCal helpers
═══════════════════════════════════════════════════════ */
function toIcalDate(iso: string): string {
  return iso.replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function escapeIcal(str: string): string {
  return (str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let out = '';
  while (line.length > 75) {
    out += line.slice(0, 75) + '\r\n ';
    line = line.slice(75);
  }
  return out + line;
}

function buildVCalendar(inner: string[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TodoerApp//EN',
    'CALSCALE:GREGORIAN',
    ...inner,
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n');
}

/* ═══════════════════════════════════════════════════════
   Service
═══════════════════════════════════════════════════════ */
class NextcloudService {
  config: NextcloudConfig | null = null;

  /* ── Config ──────────────────────────────────────────────────────────────────
     Credentials are secrets (Basic-auth password), so they live in the OS
     keystore via expo-secure-store — never in plaintext AsyncStorage. */
  async loadConfig(): Promise<NextcloudConfig | null> {
    // One-time migration: move any config left in the old plaintext location
    // into SecureStore, then purge the plaintext copy.
    const legacy = await storage.get(CONFIG_KEY, null);
    if (legacy) {
      try {
        await this.persistConfig(legacy);
      } finally {
        await storage.remove(CONFIG_KEY);
      }
    }

    const raw = await SecureStore.getItemAsync(CONFIG_KEY);
    this.config = raw ? (JSON.parse(raw) as NextcloudConfig) : null;
    return this.config;
  }

  async saveConfig(cfg: NextcloudConfig): Promise<void> {
    // Enforce encrypted transport before anything is persisted (throws on http://).
    const normalized: NextcloudConfig = { ...cfg, serverUrl: normalizeServerUrl(cfg.serverUrl) };
    await this.persistConfig(normalized);
  }

  private async persistConfig(cfg: NextcloudConfig): Promise<void> {
    this.config = cfg;
    await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(cfg));
  }

  async clearConfig(): Promise<void> {
    this.config = null;
    await SecureStore.deleteItemAsync(CONFIG_KEY);
    // Clear any legacy plaintext remnant as well.
    await storage.remove(CONFIG_KEY);
  }

  isConfigured(): boolean {
    return !!(this.config?.serverUrl && this.config?.username && this.config?.password);
  }

  /* ── Auth / URLs ─────────────────────────────────────────────────────────── */
  private authHeader(): string {
    return 'Basic ' + btoa(`${this.config!.username}:${this.config!.password}`);
  }

  private calendarUrl(): string {
    const base = this.config!.serverUrl.replace(/\/$/, '');
    return (
      this.config!.calendarPath ??
      `${base}/remote.php/dav/calendars/${this.config!.username}/personal/`
    );
  }

  private tasksUrl(): string {
    const base = this.config!.serverUrl.replace(/\/$/, '');
    return (
      this.config!.tasksPath ??
      `${base}/remote.php/dav/calendars/${this.config!.username}/tasks/`
    );
  }

  /* ── Test connection ─────────────────────────────────────────────────────── */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isConfigured()) return { ok: false, message: 'Nextcloud is not configured.' };

    try {
      const res = await fetch(this.calendarUrl(), {
        method: 'PROPFIND',
        headers: {
          Authorization: this.authHeader(),
          Depth: '0',
          'Content-Type': 'application/xml',
        },
        body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:displayname/></d:prop></d:propfind>`,
      });
      if (res.ok || res.status === 207) return { ok: true, message: 'Connection successful ✓' };
      return { ok: false, message: `Server returned ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  /* ══════════════════════════════════════════════════════
     PUSH — single Event
  ══════════════════════════════════════════════════════ */
  async pushEvent(event: {
    id: string | number;
    title: string;
    description?: string;
    date: string;
    priority?: number;
    prepTasks?: { text: string; daysBeforeEvent: number }[];
  }): Promise<PushResult> {
    if (!this.isConfigured()) return { ok: false, error: 'Not configured' };

    const uid   = `todoer-event-${event.id}@todoerapp`;
    const start = toIcalDate(new Date(event.date).toISOString());
    const end   = toIcalDate(new Date(new Date(event.date).getTime() + 3_600_000).toISOString());

    let desc = event.description ?? '';
    if (event.prepTasks && event.prepTasks.length > 0) {
      desc += '\n\n--- Preparation Plan ---\n';
      event.prepTasks.forEach((t) => { desc += `D-${t.daysBeforeEvent}: ${t.text}\n`; });
    }

    const inner = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SUMMARY:${escapeIcal(event.title)}`,
      `DESCRIPTION:${escapeIcal(desc)}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      ...(event.priority != null ? [`PRIORITY:${event.priority}`] : []),
      `CREATED:${toIcalDate(new Date().toISOString())}`,
      'END:VEVENT',
    ];

    try {
      const res = await fetch(`${this.calendarUrl()}${uid}.ics`, {
        method: 'PUT',
        headers: {
          Authorization: this.authHeader(),
          'Content-Type': 'text/calendar; charset=utf-8',
        },
        body: buildVCalendar(inner),
      });

      if (res.ok || res.status === 201 || res.status === 204) {
        await this.recordPush({ localId: event.id, uid, type: 'event', title: event.title });
        return { ok: true, uid };
      }
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /* ══════════════════════════════════════════════════════
     PUSH — Goal (all steps as individual VTODOs)
  ══════════════════════════════════════════════════════ */
  async pushGoal(goal: {
    id: string | number;
    description: string;
    sector?: string;
    endDate?: string;
    steps: { text: string; duration?: number; completed?: boolean }[];
  }): Promise<{ ok: boolean; pushed: number; failed: number }> {
    if (!this.isConfigured()) return { ok: false, pushed: 0, failed: 0 };

    let pushed = 0;
    let failed = 0;

    for (let i = 0; i < goal.steps.length; i++) {
      const step = goal.steps[i];
      const uid  = `todoer-goal-${goal.id}-step-${i}@todoerapp`;

      const inner = [
        'BEGIN:VTODO',
        `UID:${uid}`,
        `SUMMARY:${escapeIcal(`[${goal.description.slice(0, 40)}] ${step.text}`)}`,
        `DESCRIPTION:${escapeIcal(`Goal: ${goal.description}\nSector: ${goal.sector ?? 'General'}\nDuration: ${step.duration ?? 0} min`)}`,
        ...(goal.endDate ? [`DUE:${toIcalDate(new Date(goal.endDate).toISOString())}`] : []),
        `STATUS:${step.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`,
        `PERCENT-COMPLETE:${step.completed ? '100' : '0'}`,
        'END:VTODO',
      ];

      try {
        const res = await fetch(`${this.tasksUrl()}${uid}.ics`, {
          method: 'PUT',
          headers: { Authorization: this.authHeader(), 'Content-Type': 'text/calendar; charset=utf-8' },
          body: buildVCalendar(inner),
        });
        if (res.ok || res.status === 201 || res.status === 204) {
          pushed++;
          await this.recordPush({ localId: `${goal.id}-step-${i}`, uid, type: 'goal-task', title: step.text });
        } else { failed++; }
      } catch { failed++; }
    }

    return { ok: failed === 0, pushed, failed };
  }

  /* ══════════════════════════════════════════════════════
     PUSH — Daily tasks
  ══════════════════════════════════════════════════════ */
  async pushDailyTasks(tasks: {
    id: string;
    name: string;
    startTime?: string;
    duration?: number;
    type?: string;
    completed?: boolean;
  }[]): Promise<{ ok: boolean; pushed: number; failed: number }> {
    if (!this.isConfigured()) return { ok: false, pushed: 0, failed: 0 };

    let pushed = 0;
    let failed = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const task of tasks) {
      const uid = `todoer-daily-${task.id}@todoerapp`;

      let dueStr = '';
      if (task.startTime) {
        const [h, m] = task.startTime.split(':').map(Number);
        const due = new Date();
        due.setHours(h, m, 0, 0);
        dueStr = toIcalDate(due.toISOString());
      }

      const inner = [
        'BEGIN:VTODO',
        `UID:${uid}`,
        `SUMMARY:${escapeIcal(task.name)}`,
        `DESCRIPTION:${escapeIcal(`Type: ${task.type ?? 'task'}\nDuration: ${task.duration ?? 0} min\nDate: ${today}`)}`,
        ...(dueStr ? [`DUE:${dueStr}`] : []),
        `STATUS:${task.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`,
        `PERCENT-COMPLETE:${task.completed ? '100' : '0'}`,
        'END:VTODO',
      ];

      try {
        const res = await fetch(`${this.tasksUrl()}${uid}.ics`, {
          method: 'PUT',
          headers: { Authorization: this.authHeader(), 'Content-Type': 'text/calendar; charset=utf-8' },
          body: buildVCalendar(inner),
        });
        if (res.ok || res.status === 201 || res.status === 204) {
          pushed++;
          await this.recordPush({ localId: task.id, uid, type: 'daily-task', title: task.name });
        } else { failed++; }
      } catch { failed++; }
    }

    return { ok: failed === 0, pushed, failed };
  }

  /* ══════════════════════════════════════════════════════
     PUSH — Bulk all
  ══════════════════════════════════════════════════════ */
  async pushAll(): Promise<{
    eventsPushed: number;
    goalTasksPushed: number;
    dailyTasksPushed: number;
    errors: number;
  }> {
    if (!this.isConfigured()) return { eventsPushed: 0, goalTasksPushed: 0, dailyTasksPushed: 0, errors: 0 };

    const [events, goals, dailyTasks] = await Promise.all([
      storage.get('events', []),
      storage.get('goals', []),
      storage.get('dailyTasks', []),
    ]);

    let eventsPushed = 0, goalTasksPushed = 0, dailyTasksPushed = 0, errors = 0;

    for (const ev of events) {
      const r = await this.pushEvent({ id: ev.id, title: ev.title, description: ev.description, date: ev.date, priority: ev.priority, prepTasks: ev.prepTasks });
      r.ok ? eventsPushed++ : errors++;
    }

    for (const goal of goals) {
      const r = await this.pushGoal(goal);
      goalTasksPushed += r.pushed;
      errors += r.failed;
    }

    const pending = (dailyTasks as any[]).filter((t) => !t.completed);
    const r = await this.pushDailyTasks(pending);
    dailyTasksPushed += r.pushed;
    errors += r.failed;

    return { eventsPushed, goalTasksPushed, dailyTasksPushed, errors };
  }

  /* ══════════════════════════════════════════════════════
     PULL
  ══════════════════════════════════════════════════════ */
  async fetchCalendarEvents(): Promise<NCCalendarEvent[]> {
    if (!this.isConfigured()) return [];
    const now    = new Date();
    const start  = toIcalDate(now.toISOString());
    const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const end    = toIcalDate(future.toISOString());

    const body = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    try {
      const res = await fetch(this.calendarUrl(), {
        method: 'REPORT',
        headers: { Authorization: this.authHeader(), Depth: '1', 'Content-Type': 'application/xml' },
        body,
      });
      if (!res.ok && res.status !== 207) return [];
      return this.parseCalendarEvents(await res.text());
    } catch { return []; }
  }

  async fetchTasks(): Promise<NCTask[]> {
    if (!this.isConfigured()) return [];
    const body = `<?xml version="1.0" encoding="utf-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VTODO"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    try {
      const res = await fetch(this.tasksUrl(), {
        method: 'REPORT',
        headers: { Authorization: this.authHeader(), Depth: '1', 'Content-Type': 'application/xml' },
        body,
      });
      if (!res.ok && res.status !== 207) return [];
      return this.parseTasks(await res.text());
    } catch { return []; }
  }

  async syncAll(): Promise<{ events: NCCalendarEvent[]; tasks: NCTask[]; syncedAt: string }> {
    const [events, tasks] = await Promise.all([this.fetchCalendarEvents(), this.fetchTasks()]);
    const syncedAt = new Date().toISOString();
    await storage.set(LAST_SYNC_KEY, syncedAt);
    await storage.set('nc_events', events);
    await storage.set('nc_tasks', tasks);
    return { events, tasks, syncedAt };
  }

  /* ── Push record helpers ─────────────────────────────────────────────────── */
  private async recordPush(r: Omit<PushRecord, 'pushedAt'>): Promise<void> {
    const records: PushRecord[] = await storage.get(PUSH_RECORDS_KEY, []);
    const idx = records.findIndex((x) => x.localId === r.localId && x.type === r.type);
    const entry: PushRecord = { ...r, pushedAt: new Date().toISOString() };
    if (idx >= 0) records[idx] = entry; else records.push(entry);
    await storage.set(PUSH_RECORDS_KEY, records);
  }

  async getPushRecords(): Promise<PushRecord[]> {
    return storage.get(PUSH_RECORDS_KEY, []);
  }

  async isPushed(localId: string | number, type: PushRecord['type']): Promise<boolean> {
    const records: PushRecord[] = await storage.get(PUSH_RECORDS_KEY, []);
    return records.some((r) => r.localId === localId && r.type === type);
  }

  async getLastSyncTime(): Promise<string | null> {
    return storage.get(LAST_SYNC_KEY, null);
  }

  async getCachedEvents(): Promise<NCCalendarEvent[]> {
    return storage.get('nc_events', []);
  }

  async getCachedTasks(): Promise<NCTask[]> {
    return storage.get('nc_tasks', []);
  }

  /* ── Parsers ─────────────────────────────────────────────────────────────── */
  private parseCalendarEvents(xml: string): NCCalendarEvent[] {
    const events: NCCalendarEvent[] = [];
    const blocks = xml.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) ?? [];
    for (const block of blocks) {
      const v = block.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/)?.[1];
      if (!v) continue;
      const g = (p: string) => v.match(new RegExp(`^${p}[^:]*:(.+)$`, 'm'))?.[1]?.trim() ?? '';
      const dtstart = g('DTSTART');
      if (!dtstart) continue;
      events.push({ uid: g('UID') || `nc-${Date.now()}`, title: g('SUMMARY') || 'Untitled', description: g('DESCRIPTION') || undefined, dtstart: this.icalToISO(dtstart), dtend: g('DTEND') ? this.icalToISO(g('DTEND')) : undefined, source: 'nextcloud' });
    }
    return events;
  }

  private parseTasks(xml: string): NCTask[] {
    const tasks: NCTask[] = [];
    const blocks = xml.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) ?? [];
    for (const block of blocks) {
      const v = block.match(/BEGIN:VTODO([\s\S]*?)END:VTODO/)?.[1];
      if (!v) continue;
      const g = (p: string) => v.match(new RegExp(`^${p}[^:]*:(.+)$`, 'm'))?.[1]?.trim() ?? '';
      const valid = ['NEEDS-ACTION', 'COMPLETED', 'IN-PROCESS', 'CANCELLED'] as const;
      const raw   = g('STATUS') || 'NEEDS-ACTION';
      const status = valid.includes(raw as any) ? (raw as NCTask['status']) : 'NEEDS-ACTION';
      tasks.push({ uid: g('UID') || `nc-task-${Date.now()}`, summary: g('SUMMARY') || 'Untitled Task', description: g('DESCRIPTION') || undefined, due: g('DUE') ? this.icalToISO(g('DUE')) : undefined, status, percentComplete: parseInt(g('PERCENT-COMPLETE') || '0', 10) || 0, source: 'nextcloud' });
    }
    return tasks;
  }

  private icalToISO(ical: string): string {
    if (ical.includes('T')) {
      const m = ical.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
    } else {
      const m = ical.match(/(\d{4})(\d{2})(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00:00Z`;
    }
    return new Date().toISOString();
  }
}

export const nextcloudService = new NextcloudService();