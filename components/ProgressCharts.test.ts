import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildLiftSeries,
  buildSessionGroups,
  rangeStartDate,
  smoothPath,
  colorForLift,
  assignLiftColors,
  formatDate,
} from "./ProgressCharts";

afterEach(() => {
  vi.useRealTimers();
});

describe("buildLiftSeries", () => {
  const workouts = [
    { id: 1, exercises: [{ id: 10, name: "Bench Press", sortOrder: 0 }, { id: 11, name: "Overhead Press", sortOrder: 1 }] },
  ];

  it("takes the heaviest set per exercise per session, sorted by date", () => {
    const logs = [
      {
        date: "2026-08-10",
        sets: [
          { exerciseId: 10, setNumber: 1, weight: 135, reps: 8 },
          { exerciseId: 10, setNumber: 2, weight: 145, reps: 5 },
          { exerciseId: 10, setNumber: 3, weight: 125, reps: 10 },
        ],
      },
      {
        date: "2026-08-03",
        sets: [{ exerciseId: 10, setNumber: 1, weight: 130, reps: 8 }],
      },
    ];
    const series = buildLiftSeries(workouts, logs);
    expect(series.get("Bench Press")).toEqual([
      { date: "2026-08-03", weight: 130 },
      { date: "2026-08-10", weight: 145 },
    ]);
  });

  it("skips sets for exercises that don't resolve to a known workout/name", () => {
    const logs = [{ date: "2026-08-10", sets: [{ exerciseId: 999, setNumber: 1, weight: 100, reps: 5 }] }];
    const series = buildLiftSeries(workouts, logs);
    expect(series.size).toBe(0);
  });

  it("keeps separate series per exercise", () => {
    const logs = [
      {
        date: "2026-08-10",
        sets: [
          { exerciseId: 10, setNumber: 1, weight: 135, reps: 8 },
          { exerciseId: 11, setNumber: 1, weight: 85, reps: 8 },
        ],
      },
    ];
    const series = buildLiftSeries(workouts, logs);
    expect([...series.keys()].sort()).toEqual(["Bench Press", "Overhead Press"]);
  });
});

describe("buildSessionGroups", () => {
  const workout = {
    id: 1,
    exercises: [
      { id: 10, name: "Bench Press", sortOrder: 0 },
      { id: 11, name: "Overhead Press", sortOrder: 1 },
      { id: 12, name: "Dips", sortOrder: 2 },
    ],
  };

  it("orders groups by the workout's exercise order, not the session's set order", () => {
    const session = {
      date: "2026-08-10",
      sets: [
        { exerciseId: 12, setNumber: 1, weight: 25, reps: 10 },
        { exerciseId: 10, setNumber: 1, weight: 135, reps: 8 },
      ],
    };
    const groups = buildSessionGroups(workout, session);
    expect(groups.map((g) => g.name)).toEqual(["Bench Press", "Overhead Press", "Dips"]);
  });

  it("sorts each group's own sets by set number", () => {
    const session = {
      date: "2026-08-10",
      sets: [
        { exerciseId: 10, setNumber: 3, weight: 125, reps: 10 },
        { exerciseId: 10, setNumber: 1, weight: 135, reps: 8 },
        { exerciseId: 10, setNumber: 2, weight: 135, reps: 7 },
      ],
    };
    const groups = buildSessionGroups(workout, session);
    expect(groups[0].sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it("keeps exercises with no logged sets as empty groups instead of dropping them", () => {
    // This matters for cross-workout Compare: the chart lines up groups by matching name
    // between the primary and compare session, so an exercise skipped in one of them must
    // still appear (empty) rather than shift the alignment of the ones after it.
    const session = { date: "2026-08-10", sets: [{ exerciseId: 10, setNumber: 1, weight: 135, reps: 8 }] };
    const groups = buildSessionGroups(workout, session);
    expect(groups.map((g) => ({ name: g.name, count: g.sets.length }))).toEqual([
      { name: "Bench Press", count: 1 },
      { name: "Overhead Press", count: 0 },
      { name: "Dips", count: 0 },
    ]);
  });
});

describe("rangeStartDate", () => {
  it("returns null for all time (no lower bound)", () => {
    expect(rangeStartDate("all")).toBeNull();
  });

  it("returns January 1st of the current year for ytd", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00"));
    expect(rangeStartDate("ytd")).toBe("2026-01-01");
  });

  it("subtracts the given number of days from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-02T12:00:00"));
    expect(rangeStartDate("30")).toBe("2026-08-03");
  });
});

describe("smoothPath", () => {
  it("returns an empty string for no points", () => {
    expect(smoothPath([])).toBe("");
  });

  it("draws a straight line for one or two points (no curve to smooth)", () => {
    expect(smoothPath([[0, 0]])).toBe("M 0 0");
    expect(smoothPath([[0, 0], [10, 10]])).toBe("M 0 0 L 10 10");
  });

  it("uses cubic Bezier curves once there are 3+ points", () => {
    const path = smoothPath([[0, 0], [10, 5], [20, 0]]);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path).toContain("C ");
  });
});

describe("colorForLift", () => {
  it("is deterministic for the same name", () => {
    expect(colorForLift("Bench Press")).toBe(colorForLift("Bench Press"));
  });

  it("returns a CSS var reference", () => {
    expect(colorForLift("Squat")).toMatch(/^var\(--series-\d\)$/);
  });
});

describe("assignLiftColors", () => {
  it("gives every name in the batch a distinct color when there are enough slots", () => {
    // Regression test: LiftProgressChart and SessionSetsChart used to call colorForLift(name)
    // directly, so two exercises that happened to hash to the same slot rendered as
    // indistinguishable same-colored lines on the same chart (seen with real data: "Bench
    // Press", "Overhead Press", and "Dips" all landing on near-identical reds).
    const names = ["Bench Press", "Overhead Press", "Dips", "Lat Pulldown", "Face Pulls"];
    const colors = assignLiftColors(names);
    const values = names.map((n) => colors.get(n));
    expect(new Set(values).size).toBe(names.length);
  });

  it("is stable regardless of input order", () => {
    const a = assignLiftColors(["Bench Press", "Overhead Press", "Dips"]);
    const b = assignLiftColors(["Dips", "Bench Press", "Overhead Press"]);
    expect(a.get("Bench Press")).toBe(b.get("Bench Press"));
    expect(a.get("Overhead Press")).toBe(b.get("Overhead Press"));
    expect(a.get("Dips")).toBe(b.get("Dips"));
  });

  it("dedupes repeated names in the input", () => {
    const colors = assignLiftColors(["Squat", "Squat", "Deadlift"]);
    expect(colors.size).toBe(2);
  });
});

describe("formatDate", () => {
  it("formats without a year by default", () => {
    expect(formatDate("2026-03-05")).toBe("Mar 5");
  });

  it("includes the year when asked", () => {
    expect(formatDate("2026-03-05", true)).toBe("Mar 5, 2026");
  });
});
