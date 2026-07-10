import { useState } from 'react';
import { upgradeAccount, signInAccount } from '../platform/wallet';
import * as S from '../strings';

interface AccountModalProps {
  onClose: () => void;
}

type Mode = 'register' | 'signin';

export function AccountModal({ onClose }: AccountModalProps) {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const r = mode === 'register' ? await upgradeAccount(email, password) : await signInAccount(email, password);
    setSubmitting(false);
    setResult(r);
    if (r.ok && mode === 'signin') {
      // ログイン成功でセッションのユーザーIDが切り替わるため、ページ全体を再読込して
      // ウォレット／プロフィールを新しいアカウントの内容で再ハイドレートする
      window.setTimeout(() => window.location.reload(), 900);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setResult(null);
  }

  return (
    <div className="account" onClick={onClose}>
      <div className="account__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="account__header">
          <h2 className="account__title">{S.ACCOUNT_TITLE}</h2>
          <button className="btn btn--icon" onClick={onClose} aria-label={S.ACCOUNT_CLOSE}>
            ✕
          </button>
        </div>
        <div className="account__body">
          <div className="account__tabs">
            <button
              type="button"
              className={`account__tab ${mode === 'register' ? 'account__tab--active' : ''}`}
              onClick={() => switchMode('register')}
            >
              {S.ACCOUNT_TAB_REGISTER}
            </button>
            <button
              type="button"
              className={`account__tab ${mode === 'signin' ? 'account__tab--active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              {S.ACCOUNT_TAB_SIGNIN}
            </button>
          </div>
          <p className="account__blurb">{mode === 'register' ? S.ACCOUNT_BLURB : S.ACCOUNT_SIGNIN_BLURB}</p>
          {result ? (
            <p className={result.ok ? 'account__success' : 'account__error'}>{result.message}</p>
          ) : (
            <form className="account__form" onSubmit={handleSubmit}>
              <label className="account__label">
                {S.ACCOUNT_EMAIL_LABEL}
                <input
                  className="account__input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="account__label">
                {S.ACCOUNT_PASSWORD_LABEL}
                <input
                  className="account__input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="btn btn--primary" type="submit" disabled={submitting}>
                {mode === 'register'
                  ? submitting
                    ? S.ACCOUNT_SUBMITTING
                    : S.ACCOUNT_SUBMIT
                  : submitting
                    ? S.ACCOUNT_SIGNIN_SUBMITTING
                    : S.ACCOUNT_SIGNIN_SUBMIT}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
