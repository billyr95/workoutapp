import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPrograms, saveProgram, deleteProgram } from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  return NextResponse.json(await listPrograms(userId));
}

// body: { name, data? } — omit `data` to snapshot your current live schedule/workouts
// (and it becomes your active program); pass `data` (from the builder or an XML upload)
// to save an unapplied program into your library instead.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const result = await saveProgram(userId, typeof body.name === "string" ? body.name : "", body.data);
  if (!result.ok) return NextResponse.json({ error: result.error, errors: result.errors ?? [] }, { status: result.status });

  return NextResponse.json(result.data);
}

// body: { id }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await req.json();
  const result = await deleteProgram(userId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
