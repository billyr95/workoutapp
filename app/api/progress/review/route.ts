import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { buildWeeklySummary } from "@/lib/data";
import { gemini } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a blunt, encouraging strength coach reviewing one lifter's last 7 days of training data.
Write exactly one paragraph (3-5 sentences) of plain prose — no markdown, no headers, no bullet points, no emoji.
Reference specific numbers, exercises, or days from the data you're given. Call out one real thing they did well,
and one specific, concrete place they could push harder or be more consistent next week. Be direct and honest, not
generic or corporate — but never insulting, crude, or profane. Output only the paragraph — nothing before or after it.`;

// GET — returns today's cached AI training review, generating and caching it on first request of the day.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);
  const today = new Date().toISOString().slice(0, 10);

  const existing = (await db.select().from(schema.aiReviews)).find((r) => r.userId === userId && r.date === today);
  if (existing) return NextResponse.json({ date: existing.date, content: existing.content });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "AI review isn't configured yet" }, { status: 503 });
  }

  const summary = await buildWeeklySummary(userId);

  let content: string;
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: summary,
      config: { systemInstruction: SYSTEM_PROMPT },
    });
    content = response.text?.trim() || "No review available today.";
  } catch {
    return NextResponse.json({ error: "Couldn't generate a review right now" }, { status: 502 });
  }

  const [row] = await db
    .insert(schema.aiReviews)
    .values({ userId, date: today, content, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json({ date: row.date, content: row.content });
}
