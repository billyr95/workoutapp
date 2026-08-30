import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { hasActiveCoachAccess } from "@/lib/data";

// body: { content }
export async function POST(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Note can't be empty" }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.coachNotes)
    .values({ coachId, clientId, content: content.trim(), createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json(row);
}
