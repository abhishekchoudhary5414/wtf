'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/api';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import './SchoolForm.css';

type DropdownOption = {
  id: number;
  category: string;
  value: string;
};

export type SchoolFormData = {
  name: string;
  email: string;
  phone?: string;
  profile_url?: string;
  type?: string;
  established?: string;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

type SchoolFormProps = {
  onSubmit: (data: SchoolFormData) => Promise<void>;
  isLoading: boolean;
};

export default function SchoolForm({ onSubmit, isLoading }: SchoolFormProps) {
  const [formData, setFormData] = useState<SchoolFormData>({
    name: '',
    email: '',
    phone: '',
    profile_url: '',
    type: 'School',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
  });

  const [institutionTypes, setInstitutionTypes] = useState<DropdownOption[]>([]);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchInstitutionTypes();
  }, []);

  const fetchInstitutionTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/master-dropdowns/institution_type`);
      if (res.ok) {
        const data = await res.json();
        setInstitutionTypes(data);
        if (data.length > 0 && !formData.type) {
          setFormData((prev) => ({ ...prev, type: data[0].value }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch institution types', err);
    }
  };

  const handleAddInstitutionType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/master-dropdowns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: 'institution_type',
          value: newTypeName.trim(),
        }),
      });

      if (res.ok) {
        setNewTypeName('');
        await fetchInstitutionTypes();
      }
    } catch (err) {
      console.error('Failed to add institution type', err);
    }
  };

  const handleDeleteInstitutionType = async (id: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/master-dropdowns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchInstitutionTypes();
      }
    } catch (err) {
      console.error('Failed to delete institution type', err);
    }
  };

  const validateForm = () => {
    const newErrors: { name?: string; email?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Institution name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
      setFormData({
        name: '',
        email: '',
        phone: '',
        profile_url: '',
        type: 'School',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
      });
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const defaultTypesList = [
    'School',
    'College',
    'University',
    'Public Educational Institution',
    'Private Educational Institution',
    'Counseling Center',
    'Behavioral Health Organization',
    'Healthcare Organization',
    'Nonprofit',
    'Other',
  ];

  return (
    <div className="school-form-container">
      <div className="form-card">
        <h3 className="form-title">Create Institution / School Account</h3>
        <p className="form-subtitle">
          Register an educational or healthcare institution. Credentials will be emailed to the primary address.
        </p>

        <form onSubmit={handleSubmit} className="school-form">
          <div className="form-grid-school">
            {/* Institution Name */}
            <div className="form-group">
              <label htmlFor="school-name" className="form-label">
                Institution Name *
              </label>
              <input
                id="school-name"
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="e.g., Stanford Academy"
                value={formData.name}
                onChange={handleChange}
                disabled={submitting}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="school-email" className="form-label">
                Institution Email Address *
              </label>
              <input
                id="school-email"
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="admin@stanford.edu"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="school-phone" className="form-label">
                Phone Number
              </label>
              <input
                id="school-phone"
                type="tel"
                name="phone"
                className="form-input"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Profile URL */}
            <div className="form-group">
              <label htmlFor="profile_url" className="form-label">
                Logo / Profile Image URL
              </label>
              <input
                id="profile_url"
                type="text"
                name="profile_url"
                className="form-input"
                placeholder="https://example.com/logo.png"
                value={formData.profile_url}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Institution Type Dropdown + Admin Manage Option */}
            <div className="form-group span-2">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label htmlFor="school-type" className="form-label" style={{ margin: 0 }}>
                  Institution Type *
                </label>
                <button
                  type="button"
                  className="btn-manage-dropdown"
                  onClick={() => setShowTypeManager((prev) => !prev)}
                >
                  <SettingsIcon style={{ fontSize: 16 }} /> {showTypeManager ? 'Hide Manager' : 'Manage Dropdown Options'}
                </button>
              </div>

              <select
                id="school-type"
                name="type"
                className="form-input"
                value={formData.type}
                onChange={handleChange}
                disabled={submitting}
              >
                {institutionTypes.length > 0
                  ? institutionTypes.map((t) => (
                      <option key={t.id} value={t.value}>
                        {t.value}
                      </option>
                    ))
                  : defaultTypesList.map((val, i) => (
                      <option key={i} value={val}>
                        {val}
                      </option>
                    ))}
              </select>

              {/* Admin Institution Type Manager Dropdown Panel */}
              {showTypeManager && (
                <div className="dropdown-manager-box">
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#2b003d' }}>
                    Manage Institution Types (Admin Control)
                  </h4>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Add new institution type..."
                      className="form-input"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-add-type"
                      onClick={handleAddInstitutionType}
                    >
                      <AddIcon fontSize="small" /> Add
                    </button>
                  </div>

                  <div className="type-options-list">
                    {institutionTypes.map((t) => (
                      <span key={t.id} className="type-option-chip">
                        {t.value}
                        <button
                          type="button"
                          onClick={() => handleDeleteInstitutionType(t.id)}
                          title="Remove option"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Address Line 1 */}
            <div className="form-group span-2">
              <label htmlFor="address_line_1" className="form-label">
                Address Line 1
              </label>
              <input
                id="address_line_1"
                type="text"
                name="address_line_1"
                className="form-input"
                placeholder="Street address or P.O. Box"
                value={formData.address_line_1}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Address Line 2 */}
            <div className="form-group span-2">
              <label htmlFor="address_line_2" className="form-label">
                Address Line 2
              </label>
              <input
                id="address_line_2"
                type="text"
                name="address_line_2"
                className="form-input"
                placeholder="Suite, building, floor"
                value={formData.address_line_2}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* City */}
            <div className="form-group">
              <label htmlFor="city" className="form-label">City</label>
              <input
                id="city"
                type="text"
                name="city"
                className="form-input"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* State */}
            <div className="form-group">
              <label htmlFor="state" className="form-label">State / Province</label>
              <input
                id="state"
                type="text"
                name="state"
                className="form-input"
                placeholder="State"
                value={formData.state}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Postal Code */}
            <div className="form-group">
              <label htmlFor="postal_code" className="form-label">Postal Code</label>
              <input
                id="postal_code"
                type="text"
                name="postal_code"
                className="form-input"
                placeholder="Zip / Postal code"
                value={formData.postal_code}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            {/* Country */}
            <div className="form-group">
              <label htmlFor="country" className="form-label">Country</label>
              <input
                id="country"
                type="text"
                name="country"
                className="form-input"
                placeholder="Country"
                value={formData.country}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 20 }}>
            <button
              type="submit"
              className="btn-primary btn-submit"
              disabled={submitting || isLoading}
            >
              {submitting ? 'Creating...' : '✓ Create Institution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
