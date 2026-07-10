import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { USER_ID } from "@/lib/data";

// Simple shared-secret check so an outside automation (e.g. Apple Shortcuts)
// can hit this safely. Set CARDIO_API_KEY in your environment before deploying.
function isAuthorized(req: Request) {
  const key = process.env.CARDIO_API_KEY;
  if (!key) return true; // no key configured yet (local dev) — allow through
  return req.headers.get("x-api-key") === key;
}

export async function GET() {
  const rows = db
    .select()
    .from(schema.cardioLogs)
    .all()
    .filter((c) => c.userId === USER_ID)
    .sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(rows);
}

// body: { date?, type, durationMinutes, distance?, averageHeartRate?, calories? }
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { type, durationMinutes, distance, averageHeartRate, calories } = body;
  const date = body.date || new Date().toISOString().slice(0, 10);

  if (!type || !durationMinutes) {
    return NextResponse.json({ error: "Missing type or durationMinutes" }, { status: 400 });
  }

  const [row] = db
    .insert(schema.cardioLogs)
    .values({
      userId: USER_ID,
      date,
      type,
      durationMinutes,
      distance: distance ?? null,
      averageHeartRate: averageHeartRate ?? null,
      calories: calories ?? null,
    })
    .returning()
    .all();

  return NextResponse.json(row);
}
