import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { getProgramSnapshot } from "@/lib/data";

// body: { username } — save a followed user's shared program into your own library.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = Number(session.user.id);

  const { username } = await req.json();
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const allUsers = await db.select().from(schema.users);
  const target = allUsers.find((u) => u.username === username);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.id === viewerId) return NextResponse.json({ error: "That's already your program" }, { status: 400 });

  if (!target.showProgram) {
    return NextResponse.json({ error: "This user hasn't shared their program" }, { status: 403 });
  }

  const allFollows = await db.select().from(schema.follows);
  const isFollowing = allFollows.some((f) => f.followerId === viewerId && f.followingId === target.id);
  if (!isFollowing) {
    return NextResponse.json({ error: "Follow this user before saving their program" }, { status: 403 });
  }

  const data = await getProgramSnapshot(target.id);
  if (data.schedule.length === 0 && data.workouts.length === 0) {
    return NextResponse.json({ error: "This user hasn't set up a program yet" }, { status: 400 });
  }

  const [row] = await db
    .insert(schema.programs)
    .values({ userId: viewerId, name: `${target.name}'s Program`, data, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json({ id: row.id, name: row.name, createdAt: row.createdAt });
}
