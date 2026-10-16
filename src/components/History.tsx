import { useEffect, useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { getHistory, toSummaries } from "../lib/db";
import type { LogSummary } from "../lib/routine";

const FB = { light: "가벼움", ok: "적당", heavy: "무거움" } as const;

export default function History() {
  const [logs, setLogs] = useState<LogSummary[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { getHistory(60).then(s => setLogs(toSummaries(s))).catch((e: Error) => setErr(e.message)); }, []);

  if (err) return <p className="err">기록을 불러오지 못했습니다: {err}</p>;
  if (!logs) return <p className="muted">불러오는 중…</p>;
  if (!logs.length) return <div className="panel"><h2>아직 기록이 없습니다</h2><p className="muted">오늘 탭에서 세트를 "하기"로 완료하면 여기에 쌓입니다.</p></div>;

  return (
    <div className="hist">
      {logs.map(l => (
        <section className="panel" key={l.date}>
          <h2>{l.date} · {l.dayTitle}</h2>
          <ul>
            {l.exercises.map(e => (
              <li key={e.id}>
                {isExerciseId(e.id) ? EXERCISES[e.id].name : e.id}
                {e.feedback && <span className="badge">{FB[e.feedback]}</span>}
                <div className="sets">{e.sets.map(s => `${s.kg === null ? "" : `${s.kg}kg×`}${s.reps}`).join("  ")}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
