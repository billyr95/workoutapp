import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { auth } from "@/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(session.user.id);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

  const ext = file.type.split("/")[1];
  const blob = await put(`avatars/${userId}-${Date.now()}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  await db.update(schema.users).set({ avatarUrl: blob.url }).where(eq(schema.users.id, userId));

  return NextResponse.json({ avatarUrl: blob.url });
}
