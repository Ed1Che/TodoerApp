// services/scheduler.ts

type Frequency = 'once' | 'week' | 'monthly';

interface Goal {
  id: number;
  description: string;
  startTime: string;
  endDate: string;
  sector: string;
  timesPerWeek: number;
  steps: Step[];
  progress: number;
  dailyTimeAllocation?: number;
  createdAt: string;
}

interface Step {
  text: string;
  completed: boolean;
  duration: number;
  habitType?: string;
  cueStackingIdea?: string;
}

interface WeeklyFactor {
  id: number;
  taskName: string;
  startTime: string;
  endTime: string;
  sector: string;
  frequency?: Frequency;
  createdAt?: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  repetition: number;
  description?: string;
  recurrence?: 'none' | 'yearly';
  recurrenceGroupId?: number;
}

interface PurchasedLeisure {
  id: number;
  rewardName: string;
  rewardIcon: string;
  cost: number;
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
  status: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'goal-step' | 'weekly-factor' | 'event-prep' | 'leisure';
  completed: boolean;
  goalId?: number;
  stepIndex?: number;
  eventId?: number;
  duration: number;
  sector?: string;
  description?: string;

  // highest ordering rule
  fixedStart?: boolean;
}

interface TimeSlot {
  start: number;
  end: number;
  available: boolean;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);

  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));

  const yearStart = new Date(d.getFullYear(), 0, 1);

  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

class Scheduler {
  private readonly SLOT_SIZE = 5;

  // 05:00 am
  private readonly DAY_START = 5 * 60;

  // 26:00 => 02:00 next day
  private readonly DAY_END = 26 * 60;

