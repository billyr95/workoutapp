import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// GET — every coach invite code, newest first, with who used it (if anyone).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const [codes, users] = await Promise.all([db.select().from(schema.coachInviteCodes), db.select().from(schema.users)]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows = codes
    .map((c) => {
      const usedBy = c.usedByUserId ? userById.get(c.usedByUserId) : null;
      return {
        id: c.id,
        code: c.code,
        createdAt: c.createdAt,
        usedAt: c.usedAt,
        usedBy: usedBy ? (usedBy.username ?? usedBy.name) : null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(rows);
}

// POST — mint a new single-use coach invite code.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const code = randomBytes(8).toString("hex");
  const [row] = await db
    .insert(schema.coachInviteCodes)
    .values({ code, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json(row);
}
