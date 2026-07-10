import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { USER_ID } from "@/lib/data";

// body: { date?, waist?, chest?, leftArm?, rightArm?, leftThigh?, rightThigh?, neck? }
export async function POST(req: Request) {
  const body = await req.json();
  const date = body.date || new Date().toISOString().slice(0, 10);

  const existing = db
    .select()
    .from(schema.measurements)
    .all()
    .find((m) => m.userId === USER_ID && m.date === date);

  const values = {
    waist: body.waist ?? null,
    chest: body.chest ?? null,
    leftArm: body.leftArm ?? null,
    rightArm: body.rightArm ?? null,
    leftThigh: body.leftThigh ?? null,
    rightThigh: body.rightThigh ?? null,
    neck: body.neck ?? null,
  };

  if (existing) {
    db.update(schema.measurements).set(values).where(eq(schema.measurements.id, existing.id)).run();
  } else {
    db.insert(schema.measurements).values({ userId: USER_ID, date, ...values }).run();
  }

  return NextResponse.json({ ok: true });
}
