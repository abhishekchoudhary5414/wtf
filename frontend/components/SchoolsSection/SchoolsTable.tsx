'use client';

import { useState } from 'react';
import SchoolDetailsModal from './SchoolDetailsModal';
import './SchoolsTable.css';

type School = {
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

type SchoolsTableProps = {
  schools: School[];
  loading: boolean;
  onToggleStatus?: (id: number, currentStatus: boolean) => void;
  onDelete: (id: number, name: string) => void;
};

export default function SchoolsTable({
  schools,
  loading,
  onDelete,
}: SchoolsTableProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  if (loading) {
    return (
      <div className="schools-card">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading school accounts...</p>
        </div>
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="schools-card">
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <path
              d="M30 80v-20a10 10 0 0 1 10-10h20a10 10 0 0 1 10 10v20M50 40a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h4>No School Accounts Yet</h4>
          <p>Create your first school account to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="schools-card">
        <div className="schools-list">
          {schools.map((school, index) => (
            <div key={school.id} className={`school-item ${index !== schools.length - 1 ? 'has-border' : ''}`}>
              <div
                className="school-header"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedSchool(school)}
              >
                <div className="school-avatar">{school.name.charAt(0).toUpperCase()}</div>
                <div className="school-main">
                  <h3 className="school-name">{school.name}</h3>
                  <p className="school-email">{school.email}</p>
                </div>
              </div>
              
              <div className="school-footer">
                <div className="badges-group">
                  <span className={`badge badge-${school.is_active ? 'active' : 'inactive'}`}>
                    {school.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                  {school.is_locked && (
                    <span className="badge badge-warning">
                      🔒 Locked
                    </span>
                  )}
                </div>
                
                <div className="actions">
                  <button
                    className="action-btn action-view"
                    title="View school details popup"
                    onClick={() => setSelectedSchool(school)}
                  >
                    👁
                  </button>
                  <button 
                    className="action-btn action-delete" 
                    title="Delete"
                    onClick={() => onDelete(school.id, school.name)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="schools-footer">
          <small>Total: {schools.length} school{schools.length !== 1 ? ' accounts' : ' account'}</small>
        </div>
      </div>

      {/* School Details Popup Modal */}
      {selectedSchool && (
        <SchoolDetailsModal
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
        />
      )}
    </>
  );
}
