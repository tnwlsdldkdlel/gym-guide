import { describe, expect, it } from "vitest";
import { NO_REGION, regionLevels } from "../data/bodyMap";
import { DEFAULT_ROUTINES } from "../data/defaultRoutines";
import { EXERCISES } from "../data/exercises";
import { dayMark, monthCells, parseDate, toISO, weekIndex } from "./dates";
import { buildAiPrompt, dayKeyFor, dayOrder, extractJson, planText, removeItem, setsText, unitsOf, validateRoutine } from "./routine";
import { plannedAt, recommend } from "./progress";

const d = (s: string) => parseDate(s)!;
const start = d("2026-10-12"); // 월요일
const routine = DEFAULT_ROUTINES.f;

describe("dayKeyFor", () => {
  it("월~금 상체·하체가 주를 넘어 번갈아 가고 주말은 유산소·휴식", () => {
    const week = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"];
    expect(week.map(s => dayKeyFor(routine, start, d(s)))).toEqual(["upper", "lower", "upper", "lower", "upper", "cardio", "rest", "lower"]);
  });
  it("시작일을 주 중간으로 넣어도 그 주가 0주차", () => {
    expect(weekIndex(d("2026-10-15"), d("2026-10-12"))).toBe(0);
    expect(weekIndex(start, d("2026-11-09"))).toBe(4);
  });
});

describe("dayOrder", () => {
  it("DB가 키 순서를 바꿔도 주간 일정 순서로 돌려준다", () => {
    const shuffled = { ...routine, days: { rest: routine.days.rest!, upper: routine.days.upper!, cardio: routine.days.cardio!, lower: routine.days.lower! } };
    expect(dayOrder(shuffled)).toEqual(["upper", "lower", "cardio", "rest"]);
  });
});

describe("validateRoutine", () => {
  it("기본 루틴은 통과", () => {
    expect(validateRoutine(JSON.parse(JSON.stringify(routine)))).toMatchObject({ ok: true });
  });
  it("앱에 없는 운동·잘못된 값·없는 날을 모두 알려 준다", () => {
    const bad = structuredClone(routine) as unknown as { days: { upper: { items: Record<string, unknown>[] } }; saturday: string };
    bad.days.upper.items[0] = { id: "burpee", sets: 3, reps: "10", kg: null, restSec: 60 };
    bad.days.upper.items[1] = { ...bad.days.upper.items[1], sets: 0, kg: -5 };
    bad.saturday = "swim";
    const r = validateRoutine(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join("\n")).toMatch(/burpee/);
      expect(r.errors.join("\n")).toMatch(/sets/);
      expect(r.errors.join("\n")).toMatch(/kg/);
      expect(r.errors.join("\n")).toMatch(/swim/);
    }
  });
  it("모르는 필드는 버리고 저장한다", () => {
    const r = validateRoutine({ ...routine, hack: "<script>" });
    expect(r.ok && "hack" in r.routine).toBe(false);
  });
});

describe("extractJson", () => {
  it("설명과 코드 블록이 섞인 답에서 JSON만 꺼낸다", () => {
    expect(extractJson('좋아요!\n```json\n{"a":1}\n```\n화이팅')).toEqual({ a: 1 });
    expect(extractJson('여기 있어요 {"a":{"b":2}} 끝')).toEqual({ a: { b: 2 } });
  });
});

describe("buildAiPrompt", () => {
  it("기록·체감·현재 루틴이 들어간다", () => {
    const p = buildAiPrompt({ gender: "f", startDate: "2026-10-12", today: "2026-10-16", routine, logs: [
      { date: "2026-10-12", dayTitle: "상체날", exercises: [{ id: "latpull", sets: [{ kg: 15, reps: 12 }, { kg: 15, reps: 12 }], feedback: "light" }] },
    ] });
    expect(p).toContain("랫 풀다운(latpull): 15kg×12, 15kg×12 / 체감 가벼움");
    expect(p).toContain('"weekdayCycle"');
  });
});

