// services/statsService.ts - Weekly sector stats with 7-day tracking
import { storage } from './storage';

export interface DayStats {
  date: string; // ISO date string (YYYY-MM-DD)
  completedTasks: number;
  totalMinutes: number;
  sectors: Record<string, number>; // attribute name → minutes completed
}

export interface WeekStats {
  weekKey: string; // e.g. "2025-W14"
  days: DayStats[]; // up to 7 days
  totalByDay: number[]; // 7 values (Mon–Sun), minutes per day
  totalBySector: Record<string, number>;
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getDayOfWeek(date: Date): number {
  // 0 = Monday … 6 = Sunday
  return (date.getDay() + 6) % 7;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function recordTaskCompletion(
  sector: string | undefined,
  durationMinutes: number
): Promise<void> {
  const today = new Date();
  const weekKey = getWeekKey(today);
  const dayKey = toDateKey(today);
  const dayIndex = getDayOfWeek(today);

  const stored: WeekStats = (await storage.get(`weekStats_${weekKey}`, null)) ?? {
    weekKey,
    days: [],
    totalByDay: [0, 0, 0, 0, 0, 0, 0],
    totalBySector: {},
  };

  // Find or create today's DayStats
  let dayStats = stored.days.find((d) => d.date === dayKey);
  if (!dayStats) {
    dayStats = { date: dayKey, completedTasks: 0, totalMinutes: 0, sectors: {} };
    stored.days.push(dayStats);
  }

  dayStats.completedTasks += 1;
  dayStats.totalMinutes += durationMinutes;

  if (sector) {
    dayStats.sectors[sector] = (dayStats.sectors[sector] ?? 0) + durationMinutes;
    stored.totalBySector[sector] = (stored.totalBySector[sector] ?? 0) + durationMinutes;
  }

  stored.totalByDay[dayIndex] = (stored.totalByDay[dayIndex] ?? 0) + durationMinutes;

  await storage.set(`weekStats_${weekKey}`, stored);
}

export async function getCurrentWeekStats(): Promise<WeekStats> {
  const weekKey = getWeekKey(new Date());
  const empty: WeekStats = {
    weekKey,
    days: [],
    totalByDay: [0, 0, 0, 0, 0, 0, 0],
    totalBySector: {},
  };
  return (await storage.get(`weekStats_${weekKey}`, null)) ?? empty;
}

export async function getWeekStatsByKey(weekKey: string): Promise<WeekStats | null> {
  return storage.get(`weekStats_${weekKey}`, null);
}

/** Returns the max minutes in any sector this week (for scaling radar chart) */
export function getMaxSectorMinutes(stats: WeekStats): number {
  const vals = Object.values(stats.totalBySector);
  return vals.length > 0 ? Math.max(...vals, 1) : 1;
}

/** Returns per-sector percentages (0–100) relative to the max sector, for the given attribute names */
export function getSectorPercentages(stats: WeekStats, attributeNames: string[]): Record<string, number> {
  const max = getMaxSectorMinutes(stats);
  const result: Record<string, number> = {};
  for (const name of attributeNames) {
    result[name] = Math.round(((stats.totalBySector[name] ?? 0) / max) * 100);
  }
  return result;
}

/** Returns day labels Mon–Sun */
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];