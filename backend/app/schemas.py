import re
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import Optional, List, Union


class AdminRegistrationRequest(BaseModel):
    first_name: str
    last_name: str
    email_id: EmailStr
    mobile_number: Optional[str] = None
    password: str
    role_name: str = "Admin"

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None

        cleaned = re.sub(r"[\s()-]", "", value.strip())
        if not re.fullmatch(r"\+?[0-9]{8,15}", cleaned):
            raise ValueError("Mobile number must be a valid phone number with 8 to 15 digits")
        return value.strip()


class AdminLoginRequest(BaseModel):
    email_id: EmailStr
    password: str


class AdminProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email_id: str
    mobile_number: Optional[str] = None
    role_name: str
    is_live: bool
    is_active: bool
    is_locked: bool


class AdminProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile_number: Optional[str] = None

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None

        cleaned = re.sub(r"[\s()-]", "", value.strip())
        if not re.fullmatch(r"\+?[0-9]{8,15}", cleaned):
            raise ValueError("Mobile number must be a valid phone number with 8 to 15 digits")
        return value.strip()


class AdminPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class SchoolCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    type: Optional[str] = None
    established: Optional[str] = None
    principal_name: Optional[str] = None
    principal_email: Optional[EmailStr] = None
    principal_phone: Optional[str] = None


class SchoolLoginRequest(BaseModel):
    email: EmailStr
    password: str


class SchoolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    profile_url: Optional[str] = None
    type: Optional[str] = None
    phone: Optional[str] = None
    established: Optional[str] = None
    principal_name: Optional[str] = None
    principal_email: Optional[str] = None
    principal_phone: Optional[str] = None
    is_live: bool = True
    is_active: bool = True
    is_locked: bool = False


class SchoolProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    established: Optional[str] = None
    principal_name: Optional[str] = None
    principal_email: Optional[EmailStr] = None
    principal_phone: Optional[str] = None


class SchoolPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class LifeCoachCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    gender: Optional[str] = None


class LifeCoachLoginRequest(BaseModel):
    email: EmailStr
    password: str


class LifeCoachResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role_id: int = 3
    name: str
    email: str
    profile_url: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    school_id: int
    school_name: Optional[str] = None
    school_email: Optional[str] = None
    school_phone: Optional[str] = None
    school_type: Optional[str] = None
    school_established: Optional[str] = None
    principal_name: Optional[str] = None
    principal_email: Optional[str] = None
    principal_phone: Optional[str] = None
    is_live: bool = True
    is_active: bool = True
    is_locked: bool = False


class LifeCoachProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None


class LifeCoachPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    redirect_to: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class PasswordHashRequest(BaseModel):
    password: str


# Master Dropdown Schemas
class DropdownOptionCreate(BaseModel):
    category: str
    value: str


class DropdownOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    value: str
    is_active: bool


class SchoolTherapistInviteRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None


class TherapistRegistrationRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    mobile_number: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    # Professional Info
    professional_title: Optional[str] = None
    therapist_type: Optional[str] = None
    professional_biography: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[Union[int, str]] = None
    primary_specialization: Optional[str] = None
    additional_specialization: Optional[str] = None
    additional_specializations: Optional[str] = None
    language_spoken: Optional[str] = None
    languages_spoken: Optional[str] = None

    # School Association
    is_school_associated: Optional[bool] = False
    is_associated_with_school: Optional[bool] = False
    invite_token: Optional[str] = None
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    school_email: Optional[str] = None
    school_phone: Optional[str] = None

    # Professional License
    license_type: Optional[str] = None
    license_number: Optional[str] = None
    licensing_state: Optional[str] = None
    license_issued_date: Optional[str] = None
    license_expiration_date: Optional[str] = None
    license_document_url: Optional[str] = None

    # NPI
    has_npi: Optional[bool] = False
    npi_number: Optional[str] = None
    npi_type: Optional[str] = None
    provider_taxonomy: Optional[str] = None

    # Education
    highest_qualification: Optional[str] = None
    degree_name: Optional[str] = None
    field_of_study: Optional[str] = None
    university_institution: Optional[str] = None
    university_name: Optional[str] = None
    graduation_year: Optional[str] = None
    degree_document_url: Optional[str] = None

    # Insurance & Billing
    accepts_insurance: Optional[bool] = False
    insurance_types: Optional[Union[List[str], str]] = None
    insurance_providers: Optional[Union[List[str], str]] = None
    accepts_online_payment: Optional[bool] = False
    has_ehr: Optional[bool] = False
    has_ehr_system: Optional[bool] = False
    ehr_vendor: Optional[str] = None
    ehr_vendor_name: Optional[str] = None
    ehr_product_name: Optional[str] = None

    # HIPAA & Compliance
    handles_phi: Optional[bool] = False
    hipaa_training_completed: Optional[bool] = False
    hipaa_training_completion_date: Optional[str] = None
    hipaa_completion_date: Optional[str] = None
    malpractice_insurance_available: Optional[bool] = False
    malpractice_insurance_expiration_date: Optional[str] = None
    malpractice_expiration_date: Optional[str] = None
    malpractice_document_url: Optional[str] = None


class TherapistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role_id: int = 4
    first_name: str
    last_name: str
    profile_url: Optional[str] = None
    email: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None

    # Professional Info
    professional_title: Optional[str] = None
    therapist_type: Optional[str] = None
    professional_biography: Optional[str] = None
    years_of_experience: Optional[str] = None
    primary_specialization: Optional[str] = None
    additional_specialization: Optional[str] = None
    language_spoken: Optional[str] = None

    # School Association
    is_school_associated: bool = False
    school_id: Optional[int] = None
    school_name: Optional[str] = None
    school_email: Optional[str] = None
    school_phone: Optional[str] = None

    # Professional License
    license_type: Optional[str] = None
    license_number: Optional[str] = None
    licensing_state: Optional[str] = None
    license_issued_date: Optional[str] = None
    license_expiration_date: Optional[str] = None
    license_document_url: Optional[str] = None

    # NPI
    has_npi: bool = False
    npi_number: Optional[str] = None
    npi_type: Optional[str] = None
    provider_taxonomy: Optional[str] = None

    # Education
    highest_qualification: Optional[str] = None
    degree_name: Optional[str] = None
    field_of_study: Optional[str] = None
    university_institution: Optional[str] = None
    graduation_year: Optional[str] = None
    degree_document_url: Optional[str] = None

    # Insurance & Billing
    accepts_insurance: bool = False
    insurance_types: Optional[List[str]] = None
    accepts_online_payment: bool = False
    has_ehr: bool = False
    ehr_vendor: Optional[str] = None
    ehr_product_name: Optional[str] = None

    # HIPAA & Compliance
    handles_phi: bool = False
    hipaa_training_completed: bool = False
    hipaa_training_completion_date: Optional[str] = None
    malpractice_insurance_available: bool = False
    malpractice_insurance_expiration_date: Optional[str] = None
    malpractice_document_url: Optional[str] = None

    # Approval & Status
    approval_status: str = "pending"
    is_live: bool = True
    is_active: bool = True
    is_locked: bool = False


class TherapistLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TherapistProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address_line_1: Optional[str] = None
    address_line_2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    professional_title: Optional[str] = None
    therapist_type: Optional[str] = None
    professional_biography: Optional[str] = None
    years_of_experience: Optional[str] = None
    primary_specialization: Optional[str] = None
    additional_specialization: Optional[str] = None
    language_spoken: Optional[str] = None


class TherapistPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str



class PasswordHashResponse(BaseModel):
    hash: str
