'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/api';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import './AdminTherapistsSection.css';

type TherapistApp = {
  id: number;
  role_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile_number?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  professional_title?: string;
  therapist_type?: string;
  years_of_experience?: number;
  primary_specialization?: string;
  additional_specialization?: string;
  additional_specializations?: string;
  languages_spoken?: string;
  bio?: string;
  professional_biography?: string;

  is_associated_with_school?: boolean;
  school_id?: number;
  school_name?: string;
  school_email?: string;
  school_phone?: string;

  license_type?: string;
  license_number?: string;
  licensing_state?: string;
  license_issued_date?: string;
  license_expiration_date?: string;
  license_document_url?: string;

  has_npi?: boolean;
  npi_number?: string;
  npi_type?: string;
  provider_taxonomy?: string;

  highest_qualification?: string;
  degree_name?: string;
  field_of_study?: string;
  university_institution?: string;
  university_name?: string;
  graduation_year?: string;
  degree_document_url?: string;

  accepts_insurance?: boolean;
  insurance_types?: string;
  insurance_providers?: string;
  accepts_online_payment?: boolean;
  has_ehr?: boolean;
  has_ehr_system?: boolean;
  ehr_vendor?: string;
  ehr_vendor_name?: string;
  ehr_product_name?: string;

  handles_phi?: boolean;
  hipaa_training_completed?: boolean;
  hipaa_completion_date?: string;
  hipaa_training_completion_date?: string;
  malpractice_insurance_available?: boolean;
  malpractice_expiration_date?: string;
  malpractice_insurance_expiration_date?: string;
  malpractice_document_url?: string;

  approval_status: string;
  created_at?: string;
};

