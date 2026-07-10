import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { date?, weight }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const date = body.date || new Date().toISOString().slice(0, 10);
  const weight = Number(body.weight);
  if (!weight) return NextResponse.json({ error: "Missing weight" }, { status: 400 });

  const allLogs = await db.select().from(schema.weightLogs);
  const existing = allLogs.find((w) => w.userId === userId && w.date === date);

  if (existing) {
    await db.update(schema.weightLogs).set({ weight }).where(eq(schema.weightLogs.id, existing.id));
  } else {
    await db.insert(schema.weightLogs).values({ userId, date, weight });
  }

  return NextResponse.json({ ok: true });
}
