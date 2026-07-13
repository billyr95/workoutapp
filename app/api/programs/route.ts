import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { getProgramSnapshot } from "@/lib/data";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const allPrograms = await db.select().from(schema.programs);
  const mine = allPrograms
    .filter((p) => p.userId === userId)
    .map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(mine);
}

// body: { name }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Program name is required" }, { status: 400 });

  const data = await getProgramSnapshot(userId);

  const [row] = await db
    .insert(schema.programs)
    .values({ userId, name, data, createdAt: new Date().toISOString() })
    .returning();

  // Saving your current setup means that's the program you're now "on."
  await db.update(schema.users).set({ activeProgramId: row.id }).where(eq(schema.users.id, userId));

  return NextResponse.json({ id: row.id, name: row.name, createdAt: row.createdAt });
}

// body: { id }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const allPrograms = await db.select().from(schema.programs);
  const program = allPrograms.find((p) => p.id === id);
  if (!program || program.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(schema.programs).where(eq(schema.programs.id, id));

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (user?.activeProgramId === id) {
    await db.update(schema.users).set({ activeProgramId: null }).where(eq(schema.users.id, userId));
  }

  return NextResponse.json({ ok: true });
}
