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
    <form className="form" onSubmit={submit} style={{ paddingTop: "8vh" }}>
      <h1 className="title">처음 한 번만 정하면 돼요</h1>
      <div className="form" style={{ gap: 6 }}>
        <span className="label">기준 무게</span>
        <div className="seg" role="group" aria-label="기준 무게">
          <button type="button" aria-pressed={gender === "m"} onClick={() => setGender("m")}>남자 기준</button>
          <button type="button" aria-pressed={gender === "f"} onClick={() => setGender("f")}>여자 기준</button>
        </div>
      </div>
      <label>운동 시작한 날<input id="start" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <p className="hint">이 날이 든 주의 월요일부터 상체·하체가 번갈아 시작돼요. 같은 날로 맞추면 같은 날 같은 운동을 해요.</p>
      {msg && <p className="err">{msg}</p>}
      <button className="btn primary" disabled={busy}>시작하기</button>
    </form>
  );
}
