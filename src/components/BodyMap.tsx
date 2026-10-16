import { BACK, FRONT, regionLevels } from "../data/bodyMap";

/** 앞·뒤 실루엣에 주 자극 부위는 날 색, 보조 부위는 옅은 날 색으로 칠한다 */
export default function BodyMap({ muscles }: { muscles: string[] }) {
  const levels = regionLevels(muscles);
  if (!levels.size) return null;
  const fill = (l?: 1 | 2) => (l === 2 ? "var(--c)" : l === 1 ? "color-mix(in srgb, var(--c) 35%, #fff)" : "#e3e6ea");
  return (
    <div className="body-map" role="img" aria-label={`자극 부위: ${muscles.join(", ")}`}>
      {[FRONT, BACK].map((shapes, n) => (
        <svg key={n} viewBox="0 0 100 200" aria-hidden="true">
          {shapes.flatMap(([r, polys]) => polys.map((p, i) => <polygon key={`${r}${i}`} points={p} fill={fill(levels.get(r))} />))}
        </svg>
      ))}
    </div>
  );
}
