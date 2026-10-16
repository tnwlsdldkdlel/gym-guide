import { EXERCISES, isExerciseId } from "../data/exercises";
import { weekIndex } from "./dates";

export interface RoutineItem {
  id: string;
  sets: number;
  /** "12", "10-12", "30초", "30분" */
  reps: string;
  /** null이면 맨몸 */
  kg: number | null;
  restSec: number;
}

export interface RoutineDay {
  title: string;
  items: RoutineItem[];
  /** 유산소처럼 목록 중 하나만 고르는 날 */
  pickOne?: boolean;
}

export interface Routine {
  note?: string;
  /** 월~금에 순서대로 돌아가며, 주를 넘어서도 이어진다 */
  weekdayCycle: string[];
  saturday: string;
  sunday: string;
  /** 매일 하는 복근 */
  core: RoutineItem[];
  days: Record<string, RoutineDay>;
}

export function dayKeyFor(routine: Routine, start: Date, date: Date): string {
  const dow = date.getDay();
  if (dow === 6) return routine.saturday;
  if (dow === 0) return routine.sunday;
  const n = weekIndex(start, date) * 5 + dow - 1;
  return routine.weekdayCycle[n % routine.weekdayCycle.length] ?? routine.sunday;
}

/** jsonb는 키 순서를 바꿔 저장하므로, 화면에서는 주간 일정에 나오는 순서로 정렬한다 */
export function dayOrder(routine: Routine): string[] {
  const order = [...new Set([...routine.weekdayCycle, routine.saturday, routine.sunday])];
  return [...order, ...Object.keys(routine.days).filter(k => !order.includes(k))].filter(k => routine.days[k]);
}

export function firstNumber(reps: string): number {
  return Number(/\d+/.exec(reps)?.[0] ?? 0);
}

export function repsUnit(reps: string): "회" | "초" | "분" {
  return reps.includes("분") ? "분" : reps.includes("초") ? "초" : "회";
}

type Result = { ok: true; routine: Routine } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// AI가 준 JSON은 신뢰할 수 없는 입력이라 저장 전에 전부 검사한다
export function validateRoutine(input: unknown): Result {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["JSON 맨 바깥이 { } 객체가 아닙니다."] };

  const items = (v: unknown, where: string): RoutineItem[] => {
    if (!Array.isArray(v)) { errors.push(`${where}: 운동 목록이 배열 [ ]이 아닙니다.`); return []; }
    return v.flatMap((it, i): RoutineItem[] => {
      const at = `${where} ${i + 1}번째`;
      if (!isObj(it)) { errors.push(`${at}: 객체가 아닙니다.`); return []; }
      const { id, sets, reps, kg, restSec } = it;
      if (typeof id !== "string" || !isExerciseId(id)) { errors.push(`${at}: 앱에 없는 운동 id "${String(id)}"`); return []; }
      if (!Number.isInteger(sets) || (sets as number) < 1 || (sets as number) > 10) errors.push(`${at}(${id}): sets는 1~10 정수여야 합니다.`);
      if (typeof reps !== "string" || !/\d/.test(reps)) errors.push(`${at}(${id}): reps는 "12", "30초" 같은 문자열이어야 합니다.`);
      if (!(kg === null || (typeof kg === "number" && kg >= 0 && kg <= 500))) errors.push(`${at}(${id}): kg는 0~500 숫자 또는 null이어야 합니다.`);
      if (!Number.isInteger(restSec) || (restSec as number) < 0 || (restSec as number) > 600) errors.push(`${at}(${id}): restSec는 0~600 정수여야 합니다.`);
      return [{ id, sets: sets as number, reps: reps as string, kg: kg as number | null, restSec: restSec as number }];
    });
  };

  const days: Record<string, RoutineDay> = {};
  if (!isObj(input.days) || !Object.keys(input.days).length) errors.push("days가 비어 있거나 객체가 아닙니다.");
  else for (const [key, d] of Object.entries(input.days)) {
    if (!isObj(d) || typeof d.title !== "string") { errors.push(`days.${key}: title이 있는 객체여야 합니다.`); continue; }
    days[key] = { title: d.title, items: items(d.items, `days.${key}`), ...(d.pickOne === true && { pickOne: true }) };
  }

  const cycle = input.weekdayCycle;
  if (!Array.isArray(cycle) || !cycle.length || !cycle.every(k => typeof k === "string")) errors.push("weekdayCycle은 날 이름 배열이어야 합니다.");
  const refs = [...(Array.isArray(cycle) ? cycle : []), input.saturday, input.sunday];
  for (const k of refs) if (typeof k !== "string" || !days[k]) errors.push(`"${String(k)}"는 days에 없는 날입니다.`);

  const core = items(input.core, "core");
  if (input.note !== undefined && typeof input.note !== "string") errors.push("note는 문자열이어야 합니다.");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    routine: {
      ...(typeof input.note === "string" && { note: input.note }),
      weekdayCycle: cycle as string[], saturday: input.saturday as string, sunday: input.sunday as string, core, days,
    },
  };
}

