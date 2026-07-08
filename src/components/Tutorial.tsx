import { useState } from 'react';
import * as S from '../strings';

interface TutorialProps {
  onFinish: () => void;
}

export function Tutorial({ onFinish }: TutorialProps) {
  const [step, setStep] = useState(0);
  const isLast = step === S.TUTORIAL_STEPS.length - 1;
  const current = S.TUTORIAL_STEPS[step];

  return (
    <div className="tutorial">
      <div className="tutorial__card">
        <p className="tutorial__progress">
          {step + 1} / {S.TUTORIAL_STEPS.length}
        </p>
        <h2 className="tutorial__title">{current.title}</h2>
        <p className="tutorial__body">{current.body}</p>
        <div className="tutorial__actions">
          <button className="btn btn--ghost" onClick={onFinish}>
            {S.TUTORIAL_SKIP}
          </button>
          <button
            className="btn btn--primary"
            onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
          >
            {isLast ? S.TUTORIAL_START : S.TUTORIAL_NEXT}
          </button>
        </div>
      </div>
    </div>
  );
}
