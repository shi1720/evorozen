import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCheck, Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { api, errorMessage, post } from './api';
import { Button, ErrorBanner, Logo, Success } from './ui';
import type { User } from '../shared/types';
export function Auth({
  mode,
  onUser,
  onDemo,
  demoBusy,
}: {
  mode: 'login' | 'signup' | 'recover';
  onUser: (u: User) => void;
  onDemo: () => void;
  demoBusy: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [code, setCode] = useState(''),
    [copied, setCopied] = useState(false),
    [recovered, setRecovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo =
    typeof location.state?.returnTo === 'string' &&
    /^\/app(?:\/|\?|$)/.test(location.state.returnTo)
      ? location.state.returnTo
      : '/app';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === 'recover') {
        const result = await post<{ recoveryCode: string }>('/auth/recover', values);
        setCode(result.recoveryCode || '');
        setRecovered(true);
      } else {
        const result = await post<{ user: User; recoveryCode?: string }>(
          `/auth/${mode === 'signup' ? 'register' : 'login'}`,
          values,
        );
        onUser(result.user);
        if (result.recoveryCode) setCode(result.recoveryCode);
        else navigate(returnTo);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError('Select and copy the recovery code below.');
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo />
        <div>
          <div className="eyebrow">EVERY CREDIT, ACCOUNTED FOR.</div>
          <h1>
            Less chasing.
            <br />
            <em>More closure.</em>
          </h1>
          <p>
            A workspace for the money that falls
            <br />
            between the invoice and the credit note.
          </p>
          <div className="auth-quote">
            <CheckCheck size={23} />
            <span>
              Proof you can point to.
              <br />A balance you can trust.
            </span>
          </div>
        </div>
        <span className="auth-credit">Thoughtfully built for independent businesses.</span>
      </div>
      <div className="auth-form-side">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Back to Remainder
        </Link>
        <div className="auth-form-wrap">
          {code ? (
            <>
              <div className="form-icon">
                <KeyRound />
              </div>
              <h2>Keep your recovery key safe.</h2>
              <p>
                This key is your way back in if you forget your password. It is shown once. Store it
                in your password manager.
              </p>
              <div className="recovery-code">
                <code>{code}</code>
                <button className="icon-button" onClick={copy} aria-label="Copy recovery key">
                  <Copy size={18} />
                </button>
              </div>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              {copied && <Success>Copied to clipboard.</Success>}
              <Button onClick={() => navigate(recovered ? '/login' : '/app')}>
                {recovered ? 'Back to log in' : 'I saved my key. Open workspace.'}
                <ArrowRight size={16} />
              </Button>
            </>
          ) : recovered ? (
            <>
              <h2>Password updated.</h2>
              <p>Your old sessions have been signed out.</p>
              <Link to="/login" className="button">
                Log in
              </Link>
            </>
          ) : (
            <>
              <div className="eyebrow">
                {mode === 'signup'
                  ? 'YOUR NEXT CHAPTER'
                  : mode === 'recover'
                    ? 'LET’S GET YOU BACK IN'
                    : 'WELCOME BACK'}
              </div>
              <h2>
                {mode === 'signup'
                  ? 'A little more in order.'
                  : mode === 'recover'
                    ? 'Recover your account.'
                    : 'Pick up where you left off.'}
              </h2>
              <p>
                {mode === 'signup'
                  ? 'Create a private workspace for your supplier credits.'
                  : mode === 'recover'
                    ? 'Use the recovery key you saved when you signed up.'
                    : 'Your paperwork has a place. Let’s get back to it.'}
              </p>
              {mode === 'login' && location.state?.sessionExpired && (
                <Success>Your session ended. Sign in to continue where you left off.</Success>
              )}
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <form onSubmit={submit}>
                {mode === 'signup' && (
                  <>
                    <label>
                      Your name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        placeholder="Shivam Gupta"
                      />
                    </label>
                    <label>
                      Business name
                      <input
                        name="workspaceName"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="organization"
                        placeholder="Fern & Flour"
                      />
                    </label>
                  </>
                )}
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@yourbusiness.com"
                  />
                </label>
                {mode === 'recover' && (
                  <label>
                    Recovery key
                    <input
                      name="recoveryCode"
                      required
                      autoComplete="off"
                      placeholder="Your saved recovery key"
                    />
                  </label>
                )}
                <label>
                  {mode === 'recover' ? 'New password' : 'Password'}
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={mode === 'login' ? 1 : 12}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder={
                      mode === 'login' ? 'Enter your password' : 'At least 12 characters'
                    }
                  />
                </label>
                {mode === 'signup' && (
                  <label>
                    Workspace currency
                    <select name="currency" defaultValue="USD">
                      <option value="USD">USD · US Dollar</option>
                      <option value="INR">INR · Indian Rupee</option>
                      <option value="GBP">GBP · British Pound</option>
                      <option value="EUR">EUR · Euro</option>
                    </select>
                    <span className="field-hint">
                      All cases in this workspace use this currency.
                    </span>
                  </label>
                )}
                {mode === 'login' && (
                  <Link to="/recover" className="forgot-link">
                    Forgot your password?
                  </Link>
                )}
                <Button type="submit" busy={busy}>
                  {mode === 'signup'
                    ? 'Create workspace'
                    : mode === 'recover'
                      ? 'Reset password'
                      : 'Log in'}
                  <ArrowRight size={16} />
                </Button>
                {mode === 'signup' && (
                  <p className="terms-note">
                    By creating an account, you agree to the <Link to="/terms">terms</Link> and{' '}
                    <Link to="/privacy">privacy policy</Link>.
                  </p>
                )}
              </form>
              {mode !== 'recover' && (
                <>
                  <div className="form-divider">
                    <span>or take a look around</span>
                  </div>
                  <Button className="button-secondary" onClick={onDemo} busy={demoBusy}>
                    Explore the sample workspace
                  </Button>
                  <p className="switch-auth">
                    {mode === 'login' ? 'New to Remainder?' : 'Already have a workspace?'}{' '}
                    <Link to={mode === 'login' ? '/signup' : '/login'}>
                      {mode === 'login' ? 'Get started' : 'Log in'}
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
          <div className="auth-security">
            <ShieldCheck size={15} /> Private workspace · Secure sessions · Export your data
          </div>
        </div>
      </div>
    </div>
  );
}
