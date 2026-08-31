import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadProgram } from "@/lib/data";

// body: { programId }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { programId } = await req.json();
  const result = await loadProgram(userId, programId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}
