import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { api, ApiOffline } from '@/lib/api';
import type { User } from '@/lib/api';
import './auth-modal.css';

type Mode = 'signup' | 'login';

type AuthModalProps = {
  onClose: () => void;
  /** `isNew` is true for a fresh sign-up, which is what triggers brand onboarding. */
  onDone: (user: User, isNew: boolean) => void;
};

/**
 * Sign up / log in.
 *
 * Real now: the password is checked against a hash on the server and the session comes
 * back as an httpOnly cookie the page cannot read. Validation still happens here too —
 * not for security, which the server owns, but so mistakes are caught before a round
 * trip.
 */
export const AuthModal = ({ onClose, onDone }: AuthModalProps) => {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('That email address does not look right.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setBusy(true);
    try {
      const user =
        mode === 'signup'
          ? await api.signup(email, password, name)
          : await api.login(email, password);
      onDone(user, mode === 'signup');
    } catch (err) {
      if (err instanceof ApiOffline) {
        setError('Cannot reach the server. Start it with:  npm run server');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signup' ? 'Create account' : 'Log in'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal__close icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>

        <div className="modal__head">
          <Icon name="logo" size={26} />
          <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
          <p>
            {mode === 'signup'
              ? 'Your videos are saved to your account.'
              : 'Log in to pick up where you left off.'}
          </p>
        </div>

        <form className="modal__form" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                disabled={busy}
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
              required
              disabled={busy}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              disabled={busy}
            />
          </label>

          {error && <p className="modal__error">{error}</p>}

          <button className="btn btn--primary modal__submit" type="submit" disabled={busy}>
            {busy ? (
              <>
                <span className="btn__spinner" />
                One moment…
              </>
            ) : mode === 'signup' ? (
              'Create account'
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <p className="modal__switch">
          {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError(null);
            }}
          >
            {mode === 'signup' ? 'Log in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
};
