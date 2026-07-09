import { useState } from 'react';
import { upgradeAccount } from '../platform/wallet';
import * as S from '../strings';

interface AccountModalProps {
  onClose: () => void;
}

export function AccountModal({ onClose }: AccountModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const r = await upgradeAccount(email, password);
    setSubmitting(false);
    setResult(r);
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
          <p className="account__blurb">{S.ACCOUNT_BLURB}</p>
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
                {submitting ? S.ACCOUNT_SUBMITTING : S.ACCOUNT_SUBMIT}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