  private minutesToTime(minutes: number): string {
    const actual = minutes % (24 * 60);

    const h = Math.floor(actual / 60);
    const m = actual % 60;

    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}`;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);

    return h * 60 + m;
  }

  private initializeTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];

    for (
      let t = this.DAY_START;
      t < this.DAY_END;
      t += this.SLOT_SIZE
    ) {
      slots.push({
        start: t,
        end: t + this.SLOT_SIZE,
        available: true,
      });
    }

    return slots;
  }

  private blockTimeSlots(
    slots: TimeSlot[],
    startTime: string,
    endTime: string
  ): void {
    const s = this.timeToMinutes(startTime);
    const e = this.timeToMinutes(endTime);

    slots.forEach(slot => {
      if (slot.start < e && slot.end > s) {
        slot.available = false;
      }
    });
  }

  private freeTimeSlots(
    slots: TimeSlot[],
    startTime: string,
    endTime: string
  ): void {
    const s = this.timeToMinutes(startTime);
    const e = this.timeToMinutes(endTime);

    slots.forEach(slot => {
      if (slot.start < e && slot.end > s) {
        slot.available = true;
      }
    });
  }

  private reserveFixedSlot(
    slots: TimeSlot[],
    startMinutes: number,
    duration: number
  ): { start: number; end: number } | null {
    const endMinutes = startMinutes + duration;

    const relevantSlots = slots.filter(
      slot =>
        slot.start >= startMinutes &&
        slot.end <= endMinutes
    );

    const required = Math.ceil(
      duration / this.SLOT_SIZE
    );

    if (
      relevantSlots.length >= required &&
      relevantSlots.every(slot => slot.available)
    ) {
      relevantSlots.forEach(slot => {
        slot.available = false;
      });

      return {
        start: startMinutes,
        end: endMinutes,
      };
    }

    return null;
  }

  private findAvailableSlot(
    slots: TimeSlot[],
    duration: number,
    startRange: number,
    endRange: number
  ): { start: number; end: number } | null {
    const required = Math.ceil(
      duration / this.SLOT_SIZE
    );

    for (
      let i = 0;
      i <= slots.length - required;
      i++
    ) {
      const slice = slots.slice(
        i,
        i + required
      );

      if (
        slice[0].start >= startRange &&
        slice[slice.length - 1].end <= endRange &&
        slice.every(s => s.available)
      ) {
        slice.forEach(s => {
          s.available = false;
        });

        return {
          start: slice[0].start,
          end: slice[slice.length - 1].end,
        };
      }
    }

    return null;
  }

  private shouldScheduleGoalToday(
    goal: Goal,
    date: Date
  ): boolean {
    const goalEnd = new Date(goal.endDate);
    const today = new Date(date);

    today.setHours(0, 0, 0, 0);
    goalEnd.setHours(0, 0, 0, 0);

    if (goalEnd < today) {
      return false;
    }

    if (
      goal.steps.every(step => step.completed)
    ) {
      return false;
    }

    const map: Record<number, number[]> = {
      1: [1],
      2: [1, 4],
      3: [1, 3, 5],
      4: [1, 2, 4, 5],
      5: [1, 2, 3, 4, 5],
      6: [1, 2, 3, 4, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6],
    };

    return (
      (map[goal.timesPerWeek] || map[3]).includes(
        date.getDay()
      )
    );
  }

  private shouldScheduleWeeklyFactor(
    factor: WeeklyFactor,
    date: Date
  ): boolean {
    const freq = factor.frequency ?? 'week';

    if (freq === 'week') {
      return true;
    }

    if (freq === 'once') {
      if (!factor.createdAt) {
        return true;
      }

      const createdWeek = getISOWeekNumber(
        new Date(factor.createdAt)
      );

      const createdYear = new Date(
        factor.createdAt
      ).getFullYear();

      return (
        createdYear === date.getFullYear() &&
        createdWeek === getISOWeekNumber(date)
      );
    }

    if (freq === 'monthly') {
      if (!factor.createdAt) {
        return true;
      }

      return (
        date.getDate() ===
        new Date(factor.createdAt).getDate()
      );
    }

    return true;
  }

  private getConflict(
    tasks: ScheduledTask[],
    start: number,
    end: number
  ): ScheduledTask | null {
    for (const task of tasks) {
      const taskStart = this.timeToMinutes(
        task.startTime
      );

      const taskEnd = this.timeToMinutes(
        task.endTime
      );

      const overlaps =
        start < taskEnd && end > taskStart;

      if (overlaps) {
        return task;
      }
    }

    return null;
  }

  private rescheduleTask(
    task: ScheduledTask,
    tasks: ScheduledTask[],
    slots: TimeSlot[]
  ): boolean {
    // fixed tasks NEVER move
    if (task.fixedStart) {
      return false;
    }

    this.freeTimeSlots(
      slots,
      task.startTime,
      task.endTime
    );

    const slot = this.findAvailableSlot(
      slots,
      task.duration,
      this.timeToMinutes(task.endTime),
      this.DAY_END
    );

    if (!slot) {
      this.blockTimeSlots(
        slots,
        task.startTime,
        task.endTime
      );

      return false;
    }

    task.startTime = this.minutesToTime(
      slot.start
    );

    task.endTime = this.minutesToTime(
      slot.end
    );

    return true;
  }

  generateDailySchedule(
    date: Date,
    goals: Goal[],
    weeklyFactors: Record<
      string,
      WeeklyFactor[]
    >,
    events: Event[] = [],
    purchasedLeisure: PurchasedLeisure[] = [],
    existingTasks: ScheduledTask[] = []
  ): ScheduledTask[] {
    const tasks: ScheduledTask[] = [];

    const dayName = date.toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
      }
    );

    const dateStr = date
      .toISOString()
      .split('T')[0];

    const rawFactors =
      weeklyFactors[dayName] || [];

    const factors = rawFactors.filter(f =>
      this.shouldScheduleWeeklyFactor(
        f,
        date
      )
    );

    const slots =
      this.initializeTimeSlots();

    // EVENTS
    const relevantEvents = events.filter(
      event => {
        const eventDate = new Date(
          event.date
        );

        return (
          eventDate.toDateString() ===
          date.toDateString()
        );
      }
    );

    relevantEvents.forEach(event => {
      const eventDate = new Date(event.date);

      const startMinutes =
        this.timeToMinutes(
          eventDate
            .toTimeString()
            .slice(0, 5)
        );

      const duration = 60;

      const task: ScheduledTask = {
        id: `event-${event.id}-${dateStr}`,
        name: `📅 ${event.title}`,
        startTime:
          this.minutesToTime(startMinutes),
        endTime: this.minutesToTime(
          startMinutes + duration
        ),
        type: 'event-prep',
        completed: false,
        duration,
        fixedStart: true,
      };

      const conflict = this.getConflict(
        tasks,
        startMinutes,
        startMinutes + duration
      );

      if (conflict) {
        if (!conflict.fixedStart) {
          this.rescheduleTask(
            conflict,
            tasks,
            slots
          );
        } else {
          return;
        }
      }

      tasks.push(task);

      this.blockTimeSlots(
        slots,
        task.startTime,
        task.endTime
      );
    });

    // WEEKLY FACTORS
    factors.forEach(f => {
      const startMinutes =
        this.timeToMinutes(f.startTime);

      const duration =
        this.timeToMinutes(f.endTime) -
        this.timeToMinutes(f.startTime);

      const task: ScheduledTask = {
        id: `wf-${f.id}-${dateStr}`,
        name: f.taskName,
        startTime: f.startTime,
        endTime: f.endTime,
        type: 'weekly-factor',
        completed: false,
        sector: f.sector,
        duration,
        fixedStart: true,
      };

      const conflict = this.getConflict(
        tasks,
        startMinutes,
        startMinutes + duration
      );

      if (conflict) {
        if (!conflict.fixedStart) {
          this.rescheduleTask(
            conflict,
            tasks,
            slots
          );
        } else {
          return;
        }
      }

      tasks.push(task);

      this.blockTimeSlots(
        slots,
        task.startTime,
        task.endTime
      );
    });

    // GOALS
    const activeGoals = goals.filter(goal =>
      this.shouldScheduleGoalToday(
        goal,
        date
      )
    );

    activeGoals.forEach(goal => {
      let currentStart =
        this.timeToMinutes(
          goal.startTime || '05:00'
        );

      let used = 0;

      const dailyLimit =
        goal.dailyTimeAllocation ??
        Infinity;

      for (
        let i = 0;
        i < goal.steps.length;
        i++
      ) {
        const step = goal.steps[i];

        if (step.completed) {
          continue;
        }

        if (
          used + step.duration >
          dailyLimit
        ) {
          break;
        }

        let slot =
          this.reserveFixedSlot(
            slots,
            currentStart,
            step.duration
          );

        if (!slot) {
          const conflict =
            this.getConflict(
              tasks,
              currentStart,
              currentStart +
                step.duration
            );

          if (conflict && !conflict.fixedStart) {
            this.rescheduleTask(
              conflict,
              tasks,
              slots
            );

            slot = this.reserveFixedSlot(
              slots,
              currentStart,
              step.duration
            );
          }
        }

        if (!slot) {
          slot = this.findAvailableSlot(
            slots,
            step.duration,
            currentStart,
            this.DAY_END
          );
        }

        if (!slot) {
          continue;
        }

        const task: ScheduledTask = {
          id: `goal-${goal.id}-${i}-${dateStr}`,
          name: step.text,
          startTime:
            this.minutesToTime(slot.start),
          endTime:
            this.minutesToTime(slot.end),
          type: 'goal-step',
          completed: false,
          goalId: goal.id,
          stepIndex: i,
          duration: step.duration,
          sector: goal.sector,
          fixedStart: false,
        };

        tasks.push(task);

        used += step.duration;

        currentStart = slot.end;
      }
    });

    // PURCHASED LEISURE
    purchasedLeisure.forEach(leisure => {
      if (leisure.scheduledDate !== dateStr) {
        return;
      }

      const duration =
        leisure.duration ?? 60;

      const startMinutes =
        this.timeToMinutes(
          leisure.scheduledTime
        );

      const task: ScheduledTask = {
        id: `leisure-${leisure.id}-${dateStr}`,
        name: `${leisure.rewardIcon} ${leisure.rewardName}`,
        startTime: leisure.scheduledTime,
        endTime: this.minutesToTime(
          startMinutes + duration
        ),
        type: 'leisure',
        completed: false,
        duration,
        fixedStart: true,
      };

      const conflict = this.getConflict(
        tasks,
        startMinutes,
        startMinutes + duration
      );

      if (!conflict) {
        tasks.push(task);

        this.blockTimeSlots(
          slots,
          task.startTime,
          task.endTime
        );
      }
    });

    // FINAL ORDERING
    return tasks.sort((a, b) => {
      // RULE #1: fixed start tasks ALWAYS come first
      if (a.fixedStart && !b.fixedStart) {
        return -1;
      }

      if (!a.fixedStart && b.fixedStart) {
        return 1;
      }

      // RULE #2: chronological order
      const timeA = this.timeToMinutes(
        a.startTime
      );

      const timeB = this.timeToMinutes(
        b.startTime
      );

      return timeA - timeB;
    });
  }
}

export const scheduler = new Scheduler();

export function generateDailySchedule(
  date: Date,
  goals: Goal[],
  weeklyFactors: Record<
    string,
    WeeklyFactor[]
  >,
  events: Event[] = [],
  purchasedLeisure: PurchasedLeisure[] = [],
  existingTasks: ScheduledTask[] = []
) {
  return scheduler.generateDailySchedule(
    date,
    goals,
    weeklyFactors,
    events,
    purchasedLeisure,
    existingTasks
  );
}

export type {
  Event,
  Frequency,
  Goal,
  PurchasedLeisure,
  ScheduledTask,
  Step,
  TimeSlot,
  WeeklyFactor
};
