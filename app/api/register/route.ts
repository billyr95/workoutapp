import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, schema } from "@/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// body: { name, email, password }
export async function POST(req: Request) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const passwordHash = await hash(password, 10);

  await db.insert(schema.users).values({
    name,
    email,
    passwordHash,
    heightFeet: 0,
    heightInches: 0,
    startingWeight: 0,
    goalWeight: 0,
    goalText: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  return NextResponse.json({ ok: true });
}
