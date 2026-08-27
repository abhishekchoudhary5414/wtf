'use client';

import { Suspense, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import './login.css';

type FormState = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialForm: FormState = {
  email: '',
  password: '',
  rememberMe: true,
};

function SchoolLoginForm() {
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
    const hasCookie = document.cookie.split('; ').some(row => row.startsWith('school_token='));
    const token = localStorage.getItem('school_token') || sessionStorage.getItem('school_token');
    if (token && hasCookie) {
      router.replace('/schools/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const errorStatus = searchParams.get('error');
    if (errorStatus === 'unauthorized') {
      setSubmitMessage('School access is required.');
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

    if (!form.email.trim()) {
      nextErrors.email = 'School email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.';
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/schools/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      const token = data.access_token;

      if (form.rememberMe) {
        localStorage.setItem('school_token', token);
      } else {
        sessionStorage.setItem('school_token', token);
      }

      try {
        document.cookie = `school_token=${token}; path=/; samesite=lax; max-age=3600`;
      } catch (e) {
        // ignore
      }

      const redirectTo = data.redirect_to || '/schools/dashboard';
      const absoluteUrl = new URL(redirectTo, window.location.origin).href;
      window.location.replace(absoluteUrl);
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
    <section className="login-panel" aria-label="School login form">
      <div className="login-card">
        <div className="brand-block">
          <div className="brand-mark-large">S</div>
          <p className="eyebrow">School Portal</p>
          <h1>WTF</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="school@wtf.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && (
              <span id="email-error" className="error-message">
                {errors.email}
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

          <button type="submit" className="login-button" disabled={isSubmitting || lockoutSecondsLeft > 0}>
            {isSubmitting ? 'Signing in...' : lockoutSecondsLeft > 0 ? `Locked (${lockoutSecondsLeft}s)` : 'Login'}
          </button>

          {submitMessage && (
            <p className={`submit-message ${submitMessage.toLowerCase().includes('success') ? 'success' : 'error'}`}>
              {submitMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default function SchoolLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SchoolLoginForm />
    </Suspense>
  );
}
