import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { buildWeeklySummary } from "@/lib/data";
import { gemini } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a sharp, encouraging strength coach glancing at one lifter's recent training data
right before their session today. Write exactly one short sentence (max 30 words) of plain prose — no markdown,
no headers, no bullet points, no emoji. Reference one concrete number, exercise, or trend from the data you're
given. Point out either how they're progressing or one specific thing to focus on today. Be direct and specific,
not generic or motivational-poster empty. Output only the sentence — nothing before or after it.`;

// GET — returns today's cached AI Today-page insight, generating and caching it on first request of the day.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const today = new Date().toISOString().slice(0, 10);

  const existing = (await db.select().from(schema.dailyInsights)).find((r) => r.userId === userId && r.date === today);
  if (existing) return NextResponse.json({ date: existing.date, content: existing.content });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Insights aren't configured yet" }, { status: 503 });
  }

  const summary = await buildWeeklySummary(userId);

  let content: string;
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: summary,
      config: { systemInstruction: SYSTEM_PROMPT },
    });
    content = response.text?.trim() || "No insight available today.";
  } catch {
    return NextResponse.json({ error: "Couldn't generate an insight right now" }, { status: 502 });
  }

  const [row] = await db
    .insert(schema.dailyInsights)
    .values({ userId, date: today, content, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json({ date: row.date, content: row.content });
}
