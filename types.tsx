export type WeeklyFactorTask = {
id: number | string;
taskName: string;
startTime: string;
endTime: string;
};


export type GoalStep = { text: string; completed?: boolean };


export type Goal = {
id: number | string;
description: string;
preferredTime?: "morning" | "evening" | "night";
endDate?: string;
sector?: string;
timesPerWeek?: number;
steps: GoalStep[];
};


export type DailyTask = {
id: string;
name: string;
startTime?: string;
endTime?: string;
type: "weekly-factor" | "goal-step" | "ad-hoc";
goalId?: number | string;
stepIndex?: number;
duration?: number;
completed?: boolean;
attachments?: string[];
};