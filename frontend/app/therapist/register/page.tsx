'use client';

import { Suspense, useEffect, useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PaymentIcon from '@mui/icons-material/Payment';
import ComputerIcon from '@mui/icons-material/Computer';
import './register.css';

type DropdownOption = {
  id: number;
  category: string;
  value: string;
};

type TherapistRegisterForm = {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  gender: string;
  date_of_birth: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;

  professional_title: string;
  therapist_type: string;
  years_of_experience: number;
  primary_specialization: string;
  additional_specializations: string;
  languages_spoken: string;
  bio: string;

  is_associated_with_school: boolean;
  school_id: number | null;
  school_name: string;
  school_email: string;
  school_phone: string;

  license_type: string;
  license_number: string;
  licensing_state: string;
  license_issued_date: string;
  license_expiration_date: string;
  license_document_url: string;

  has_npi: boolean;
  npi_number: string;
  npi_type: string;
  provider_taxonomy: string;

  highest_qualification: string;
  degree_name: string;
  field_of_study: string;
  university_name: string;
  graduation_year: string;
  degree_document_url: string;

  accepts_insurance: boolean;
  selected_insurances: string[];
  accepts_online_payment: boolean;
  has_ehr_system: boolean;
  ehr_vendor_name: string;
  ehr_product_name: string;

  handles_phi: boolean;
  hipaa_training_completed: boolean;
  hipaa_completion_date: string;
  malpractice_insurance_available: boolean;
  malpractice_expiration_date: string;
  malpractice_document_url: string;
};

const initialRegisterForm: TherapistRegisterForm = {
  first_name: '',
  last_name: '',
  email: '',
  mobile_number: '',
  gender: '',
  date_of_birth: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United States',

  professional_title: 'Licensed Professional Counselor (LPC)',
  therapist_type: 'Individual Therapist',
  years_of_experience: 1,
  primary_specialization: '',
  additional_specializations: '',
  languages_spoken: 'English',
  bio: '',

  is_associated_with_school: false,
  school_id: null,
  school_name: '',
  school_email: '',
  school_phone: '',

  license_type: '',
  license_number: '',
  licensing_state: '',
  license_issued_date: '',
  license_expiration_date: '',
  license_document_url: '',

  has_npi: false,
  npi_number: '',
  npi_type: 'Individual',
  provider_taxonomy: '',

  highest_qualification: "Master's Degree",
  degree_name: '',
  field_of_study: '',
  university_name: '',
  graduation_year: '',
  degree_document_url: '',

  accepts_insurance: true,
  selected_insurances: ['Blue Cross Blue Shield', 'Aetna'],
  accepts_online_payment: true,
  has_ehr_system: false,
  ehr_vendor_name: '',
  ehr_product_name: '',

  handles_phi: true,
  hipaa_training_completed: true,
  hipaa_completion_date: '',
  malpractice_insurance_available: true,
  malpractice_expiration_date: '',
  malpractice_document_url: '',
};

type FormTab = 1 | 2 | 3 | 4 | 5 | 6;

function TherapistRegisterContent() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get('invite') || searchParams.get('invite_id');

  const [activeTab, setActiveTab] = useState<FormTab>(1);
  const [form, setForm] = useState<TherapistRegisterForm>(initialRegisterForm);
  const [inviteInfo, setInviteInfo] = useState<{ school_name?: string; school_email?: string; therapist_email?: string } | null>(null);
  const [titles, setTitles] = useState<DropdownOption[]>([]);
  const [therapistTypes, setTherapistTypes] = useState<DropdownOption[]>([]);
  const [insurances, setInsurances] = useState<DropdownOption[]>([]);

  const [isInsuranceDropdownOpen, setIsInsuranceDropdownOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOptions = async (category: string, setter: (data: DropdownOption[]) => void) => {
      try {
        const res = await fetch(`${API_BASE_URL}/master-dropdowns/${category}`);
        if (res.ok) {
          const data = await res.json();
          setter(data);
        }
      } catch (err) {
        console.error(`Failed to fetch dropdown for ${category}`, err);
      }
    };

    fetchOptions('professional_title', setTitles);
    fetchOptions('therapist_type', setTherapistTypes);
    fetchOptions('insurance_types', setInsurances);

    if (inviteId) {
      fetch(`${API_BASE_URL}/therapists/invite-info/${inviteId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.email) {
            setInviteInfo({
              school_name: data.school_name,
              school_email: data.school_email,
              therapist_email: data.email,
            });
            setForm((prev) => ({
              ...prev,
              email: data.email || prev.email,
              first_name: data.first_name || prev.first_name,
              last_name: data.last_name || prev.last_name,
              is_associated_with_school: true,
              school_id: data.school_id || null,
              school_name: data.school_name || prev.school_name,
              school_email: data.school_email || prev.school_email,
              school_phone: data.school_phone || prev.school_phone,
            }));
          }
        })
        .catch((err) => console.error('Failed to fetch invitation details', err));
    } else {
      setForm((prev) => ({
        ...prev,
        is_associated_with_school: false,
        school_id: null,
        school_name: '',
        school_email: '',
        school_phone: '',
      }));
    }
  }, [inviteId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsInsuranceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value,
    }));
    setSubmitError('');
  };

  // Insurance Selection Toggle Handler
  const toggleInsuranceSelection = (insuranceVal: string) => {
    setForm((prev) => {
      const exists = prev.selected_insurances.includes(insuranceVal);
      if (exists) {
        return {
          ...prev,
          selected_insurances: prev.selected_insurances.filter((item) => item !== insuranceVal),
        };
      } else {
        return {
          ...prev,
          selected_insurances: [...prev.selected_insurances, insuranceVal],
        };
      }
    });
  };

  // Real-time File Upload Handler
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, targetField: keyof TherapistRegisterForm) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(targetField);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('File upload failed');
      }

      const data = await res.json();
      if (data.url) {
        setForm((prev) => ({
          ...prev,
          [targetField]: data.url,
        }));
      }
    } catch (err) {
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.first_name || !form.last_name || !form.email || !form.mobile_number) {
      setActiveTab(1);
      setSubmitError('Please fill out all required basic information fields in Tab 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        mobile_number: form.mobile_number,
        phone: form.mobile_number,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        address_line_1: form.address_line_1 || null,
        address_line_2: form.address_line_2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country || null,

        professional_title: form.professional_title,
        therapist_type: form.therapist_type,
        years_of_experience: Number(form.years_of_experience) || 0,
        primary_specialization: form.primary_specialization || null,
        additional_specializations: form.additional_specializations || null,
        languages_spoken: form.languages_spoken || null,
        bio: form.bio || null,

        is_associated_with_school: Boolean(inviteInfo),
        is_school_associated: Boolean(inviteInfo),
        school_id: inviteInfo ? form.school_id : null,
        school_name: inviteInfo ? form.school_name : null,
        school_email: inviteInfo ? form.school_email : null,
        school_phone: inviteInfo ? form.school_phone : null,

        license_type: form.license_type || null,
        license_number: form.license_number || null,
        licensing_state: form.licensing_state || null,
        license_issued_date: form.license_issued_date || null,
        license_expiration_date: form.license_expiration_date || null,
        license_document_url: form.license_document_url || null,

        has_npi: form.has_npi,
        npi_number: form.has_npi ? form.npi_number : null,
        npi_type: form.has_npi ? form.npi_type : null,
        provider_taxonomy: form.has_npi ? form.provider_taxonomy : null,

        highest_qualification: form.highest_qualification || null,
        degree_name: form.degree_name || null,
        field_of_study: form.field_of_study || null,
        university_name: form.university_name || null,
        graduation_year: form.graduation_year || null,
        degree_document_url: form.degree_document_url || null,

        accepts_insurance: form.accepts_insurance,
        insurance_providers: form.accepts_insurance ? form.selected_insurances.join(', ') : null,
        accepts_online_payment: form.accepts_online_payment,
        has_ehr_system: form.has_ehr_system,
        ehr_vendor_name: form.has_ehr_system ? form.ehr_vendor_name : null,
        ehr_product_name: form.has_ehr_system ? form.ehr_product_name : null,

        handles_phi: form.handles_phi,
        hipaa_training_completed: form.hipaa_training_completed,
        hipaa_completion_date: form.hipaa_completion_date || null,
        malpractice_insurance_available: form.malpractice_insurance_available,
        malpractice_expiration_date: form.malpractice_expiration_date || null,
        malpractice_document_url: form.malpractice_document_url || null,
      };

      const response = await fetch(`${API_BASE_URL}/therapists/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed');
      }

      setIsSubmittedSuccess(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit registration application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmittedSuccess) {
    return (
      <section className="register-shell">
        <div className="register-container">
          <div className="success-card">
            <div className="success-icon">
              <CheckCircleOutlineIcon fontSize="inherit" />
            </div>
            <h2>Application Submitted Successfully!</h2>
            <p>
              Thank you for registering with WTF Healthcare Provider Network. Your application has been submitted and is currently pending Admin review. Once approved, login credentials will be dispatched to your registered email address ({form.email}).
            </p>
            <Link href="/therapist/login" className="btn-back-login">
              Return to Therapist Login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const defaultInsurancesList = [
    'Blue Cross Blue Shield',
    'Aetna',
    'Cigna',
    'UnitedHealthcare',
    'Kaiser Permanente',
    'Medicare / Medicaid',
    'Humana',
    'Molina Healthcare',
    'Tricare',
    'Optum Behavioral Health',
    'Beacon Health Options',
    'Magellan Health',
  ];

  const availableInsurances =
    insurances.length > 0 ? insurances.map((i) => i.value) : defaultInsurancesList;

  return (
    <section className="register-shell">
      <div className="register-container">
        <div className="register-header">
          <div className="brand-badge">T</div>
          <h1>Therapist Registration</h1>
          <p>Complete your professional credentials in 6 step tabs below to join the WTF Healthcare Portal</p>
        </div>

        {inviteInfo ? (
          <div className="invited-banner">
            <InfoOutlinedIcon fontSize="small" />
            <div>
              <strong>School Invitation Active:</strong> Registering via official invitation from <strong>{inviteInfo.school_name || 'School'}</strong> ({inviteInfo.school_email}). School affiliation details are pre-filled and locked.
            </div>
          </div>
        ) : (
          <div className="invited-banner" style={{ background: '#faf7fc', borderColor: '#efe3f5', color: '#6b7280' }}>
            <LockOutlinedIcon fontSize="small" />
            <div>
              <strong>Individual Practitioner Registration:</strong> Registering as an independent practitioner. School affiliation is defaulted and locked.
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${(activeTab / 6) * 100}%` }} />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="tabs-navigation">
          <button
            type="button"
            className={`tab-btn ${activeTab === 1 ? 'active' : activeTab > 1 ? 'completed' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <span className="tab-badge">1</span>
            <span>Personal & Contact</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 2 ? 'active' : activeTab > 2 ? 'completed' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <span className="tab-badge">2</span>
            <span>Professional Profile</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 3 ? 'active' : activeTab > 3 ? 'completed' : ''}`}
            onClick={() => setActiveTab(3)}
          >
            <span className="tab-badge">3</span>
            <span>School Affiliation</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 4 ? 'active' : activeTab > 4 ? 'completed' : ''}`}
            onClick={() => setActiveTab(4)}
          >
            <span className="tab-badge">4</span>
            <span>License & NPI</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 5 ? 'active' : activeTab > 5 ? 'completed' : ''}`}
            onClick={() => setActiveTab(5)}
          >
            <span className="tab-badge">5</span>
            <span>Insurance & Practice</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 6 ? 'active' : ''}`}
            onClick={() => setActiveTab(6)}
          >
            <span className="tab-badge">6</span>
            <span>Document Uploads</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: Personal & Contact Information */}
          {activeTab === 1 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">1</span>
                Personal & Contact Information
              </h2>
              <div className="form-grid">
                <div className="field-group">
                  <label>First Name *</label>
                  <input
                    name="first_name"
                    type="text"
                    required
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="First name"
                  />
                </div>

                <div className="field-group">
                  <label>Last Name *</label>
                  <input
                    name="last_name"
                    type="text"
                    required
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Last name"
                  />
                </div>

                <div className="field-group">
                  <label>Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    disabled={Boolean(inviteInfo?.therapist_email)}
                    value={form.email}
                    onChange={handleChange}
                    placeholder="therapist@domain.com"
                  />
                  {inviteInfo?.therapist_email && (
                    <span className="locked-notice">Locked to invited email</span>
                  )}
                </div>

                <div className="field-group">
                  <label>Mobile Phone Number *</label>
                  <input
                    name="mobile_number"
                    type="tel"
                    required
                    value={form.mobile_number}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="field-group">
                  <label>Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="field-group">
                  <label>Date of Birth</label>
                  <input
                    name="date_of_birth"
                    type="date"
                    value={form.date_of_birth}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group span-2">
                  <label>Address Line 1</label>
                  <input
                    name="address_line_1"
                    type="text"
                    value={form.address_line_1}
                    onChange={handleChange}
                    placeholder="Street address or P.O. Box"
                  />
                </div>

                <div className="field-group span-2">
                  <label>Address Line 2</label>
                  <input
                    name="address_line_2"
                    type="text"
                    value={form.address_line_2}
                    onChange={handleChange}
                    placeholder="Suite, unit, building, floor"
                  />
                </div>

                <div className="field-group">
                  <label>City</label>
                  <input name="city" type="text" value={form.city} onChange={handleChange} placeholder="City" />
                </div>

                <div className="field-group">
                  <label>State / Province</label>
                  <input name="state" type="text" value={form.state} onChange={handleChange} placeholder="State" />
                </div>

                <div className="field-group">
                  <label>Postal Code</label>
                  <input name="postal_code" type="text" value={form.postal_code} onChange={handleChange} placeholder="Zip code" />
                </div>

                <div className="field-group">
                  <label>Country</label>
                  <input name="country" type="text" value={form.country} onChange={handleChange} placeholder="Country" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Professional Profile */}
          {activeTab === 2 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">2</span>
                Professional Profile & Bio
              </h2>
              <div className="form-grid">
                <div className="field-group">
                  <label>Professional Title</label>
                  <select name="professional_title" value={form.professional_title} onChange={handleChange}>
                    {titles.length > 0 ? (
                      titles.map((t) => (
                        <option key={t.id} value={t.value}>
                          {t.value}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Licensed Professional Counselor (LPC)">Licensed Professional Counselor (LPC)</option>
                        <option value="Licensed Clinical Social Worker (LCSW)">Licensed Clinical Social Worker (LCSW)</option>
                        <option value="Licensed Marriage and Family Therapist (LMFT)">Licensed Marriage and Family Therapist (LMFT)</option>
                        <option value="Clinical Psychologist (PsyD/PhD)">Clinical Psychologist (PsyD/PhD)</option>
                        <option value="Psychiatrist (MD/DO)">Psychiatrist (MD/DO)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="field-group">
                  <label>Therapist Practice Type</label>
                  <select name="therapist_type" value={form.therapist_type} onChange={handleChange}>
                    {therapistTypes.length > 0 ? (
                      therapistTypes.map((tt) => (
                        <option key={tt.id} value={tt.value}>
                          {tt.value}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Individual Therapist">Individual Therapist</option>
                        <option value="Child & Adolescent Specialist">Child & Adolescent Specialist</option>
                        <option value="Couples & Family Therapist">Couples & Family Therapist</option>
                        <option value="Behavioral Analyst">Behavioral Analyst</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="field-group">
                  <label>Years of Experience</label>
                  <input
                    name="years_of_experience"
                    type="number"
                    min="0"
                    max="60"
                    value={form.years_of_experience}
                    onChange={handleChange}
                  />
                </div>

                <div className="field-group">
                  <label>Languages Spoken</label>
                  <input
                    name="languages_spoken"
                    type="text"
                    value={form.languages_spoken}
                    onChange={handleChange}
                    placeholder="e.g. English, Spanish, French"
                  />
                </div>

                <div className="field-group span-2">
                  <label>Primary Specialization</label>
                  <input
                    name="primary_specialization"
                    type="text"
                    value={form.primary_specialization}
                    onChange={handleChange}
                    placeholder="e.g. Anxiety & Mood Disorders, Trauma, ADHD"
                  />
                </div>

                <div className="field-group span-2">
                  <label>Additional Specializations</label>
                  <input
                    name="additional_specializations"
                    type="text"
                    value={form.additional_specializations}
                    onChange={handleChange}
                    placeholder="e.g. CBT, EMDR, Mindfulness, Family Conflict"
                  />
                </div>

                <div className="field-group span-2">
                  <label>Professional Biography</label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Brief summary of your therapeutic practice and clinical approach..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: School Affiliation */}
          {activeTab === 3 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">3</span>
                Institutional / School Affiliation
              </h2>
              <div className="checkbox-group">
                <input
                  id="is_associated_with_school"
                  name="is_associated_with_school"
                  type="checkbox"
                  checked={Boolean(inviteInfo)}
                  disabled
                />
                <label htmlFor="is_associated_with_school" className="disabled">
                  {inviteInfo ? 'Affiliated with School (Invitation Active)' : 'Associated with an Educational Institution'}
                </label>
              </div>
              <span className="locked-notice" style={{ display: 'block', marginTop: 6 }}>
                {inviteInfo
                  ? 'School affiliation locked to the inviting institution.'
                  : 'Locked: Public registrations are assigned as individual practitioners.'}
              </span>

              {inviteInfo && (
                <div className="form-grid" style={{ marginTop: 20 }}>
                  <div className="field-group span-2">
                    <label>School / Institution Name</label>
                    <input
                      name="school_name"
                      type="text"
                      disabled
                      value={form.school_name}
                    />
                  </div>
                  <div className="field-group">
                    <label>School Email</label>
                    <input
                      name="school_email"
                      type="email"
                      disabled
                      value={form.school_email}
                    />
                  </div>
                  <div className="field-group">
                    <label>School Phone</label>
                    <input
                      name="school_phone"
                      type="tel"
                      disabled
                      value={form.school_phone}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Professional License & NPI */}
          {activeTab === 4 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">4</span>
                Professional License & NPI
              </h2>
              <div className="form-grid">
                <div className="field-group">
                  <label>License Type</label>
                  <input
                    name="license_type"
                    type="text"
                    value={form.license_type}
                    onChange={handleChange}
                    placeholder="e.g. LPC, LCSW, PsyD"
                  />
                </div>

                <div className="field-group">
                  <label>License Number</label>
                  <input
                    name="license_number"
                    type="text"
                    value={form.license_number}
                    onChange={handleChange}
                    placeholder="e.g. LIC-987654"
                  />
                </div>

                <div className="field-group">
                  <label>Licensing State</label>
                  <input
                    name="licensing_state"
                    type="text"
                    value={form.licensing_state}
                    onChange={handleChange}
                    placeholder="e.g. California"
                  />
                </div>

                <div className="field-group">
                  <label>License Expiration Date</label>
                  <input
                    name="license_expiration_date"
                    type="date"
                    value={form.license_expiration_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="checkbox-group span-2" style={{ marginTop: 12 }}>
                  <input
                    id="has_npi"
                    name="has_npi"
                    type="checkbox"
                    checked={form.has_npi}
                    onChange={handleChange}
                  />
                  <label htmlFor="has_npi">National Provider Identifier (NPI) Available</label>
                </div>

                {form.has_npi && (
                  <>
                    <div className="field-group">
                      <label>NPI Number (10 digits)</label>
                      <input
                        name="npi_number"
                        type="text"
                        maxLength={10}
                        value={form.npi_number}
                        onChange={handleChange}
                        placeholder="1234567890"
                      />
                    </div>

                    <div className="field-group">
                      <label>Provider Taxonomy</label>
                      <input
                        name="provider_taxonomy"
                        type="text"
                        value={form.provider_taxonomy}
                        onChange={handleChange}
                        placeholder="101YM0800X"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Insurances & Practice Setup */}
          {activeTab === 5 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">5</span>
                Insurance Coverage & Practice Setup
              </h2>

              {/* Interactive Practice Toggle Card 1: Health Insurance */}
              <div className="practice-card-feature" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: '#f0daf8',
                      color: '#7700aa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LocalHospitalIcon />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#2b003d' }}>
                      Accepts Health Insurance Coverage
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                      Enable insurance billing for client sessions and reimbursement
                    </p>
                  </div>
                </div>

                <div className="checkbox-group">
                  <input
                    id="accepts_insurance"
                    name="accepts_insurance"
                    type="checkbox"
                    checked={form.accepts_insurance}
                    onChange={handleChange}
                    style={{ width: 22, height: 22 }}
                  />
                </div>
              </div>

              {/* Attractive Custom Multi-Select Dropdown Selector */}
              {form.accepts_insurance && (
                <div className="field-group span-2" style={{ marginBottom: 24 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.92rem', color: '#2b003d' }}>
                    Select Accepted Insurance Providers (Click dropdown to select multiple)
                  </label>

                  <div className="attractive-dropdown-container" ref={dropdownRef}>
                    <div
                      className={`attractive-dropdown-trigger ${isInsuranceDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsInsuranceDropdownOpen((prev) => !prev)}
                    >
                      <div className="dropdown-trigger-text">
                        <LocalHospitalIcon style={{ color: '#7700aa', fontSize: 20 }} />
                        <span>
                          {form.selected_insurances.length > 0
                            ? `Selected Insurance Providers`
                            : 'Choose Accepted Insurance Providers...'}
                        </span>
                        {form.selected_insurances.length > 0 && (
                          <span className="dropdown-selected-count">
                            {form.selected_insurances.length} Selected
                          </span>
                        )}
                      </div>
                      <KeyboardArrowDownIcon
                        style={{
                          color: '#7700aa',
                          transform: isInsuranceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}
                      />
                    </div>

                    {isInsuranceDropdownOpen && (
                      <div className="dropdown-menu-popup">
                        {availableInsurances.map((insName, idx) => {
                          const isSelected = form.selected_insurances.includes(insName);
                          return (
                            <div
                              key={idx}
                              className={`dropdown-item-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleInsuranceSelection(insName)}
                            >
                              <span>{insName}</span>
                              {isSelected && <CheckIcon style={{ fontSize: 18, color: '#7700aa' }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Vibrant Selected Insurance Pill Tags */}
                  <div className="selected-pills-row">
                    {form.selected_insurances.map((insVal, i) => (
                      <span key={i} className="insurance-pill-vibrant">
                        <span>{insVal}</span>
                        <button
                          type="button"
                          onClick={() => toggleInsuranceSelection(insVal)}
                          title="Remove Provider"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {form.selected_insurances.length === 0 && (
                      <span style={{ fontSize: '0.88rem', color: '#6b7280', fontStyle: 'italic' }}>
                        No insurance providers selected. Click the dropdown menu above to select providers.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="form-grid">
                {/* Practice Toggle Card 2: Online Payments */}
                <div className="practice-card-feature span-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#f0daf8',
                        color: '#7700aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PaymentIcon />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#2b003d' }}>
                        Accepts Direct Online Payments
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                        Allow clients to pay for copays & sessions via credit/debit card
                      </p>
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <input
                      id="accepts_online_payment"
                      name="accepts_online_payment"
                      type="checkbox"
                      checked={form.accepts_online_payment}
                      onChange={handleChange}
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                </div>

                {/* Practice Toggle Card 3: EHR Integration */}
                <div className="practice-card-feature span-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#f0daf8',
                        color: '#7700aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ComputerIcon />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#2b003d' }}>
                        Electronic Health Record (EHR) Integrated
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                        Connect existing EHR / Practice Management software
                      </p>
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <input
                      id="has_ehr_system"
                      name="has_ehr_system"
                      type="checkbox"
                      checked={form.has_ehr_system}
                      onChange={handleChange}
                      style={{ width: 22, height: 22 }}
                    />
                  </div>
                </div>

                {form.has_ehr_system && (
                  <>
                    <div className="field-group">
                      <label>EHR Vendor Name</label>
                      <input
                        name="ehr_vendor_name"
                        type="text"
                        value={form.ehr_vendor_name}
                        onChange={handleChange}
                        placeholder="e.g. SimplePractice, TherapyNotes"
                      />
                    </div>

                    <div className="field-group">
                      <label>EHR Product Name</label>
                      <input
                        name="ehr_product_name"
                        type="text"
                        value={form.ehr_product_name}
                        onChange={handleChange}
                        placeholder="e.g. Pro Suite 2026"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Document Uploads & Submit */}
          {activeTab === 6 && (
            <div className="section-card">
              <h2 className="section-title">
                <span className="section-badge">6</span>
                Verification Document Uploads
              </h2>
              <div className="form-grid">
                {/* Upload License Document */}
                <div className="upload-box-card">
                  <DescriptionIcon style={{ fontSize: 36, color: '#7700aa' }} />
                  <strong>Professional License Document</strong>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
                    Upload your active clinical license (PDF, PNG, JPG)
                  </p>
                  <label className="btn-upload-file">
                    <CloudUploadIcon fontSize="small" />
                    {uploadingDoc === 'license_document_url' ? 'Uploading...' : 'Browse File'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'license_document_url')}
                    />
                  </label>
                  {form.license_document_url && (
                    <a
                      href={form.license_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doc-link-badge"
                    >
                      <CheckIcon fontSize="small" /> License Uploaded (View Document)
                    </a>
                  )}
                </div>

                {/* Upload Degree Certificate */}
                <div className="upload-box-card">
                  <DescriptionIcon style={{ fontSize: 36, color: '#7700aa' }} />
                  <strong>Degree Certificate</strong>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
                    Upload highest qualification degree (PDF, PNG, JPG)
                  </p>
                  <label className="btn-upload-file">
                    <CloudUploadIcon fontSize="small" />
                    {uploadingDoc === 'degree_document_url' ? 'Uploading...' : 'Browse File'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'degree_document_url')}
                    />
                  </label>
                  {form.degree_document_url && (
                    <a
                      href={form.degree_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doc-link-badge"
                    >
                      <CheckIcon fontSize="small" /> Degree Uploaded (View Document)
                    </a>
                  )}
                </div>

                {/* Upload Malpractice Insurance Document */}
                <div className="upload-box-card span-2">
                  <DescriptionIcon style={{ fontSize: 36, color: '#7700aa' }} />
                  <strong>Malpractice Insurance Certificate</strong>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
                    Upload malpractice insurance certificate (PDF, PNG, JPG)
                  </p>
                  <label className="btn-upload-file">
                    <CloudUploadIcon fontSize="small" />
                    {uploadingDoc === 'malpractice_document_url' ? 'Uploading...' : 'Browse File'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e, 'malpractice_document_url')}
                    />
                  </label>
                  {form.malpractice_document_url && (
                    <a
                      href={form.malpractice_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doc-link-badge"
                    >
                      <CheckIcon fontSize="small" /> Malpractice Doc Uploaded (View Document)
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <p className="submit-message error" style={{ color: '#d93025', textAlign: 'center', fontWeight: 600, marginBottom: 16 }}>
              {submitError}
            </p>
          )}

          {/* Tab Navigation Controls */}
          <div className="tab-controls-row">
            {activeTab > 1 ? (
              <button
                type="button"
                className="btn-tab-prev"
                onClick={() => setActiveTab((prev) => (prev - 1) as FormTab)}
              >
                ← Previous Step
              </button>
            ) : <div />}

            {activeTab < 6 ? (
              <button
                type="button"
                className="btn-tab-next"
                onClick={() => setActiveTab((prev) => (prev + 1) as FormTab)}
              >
                Next Step →
              </button>
            ) : (
              <button type="submit" className="btn-register-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting Application...' : 'Submit Registration Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export default function TherapistRegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading registration form...</div>}>
      <TherapistRegisterContent />
    </Suspense>
  );
}
