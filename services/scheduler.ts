// services/scheduler.ts

interface Goal {
  id: number;
  description: string;
  preferredTime: 'morning' | 'evening' | 'night';
  endDate: string;
  sector: string;
  timesPerWeek: number;
  steps: Step[];
  progress: number;
  dailyTimeAllocation?: number; // minutes
}

interface Step {
  text: string;
  completed: boolean;
  duration: number; // minutes
  habitType?: string;
  cueStackingIdea?: string;
}

interface WeeklyFactor {
  id: number;
  taskName: string;
  startTime: string;
  endTime: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'goal-step' | 'weekly-factor';
  completed: boolean;
  goalId?: number;
  stepIndex?: number;
  duration: number;
  sector?: string;
  priority?: number;
}

interface TimeSlot {
  start: number; // minutes from midnight
  end: number;
  available: boolean;
}

class Scheduler {
  private readonly SLOT_SIZE = 5; // 🔥 minute precision
  private readonly DAY_START = 5 * 60;
  private readonly DAY_END = 22 * 60;
  private readonly MORNING_END = 12 * 60;
  private readonly EVENING_START = 17 * 60;
  private readonly NIGHT_START = 19 * 60;

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private getPreferredTimeRange(preferred: Goal['preferredTime']) {
    switch (preferred) {
      case 'morning':
        return { start: this.DAY_START, end: this.MORNING_END };
      case 'evening':
        return { start: this.EVENING_START, end: this.NIGHT_START };
      case 'night':
        return { start: this.NIGHT_START, end: this.DAY_END };
      default:
        return { start: this.DAY_START, end: this.DAY_END };
    }
  }

  private initializeTimeSlots(weeklyFactors: WeeklyFactor[]): TimeSlot[] {
    const slots: TimeSlot[] = [];

    for (let t = this.DAY_START; t < this.DAY_END; t += this.SLOT_SIZE) {
      slots.push({ start: t, end: t + this.SLOT_SIZE, available: true });
    }

    weeklyFactors.forEach(factor => {
      const s = this.timeToMinutes(factor.startTime);
      const e = this.timeToMinutes(factor.endTime);

      slots.forEach(slot => {
        if (slot.start < e && slot.end > s) {
          slot.available = false;
        }
      });
    });

    return slots;
  }

  private findAvailableSlot(
    slots: TimeSlot[],
    duration: number,
    startRange: number,
    endRange: number
  ): { start: number; end: number } | null {
    const requiredSlots = Math.ceil(duration / this.SLOT_SIZE);

    for (let i = 0; i <= slots.length - requiredSlots; i++) {
      const slice = slots.slice(i, i + requiredSlots);
      const slotStart = slice[0].start;
      const slotEnd = slice[slice.length - 1].end;

      if (
        slotStart >= startRange &&
        slotEnd <= endRange &&
        slice.every(s => s.available)
      ) {
        slice.forEach(s => (s.available = false));
        return { start: slotStart, end: slotEnd };
      }
    }

    return null;
  }

  private shouldScheduleGoalToday(goal: Goal, date: Date): boolean {
    if (new Date(goal.endDate) <= date) return false;
    if (goal.steps.every(s => s.completed)) return false;

    const map: Record<number, number[]> = {
      1: [1],
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 5],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6],
    };

    return (map[goal.timesPerWeek] || map[3]).includes(date.getDay());
  }

  private calculatePriority(goal: Goal, stepIndex: number): number {
    const daysLeft =
      (new Date(goal.endDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    let score = 100;
    if (daysLeft < 7) score += 30;
    else if (daysLeft < 30) score += 15;

    score -= (stepIndex / goal.steps.length) * 20;
    score -= (goal.progress / 100) * 15;

    return Math.max(0, Math.min(100, score));
  }

  generateDailySchedule(
    date: Date,
    goals: Goal[],
    weeklyFactors: Record<string, WeeklyFactor[]>
  ): ScheduledTask[] {
    const tasks: ScheduledTask[] = [];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const factors = weeklyFactors[dayName] || [];

    const slots = this.initializeTimeSlots(factors);

    // Add weekly fixed tasks
    factors.forEach(f => {
      tasks.push({
        id: `wf-${f.id}-${date.getTime()}`,
        name: f.taskName,
        startTime: f.startTime,
        endTime: f.endTime,
        type: 'weekly-factor',
        completed: false,
        duration: this.timeToMinutes(f.endTime) - this.timeToMinutes(f.startTime),
      });
    });

    const activeGoals = goals.filter(g =>
      this.shouldScheduleGoalToday(g, date)
    );

    for (const goal of activeGoals) {
      const range = this.getPreferredTimeRange(goal.preferredTime);
      const dailyLimit = goal.dailyTimeAllocation ?? Infinity;
      let used = 0;

      for (let i = 0; i < goal.steps.length; i++) {
        const step = goal.steps[i];
        if (step.completed) continue;
        if (used + step.duration > dailyLimit) break;

        const slot = this.findAvailableSlot(
          slots,
          step.duration,
          range.start,
          range.end
        );

        if (!slot) break;

        tasks.push({
          id: `goal-${goal.id}-${i}-${date.getTime()}`,
          name: step.text,
          startTime: this.minutesToTime(slot.start),
          endTime: this.minutesToTime(slot.end),
          type: 'goal-step',
          completed: false,
          goalId: goal.id,
          stepIndex: i,
          duration: step.duration,
          sector: goal.sector,
          priority: this.calculatePriority(goal, i),
        });

        used += step.duration;
      }
    }

    return tasks.sort(
      (a, b) =>
        this.timeToMinutes(a.startTime) -
        this.timeToMinutes(b.startTime)
    );
  }
}

export const scheduler = new Scheduler();

export function generateDailySchedule(
  date: Date,
  goals: Goal[],
  weeklyFactors: Record<string, WeeklyFactor[]>
) {
  return scheduler.generateDailySchedule(date, goals, weeklyFactors);
}

export type { Goal, ScheduledTask, Step, TimeSlot, WeeklyFactor };

