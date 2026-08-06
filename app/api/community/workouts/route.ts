import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCommunityWorkouts } from "@/lib/data";

// GET ?q=<search> — searches every named workout template ever entered across all users.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const rows = await getCommunityWorkouts(q);
  return NextResponse.json(rows);
}
