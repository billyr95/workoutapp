import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, schema } from "@/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

// body: { name, username, email, password, code } — same as /api/register, plus a coach invite code.
export async function POST(req: Request) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!code) return NextResponse.json({ error: "A coach invite code is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const allCodes = await db.select().from(schema.coachInviteCodes);
  const inviteCode = allCodes.find((c) => c.code === code);
  if (!inviteCode) return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  if (inviteCode.usedByUserId) return NextResponse.json({ error: "This invite code has already been used" }, { status: 409 });

  const allUsers = await db.select().from(schema.users);
  if (allUsers.some((u) => u.email === email)) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }
  if (allUsers.some((u) => u.username === username)) {
    return NextResponse.json({ error: "That username is taken" }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const [newUser] = await db
    .insert(schema.users)
    .values({
      name,
      username,
      email,
      passwordHash,
      isCoach: true,
      heightFeet: 0,
      heightInches: 0,
      startingWeight: 0,
      goalWeight: 0,
      goalText: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    })
    .returning();

  await db
    .update(schema.coachInviteCodes)
    .set({ usedByUserId: newUser.id, usedAt: new Date().toISOString() })
    .where(eq(schema.coachInviteCodes.id, inviteCode.id));

  // New accounts auto-follow the app owner so they can see how it all works.
  const billy = allUsers.find((u) => u.username === "billsner");
  if (billy) {
    await db.insert(schema.follows).values({
      followerId: newUser.id,
      followingId: billy.id,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
