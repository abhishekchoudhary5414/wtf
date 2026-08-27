"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './LoginForm.css';
import { authApi, getToken } from '@/lib/api';

type FormState = {
  email_id: string;
  password: string;
  rememberMe: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  email_id: '',
  password: '',
  rememberMe: true,
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const errorStatus = searchParams.get('error');
    if (errorStatus === 'unauthorized') {
      setSubmitMessage('Admin access is required.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSecondsLeft(remaining);

      if (remaining <= 0) {
        setLockoutUntil(null);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutUntil]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!form.email_id.trim()) {
      nextErrors.email_id = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_id)) {
      nextErrors.email_id = 'Enter a valid email address.';
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    if (submitMessage) {
      setSubmitMessage('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage('');

    if (lockoutSecondsLeft > 0) {
      setSubmitMessage(`Too many failed attempts. Please retry in ${lockoutSecondsLeft}s.`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await authApi.login({ email_id: form.email_id, password: form.password });
      const token = resp.access_token;
      if (form.rememberMe) {
        localStorage.setItem('wtf_token', token);
      } else {
        sessionStorage.setItem('wtf_token', token);
      }

      // Also set a client-side cookie so Next.js middleware (which runs on the
      // server) can see the token on the next request and avoid redirecting to
      // the login page. Cookie is intentionally not HttpOnly so JS can set it.
      try {
        document.cookie = `wtf_token=${token}; path=/; samesite=lax; max-age=3600`;
      } catch (e) {
        // ignore; cookie setting may fail in some strict contexts
      }

      // If backend provided a redirect URL, use it; otherwise go to dashboard
      const redirectTo = resp.redirect_to || '/admin/dashboard';

      // Build an absolute URL so we always navigate to the frontend origin
      try {
        const abs = redirectTo.startsWith('http') ? redirectTo : new URL(redirectTo, window.location.origin).href;
        // Hard replace to ensure cross-port navigation works during development
        window.location.replace(abs);
      } catch {
        // fallback: client-side routing
        try {
          router.replace(redirectTo);
        } catch {
          window.location.href = redirectTo;
        }
      }
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      const lockMatch = message.match(/retry after\s+(\d+)\s*(minute|minutes|second|seconds)?/i);
      if (/locked/i.test(message) || lockMatch) {
        const seconds = lockMatch ? Number(lockMatch[1]) * (lockMatch[2]?.startsWith('min') ? 60 : 1) : 60;
        setLockoutUntil(Date.now() + seconds * 1000);
        setSubmitMessage(`Account temporarily locked. Please retry in ${seconds}s.`);
      } else {
        setSubmitMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-panel" aria-label="Admin login form">
      <div className="login-card">
        <div className="brand-block">
          <div className="brand-mark-large">W</div>
          <p className="eyebrow">Admin access</p>
          <h1>WTF</h1>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          action={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/admin/login`}
          method="post"
          noValidate
        >
          <div className="field-group">
            <label htmlFor="email_id">Email</label>
            <input
              id="email_id"
              name="email_id"
              type="email"
              autoComplete="email"
              value={form.email_id}
              onChange={handleChange}
              placeholder="admin@wtf.com"
              aria-invalid={Boolean(errors.email_id)}
              aria-describedby={errors.email_id ? 'email-error' : undefined}
              className={errors.email_id ? 'input-error' : ''}
            />
            {errors.email_id && (
              <span id="email-error" className="error-message">
                {errors.email_id}
              </span>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                className={errors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </button>
            </div>
            {errors.password && (
              <span id="password-error" className="error-message">
                {errors.password}
              </span>
            )}
          </div>

          <div className="options-row">
            <label className="remember-me" htmlFor="rememberMe">
              <input
                id="rememberMe"
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
              />
              <span>Remember me</span>
            </label>
          </div>

          {/* include role for backend */}
          <input type="hidden" name="role" value="admin" />

          <button type="submit" className="login-button" disabled={isSubmitting || lockoutSecondsLeft > 0}>
            {isSubmitting ? 'Signing in...' : lockoutSecondsLeft > 0 ? `Locked (${lockoutSecondsLeft}s)` : 'Login'}
          </button>

          {submitMessage && (
            <p className={`submit-message ${submitMessage.toLowerCase().includes('admin') ? 'error' : submitMessage.toLowerCase().includes('success') ? 'success' : 'error'}`}>
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
