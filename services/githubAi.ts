// services/githubAi.ts - Updated to create exactly 4 steps with daily time allocation
import { config } from './config';

interface GoalBreakdownRequest {
  goalDescription: string;
  sector: string;
  preferredTime: 'morning' | 'evening' | 'night';
  endDate: string;
  timesPerWeek: number;
  dailyTimeAllocation: number; // in minutes
}

interface Step {
  text: string;
  completed: boolean;
  habitType?: 'identity' | 'process' | 'outcome';
  cueStackingIdea?: string;
  duration: number; // in minutes - required field
}

interface GoalBreakdownResponse {
  steps: Step[];
  habitFormationTips: string[];
  identityStatement: string;
}

class GitHubAIService {
  private token: string;
  private endpoint: string;
  private model: string;

  constructor() {
    this.token = config.githubToken;
    this.endpoint = config.githubEndpoint;
    this.model = config.githubModel;

    if (!this.token) {
      console.error('⚠️ GITHUB_TOKEN is not set. Add EXPO_PUBLIC_GITHUB_TOKEN to your .env file');
    }
  }

  private createSystemPrompt(): string {
  return `You are an elite habit formation coach and behavioral design expert.

Your methodology is a synthesis of:
- **Atomic Habits (James Clear)** – identity-based habits, systems over goals, marginal gains
- **The Power of Habit (Charles Duhigg)** – cue → routine → reward loops and keystone habits
- **Tiny Habits (BJ Fogg)** – behavior = motivation × ability × prompt, tiny behaviors first

────────────────────────
CORE PRINCIPLES YOU MUST APPLY
────────────────────────

1. **Identity First (James Clear)**
   - Every habit reinforces an identity
   - Start with “I am the type of person who…”
   - Habits are votes for identity, not one-time wins

2. **Cue–Routine–Reward Loop (Charles Duhigg)**
   - Every step MUST clearly fit into:
     - Cue (when/after what?)
     - Routine (the habit itself)
     - Reward (immediate satisfaction or closure)
   - Prefer keystone habits that naturally trigger other positive behaviors

3. **Tiny Habits & Behavior Design (BJ Fogg)**
   - Start ridiculously small (especially Step 1)
   - Increase ability before increasing intensity
   - Each habit must be easy to succeed at
   - Use clear prompts (habit stacking)

4. **Atomic Progression**
   - Steps must be:
     - Small
     - Specific
     - Repeatable
     - System-focused (process > outcome)

────────────────────────
CRITICAL HARD RULES (NON-NEGOTIABLE)
────────────────────────

- Create **EXACTLY 4 steps** — no more, no less
- EACH step MUST:
  - Have a duration in minutes
  - Be small and achievable
  - Build progressively on the previous step
  - Include a habit stacking cue
- Total duration of all steps MUST equal the user’s daily time allocation
- Steps must align with the user’s preferred time (morning/evening/night)
- Steps must be realistic for the stated frequency per week
- Focus on **systems and habits**, not vague goals

────────────────────────
STEP DESIGN GUIDELINES
────────────────────────

Step 1 – **Tiny Entry Habit**
- Extremely easy to start
- Focus: identity + ability
- Uses Tiny Habits logic

Step 2 – **Core Routine**
- Establishes the main habit loop
- Focus: consistency and cue clarity

Step 3 – **Reinforcement & Depth**
- Strengthens the habit
- Introduces mild challenge

Step 4 – **Keystone / Identity Lock-In**
- Most advanced
- Reinforces long-term identity
- Creates compounding benefits

────────────────────────
OUTPUT FORMAT (STRICT JSON ONLY)
────────────────────────

{
  "steps": [
    {
      "text": "Specific, actionable habit step",
      "habitType": "identity | process | outcome",
      "cueStackingIdea": "After/Before [existing habit], I will [new habit]",
      "duration": 10
    }
  ],
  "habitFormationTips": [
    "Clear, practical habit-building advice grounded in the three frameworks"
  ],
  "identityStatement": "I am a person who naturally does this."
}

IMPORTANT:
- Return ONLY valid JSON
- NO markdown
- NO explanations
- EXACTLY 4 steps
- Durations must sum exactly to the daily time allocation
`;
}


