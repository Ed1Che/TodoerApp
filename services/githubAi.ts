const GH_AI_ENDPOINT = "https://api.github.com/copilot/assist"; // placeholder


export async function breakdownGoalWithGitHubAI(goalDescription: string) {
const prompt = `Break this goal into a JSON array of 5 daily steps: ${goalDescription}`;
try {
const res = await fetch(GH_AI_ENDPOINT, {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ input: prompt })
});
const json = await res.json();
const text = json?.response || json?.output || "[]";
return JSON.parse(text);
} catch (err) {
return ["Research", "Plan", "Start", "Execute", "Review"]; // fallback
}
}