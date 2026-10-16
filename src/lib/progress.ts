import { firstNumber, type Routine, type RoutineItem } from "./routine";

export type Feedback = "light" | "ok" | "heavy";

export interface LastLog {
  /** 그날 가장 무겁게 든 무게 */
  kg: number | null;
  /** 그날 가장 많이 한 횟수(초·분 운동은 그 값) */
  reps: number | null;
  feedback: Feedback | null;
  /** ISO 시각 */
  at: string;
}

type Plan = Pick<RoutineItem, "kg" | "reps">;

/** 마지막 기록 당시 쓰던 루틴에서 이 운동의 계획. 그때 루틴에 없던 운동이면 undefined */
export function plannedAt(routines: { data: Routine; created_at: string }[], at: string, find: (r: Routine) => RoutineItem | undefined): Plan | undefined {
  const t = Date.parse(at);
  const then = routines.filter(r => Date.parse(r.created_at) <= t).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  return then && find(then.data);
}

/**
 * 다음 세트에 미리 채울 무게·횟수.
 * 지난 기록 뒤로 이 운동의 루틴 값이 바뀌었으면(AI와 새로 정한 값) 루틴을 따르고,
 * 그대로면 지난 기록을 이어 간다. 무게는 체감에 따라 한 단위 올리거나 내린다.
 * 다른 운동을 빼는 등 루틴만 새로 저장된 경우는 이어 간다.
 */
export function recommend(o: { planned: Plan; then?: Plan; last?: LastLog; step?: number }): { kg: number | null; reps: number } {
  const { planned, then, last, step } = o;
  const kgChanged = !then || then.kg !== planned.kg;
  const repsChanged = !then || then.reps !== planned.reps;
  let kg = planned.kg;
  if (kg !== null && step && last && last.kg !== null && !kgChanged) {
    const delta = last.feedback === "light" ? step : last.feedback === "heavy" ? -step : 0;
    kg = Math.max(step, last.kg + delta);
  }
  const reps = last && last.reps !== null && !repsChanged ? last.reps : firstNumber(planned.reps);
  return { kg, reps };
}
