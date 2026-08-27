import re
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import Optional


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


class PasswordHashResponse(BaseModel):
    hash: str
