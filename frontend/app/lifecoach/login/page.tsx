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

function LifeCoachLoginForm() {
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
    const hasCookie = document.cookie.split('; ').some((row) => row.startsWith('lifecoach_token='));
    const token = localStorage.getItem('lifecoach_token') || sessionStorage.getItem('lifecoach_token');
    if (token && hasCookie) {
      router.replace('/lifecoach/dashboard');
    }
  }, [router]);

  useEffect(() => {
    const errorStatus = searchParams.get('error');
    if (errorStatus === 'unauthorized') {
      setSubmitMessage('Life Coach authorization is required.');
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
      nextErrors.email = 'Life Coach email is required.';
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitMessage('');

    if (lockoutSecondsLeft > 0) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/life-coaches/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403 && data.detail?.includes('locked')) {
          setLockoutUntil(Date.now() + 60000);
          setSubmitMessage(data.detail);
        } else {
          setSubmitMessage(data.detail || 'Sign-in failed. Please check your credentials.');
        }
        return;
      }

      if (!data.access_token) {
        setSubmitMessage('Sign-in failed. Token missing from response.');
        return;
      }

      const storage = form.rememberMe ? localStorage : sessionStorage;
      storage.setItem('lifecoach_token', data.access_token);
      document.cookie = `lifecoach_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;

      router.replace(data.redirect_to || '/lifecoach/dashboard');
    } catch (error) {
      console.error('Life Coach sign-in error:', error);
      setSubmitMessage('Network error. Unable to connect to authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-brand-header">
          <div className="login-brand-icon">C</div>
          <h1>Life Coach Portal</h1>
          <p>Sign in to access your coaching workspace</p>
        </div>

        {submitMessage && <div className="login-alert error">{submitMessage}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="coach@example.com"
              disabled={isSubmitting || lockoutSecondsLeft > 0}
            />
            {errors.email && <span className="form-field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={isSubmitting || lockoutSecondsLeft > 0}
              />
              <button
                type="button"
                className="toggle-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </button>
            </div>
            {errors.password && <span className="form-field-error">{errors.password}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting || lockoutSecondsLeft > 0}
          >
            {lockoutSecondsLeft > 0
              ? `Locked (${lockoutSecondsLeft}s)`
              : isSubmitting
              ? 'Signing in...'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LifeCoachLoginPage() {
  return (
    <Suspense fallback={<div className="login-page-container">Loading sign-in form...</div>}>
      <LifeCoachLoginForm />
    </Suspense>
  );
}
