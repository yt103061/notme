import * as S from '../strings';

interface TitleProps {
  onStart: () => void;
}

export function Title({ onStart }: TitleProps) {
  return (
    <div className="title">
      <div className="title__cardMotif" aria-hidden>
        🂠
      </div>
      <h1 className="title__name">{S.APP_NAME}</h1>
      <p className="title__subtitle">{S.APP_SUBTITLE}</p>
      <p className="title__hook">{S.HOOK_LINE}</p>
      <button className="btn btn--primary btn--large" onClick={onStart}>
        {S.TITLE_START}
      </button>
      <p className="title__blurb">{S.TITLE_RULES_BLURB}</p>
    </div>
  );
}
