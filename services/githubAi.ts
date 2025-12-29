// services/githubAi.ts
import { config } from './config';

interface GoalBreakdownRequest {
  goalDescription: string;
  sector: string;
  preferredTime: 'morning' | 'evening' | 'night';
  endDate: string;
  timesPerWeek: number;
}

interface Step {
  text: string;
  completed: boolean;
  habitType?: 'identity' | 'process' | 'outcome';
  cueStackingIdea?: string;
  estimatedDuration?: number;
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

  /**
   * Creates an optimized system prompt based on Atomic Habits principles
   */
  private createSystemPrompt(): string {
    return `You are an expert habit formation coach and productivity advisor, specialized in applying James Clear's Atomic Habits methodology to goal achievement.

Your expertise includes:
1. **The Four Laws of Behavior Change**: Make it Obvious, Make it Attractive, Make it Easy, Make it Satisfying
2. **Identity-based habits**: Focus on who the person wants to become, not just what they want to achieve
3. **The aggregation of marginal gains**: Small improvements compound into remarkable results
4. **Habit stacking**: Linking new habits to existing ones
5. **The 2-minute rule**: Making habits so easy they can be started in 2 minutes
6. **Environment design**: Making good habits inevitable and bad habits invisible

When breaking down goals into steps, you must:
- Create atomic (small, achievable) daily tasks that compound over time
- Focus on SYSTEMS and PROCESSES, not just outcomes
- Design habits that are specific, measurable, and immediately actionable
- Consider the identity the person must become to achieve this goal
- Use implementation intentions (when X happens, I will do Y)
- Make habits obvious through cues and triggers
- Ensure each step follows the principle of "never miss twice"

Format your response as JSON with this exact structure:
{
  "steps": [
    {
      "text": "Specific, actionable step (2-30 minutes)",
      "habitType": "identity|process|outcome",
      "cueStackingIdea": "After/Before [existing habit], I will [new habit]",
      "estimatedDuration": 15
    }
  ],
  "habitFormationTips": [
    "Specific tip for making this habit stick"
  ],
  "identityStatement": "I am a [type of person who does this naturally]"
}`;
  }

  /**
   * Creates an optimized user prompt for goal breakdown
   */
  private createUserPrompt(request: GoalBreakdownRequest): string {
    const { goalDescription, sector, preferredTime, endDate, timesPerWeek } = request;
    
    const daysUntilGoal = Math.ceil(
      (new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return `Break down this goal into atomic, daily habits using Atomic Habits principles:

GOAL DETAILS:
- Goal: ${goalDescription}
- Life Sector: ${sector}
- Preferred Time: ${preferredTime}
- Target Completion: ${endDate} (${daysUntilGoal} days from now)
- Frequency: ${timesPerWeek} times per week

REQUIREMENTS:
1. Create 5-8 progressive steps that build upon each other
2. Each step should be:
   - Atomic (small enough to do consistently)
   - Specific (no vague actions)
   - Measurable (clear success criteria)
   - Time-bound (15-30 minutes max per session)
   
3. Apply Atomic Habits principles:
   - Start with the 2-minute version of the habit
   - Progress from easy to challenging
   - Focus on identity change: "What type of person achieves this goal?"
   - Include habit stacking opportunities
   - Make the first step ridiculously easy
   
4. Consider the ${preferredTime} time preference for optimal habit formation

5. Design for ${timesPerWeek}x per week frequency with built-in flexibility

6. Provide actionable tips for:
   - Making each habit obvious (environmental cues)
   - Making each habit attractive (temptation bundling)
   - Making each habit easy (reduce friction)
   - Making each habit satisfying (immediate rewards)

Return ONLY valid JSON, no additional text or markdown.`;
  }

  /**
   * Breaks down a goal into atomic habits using GitHub Models API
   */
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

      // Parse the JSON response
      const parsedResponse: GoalBreakdownResponse = JSON.parse(content);

      // Add completed: false to all steps
      const stepsWithCompletion = parsedResponse.steps.map(step => ({
        ...step,
        completed: false,
      }));

      return {
        ...parsedResponse,
        steps: stepsWithCompletion,
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

  /**
   * Simple test to verify API connection
   */
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

  /**
   * Generate a habit-forming identity statement
   */
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

  /**
   * Get habit optimization suggestions for an existing goal
   */
  async getHabitOptimizationTips(currentSteps: string[]): Promise<string[]> {
    if (!this.token) {
      return [
        'Track your habit completion daily',
        'Use habit stacking to link to existing routines',
        'Make your environment support your habits',
      ];
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
              content: 'You are a habit optimization expert using Atomic Habits principles.' 
            },
            { 
              role: 'user', 
              content: `Given these habit steps: ${JSON.stringify(currentSteps)}, provide 3-5 specific optimization tips using the Four Laws of Behavior Change. Return as a JSON array of strings.` 
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error getting optimization tips:', error);
      return [
        'Track your habit completion daily',
        'Use habit stacking to link to existing routines',
        'Make your environment support your habits',
      ];
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.token && this.endpoint && this.model);
  }

  /**
   * Get configuration status for debugging
   */
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

// Export singleton instance
export const githubAI = new GitHubAIService();

// Export types
export type { GoalBreakdownRequest, GoalBreakdownResponse, Step };
