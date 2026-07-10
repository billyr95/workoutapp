import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// body: { userId }  — the account to follow/unfollow
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const followerId = Number(session.user.id);

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (userId === followerId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await db
    .select()
    .from(schema.follows)
    .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, userId)));
  if (existing.length === 0) {
    await db.insert(schema.follows).values({ followerId, followingId: userId, createdAt: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true });
}

// body: { userId }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const followerId = Number(session.user.id);

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await db
    .delete(schema.follows)
    .where(and(eq(schema.follows.followerId, followerId), eq(schema.follows.followingId, userId)));

  return NextResponse.json({ ok: true });
}
