'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/api';
import SchoolForm, { type SchoolFormData } from './SchoolForm';
import SchoolsTable from './SchoolsTable';
import './SchoolsSection.css';

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
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_active: boolean;
  is_locked?: boolean;
};

export default function SchoolsSection() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSchools();
  }, []);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/schools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async (schoolData: SchoolFormData) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/schools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schoolData),
      });

      if (response.ok) {
        const newSchool = await response.json();
        setSchools([...schools, newSchool]);
        setShowForm(false);
        setSuccessMessage(`✓ School "${schoolData.name}" created and credentials sent via email`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || 'Failed to create school');
      }
    } catch (error) {
      setErrorMessage('An error occurred while creating the school');
      console.error('Error:', error);
    }
  };

  const handleToggleStatus = async (schoolId: number, currentStatus: boolean) => {
    try {
      const token = getToken();
      if (!token) return;

      console.log('Toggle school status:', schoolId, currentStatus);
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteSchool = async (schoolId: number, schoolName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${schoolName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/schools/${schoolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSchools(schools.filter(s => s.id !== schoolId));
        setSuccessMessage(`✓ School "${schoolName}" deleted successfully`);
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        const error = await response.json();
        setErrorMessage(error.detail || 'Failed to delete school');
      }
    } catch (error) {
      setErrorMessage('An error occurred while deleting the school');
      console.error('Error:', error);
    }
  };

  return (
    <section className="schools-section">
      <div className="schools-header">
        <div className="schools-title">
          <h2>Schools Management</h2>
          <p className="subtitle">Create and manage school accounts</p>
        </div>
        <button
          className="btn-primary btn-add-school"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Add School'}
        </button>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
          <button className="alert-close" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {showForm && (
        <SchoolForm
          onSubmit={handleAddSchool}
          isLoading={loading}
        />
      )}

      <SchoolsTable
        schools={schools}
        loading={loading}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteSchool}
      />
    </section>
  );
}
