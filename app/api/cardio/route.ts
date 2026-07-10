import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// Simple shared-secret check so an outside automation (e.g. Apple Shortcuts)
// can hit this safely. Set CARDIO_API_KEY in your environment before deploying.
function hasValidApiKey(req: Request) {
  const key = process.env.CARDIO_API_KEY;
  if (!key) return false;
  return req.headers.get("x-api-key") === key;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const allLogs = await db.select().from(schema.cardioLogs);
  const rows = allLogs.filter((c) => c.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(rows);
}

// body: { date?, type, durationMinutes, distance?, averageHeartRate?, calories?, email? }
// `email` is only used (and required) for the API-key path, to say whose account this logs to.
export async function POST(req: Request) {
  const session = await auth();
  const body = await req.json();

  let userId: number;
  if (session?.user) {
    userId = Number(session.user.id);
  } else if (hasValidApiKey(req)) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return NextResponse.json({ error: "Missing email for API key auth" }, { status: 400 });
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (!user) return NextResponse.json({ error: "Unknown account" }, { status: 401 });
    userId = user.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, durationMinutes, distance, averageHeartRate, calories } = body;
  const date = body.date || new Date().toISOString().slice(0, 10);

  if (!type || !durationMinutes) {
    return NextResponse.json({ error: "Missing type or durationMinutes" }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.cardioLogs)
    .values({
      userId,
      date,
      type,
      durationMinutes,
      distance: distance ?? null,
      averageHeartRate: averageHeartRate ?? null,
      calories: calories ?? null,
    })
    .returning();

  return NextResponse.json(row);
}