  private createUserPrompt(request: GoalBreakdownRequest): string {
    const { goalDescription, sector, preferredTime, endDate, timesPerWeek, dailyTimeAllocation } = request;
    
    const daysUntilGoal = Math.ceil(
      (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate suggested time distribution for 4 steps
    const timePerStep = Math.floor(dailyTimeAllocation / 4);
    const remainder = dailyTimeAllocation % 4;

    return `Break down this goal into EXACTLY 4 atomic, progressive habits using Atomic Habits principles:

GOAL DETAILS:
- Goal: ${goalDescription}
- Life Sector: ${sector}
- Preferred Time: ${preferredTime}
- Target Completion: ${endDate} (${daysUntilGoal} days from now)
- Frequency: ${timesPerWeek} times per week
- Daily Time Allocation: ${dailyTimeAllocation} minutes

TIME DISTRIBUTION:
You must create EXACTLY 4 steps. Distribute the ${dailyTimeAllocation} minutes across these 4 steps.
Suggested distribution (adjust slightly based on complexity):
- Step 1: ${timePerStep} minutes (easiest, foundation)
- Step 2: ${timePerStep} minutes (building on step 1)
- Step 3: ${timePerStep + Math.floor(remainder / 2)} minutes (more advanced)
- Step 4: ${timePerStep + Math.ceil(remainder / 2)} minutes (most advanced)

CRITICAL: The sum of all durations must equal ${dailyTimeAllocation} minutes.

REQUIREMENTS FOR THE 4 STEPS:
1. **Step 1 (Foundation)**: The easiest entry point using the 2-minute rule
   - Should be ridiculously easy to start
   - Duration: ${timePerStep} minutes
   
2. **Step 2 (Building)**: Slightly more challenging, builds on step 1
   - Introduces the core habit
   - Duration: ${timePerStep} minutes
   
3. **Step 3 (Advancing)**: More substantial practice
   - Deepens the habit
   - Duration: ${timePerStep + Math.floor(remainder / 2)} minutes
   
4. **Step 4 (Mastering)**: Most challenging, synthesizes everything
   - Creates lasting change
   - Duration: ${timePerStep + Math.ceil(remainder / 2)} minutes

Each step must:
- Be specific and measurable
- Include a habit stacking suggestion
- Fit within the ${preferredTime} time preference
- Be designed for ${timesPerWeek}x per week frequency

Return ONLY valid JSON with EXACTLY 4 steps, no additional text or markdown.`;
  }

  async breakdownGoal(request: GoalBreakdownRequest): Promise<GoalBreakdownResponse> {
    if (!this.token) {
      throw new Error('GitHub token is not configured. Please set EXPO_PUBLIC_GITHUB_TOKEN in your .env file');
    }

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.createSystemPrompt() },
            { role: 'user', content: this.createUserPrompt(request) },
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from API');
      }

      // Remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/g, '');
      }

      const parsedResponse: GoalBreakdownResponse = JSON.parse(cleanedContent);

      // Validate that we have exactly 4 steps
      if (parsedResponse.steps.length !== 4) {
        console.warn(`Expected 4 steps, got ${parsedResponse.steps.length}. Adjusting...`);
        // If we got more or less, take first 4 or pad with generic steps
        if (parsedResponse.steps.length > 4) {
          parsedResponse.steps = parsedResponse.steps.slice(0, 4);
        } else {
          // Pad with generic steps if less than 4
          const timePerStep = Math.floor(request.dailyTimeAllocation / 4);
          while (parsedResponse.steps.length < 4) {
            parsedResponse.steps.push({
              text: `Continue practicing and refining (Step ${parsedResponse.steps.length + 1})`,
              habitType: 'process',
              cueStackingIdea: 'After completing previous step, I will continue',
              duration: timePerStep,
              completed: false,
            });
          }
        }
      }

      // Ensure all steps have duration and completed fields
      const stepsWithMetadata = parsedResponse.steps.map((step, index) => ({
        ...step,
        duration: step.duration || Math.floor(request.dailyTimeAllocation / 4),
        completed: false,
      }));

      // Adjust durations to match total allocation
      const totalDuration = stepsWithMetadata.reduce((sum, step) => sum + step.duration, 0);
      if (totalDuration !== request.dailyTimeAllocation) {
        const difference = request.dailyTimeAllocation - totalDuration;
        stepsWithMetadata[stepsWithMetadata.length - 1].duration += difference;
      }

      return {
        ...parsedResponse,
        steps: stepsWithMetadata,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Failed to parse AI response as JSON:', error);
        throw new Error('Invalid response format from AI. Please try again.');
      }
      
      console.error('Error in breakdownGoal:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.token) {
      console.error('Cannot test connection: GITHUB_TOKEN not set');
      return false;
    }

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say "connected" if you can read this.' },
          ],
          max_tokens: 10,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async generateIdentityStatement(goal: string, sector: string): Promise<string> {
    if (!this.token) {
      return 'I am someone who takes consistent action toward my goals.';
    }

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a habit formation expert. Create powerful identity statements based on Atomic Habits by James Clear.' 
            },
            { 
              role: 'user', 
              content: `Create a single, powerful identity statement for someone whose goal is: "${goal}" in the ${sector} sector. Format: "I am a [identity]." Keep it short, specific, and inspiring.` 
            },
          ],
          temperature: 0.8,
          max_tokens: 50,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || 'I am someone who takes consistent action toward my goals.';
    } catch (error) {
      console.error('Error generating identity statement:', error);
      return 'I am someone who takes consistent action toward my goals.';
    }
  }

  isConfigured(): boolean {
    return !!(this.token && this.endpoint && this.model);
  }

  getConfigStatus(): { configured: boolean; details: Record<string, boolean> } {
    return {
      configured: this.isConfigured(),
      details: {
        hasToken: !!this.token,
        hasEndpoint: !!this.endpoint,
        hasModel: !!this.model,
      },
    };
  }
}

export const githubAI = new GitHubAIService();
export type { GoalBreakdownRequest, GoalBreakdownResponse, Step };
