import { useEffect, useRef } from "react";

/** 아래에서 올라오는 창. 네이티브 dialog라 뒤로가기·ESC·포커스 가두기를 브라우저가 처리한다 */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" aria-label={title} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
      {open && (
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