describe("recommend", () => {
  const plan = { kg: 15, reps: "12" };
  const last = (kg: number | null, reps: number, feedback: "light" | "ok" | "heavy" | null = null) => ({ kg, reps, feedback, at: "2026-10-12T10:00:00Z" });
  it("루틴 값이 그대로면 지난 무게·횟수를 이어 가고, 무게는 체감으로 한 단위 조정", () => {
    expect(recommend({ planned: plan, then: plan, step: 2.5, last: last(17.5, 15, "light") })).toEqual({ kg: 20, reps: 15 });
    expect(recommend({ planned: plan, then: plan, step: 2.5, last: last(17.5, 12, "heavy") })).toEqual({ kg: 15, reps: 12 });
    expect(recommend({ planned: plan, then: plan, step: 2.5, last: last(2.5, 12, "heavy") }).kg).toBe(2.5);
  });
  it("기록 뒤에 이 운동의 루틴 값이 바뀌었으면 루틴을 따른다", () => {
    expect(recommend({ planned: { kg: 25, reps: "10" }, then: plan, step: 2.5, last: last(17.5, 15, "light") })).toEqual({ kg: 25, reps: 10 });
    expect(recommend({ planned: { kg: 15, reps: "10" }, then: plan, step: 2.5, last: last(17.5, 15) })).toEqual({ kg: 17.5, reps: 10 });
  });
  it("기록이 없거나 그때 루틴에 없던 운동이면 루틴 값", () => {
    expect(recommend({ planned: plan, step: 2.5 })).toEqual({ kg: 15, reps: 12 });
    expect(recommend({ planned: plan, then: undefined, step: 2.5, last: last(17.5, 15, "light") })).toEqual({ kg: 15, reps: 12 });
  });
  it("맨몸 운동은 무게 없이 횟수만 이어 간다", () => {
    expect(recommend({ planned: { kg: null, reps: "15" }, then: { kg: null, reps: "15" }, last: last(null, 20) })).toEqual({ kg: null, reps: 20 });
  });
});

describe("plannedAt", () => {
  it("기록 시각 이전의 가장 최근 루틴에서 운동 계획을 찾는다(빼기로 새로 저장해도 계획이 같으면 이어 감)", () => {
    const a = structuredClone(routine), b = removeItem(routine, "upper", 4)!;
    const rows = [{ data: a, created_at: "2026-10-10T00:00:00Z" }, { data: b, created_at: "2026-10-13T00:00:00Z" }];
    const find = (r: typeof routine) => r.days.upper!.items.find(i => i.id === "latpull");
    expect(plannedAt(rows, "2026-10-12T10:00:00Z", find)).toEqual(a.days.upper!.items[0]);
    expect(plannedAt(rows, "2026-10-09T00:00:00Z", find)).toBeUndefined();
    const then = plannedAt(rows, "2026-10-12T10:00:00Z", find)!, now = find(b)!;
    expect(recommend({ planned: now, then, step: 2.5, last: { kg: 17.5, reps: 12, feedback: "light", at: "2026-10-12T10:00:00Z" } }).kg).toBe(20);
  });
});

describe("운동 개수 규칙", () => {
  it("본운동이 4~5개를 벗어나거나 복근이 2개가 아니면 알려 준다", () => {
    const bad = structuredClone(routine);
    bad.days.upper!.items.push(bad.days.lower!.items[0]!);
    bad.days.lower!.items = bad.days.lower!.items.slice(0, 3);
    bad.core = bad.core.slice(0, 1);
    const r = validateRoutine(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join("\n")).toMatch(/days\.upper: 본운동은 4~5개/);
      expect(r.errors.join("\n")).toMatch(/days\.lower: 본운동은 4~5개/);
      expect(r.errors.join("\n")).toMatch(/core: 복근은 2개/);
    }
  });
});

