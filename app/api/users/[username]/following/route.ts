import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { getConnections } from "@/lib/data";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const viewerId = Number(session.user.id);

  const { username } = await params;
  const allUsers = await db.select().from(schema.users);
  const target = allUsers.find((u) => u.username === username);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const following = await getConnections(target.id, "following", viewerId);
  return NextResponse.json(following);
}