export default function AdminTherapistsSection() {
  const [therapists, setTherapists] = useState<TherapistApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistApp | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchTherapists();
  }, [statusFilter]);

  const fetchTherapists = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;

      const url =
        statusFilter === 'all'
          ? `${API_BASE_URL}/admin/therapists`
          : `${API_BASE_URL}/admin/therapists?status=${statusFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTherapists(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch therapists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      setActionMessage('');
      setErrorMessage('');
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/therapists/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✓ Approved! Generated credentials sent to ${data.email_id || 'therapist'}`);
        fetchTherapists();
        if (selectedTherapist?.id === id) {
          setSelectedTherapist((prev) => (prev ? { ...prev, approval_status: 'approved' } : null));
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || 'Failed to approve therapist');
      }
    } catch (err) {
      setErrorMessage('An error occurred during approval');
    }
  };

  const handleReject = async (id: number) => {
    try {
      setActionMessage('');
      setErrorMessage('');
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/therapists/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setActionMessage('Application rejected.');
        fetchTherapists();
        if (selectedTherapist?.id === id) {
          setSelectedTherapist((prev) => (prev ? { ...prev, approval_status: 'rejected' } : null));
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || 'Failed to reject therapist');
      }
    } catch (err) {
      setErrorMessage('An error occurred during rejection');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete therapist profile for ${name}?`)) {
      return;
    }

    try {
      setActionMessage('');
      setErrorMessage('');
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/therapists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setActionMessage(`Therapist profile #${id} deleted successfully.`);
        fetchTherapists();
        if (selectedTherapist?.id === id) {
          setSelectedTherapist(null);
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || 'Failed to delete therapist profile');
      }
    } catch (err) {
      setErrorMessage('An error occurred while deleting therapist');
    }
  };

  // If a therapist is selected, display the full details in-line view (NO POPUP)
  if (selectedTherapist) {
    const t = selectedTherapist;
    const fullName = `${t.first_name} ${t.last_name}`;
    const mobile = t.mobile_number || t.phone || 'N/A';
    const address = [t.address_line_1, t.address_line_2, t.city, t.state, t.postal_code, t.country]
      .filter(Boolean)
      .join(', ');

    return (
      <div className="admin-therapists-container">
        <div className="detail-view-card">
          <div className="detail-view-header">
            <div>
              <button className="btn-back-list" onClick={() => setSelectedTherapist(null)}>
                <ArrowBackIcon fontSize="small" /> Back to Therapist List
              </button>
              <h2 style={{ margin: '14px 0 0', fontSize: '1.6rem', color: '#2b003d' }}>
                Therapist Profile: {fullName}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`status-chip ${t.approval_status}`}>{t.approval_status}</span>
              {t.approval_status === 'pending' && (
                <>
                  <button className="btn-approve" onClick={() => handleApprove(t.id)}>
                    <CheckIcon fontSize="small" /> Approve
                  </button>
                  <button className="btn-reject" onClick={() => handleReject(t.id)}>
                    <CloseIcon fontSize="small" /> Reject
                  </button>
                </>
              )}
              <button className="btn-delete" onClick={() => handleDelete(t.id, fullName)}>
                <DeleteIcon fontSize="small" /> Delete Therapist
              </button>
            </div>
          </div>

          {actionMessage && (
            <div style={{ background: '#d1e7dd', color: '#0f5132', padding: '12px 16px', borderRadius: 10, fontWeight: 600 }}>
              {actionMessage}
            </div>
          )}
          {errorMessage && (
            <div style={{ background: '#f8d7da', color: '#842029', padding: '12px 16px', borderRadius: 10, fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}

          {/* Section 1: Basic & Contact */}
          <div className="detail-section">
            <h3>Personal & Contact Information</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>Therapist ID</span>
                <strong>#{t.id}</strong>
              </div>
              <div className="detail-grid-item">
                <span>First Name</span>
                <strong>{t.first_name}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Last Name</span>
                <strong>{t.last_name}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Email Address</span>
                <strong>{t.email}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Mobile Phone</span>
                <strong>{mobile}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Gender</span>
                <strong>{t.gender || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Date of Birth</span>
                <strong>{t.date_of_birth || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item" style={{ gridColumn: 'span 2' }}>
                <span>Address</span>
                <strong>{address || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Professional Profile */}
          <div className="detail-section">
            <h3>Professional Profile & Specializations</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>Professional Title</span>
                <strong>{t.professional_title || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Practice Type</span>
                <strong>{t.therapist_type || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Years of Experience</span>
                <strong>{t.years_of_experience ?? 0} Years</strong>
              </div>
              <div className="detail-grid-item">
                <span>Languages Spoken</span>
                <strong>{t.languages_spoken || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Primary Specialization</span>
                <strong>{t.primary_specialization || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Additional Specializations</span>
                <strong>{t.additional_specialization || t.additional_specializations || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item" style={{ gridColumn: 'span 3' }}>
                <span>Professional Biography</span>
                <strong>{t.bio || t.professional_biography || 'No biography provided.'}</strong>
              </div>
            </div>
          </div>

          {/* Section 3: School Affiliation */}
          <div className="detail-section">
            <h3>School / Institutional Affiliation</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>Is School Associated</span>
                <strong>{t.is_associated_with_school ? 'Yes (School Affiliated)' : 'No (Individual Practitioner)'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>School Name</span>
                <strong>{t.school_name || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>School Email</span>
                <strong>{t.school_email || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>School Phone</span>
                <strong>{t.school_phone || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 4: License & NPI */}
          <div className="detail-section">
            <h3>License & NPI Credentials</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>License Type</span>
                <strong>{t.license_type || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>License Number</span>
                <strong>{t.license_number || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Licensing State</span>
                <strong>{t.licensing_state || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>License Issued Date</span>
                <strong>{t.license_issued_date || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>License Expiration Date</span>
                <strong>{t.license_expiration_date || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>NPI Status</span>
                <strong>{t.has_npi ? `Available (${t.npi_number || 'N/A'})` : 'No NPI Registered'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>NPI Type</span>
                <strong>{t.npi_type || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Provider Taxonomy</span>
                <strong>{t.provider_taxonomy || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 5: Higher Education */}
          <div className="detail-section">
            <h3>Education & Qualifications</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>Highest Qualification</span>
                <strong>{t.highest_qualification || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Degree Name</span>
                <strong>{t.degree_name || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Field of Study</span>
                <strong>{t.field_of_study || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>University / Institution</span>
                <strong>{t.university_institution || t.university_name || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Graduation Year</span>
                <strong>{t.graduation_year || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 6: Insurance & EHR Setup */}
          <div className="detail-section">
            <h3>Practice Setup, Insurance & EHR</h3>
            <div className="detail-grid-expanded">
              <div className="detail-grid-item">
                <span>Accepts Health Insurance</span>
                <strong>{t.accepts_insurance ? 'Yes' : 'No'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Accepted Insurance Providers</span>
                <strong>{t.insurance_types || t.insurance_providers || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>Accepts Online Payment</span>
                <strong>{t.accepts_online_payment ? 'Yes' : 'No'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>EHR System Integrated</span>
                <strong>{t.has_ehr || t.has_ehr_system ? 'Yes' : 'No'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>EHR Vendor</span>
                <strong>{t.ehr_vendor || t.ehr_vendor_name || 'N/A'}</strong>
              </div>
              <div className="detail-grid-item">
                <span>EHR Product Name</span>
                <strong>{t.ehr_product_name || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 7: Documents & Verification Links */}
          <div className="detail-section">
            <h3>Uploaded Verification Documents</h3>
            <div className="detail-grid-expanded" style={{ marginTop: 8 }}>
              <div className="detail-grid-item">
                <span>License Document</span>
                {t.license_document_url ? (
                  <a
                    href={t.license_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-document"
                  >
                    <DescriptionIcon fontSize="small" /> View License <OpenInNewIcon fontSize="inherit" />
                  </a>
                ) : (
                  <strong>No document uploaded</strong>
                )}
              </div>

              <div className="detail-grid-item">
                <span>Degree Certificate</span>
                {t.degree_document_url ? (
                  <a
                    href={t.degree_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-document"
                  >
                    <DescriptionIcon fontSize="small" /> View Degree <OpenInNewIcon fontSize="inherit" />
                  </a>
                ) : (
                  <strong>No document uploaded</strong>
                )}
              </div>

              <div className="detail-grid-item">
                <span>Malpractice Insurance Document</span>
                {t.malpractice_document_url ? (
                  <a
                    href={t.malpractice_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-document"
                  >
                    <DescriptionIcon fontSize="small" /> View Malpractice Doc <OpenInNewIcon fontSize="inherit" />
                  </a>
                ) : (
                  <strong>No document uploaded</strong>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, display Table List View
  return (
    <div className="admin-therapists-container">
      <div className="filters-row">
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7700aa' }}>Filter Status:</span>
        <button
          className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All Applications
        </button>
        <button
          className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending Review
        </button>
        <button
          className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
        </button>
        <button
          className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected
        </button>
      </div>

      {actionMessage && (
        <div style={{ background: '#d1e7dd', color: '#0f5132', padding: '12px 16px', borderRadius: 10, fontWeight: 600 }}>
          {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ background: '#f8d7da', color: '#842029', padding: '12px 16px', borderRadius: 10, fontWeight: 600 }}>
          {errorMessage}
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <p style={{ padding: 20, textAlign: 'center' }}>Loading therapist applications...</p>
        ) : therapists.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: '#6c757d' }}>No therapist applications found for this filter.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Title / Type</th>
                <th>School Affiliation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map((t) => {
                const nameStr = `${t.first_name} ${t.last_name}`;
                return (
                  <tr key={t.id}>
                    <td>
                      <strong>{nameStr}</strong>
                    </td>
                    <td>{t.email}</td>
                    <td>{t.professional_title || t.therapist_type || 'N/A'}</td>
                    <td>{t.is_associated_with_school ? t.school_name || 'Associated' : 'Individual'}</td>
                    <td>
                      <span className={`status-chip ${t.approval_status}`}>{t.approval_status}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn-view"
                          onClick={() => setSelectedTherapist(t)}
                          title="View Full Profile Details"
                        >
                          <VisibilityIcon fontSize="small" /> Details
                        </button>
                        {t.approval_status === 'pending' && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => handleApprove(t.id)}
                              title="Approve & Send Credentials"
                            >
                              <CheckIcon fontSize="small" /> Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleReject(t.id)}
                              title="Reject Application"
                            >
                              <CloseIcon fontSize="small" /> Reject
                            </button>
                          </>
                        )}
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(t.id, nameStr)}
                          title="Delete Therapist Profile"
                        >
                          <DeleteIcon fontSize="small" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