export interface LogSummary {
  date: string;
  dayTitle: string;
  exercises: { id: string; sets: { kg: number | null; reps: number }[]; feedback: "light" | "ok" | "heavy" | null }[];
}

const FEEDBACK_KO = { light: "가벼움", ok: "적당", heavy: "무거움" } as const;

/** 사용자가 Claude·ChatGPT에 그대로 붙여 넣을 질문 */
export function buildAiPrompt(opts: { gender: "m" | "f"; startDate: string; today: string; routine: Routine; logs: LogSummary[] }): string {
  const { gender, startDate, today, routine, logs } = opts;
  const name = (id: string) => (isExerciseId(id) ? EXERCISES[id].name : id);
  const logText = logs.length
    ? logs.map(l => `- ${l.date} ${l.dayTitle}\n` + l.exercises.map(e =>
        `  - ${name(e.id)}(${e.id}): ${e.sets.map(s => `${s.kg ?? "맨몸"}${s.kg !== null ? "kg" : ""}×${s.reps}`).join(", ")}${e.feedback ? ` / 체감 ${FEEDBACK_KO[e.feedback]}` : ""}`).join("\n")).join("\n")
    : "- 아직 기록 없음";
  const catalog = Object.entries(EXERCISES).map(([id, e]) => `${id}: ${e.name} (${e.kind}${e.gear ? `, ${e.gear}` : ""})`).join("\n");
  return `나는 헬스를 처음 시작한 ${gender === "m" ? "남자" : "여자"}이고 ${startDate}부터 운동했어. 오늘은 ${today}야.
아래 최근 운동 기록을 보고 다음 루틴에서 무게·횟수·세트를 늘릴지 유지할지 판단해서 새 루틴을 만들어 줘.

규칙
- 답은 아래 "현재 루틴"과 똑같은 구조의 JSON 하나만, 코드 블록으로 줘.
- 운동 id는 맨 아래 "쓸 수 있는 운동" 목록에 있는 것만 써.
- 판단 이유는 JSON의 note에 한국어로 2~3문장으로 적어 줘.
- kg는 숫자(덤벨은 한 개 무게) 또는 맨몸이면 null, restSec는 쉬는 시간(초), reps는 "12"나 "30초" 같은 문자열이야.
- weekdayCycle은 월~금에 순서대로 돌아가는 날 이름, saturday·sunday는 주말 날 이름이고, 모두 days에 있어야 해.

최근 기록 (무게×횟수)
${logText}

현재 루틴
\`\`\`json
${JSON.stringify(routine, null, 2)}
\`\`\`

쓸 수 있는 운동
${catalog}`;
}

/** 코드 블록이나 앞뒤 설명이 섞여 붙여 넣어져도 JSON 부분만 꺼낸다 */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)?.[1];
  const raw = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}
