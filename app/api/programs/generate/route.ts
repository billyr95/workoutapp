import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { validateProgramData, recordCommunityProgram } from "@/lib/data";
import { gemini } from "@/lib/gemini";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// Note: deliberately no numeric min/max bounds here — Gemini's structured-output
// support returns a 400 on this schema once bounded integers are nested this deep.
// validateProgramData() clamps everything server-side regardless, so bounds here
// would only ever be a hint, not enforcement.
const GeneratedExercise = z.object({
  name: z.string(),
  sets: z.number().int(),
  repMin: z.number().int(),
  repMax: z.number().int(),
  restSeconds: z.number().int(),
});
const GeneratedWorkout = z.object({
  name: z.string(),
  exercises: z.array(GeneratedExercise),
});
const GeneratedDay = z.object({
  day: z.enum(DAY_NAMES),
  workoutType: z.string(),
  category: z.enum(["Strength", "Hypertrophy", "None"]),
});
const GeneratedProgram = z.object({
  programName: z.string(),
  schedule: z.array(GeneratedDay).length(7),
  workouts: z.array(GeneratedWorkout),
});
const RESPONSE_SCHEMA = z.toJSONSchema(GeneratedProgram);

const SYSTEM_PROMPT = `You are an expert strength & conditioning coach designing a full 7-day weekly training schedule from a lifter's stated goals, equipment, experience, and time constraints.

Rules:
- Assign every day Sunday through Saturday to exactly one of: Rest, Cardio, or a named Workout.
- Every workoutType you assign for a Workout day must exactly match the "name" of one entry in "workouts" — never reference a workout you didn't define.
- Reuse the same workout name across multiple days only when the user's split calls for repeating it (e.g. Push twice a week); otherwise give each workout a distinct, descriptive name (e.g. "Upper A", "Push Day", "Leg Day").
- Use conventional, recognizable exercise names.
- category is "Strength" for lower-rep heavier-focused workouts and "Hypertrophy" for higher-rep volume workouts; "None" for Rest/Cardio days.
- sets, repMin, repMax, and restSeconds must be plain whole numbers (no ranges, no units, no null).
- Respect equipment, injury, frequency, and time constraints the user mentions. If they want fewer than 7 active days, assign the remainder to Rest or Cardio sensibly.
- Give each exercise a realistic restSeconds (60-180 typical) and rep range.
- programName should be a short, descriptive name for the overall program (e.g. "Push Pull Legs — Hypertrophy Focus").
- Respond with JSON only, matching the given schema — no prose before or after it.`;

// body: { goals: string }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI program generation isn't configured yet" }, { status: 503 });
  }

  const body = await req.json();
  const goals = typeof body.goals === "string" ? body.goals.trim().slice(0, 1500) : "";
  if (!goals) return NextResponse.json({ error: "Describe your goals first" }, { status: 400 });

  let parsed: unknown;
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: goals,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });
    parsed = JSON.parse(response.text ?? "");
  } catch {
    return NextResponse.json({ error: "Couldn't generate a program right now" }, { status: 502 });
  }

  const parsedObj = (parsed ?? {}) as { programName?: unknown };
  const { data, errors } = validateProgramData(parsed);
  if (data.schedule.length === 0 && data.workouts.length === 0) {
    return NextResponse.json({ error: "Generated program came back empty", errors }, { status: 502 });
  }

  const name = (typeof parsedObj.programName === "string" ? parsedObj.programName.trim() : "").slice(0, 80) || "AI Program";
  const [row] = await db
    .insert(schema.programs)
    .values({ userId, name, data, createdAt: new Date().toISOString() })
    .returning();

  await recordCommunityProgram(data, userId);

  return NextResponse.json({ id: row.id, name: row.name, createdAt: row.createdAt, data, errors });
}
