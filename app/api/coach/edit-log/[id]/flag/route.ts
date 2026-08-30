import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { flagNote? } — only the log entry's client may flag it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await params;
  const logId = Number(id);
  const { flagNote } = await req.json().catch(() => ({ flagNote: undefined }));

  const rows = await db.select().from(schema.programEditLog);
  const entry = rows.find((e) => e.id === logId);
  if (!entry || entry.clientId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(schema.programEditLog)
    .set({ flagged: true, flagNote: typeof flagNote === "string" ? flagNote.trim() || null : null })
    .where(eq(schema.programEditLog.id, logId));

  return NextResponse.json({ ok: true });
}
