// services/eventPrepAi.ts - AI-powered event preparation task generator
import { config } from './config';

export interface EventPrepRequest {
  eventTitle: string;
  eventDescription?: string;
  eventDate: string;
  priority: number; // 1-5
  repetition: number; // how many prep sessions
}

export interface PrepTask {
  text: string;
  daysBeforeEvent: number; // when to do it relative to the event
  duration: number; // minutes
  category: 'logistics' | 'mental' | 'material' | 'communication' | 'review';
  tip?: string;
}

export interface EventPrepResponse {
  prepTasks: PrepTask[];
  mindsetStatement: string;
  prepTips: string[];
}

class EventPrepAIService {
  private token: string;
  private endpoint: string;
  private model: string;

  constructor() {
    this.token = config.githubToken;
    this.endpoint = config.githubEndpoint;
    this.model = config.githubModel;
  }

  private createSystemPrompt(): string {
    return `You are an expert event preparation coach and productivity strategist.

Your role is to help people prepare thoroughly and confidently for important events using proven preparation frameworks.

PREPARATION PRINCIPLES:
1. **Backwards Planning** – Work backwards from the event date to schedule tasks
2. **Progressive Readiness** – Earlier tasks are foundational; later tasks are refinements
3. **Mental & Logistical Balance** – Combine practical preparation with mindset/confidence work
4. **Minimal Viable Preparation** – Each task should be focused, specific, and achievable
5. **Contingency Thinking** – Include review and fallback planning tasks

TASK CATEGORIES:
- logistics: Physical/practical arrangements (venue, materials, travel, tools)
- mental: Mindset, confidence, rehearsal, visualization
- material: Creating/gathering content, documents, presentations
- communication: Emails, confirmations, outreach
- review: Checking, revising, final walkthroughs

OUTPUT FORMAT (STRICT JSON ONLY, no markdown):
{
  "prepTasks": [
    {
      "text": "Specific, actionable preparation step",
      "daysBeforeEvent": 7,
      "duration": 30,
      "category": "logistics | mental | material | communication | review",
      "tip": "Optional helpful tip for doing this task well"
    }
  ],
  "mindsetStatement": "A powerful, confidence-building statement for this event",
  "prepTips": ["Practical tips grounded in preparation science"]
}

RULES:
- Return ONLY valid JSON — no markdown, no explanations
- Tasks must be distributed intelligently across the days leading up to the event
- Earlier tasks (further from event) handle logistics and materials
- Later tasks (close to event) handle review and mental prep
- The final day should always include a short review + mindset task
- Keep tasks specific, not vague (e.g., "Pack presentation clicker and laptop charger" not "Prepare materials")`;
  }

  private createUserPrompt(request: EventPrepRequest): string {
    const eventDate = new Date(request.eventDate);
    const today = new Date();
    const daysUntil = Math.max(
      1,
      Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    const maxDaysSpread = Math.min(daysUntil, 14);
    const taskCount = Math.min(request.repetition, maxDaysSpread);

    return `Create EXACTLY ${taskCount} preparation tasks for this event:

EVENT DETAILS:
- Title: ${request.eventTitle}
- Description: ${request.eventDescription || 'No additional details'}
- Event Date: ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Days Until Event: ${daysUntil}
- Priority Level: ${request.priority}/5
- Number of Prep Sessions: ${request.repetition}

SCHEDULING CONSTRAINTS:
- You have ${maxDaysSpread} days to spread preparation
- Create EXACTLY ${taskCount} tasks
- Distribute them meaningfully (e.g., for ${taskCount} tasks over ${maxDaysSpread} days, space them out)
- The last task must have daysBeforeEvent = 1 (day before) or 0 (day of, for review)
- Higher priority events (4-5) should have more thorough tasks with longer durations
- Each task should build on the previous ones

TASK DURATION GUIDE based on priority ${request.priority}/5:
- Priority 1-2: 15-20 min tasks
- Priority 3: 20-30 min tasks  
- Priority 4-5: 30-45 min tasks

Return ONLY valid JSON with EXACTLY ${taskCount} prep tasks.`;
  }

  async generateEventPrep(request: EventPrepRequest): Promise<EventPrepResponse> {
    if (!this.token) {
      throw new Error('GitHub token not configured. Please set GITHUB_TOKEN in your .env file.');
    }

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.createSystemPrompt() },
            { role: 'user', content: this.createUserPrompt(request) },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content ?? '';

      // Strip markdown fences if present
      let cleaned = content.trim();
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed: EventPrepResponse = JSON.parse(cleaned);

      // Validate task count
      const expected = Math.min(request.repetition, 14);
      if (parsed.prepTasks.length !== expected) {
        // Trim or pad gracefully
        while (parsed.prepTasks.length > expected) parsed.prepTasks.pop();
        while (parsed.prepTasks.length < expected) {
          parsed.prepTasks.push({
            text: `Final review and mental preparation for ${request.eventTitle}`,
            daysBeforeEvent: 1,
            duration: 20,
            category: 'review',
            tip: 'Go through your main points once and visualize success.',
          });
        }
      }

      // Ensure durations are reasonable
      parsed.prepTasks = parsed.prepTasks.map((t) => ({
        ...t,
        duration: t.duration && t.duration > 0 ? t.duration : 20,
      }));

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid AI response format. Please try again.');
      }
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!(this.token && this.endpoint && this.model);
  }
}

export const eventPrepAI = new EventPrepAIService();