import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { accept: boolean } — only the invite's target client may respond.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await params;
  const relationshipId = Number(id);
  const { accept } = await req.json();

  const rows = await db.select().from(schema.coachRelationships);
  const relationship = rows.find((r) => r.id === relationshipId);
  if (!relationship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (relationship.clientId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (relationship.status !== "pending") return NextResponse.json({ error: "Already responded to" }, { status: 409 });

  await db
    .update(schema.coachRelationships)
    .set({ status: accept ? "active" : "declined", respondedAt: new Date().toISOString() })
    .where(eq(schema.coachRelationships.id, relationshipId));

  return NextResponse.json({ ok: true });
}
