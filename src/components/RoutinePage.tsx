import { useState } from "react";
import { EXERCISES, isExerciseId } from "../data/exercises";
import { toISO } from "../lib/dates";
import { getHistory, saveRoutine, toSummaries, type Profile, type RoutineRow } from "../lib/db";
import { buildAiPrompt, extractJson, validateRoutine, type Routine } from "../lib/routine";

const name = (id: string) => (isExerciseId(id) ? EXERCISES[id].name : id);

function Summary({ routine }: { routine: Routine }) {
  return (
    <div className="hist">
      {Object.entries(routine.days).map(([k, d]) => (
        <div key={k}>
          <b>{d.title}</b>{routine.weekdayCycle.includes(k) ? "" : <span className="badge">{routine.saturday === k ? "토" : routine.sunday === k ? "일" : "안 씀"}</span>}
          <ul>{d.items.map((i, n) => <li key={n}>{name(i.id)} <span className="sets">{i.sets}×{i.reps} · {i.kg === null ? "맨몸" : `${i.kg}kg`}</span></li>)}</ul>
        </div>
      ))}
      <div><b>복근 (매일)</b><ul>{routine.core.map((i, n) => <li key={n}>{name(i.id)} <span className="sets">{i.sets}×{i.reps}</span></li>)}</ul></div>
      <p className="muted">평일 순서: {routine.weekdayCycle.map(k => routine.days[k]?.title ?? k).join(" → ")} (반복)</p>
    </div>
  );
}

export default function RoutinePage({ profile, routine, onSaved }: { profile: Profile; routine: RoutineRow; onSaved: (r: RoutineRow) => void }) {
  const [prompt, setPrompt] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof validateRoutine> | null>(null);
  const [msg, setMsg] = useState("");

  async function copyPrompt() {
    setCopyMsg("최근 기록을 모으는 중…");
    try {
      const logs = toSummaries(await getHistory(14)).reverse();
      const p = buildAiPrompt({ gender: profile.gender, startDate: profile.start_date, today: toISO(new Date()), routine: routine.data, logs });
      setPrompt(p);
      try { await navigator.clipboard.writeText(p); setCopyMsg("복사했습니다. Claude나 ChatGPT에 붙여 넣으세요."); }
      catch { setCopyMsg("자동 복사가 막혀 있습니다. 아래 칸을 길게 눌러 전체 선택 후 복사하세요."); }
    } catch (e) { setCopyMsg(`기록을 불러오지 못했습니다: ${(e as Error).message}`); }
  }

  function check() {
    setMsg("");
    try { setResult(validateRoutine(extractJson(text))); }
    catch { setResult({ ok: false, errors: ["JSON을 읽을 수 없습니다. AI 답에서 { 부터 } 까지 빠짐없이 붙여 넣었는지 확인하세요."] }); }
  }

  async function save() {
    if (!result?.ok) return;
    try {
      onSaved(await saveRoutine(result.routine));
      setText(""); setResult(null); setMsg("새 루틴을 저장했습니다. 오늘 탭에 바로 반영됩니다.");
    } catch (e) { setMsg(`저장하지 못했습니다: ${(e as Error).message}`); }
  }

  return (
    <>
      <section className="panel">
        <h2>지금 루틴</h2>
        <p className="muted">{routine.created_at.slice(0, 10)}에 저장{routine.data.note ? ` · ${routine.data.note}` : ""}</p>
        <Summary routine={routine.data} />
      </section>

      <section className="panel">
        <h2>1. AI에게 물어보기</h2>
        <p className="muted">최근 2주 기록과 지금 루틴을 묶은 질문을 복사합니다. 무게를 늘릴지 유지할지 AI가 판단해서 새 루틴 JSON을 돌려줍니다.</p>
        <button type="button" className="primary" onClick={copyPrompt}>AI에게 물어볼 내용 복사</button>
        {copyMsg && <p className="hint" role="status">{copyMsg}</p>}
        {prompt && <textarea id="prompt" readOnly value={prompt} onFocus={e => e.currentTarget.select()} aria-label="AI에게 보낼 질문" />}
      </section>

      <section className="panel">
        <h2>2. 새 루틴 붙여넣기</h2>
        <p className="muted">AI 답을 통째로 붙여 넣어도 JSON 부분만 골라 검사합니다. 저장 전에 무엇이 바뀌는지 보여 줍니다.</p>
        <textarea id="routine-json" value={text} onChange={e => { setText(e.target.value); setResult(null); }} placeholder='```json&#10;{ "weekdayCycle": [...], ... }&#10;```' aria-label="새 루틴 JSON" />
        <button type="button" className="ghost" disabled={!text.trim()} onClick={check}>검사하기</button>
        {result && !result.ok && <ul className="err">{result.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        {result?.ok && (
          <>
            {result.routine.note && <p><b>AI 메모</b> {result.routine.note}</p>}
            <Summary routine={result.routine} />
            <button type="button" className="primary" onClick={save}>이 루틴으로 저장</button>
          </>
        )}
        {msg && <p className="hint" role="status">{msg}</p>}
      </section>
    </>
  );
}
