const COLORS = ['#e8b64c', '#4bc98f', '#e05a5a', '#5aa3e0', '#f3d38a', '#c95ab8'];

interface ConfettiProps {
  count?: number;
}

/** 勝利のピーク演出用の軽量 CSS 紙吹雪 */
export function Confetti({ count = 28 }: ConfettiProps) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const style: React.CSSProperties = {
      left: `${(i * 37) % 100}%`,
      backgroundColor: COLORS[i % COLORS.length],
      animationDelay: `${(i % 10) * 0.12}s`,
      animationDuration: `${2 + ((i * 13) % 10) / 6}s`,
      width: i % 3 === 0 ? 10 : 7,
      height: i % 3 === 0 ? 6 : 10,
    };
    return <span key={i} className="confetti__piece" style={style} />;
  });
  return <div className="confetti">{pieces}</div>;
}
