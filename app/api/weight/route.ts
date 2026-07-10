import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { USER_ID } from "@/lib/data";

// body: { date?, weight }
export async function POST(req: Request) {
  const body = await req.json();
  const date = body.date || new Date().toISOString().slice(0, 10);
  const weight = Number(body.weight);
  if (!weight) return NextResponse.json({ error: "Missing weight" }, { status: 400 });

  const existing = db
    .select()
    .from(schema.weightLogs)
    .all()
    .find((w) => w.userId === USER_ID && w.date === date);

  if (existing) {
    db.update(schema.weightLogs).set({ weight }).where(eq(schema.weightLogs.id, existing.id)).run();
  } else {
    db.insert(schema.weightLogs).values({ userId: USER_ID, date, weight }).run();
  }

  return NextResponse.json({ ok: true });
}
