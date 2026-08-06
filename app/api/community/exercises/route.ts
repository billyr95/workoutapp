import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCommunityExercises } from "@/lib/data";

// GET ?q=<search> — searches every exercise name ever entered across all users.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = await getCommunityExercises(q);
  return NextResponse.json(rows);
}
