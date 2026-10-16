import { useEffect, useRef, useState } from "react";

/** 아래에서 올라오는 창. 네이티브 dialog라 뒤로가기·ESC·포커스 가두기를 브라우저가 처리한다 */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // 닫을 때 내려가는 애니메이션이 끝날 때까지 내용을 남겨 둔다
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) { setClosing(false); if (!d.open) d.showModal(); return; }
    if (!d.open) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { d.close(); return; }
    setClosing(true);
    const t = setTimeout(() => { d.close(); setClosing(false); }, 220);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <dialog ref={ref} className={`sheet${closing ? " closing" : ""}`} aria-label={title} onClose={onClose}
      onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
      {(open || closing) && (
        <div className="sheet-in">
          <div className="grabber" />
          <div className="sheet-head">
            <h3>{title}</h3>
            <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>✕</button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
