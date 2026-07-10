import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!q) return NextResponse.json([]);

  const allUsers = await db.select().from(schema.users);
  const results = allUsers
    .filter((u) => u.username && u.username.includes(q))
    .slice(0, 20)
    .map((u) => ({ username: u.username, name: u.name, avatarUrl: u.avatarUrl }));

  return NextResponse.json(results);
}
