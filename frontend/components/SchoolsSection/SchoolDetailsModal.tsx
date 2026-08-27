'use client';

import React from 'react';
import { Close, School, Person, LocalPhone, Email, Business, EventNote } from '@mui/icons-material';
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
  is_live?: boolean;
  is_active: boolean;
  is_locked?: boolean;
};

type SchoolDetailsModalProps = {
  school: SchoolData | null;
  onClose: () => void;
};

export default function SchoolDetailsModal({ school, onClose }: SchoolDetailsModalProps) {
  if (!school) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-brand">
            <div className="modal-avatar">
              {school.name.charAt(0).toUpperCase()}
            </div>
            <div className="modal-title-group">
              <h2>{school.name}</h2>
              <p>School Details & Credentials Overview</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <Close />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* General Info */}
          <div>
            <div className="details-section-title">General Information</div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">School ID</span>
                <span className="detail-value">#{school.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">School Name</span>
                <span className="detail-value">{school.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">School Email</span>
                <span className="detail-value">{school.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone Number</span>
                <span className="detail-value">{school.phone || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">School Type</span>
                <span className="detail-value">{school.type || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Established Year</span>
                <span className="detail-value">{school.established || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Principal Info */}
          <div>
            <div className="details-section-title">Principal Information</div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Principal Name</span>
                <span className="detail-value">{school.principal_name || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Principal Email</span>
                <span className="detail-value">{school.principal_email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Principal Phone</span>
                <span className="detail-value">{school.principal_phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Account & Lock Status */}
          <div>
            <div className="details-section-title">Account Security & System Status</div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Login Account Status</span>
                <span className={`badge-tag ${school.is_active ? 'active' : 'inactive'}`}>
                  {school.is_active ? '✓ Active' : '✗ Inactive'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Lockout Status</span>
                <span className={`badge-tag ${school.is_locked ? 'warning' : 'active'}`}>
                  {school.is_locked ? '🔒 Account Locked' : '✓ Normal Access'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Live Profile</span>
                <span className={`badge-tag ${school.is_live !== false ? 'active' : 'inactive'}`}>
                  {school.is_live !== false ? '✓ Live' : 'Hidden'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-modal-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
