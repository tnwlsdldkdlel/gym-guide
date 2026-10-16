import { useEffect, useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { parseDate, WEEK_NAMES } from "../lib/dates";
import { getHistory, toSummaries } from "../lib/db";
import type { LogSummary } from "../lib/routine";

const FB = { light: "가벼웠어요", ok: "적당했어요", heavy: "무거웠어요" } as const;

function dateLabel(iso: string) {
  const d = parseDate(iso);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK_NAMES[d.getDay()]})` : iso;
}

export default function History() {
  const [logs, setLogs] = useState<LogSummary[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { getHistory(60).then(s => setLogs(toSummaries(s))).catch(e => { console.error(e); setErr("기록을 불러오지 못했어요. 잠시 후 다시 열어 주세요."); }); }, []);

  return (
    <div className="screen">
      <h1 className="title">기록</h1>
      {err && <p className="err">{err}</p>}
      {!err && !logs && <p className="muted">불러오는 중…</p>}
      {logs?.length === 0 && <div className="card"><p className="card-title">아직 기록이 없어요</p><p className="sub">오늘 탭에서 세트를 완료하면 여기에 쌓여요.</p></div>}
      {logs?.map(l => (
        <section className="list-card" key={l.date}>
          <h3>{dateLabel(l.date)} · {l.dayTitle}</h3>
          <ul>
            {l.exercises.map(e => (
              <li key={e.id}>
                <span>{isExerciseId(e.id) ? EXERCISES[e.id].name : e.id}{e.feedback && <span className="badge">{FB[e.feedback]}</span>}</span>
                <span className="r">{e.sets.map(s => `${s.kg === null ? "" : `${s.kg}kg×`}${s.reps}`).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
