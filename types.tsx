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
preferredTime?: "morning-early" | "morning-mid" | "morning-late" | "afternoon-early" | "afternoon-mid" | "afternoon-late" | "evening-early" | "evening-mid" | "evening-late";
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
type: "weekly-factor" | "goal-step" | "leisure";
goalId?: number | string;
stepIndex?: number;
duration?: number;
completed?: boolean;
attachments?: string[];
};

