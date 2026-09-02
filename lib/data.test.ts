import { describe, it, expect, vi, afterEach } from "vitest";
import { computeClientDashboardStats } from "./data";

afterEach(() => {
  vi.useRealTimers();
});

// Wednesday, so the trailing 7 days run back through the previous Thursday.
const NOW = new Date("2026-09-02T12:00:00");

describe("computeClientDashboardStats", () => {
  it("reports no activity when nothing has been logged", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 170 }, [], [], [], []);
    expect(stats.lastActivityDate).toBeNull();
    expect(stats.daysSinceActivity).toBeNull();
    expect(stats.workoutsThisWeek).toBe(0);
  });

  it("finds the most recent activity across both workout and cardio logs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const stats = computeClientDashboardStats(
      { startingWeight: 180, goalWeight: 170 },
      [{ date: "2026-08-28" }],
      [{ date: "2026-08-30" }],
      [],
      []
    );
    expect(stats.lastActivityDate).toBe("2026-08-30");
    expect(stats.daysSinceActivity).toBe(3);
  });

  it("only counts workouts in the trailing 7 days toward workoutsThisWeek", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const stats = computeClientDashboardStats(
      { startingWeight: 180, goalWeight: 170 },
      [{ date: "2026-08-27" }, { date: "2026-08-20" }],
      [],
      [],
      []
    );
    // 2026-08-27 is exactly 6 days before 2026-09-02 (in window); 2026-08-20 is 13 days before (out).
    expect(stats.workoutsThisWeek).toBe(1);
  });

  it("computes adherence only against scheduled (non-Rest) days, not every day of the week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    // Wed 2026-09-02, going back: Tue 09-01, Mon 08-31, Sun 08-30, Sat 08-29, Fri 08-28, Thu 08-27.
    const schedule = [
      { day: "Monday", workoutType: "Upper A" },
      { day: "Wednesday", workoutType: "Lower A" },
      { day: "Friday", workoutType: "Upper B" },
      { day: "Tuesday", workoutType: "Rest" },
      { day: "Thursday", workoutType: "Rest" },
      { day: "Saturday", workoutType: "Rest" },
      { day: "Sunday", workoutType: "Rest" },
    ];
    // Logged on the Monday and the Wednesday (today), but not the Friday.
    const workoutLogs = [{ date: "2026-08-31" }, { date: "2026-09-02" }];
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 170 }, workoutLogs, [], schedule, []);
    expect(stats.scheduledDaysThisWeek).toBe(3);
    expect(stats.completedDaysThisWeek).toBe(2);
  });

  it("flags weight trending the wrong way for a stated loss goal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const weightLogs = [
      { date: "2026-08-10", weight: 180 },
      { date: "2026-08-25", weight: 182 },
    ];
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 170 }, [], [], [], weightLogs);
    expect(stats.weightTrend.direction).toBe("up");
    expect(stats.weightTrend.onTrack).toBe(false);
  });

  it("confirms on-track weight loss for a stated loss goal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const weightLogs = [
      { date: "2026-08-10", weight: 182 },
      { date: "2026-08-25", weight: 179 },
    ];
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 170 }, [], [], [], weightLogs);
    expect(stats.weightTrend.direction).toBe("down");
    expect(stats.weightTrend.onTrack).toBe(true);
  });

  it("leaves onTrack null when the goal is just to maintain (no gain/lose direction)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const weightLogs = [
      { date: "2026-08-10", weight: 180 },
      { date: "2026-08-25", weight: 183 },
    ];
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 180 }, [], [], [], weightLogs);
    expect(stats.weightTrend.onTrack).toBeNull();
  });

  it("treats a sub-half-pound change as flat, not up or down", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const weightLogs = [
      { date: "2026-08-10", weight: 180 },
      { date: "2026-08-25", weight: 180.2 },
    ];
    const stats = computeClientDashboardStats({ startingWeight: 180, goalWeight: 170 }, [], [], [], weightLogs);
    expect(stats.weightTrend.direction).toBe("flat");
    expect(stats.weightTrend.onTrack).toBe(false);
  });
});
