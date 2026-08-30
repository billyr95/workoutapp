import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertScheduleDay } from "@/lib/data";

// body: { day, type: "Rest" | "Cardio" | "Workout", name?, category? }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const result = await upsertScheduleDay(userId, body.day, body.type, body.name, body.category);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
