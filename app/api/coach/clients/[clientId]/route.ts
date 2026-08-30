import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import {
  hasActiveCoachAccess,
  getUser,
  getSchedule,
  getWorkoutsWithExercises,
  getPersonalRecords,
  getWeightLogs,
  getWorkoutLogsWithSets,
  getCardioLogs,
} from "@/lib/data";

// GET — full read-only view of a client: schedule, workouts, PRs, weight, workout logs, cardio,
// plus this coach's notes and edit history for them. Requires an active coach relationship.
export async function GET(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coachId = Number(session.user.id);

  const { clientId: clientIdParam } = await params;
  const clientId = Number(clientIdParam);
  if (!(await hasActiveCoachAccess(coachId, clientId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [client, schedule, workouts, personalRecords, weightLogs, workoutLogs, cardioLogs, allNotes, allEditLog] =
    await Promise.all([
      getUser(clientId),
      getSchedule(clientId),
      getWorkoutsWithExercises(clientId),
      getPersonalRecords(clientId),
      getWeightLogs(clientId),
      getWorkoutLogsWithSets(clientId),
      getCardioLogs(clientId),
      db.select().from(schema.coachNotes),
      db.select().from(schema.programEditLog),
    ]);

  const notes = allNotes
    .filter((n) => n.coachId === coachId && n.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const editLog = allEditLog
    .filter((e) => e.coachId === coachId && e.clientId === clientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ client, schedule, workouts, personalRecords, weightLogs, workoutLogs, cardioLogs, notes, editLog });
}
