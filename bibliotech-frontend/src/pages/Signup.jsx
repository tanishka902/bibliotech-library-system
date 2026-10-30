import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SIGNUP_ROLES } from '../config';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import ErrorBanner from '../components/ErrorBanner';
import { Spinner } from '../components/Spinner';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', role: SIGNUP_ROLES[0] || '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.username.trim().length < 3) next.username = 'Use at least 3 characters.';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 6) next.password = 'Use at least 6 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    setApiError(null);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await signup({ username: form.username.trim(), email: form.email.trim(), password: form.password, role: form.role });
      navigate('/login', { replace: true, state: { registered: form.username.trim() } });
    } catch (err) {
      setApiError(err.status === 409 ? { message: 'That username or email is already registered.', status: 409 } : err);
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a minute. You can borrow books straight away."
      footer={<>Already registered? <Link to="/login">Sign in</Link></>}
    >
      <ErrorBanner error={apiError} title="Could not create the account" />
      <form onSubmit={submit} noValidate>
        <Field id="username" label="Username" error={errors.username}>
          <input id="username" autoComplete="username" value={form.username} onChange={set('username')} aria-invalid={!!errors.username} autoFocus />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
        </Field>
        <div className="field-row">
          <Field id="password" label="Password" error={errors.password}>
            <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
          </Field>
          <Field id="confirm" label="Confirm password" error={errors.confirm}>
            <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
          </Field>
        </div>
        {SIGNUP_ROLES.length > 0 && (
          <Field id="role" label="Role">
            <select id="role" value={form.role} onChange={set('role')}>
              {SIGNUP_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner small /> : null} Create account
        </button>
      </form>
    </AuthLayout>
  );
}
