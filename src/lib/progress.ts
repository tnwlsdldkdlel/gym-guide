export type Feedback = "light" | "ok" | "heavy";

export interface LastLog {
  /** 그날 가장 무겁게 든 무게 */
  kg: number | null;
  feedback: Feedback | null;
  /** ISO 시각 */
  at: string;
}

/**
 * 다음 세트에 미리 채울 무게.
 * 루틴이 마지막 기록보다 나중에 바뀌었으면 루틴 무게를 따르고(AI와 새로 정한 값),
 * 아니면 마지막 기록에 체감을 반영해 한 단위 올리거나 내린다.
 */
export function recommendKg(o: { routineKg: number | null; routineSavedAt: string; last?: LastLog; step?: number }): number | null {
  const { routineKg, routineSavedAt, last, step } = o;
  if (routineKg === null || !step) return routineKg;
  if (!last || last.kg === null || last.at < routineSavedAt) return routineKg;
  const delta = last.feedback === "light" ? step : last.feedback === "heavy" ? -step : 0;
  return Math.max(step, last.kg + delta);
}
