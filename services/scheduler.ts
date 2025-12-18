import { DailyTask, Goal, WeeklyFactorTask } from "../types";


const MIN = 5 * 60;
const MAX = 19 * 60;


const hhmmToMin = (x: string) => {
const [h, m] = x.split(":").map(Number);
return h * 60 + m;
};
const minToHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;


export function generateDailySchedule(date: Date, goals: Goal[], weeklyFactors: any) {
const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
const dayFactors = weeklyFactors[weekday] || [];


const scheduled: DailyTask[] = [];
const occupied: { start: number; end: number }[] = [];


// Insert weekly factors
dayFactors.forEach((f: WeeklyFactorTask) => {
const s = Math.max(hhmmToMin(f.startTime), MIN);
const e = Math.min(hhmmToMin(f.endTime), MAX);
if (s < e) {
scheduled.push({ id: "wf-" + f.id, name: f.taskName, startTime: minToHHMM(s), endTime: minToHHMM(e), type: "weekly-factor", duration: e - s });
occupied.push({ start: s, end: e });
}
});


// Collect pending goal steps
const goalTasks: DailyTask[] = [];
goals.forEach((g) => {
g.steps.forEach((s, idx) => {
if (!s.completed) goalTasks.push({ id: `goal-${g.id}-${idx}`, name: s.text, type: "goal-step", goalId: g.id, stepIndex: idx, duration: 60 });
});
});


// Merge intervals
occupied.sort((a, b) => a.start - b.start);
const merged = [] as typeof occupied;
for (const seg of occupied) {
if (!merged.length || seg.start > merged[merged.length - 1].end) merged.push({ ...seg });
else merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, seg.end);
}


// Identify free space
const free: { start: number; end: number }[] = [];
let cursor = MIN;
for (const seg of merged) {
if (cursor < seg.start) free.push({ start: cursor, end: seg.start });
cursor = seg.end;
}
if (cursor < MAX) free.push({ start: cursor, end: MAX });


// Greedy place goal steps
for (const t of goalTasks) {
for (const slot of free) {
if (slot.end - slot.start >= t.duration!) {
const start = slot.start;
const end = start + t.duration!;
t.startTime = minToHHMM(start);
t.endTime = minToHHMM(end);
scheduled.push(t);
slot.start = end;
break;
}
}
}


return scheduled.sort((a, b) => hhmmToMin(a.startTime!) - hhmmToMin(b.startTime!));
}

