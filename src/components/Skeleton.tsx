/** 불러오는 동안 보이는 회색 자리 표시. 화면마다 모양을 맞추지 않고 제목·큰 블록·줄 몇 개로 통일한다 */
export default function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skel-wrap" role="status" aria-label="불러오는 중">
      <span className="skel" style={{ width: "40%", height: 28 }} />
      <span className="skel" style={{ height: 160, borderRadius: 20 }} />
      {Array.from({ length: rows }, (_, i) => <span key={i} className="skel" style={{ height: 52 }} />)}
    </div>
  );
}
