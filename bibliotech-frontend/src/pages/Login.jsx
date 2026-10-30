import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import ErrorBanner, { InfoBanner } from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';

export default function Login() {
  const { signin, notice } = useAuth();
  const location = useLocation();
  const registered = location.state?.registered;

  const [identifier, setIdentifier] = useState(registered || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!identifier.trim()) next.identifier = 'Enter your username or email.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signin(identifier.trim(), password);
      // On success the route guard redirects automatically.
    } catch (err) {
      setApiError(
        err.status === 401 || err.status === 403
          ? { message: `Incorrect username or password (HTTP ${err.status}). If you are sure they are right, the backend may be blocking the sign-in request.`, status: err.status }
          : err
      );
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to borrow books and track your loans."
      footer={<>New here? <Link to="/signup">Create an account</Link> · <Link to="/diagnostics">API check</Link></>}
    >
      {registered && <InfoBanner tone="good">Account created. Sign in to continue.</InfoBanner>}
      {notice && <InfoBanner tone="warn">{notice}</InfoBanner>}
      <ErrorBanner error={apiError} title="Could not sign in" />
      <form onSubmit={submit} noValidate>
        <Field id="identifier" label="Username or email" error={errors.identifier}>
          <input id="identifier" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} aria-invalid={!!errors.identifier} autoFocus />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner small /> : null} Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
