import { useEffect, useState } from "react";

export default function RestTimer({ end, onAdd, onClose }: { end: number; onAdd: (sec: number) => void; onClose: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (left === 0) navigator.vibrate?.(400);
  }, [left]);

  return (
    <div className="rest" role="timer">
      <div>
        <span>{left ? "쉬는 시간" : "다음 세트!"}</span>
        <b>{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</b>
        <span style={{ display: "flex", gap: 6 }}>
          {left > 0 && <button type="button" onClick={() => onAdd(15)}>+15초</button>}
          <button type="button" onClick={onClose}>{left ? "건너뛰기" : "닫기"}</button>
        </span>
      </div>
    </div>
  );
}
