import { useState } from "react";
import { mondayOf, toISO } from "../lib/dates";

export default function Onboarding({ onDone }: { onDone: (p: { gender: "m" | "f"; start_date: string }) => Promise<void> }) {
  const [gender, setGender] = useState<"m" | "f">("f");
  const [start, setStart] = useState(toISO(mondayOf(new Date())));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await onDone({ gender, start_date: start }); }
    catch (err) { setMsg((err as Error).message); setBusy(false); }
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <h2>처음 한 번만 정하면 됩니다</h2>
      <div className="form">
        <span style={{ fontWeight: 600, fontSize: ".9rem" }}>기준 무게</span>
        <div className="seg" role="group" aria-label="기준 무게">
          <button type="button" aria-pressed={gender === "m"} onClick={() => setGender("m")}>남자 기준</button>
          <button type="button" aria-pressed={gender === "f"} onClick={() => setGender("f")}>여자 기준</button>
        </div>
      </div>
      <label>운동 시작한 날<input id="start" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <p className="muted">이 날이 든 주의 월요일부터 상체·하체가 번갈아 시작됩니다. 남편과 같은 날로 맞추면 같은 날 같은 운동을 합니다.</p>
      {msg && <p className="err">{msg}</p>}
      <button className="primary" disabled={busy}>시작하기</button>
    </form>
  );
}
