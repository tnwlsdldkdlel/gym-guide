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
