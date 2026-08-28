'use client';

import React from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import './SchoolDetailsModal.css';

type SchoolData = {
  id: number;
  name: string;
  email: string;
  profile_url?: string;
  type?: string;
  phone?: string;
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
  is_live?: boolean;
  is_active: boolean;
  is_locked?: boolean;
};

type SchoolDetailsModalProps = {
  school: SchoolData | null;
  onClose: () => void;
  onDelete?: (id: number, name: string) => void;
};

export default function SchoolDetailsModal({ school, onClose, onDelete }: SchoolDetailsModalProps) {
  if (!school) return null;

  return (
    <div className="school-detail-view-card">
      <div className="detail-view-header">
        <div>
          <button className="btn-back-list" onClick={onClose}>
            <ArrowBackIcon fontSize="small" /> Back to Schools List
          </button>
          <div className="school-brand-title" style={{ marginTop: 14 }}>
            {school.profile_url ? (
              <img
                src={school.profile_url}
                alt={school.name}
                className="school-avatar-large"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="school-avatar-large">{school.name.charAt(0).toUpperCase()}</div>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', color: '#2b003d' }}>{school.name}</h2>
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '0.92rem' }}>
                School Details & Institutional Overview
              </p>
            </div>
          </div>
        </div>

        {onDelete && (
          <button className="btn-delete-school" onClick={() => onDelete(school.id, school.name)}>
            <DeleteIcon fontSize="small" /> Delete School
          </button>
        )}
      </div>

      <div className="detail-view-body">
        {/* General Information */}
        <div className="detail-section-box">
          <h3>General Information</h3>
          <div className="detail-grid-expanded">
            <div className="detail-item">
              <span className="label">Institution ID</span>
              <strong className="value">#{school.id}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Institution Name</span>
              <strong className="value">{school.name}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Email Address</span>
              <strong className="value">{school.email}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Phone Number</span>
              <strong className="value">{school.phone || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Institution Type</span>
              <strong className="value">{school.type || 'School'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Profile URL</span>
              <strong className="value">{school.profile_url || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="detail-section-box">
          <h3>Institutional Address</h3>
          <div className="detail-grid-expanded">
            <div className="detail-item">
              <span className="label">Address Line 1</span>
              <strong className="value">{school.address_line_1 || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Address Line 2</span>
              <strong className="value">{school.address_line_2 || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">City</span>
              <strong className="value">{school.city || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">State / Province</span>
              <strong className="value">{school.state || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Postal Code</span>
              <strong className="value">{school.postal_code || 'N/A'}</strong>
            </div>
            <div className="detail-item">
              <span className="label">Country</span>
              <strong className="value">{school.country || 'N/A'}</strong>
            </div>
          </div>
        </div>

        {/* Account & Lock Status */}
        <div className="detail-section-box">
          <h3>Account Security & Access Status</h3>
          <div className="detail-grid-expanded">
            <div className="detail-item">
              <span className="label">Login Account Status</span>
              <strong className="value">
                <span className={`badge-tag ${school.is_active ? 'active' : 'inactive'}`}>
                  {school.is_active ? '✓ Active' : '✗ Inactive'}
                </span>
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">Account Lockout Status</span>
              <strong className="value">
                <span className={`badge-tag ${school.is_locked ? 'warning' : 'active'}`}>
                  {school.is_locked ? '🔒 Account Locked' : '✓ Normal Access'}
                </span>
              </strong>
            </div>
            <div className="detail-item">
              <span className="label">Live Profile Visibility</span>
              <strong className="value">
                <span className={`badge-tag ${school.is_live !== false ? 'active' : 'inactive'}`}>
                  {school.is_live !== false ? '✓ Live' : 'Hidden'}
                </span>
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
