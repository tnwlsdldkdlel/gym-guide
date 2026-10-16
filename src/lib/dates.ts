const DAY = 864e5;

export function parseDate(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** 시작한 주를 0으로. 시작일 이전도 0 (서머타임 차이는 round로 흡수) */
export function weekIndex(start: Date, date: Date): number {
  return Math.max(0, Math.round((mondayOf(date).getTime() - mondayOf(start).getTime()) / (7 * DAY)));
}

export const WEEK_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 월요일부터 시작하는 달력 칸. 1일 앞의 빈 칸은 null */
export function monthCells(year: number, month: number): (Date | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
}

/** 달력 표시: 운동한 날 done, from 이후 지난 날 중 안 한 날 miss. 오늘·미래는 아직 모르니 표시 없음 */
export function dayMark(iso: string, logged: boolean, from: string, today: string): "done" | "miss" | "" {
  if (logged) return "done";
  return iso >= from && iso < today ? "miss" : "";
}
