import { useEffect } from 'react';
import { sfx } from '../audio/sfx';

interface VSIntroProps {
  onDone: () => void;
}

// 対戦開始のシネマティックな導入。ポケポケ風の斜め分割 VS 画面。
// 上＝卓を囲む3人の AI、下＝あなた。数秒で自動的にゲーム盤へ切り替わる。
const AI = [
  { avatar: '🔥', name: 'ミライ' },
  { avatar: '🛡️', name: 'ケイ' },
  { avatar: '🎭', name: 'ソラ' },
];

export function VSIntro({ onDone }: VSIntroProps) {
  useEffect(() => {
    sfx.play('fanfare');
    const t = window.setTimeout(onDone, 2100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="vs" onClick={onDone}>
      <div className="vs__half vs__half--top">
        <span className="vs__side">対戦相手</span>
        <div className="vs__oppoRow">
          {AI.map((a) => (
            <div key={a.name} className="vs__oppo">
              <span className="vs__avatar" aria-hidden>
                {a.avatar}
              </span>
              <span className="vs__name">{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="vs__slash" aria-hidden />
      <div className="vs__badge">VS</div>

      <div className="vs__half vs__half--bottom">
        <div className="vs__you">
          <span className="vs__youAvatar" aria-hidden>
            🙂
          </span>
          <span className="vs__youName">あなた</span>
        </div>
        <span className="vs__side vs__side--you">よろしく！</span>
      </div>

      <div className="vs__sparkles" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="vs__spark" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