describe("removeItem", () => {
  it("본운동·복근에서 하나를 빼고 원본은 그대로 둔다", () => {
    const next = removeItem(routine, "upper", 0)!;
    expect(next.days.upper!.items.map(i => i.id)).toEqual(routine.days.upper!.items.slice(1).map(i => i.id));
    expect(removeItem(routine, null, 1)!.core.map(i => i.id)).toEqual([routine.core[0]!.id]);
    expect(routine.days.upper!.items).toHaveLength(5);
  });
  it("마지막 하나나 없는 날·번호는 빼지 않는다", () => {
    const one = removeItem(routine, null, 0)!;
    expect(removeItem(one, null, 0)).toBeNull();
    expect(removeItem(routine, "swim", 0)).toBeNull();
    expect(removeItem(routine, "upper", 9)).toBeNull();
  });
});

describe("setsText", () => {
  it("같으면 묶고, 다르면 세트별로, 맨몸은 무게 없이", () => {
    expect(setsText([{ kg: 15, reps: 12 }, { kg: 15, reps: 12 }, { kg: 15, reps: 12 }], "회")).toBe("15kg × 12회 3세트");
    expect(setsText([{ kg: 15, reps: 12 }, { kg: 17.5, reps: 10 }], "회")).toBe("15kg × 12회, 17.5kg × 10회");
    expect(setsText([{ kg: null, reps: 30 }, { kg: null, reps: 30 }], "초")).toBe("30초 2세트");
    expect(setsText([{ kg: null, reps: 30 }], "분")).toBe("30분");
    expect(setsText([])).toBe("");
  });
  it("루틴에서 운동별 단위를 뽑는다", () => {
    const u = unitsOf(routine);
    expect(u.plank).toBe("초");
    expect(u.latpull).toBe("회");
    expect(u.treadmill).toBe("분");
  });
});

describe("달력", () => {
  it("월요일 시작으로 1일 앞을 비운다", () => {
    const c = monthCells(2026, 9); // 2026-10-01은 목요일
    expect(c.slice(0, 3)).toEqual([null, null, null]);
    expect(toISO(c[3]!)).toBe("2026-10-01");
    expect(c).toHaveLength(3 + 31);
  });
  it("운동한 날 동그라미, 지난 날 중 안 한 날 엑스, 시작 전·오늘·미래는 표시 없음", () => {
    expect(dayMark("2026-10-14", true, "2026-10-12", "2026-10-16")).toBe("done");
    expect(dayMark("2026-10-15", false, "2026-10-12", "2026-10-16")).toBe("miss");
    expect(dayMark("2026-10-11", false, "2026-10-12", "2026-10-16")).toBe("");
    expect(dayMark("2026-10-16", false, "2026-10-12", "2026-10-16")).toBe("");
    expect(dayMark("2026-10-20", false, "2026-10-12", "2026-10-16")).toBe("");
  });
});

describe("planText", () => {
  it("무게·횟수·세트를 한 줄로", () => {
    expect(planText({ id: "latpull", sets: 3, reps: "12", kg: 15, restSec: 90 })).toBe("15kg × 12회 3세트");
    expect(planText({ id: "plank", sets: 2, reps: "20–30초", kg: null, restSec: 30 })).toBe("20–30초 2세트");
    expect(planText({ id: "treadmill", sets: 1, reps: "30분", kg: null, restSec: 0 })).toBe("30분");
  });
});

describe("자극 부위 그림", () => {
  it("운동 데이터의 모든 부위 이름이 그림 영역에 대응된다(심폐·전신 제외)", () => {
    const missing = Object.values(EXERCISES).flatMap(e => e.muscles).filter(m => !NO_REGION.includes(m) && !regionLevels([m]).size);
    expect([...new Set(missing)]).toEqual([]);
  });
  it("첫 부위는 주 자극, 나머지는 보조, 겹치면 주 자극 유지", () => {
    const l = regionLevels(["등(광배근)", "등 가운데", "어깨 뒤", "어깨"]);
    expect(l.get("upper-back")).toBe(2);
    expect(l.get("trapezius")).toBe(1);
    expect(l.get("back-deltoids")).toBe(1);
    expect(regionLevels(["심폐"]).size).toBe(0);
  });
});
