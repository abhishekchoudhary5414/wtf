'use client';

import { useState } from 'react';
import './SchoolForm.css';

type SchoolFormProps = {
  onSubmit: (data: { name: string; email: string }) => Promise<void>;
  isLoading: boolean;
};

export default function SchoolForm({ onSubmit, isLoading }: SchoolFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'School name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ name: '', email: '' });
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  return (
    <div className="school-form-container">
      <div className="form-card">
        <h3 className="form-title">Create New School Account</h3>
        <p className="form-subtitle">
          A temporary password will be generated and sent to the school's email address
        </p>

        <form onSubmit={handleSubmit} className="school-form">
          <div className="form-group">
            <label htmlFor="school-name" className="form-label">
              School Name *
            </label>
            <input
              id="school-name"
              type="text"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g., Lincoln High School"
              value={formData.name}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.name && (
              <span className="form-error">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="school-email" className="form-label">
              School Email *
            </label>
            <input
              id="school-email"
              type="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="e.g., admin@lincolnhigh.edu"
              value={formData.email}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.email && (
              <span className="form-error">{errors.email}</span>
            )}
          </div>

          <div className="form-info">
            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" />
              <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" />
            </svg>
            <div>
              <strong>What happens next:</strong>
              <ul>
                <li>A temporary password will be generated automatically</li>
                <li>Login credentials will be sent to the school's email</li>
                <li>School must change password on first login</li>
              </ul>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary btn-submit"
              disabled={submitting || isLoading}
            >
              {submitting ? '⏳ Creating...' : '✓ Create School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
