import os
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import logging
from datetime import datetime, timezone, timedelta
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from uuid import uuid4
from typing import List, Optional

from app.database import Base, engine, get_db
from app.models import AdminLogin, AdminDetails, Role, SchoolDetails, SchoolLogin, LifeCoachDetails, LifeCoachLogin, MasterDropdownOption, TherapistDetails, TherapistLogin
from app.schemas import (
    AdminRegistrationRequest,
    AdminProfileResponse,
    AdminProfileUpdateRequest,
    AdminPasswordChangeRequest,
    AdminLoginRequest,
    SchoolCreate,
    SchoolResponse,
    SchoolLoginRequest,
    SchoolProfileUpdateRequest,
    SchoolPasswordChangeRequest,
    LifeCoachCreate,
    LifeCoachResponse,
    LifeCoachLoginRequest,
    LifeCoachProfileUpdateRequest,
    LifeCoachPasswordChangeRequest,
    DropdownOptionCreate,
    DropdownOptionResponse,
    SchoolTherapistInviteRequest,
    TherapistRegistrationRequest,
    TherapistResponse,
    TherapistLoginRequest,
    TherapistProfileUpdateRequest,
    TherapistPasswordChangeRequest,
    Token,
    PasswordHashRequest,
    PasswordHashResponse,
)
from app.config import settings
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    require_admin,
    generate_secure_password,
    oauth2_scheme,
)
from app.services.email_service import (
    send_school_credentials_email,
    send_life_coach_credentials_email,
    send_therapist_invite_email,
    send_therapist_approval_credentials_email,
)
from jose import JWTError, jwt


Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)
app = FastAPI(title="WTF Backend", version="1.0.0")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

logger = logging.getLogger("wtf.backend")
logging.basicConfig(level=logging.INFO)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a document or image file and return its accessible URL."""
    os.makedirs("uploads", exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    safe_name = f"doc_{uuid4().hex[:12]}.{ext}"
    filepath = os.path.join("uploads", safe_name)
    with open(filepath, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {
        "url": f"http://localhost:8000/uploads/{safe_name}",
        "filename": file.filename,
    }


@app.get("/.well-known/appspecific/com.chrome.devtools.json")
def chrome_devtools_manifest():
    """Serve a minimal manifest for Chrome DevTools app discovery to avoid 404 noise.

    Chrome sometimes requests this path when DevTools is open; returning a small
    JSON avoids repeated 404 log lines during development.
    """
    return JSONResponse({"name": "WTF DevTools", "frontend": "http://localhost:3000"})


@app.post("/admin/register", response_model=AdminProfileResponse)
def register_admin(payload: AdminRegistrationRequest, db: Session = Depends(get_db)):
    # 1. Ensure Role exists
    role = db.query(Role).filter(Role.role_name == payload.role_name).first()
    if not role:
        role = Role(role_name=payload.role_name, description=f"{payload.role_name} role")
        db.add(role)
        db.commit()
        db.refresh(role)

    # 2. Check if email already exists in admin_details or admin_login
    existing_detail = db.query(AdminDetails).filter(AdminDetails.email_id == payload.email_id).first()
    if existing_detail:
        raise HTTPException(status_code=400, detail="Admin already exists")

    # 3. Create AdminDetails
    admin_detail = AdminDetails(
        role_id=role.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email_id=payload.email_id,
        mobile_number=payload.mobile_number,
        is_live=True
    )
    db.add(admin_detail)
    db.commit()
    db.refresh(admin_detail)

    # 4. Create AdminLogin
    admin_login = AdminLogin(
        admin_id=admin_detail.id,
        email_id=payload.email_id,
        password_hash=hash_password(payload.password),
        is_active=True
    )
    db.add(admin_login)
    db.commit()

    # 5. Return profile
    return {
        "id": admin_detail.id,
        "first_name": admin_detail.first_name,
        "last_name": admin_detail.last_name,
        "email_id": admin_detail.email_id,
        "mobile_number": admin_detail.mobile_number,
        "role_name": role.role_name,
        "is_live": admin_detail.is_live,
        "is_active": admin_login.is_active,
        "is_locked": admin_login.is_locked,
    }


@app.post("/admin/login", response_model=Token)
async def login_admin(request: Request, db: Session = Depends(get_db)):
    """Authenticate admin.

    - If the request looks like a browser form (Accept includes text/html or content-type is form),
      return a tiny HTML page that navigates the browser to the frontend dashboard and includes the token.
    - Otherwise return JSON (API behavior) including optional `redirect_to` field.
    """
    content_type = request.headers.get('content-type', '')
    accept = request.headers.get('accept', '')

    if content_type.startswith('application/x-www-form-urlencoded') or content_type.startswith('multipart/form-data'):
        form = await request.form()
        email_id = form.get('email_id') or form.get('username') or form.get('email')
        password = form.get('password')
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        email_id = body.get('email_id') or body.get('email') or body.get('username')
        password = body.get('password')

    if not email_id or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='email_id and password are required')

    from sqlalchemy.orm import joinedload
    login_record = db.query(AdminLogin).options(
        joinedload(AdminLogin.admin).joinedload(AdminDetails.role)
    ).filter(AdminLogin.email_id == email_id).first()

    if not login_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    now = datetime.now(timezone.utc)
    
    locked_until = login_record.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and locked_until <= now:
        login_record.is_locked = False
        login_record.locked_until = None
        login_record.failed_login_attempts = 0
        db.commit()
        locked_until = None

    if login_record.is_locked and locked_until and locked_until > now:
        remaining_seconds = int((locked_until - now).total_seconds())
        minutes = max(1, (remaining_seconds + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked. Please retry after {minutes} minute(s).",
        )

    if not verify_password(password, login_record.password_hash):
        login_record.failed_login_attempts = (login_record.failed_login_attempts or 0) + 1
        if login_record.failed_login_attempts >= 5:
            login_record.is_locked = True
            login_record.locked_until = now + timedelta(minutes=1)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked for 1 minute due to too many failed attempts.",
            )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not login_record.is_active or login_record.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive or locked")

    if not login_record.admin.is_live:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin profile is not live")

    login_record.failed_login_attempts = 0
    login_record.locked_until = None
    login_record.is_locked = False
    login_record.last_login = now
    db.commit()

    token = create_access_token(subject=login_record.email_id, role=login_record.admin.role.role_name)

    # decide whether to redirect (browser) or return JSON (API)
    looks_like_browser = 'text/html' in accept or content_type.startswith('application/x-www-form-urlencoded') or content_type.startswith('multipart/form-data')

    if looks_like_browser:
        from urllib.parse import quote, urlparse

        origin = request.headers.get('origin')
        referer = request.headers.get('referer')
        target = '/admin/dashboard'

        # Prefer explicit FRONTEND_BASE_URL from settings for deterministic redirects
        from app.config import settings
        if settings.FRONTEND_BASE_URL:
            # ensure no trailing slash
            target = settings.FRONTEND_BASE_URL.rstrip('/') + '/admin/dashboard'
        else:
            # fall back to origin or referer-derived base
            if origin:
                target = origin.rstrip('/') + '/admin/dashboard'
            elif referer:
                parsed = urlparse(referer)
                base = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ''
                if base:
                    target = base.rstrip('/') + '/admin/dashboard'

        # append token as a query parameter so the frontend can pick it up across origins
        target_with_token = f"{target}?token={quote(token)}"

        # log debug info so we can diagnose browser redirect issues
        logger.info("/admin/login browser redirect: FRONTEND_BASE_URL=%s origin=%s referer=%s target=%s token_prefix=%s", settings.FRONTEND_BASE_URL, origin, referer, target, token[:8])

        # Return a tiny HTML page that performs a client-side navigation to the frontend
        # including the token as a query parameter. This is more reliable during dev
        # when redirects across origins or dev ports behave inconsistently.
        html = f"""
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Redirecting...</title>
            <meta http-equiv="refresh" content="0;url={target_with_token}" />
            <script>
              // If meta refresh is blocked, use JS navigation
              try {{ window.location.replace("{target_with_token}"); }} catch(e) {{ /* ignore */ }}
              // fallback: set location directly
              window.location.href = "{target_with_token}";
            </script>
          </head>
          <body>
            <p>Redirecting to dashboard… If you are not redirected, <a href="{target_with_token}">click here</a>.</p>
          </body>
        </html>
        """

        resp = HTMLResponse(content=html, status_code=200)
        # set cookie for backend origin as a convenience (not used by frontend on different origin)
        resp.set_cookie('wtf_token', token, httponly=False, samesite='lax', max_age=3600)
        return resp

    # API client: return JSON with optional redirect target
    return JSONResponse({"access_token": token, "token_type": "bearer", "redirect_to": "/admin/dashboard"})


@app.get("/admin/me", response_model=AdminProfileResponse)
def get_me(current_admin: AdminDetails = Depends(require_admin)):
    return {
        "id": current_admin.id,
        "first_name": current_admin.first_name,
        "last_name": current_admin.last_name,
        "email_id": current_admin.email_id,
        "mobile_number": current_admin.mobile_number,
        "role_name": current_admin.role.role_name,
        "is_live": current_admin.is_live,
        "is_active": current_admin.login.is_active,
        "is_locked": current_admin.login.is_locked,
    }


@app.get("/admin/account", response_model=AdminProfileResponse)
def get_admin_account(current_admin: AdminDetails = Depends(require_admin)):
    return {
        "id": current_admin.id,
        "first_name": current_admin.first_name,
        "last_name": current_admin.last_name,
        "email_id": current_admin.email_id,
        "mobile_number": current_admin.mobile_number,
        "role_name": current_admin.role.role_name,
        "is_live": current_admin.is_live,
        "is_active": current_admin.login.is_active,
        "is_locked": current_admin.login.is_locked,
    }


@app.put("/admin/account/profile", response_model=AdminProfileResponse)
def update_admin_profile(
    payload: AdminProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: AdminDetails = Depends(require_admin),
):
    if payload.first_name is not None:
        first_name = payload.first_name.strip()
        if not first_name:
            raise HTTPException(status_code=400, detail="First name is required")
        current_admin.first_name = first_name

    if payload.last_name is not None:
        last_name = payload.last_name.strip()
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name is required")
        current_admin.last_name = last_name

    if payload.mobile_number is not None:
        mobile_number = payload.mobile_number.strip()
        if mobile_number:
            duplicate_mobile = (
                db.query(AdminDetails)
                .filter(AdminDetails.mobile_number == mobile_number, AdminDetails.id != current_admin.id)
                .first()
            )
            if duplicate_mobile:
                raise HTTPException(status_code=400, detail="Mobile number already exists")
            current_admin.mobile_number = mobile_number
        else:
            current_admin.mobile_number = None

    db.commit()
    db.refresh(current_admin)

    return {
        "id": current_admin.id,
        "first_name": current_admin.first_name,
        "last_name": current_admin.last_name,
        "email_id": current_admin.email_id,
        "mobile_number": current_admin.mobile_number,
        "role_name": current_admin.role.role_name,
        "is_live": current_admin.is_live,
        "is_active": current_admin.login.is_active,
        "is_locked": current_admin.login.is_locked,
    }


@app.put("/admin/account/password")
def update_admin_password(
    payload: AdminPasswordChangeRequest,
    db: Session = Depends(get_db),
    current_admin: AdminDetails = Depends(require_admin),
):
    if not payload.current_password or not payload.new_password:
        raise HTTPException(status_code=400, detail="Current and new passwords are required")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")

    if not any(ch.isupper() for ch in payload.new_password):
        raise HTTPException(status_code=400, detail="New password must include at least one uppercase letter")

    if not any(ch.islower() for ch in payload.new_password):
        raise HTTPException(status_code=400, detail="New password must include at least one lowercase letter")

    if not any(ch.isdigit() for ch in payload.new_password):
        raise HTTPException(status_code=400, detail="New password must include at least one number")

    if not any(not ch.isalnum() for ch in payload.new_password):
        raise HTTPException(status_code=400, detail="New password must include at least one special character")

    login_record = db.query(AdminLogin).filter(AdminLogin.admin_id == current_admin.id).first()
    if not login_record:
        raise HTTPException(status_code=404, detail="Admin login record not found")

    if not verify_password(payload.current_password, login_record.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    login_record.password_hash = hash_password(payload.new_password)
    login_record.password_changed_at = datetime.now(timezone.utc)
    login_record.is_first_time_password_changed = True
    db.commit()

    return {"message": "Password updated successfully"}


@app.get("/schools", response_model=list[SchoolResponse])
def get_schools(db: Session = Depends(get_db), current_admin: AdminDetails = Depends(require_admin)):
    """Get all schools.
    
    - Requires admin authentication
    - Returns list of all schools
    """
    from sqlalchemy.orm import joinedload
    schools = db.query(SchoolDetails).options(joinedload(SchoolDetails.login)).order_by(SchoolDetails.created_at.desc()).all()
    results = []
    for s in schools:
        results.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "profile_url": s.profile_url,
            "type": s.type,
            "phone": s.phone,
            "established": s.established,
            "principal_name": s.principal_name,
            "principal_email": s.principal_email,
            "principal_phone": s.principal_phone,
            "is_live": s.is_live,
            "is_active": s.login.is_active if s.login else True,
            "is_locked": s.login.is_locked if s.login else False,
        })
    return results


@app.post("/schools", response_model=SchoolResponse)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db), current_admin: AdminDetails = Depends(require_admin)):
    """Create a new school account.
    
    - Validates school name and email
    - Checks if email already exists
    - Ensures Role(id=2, role_name="school") exists
    - Creates SchoolDetails and SchoolLogin records
    - Generates secure temporary password and hashes it
    - Sends login credentials via email
    """
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="School name is required")
    
    if not payload.email.strip():
        raise HTTPException(status_code=400, detail="School email is required")
    
    # Check if school email already exists
    existing = db.query(SchoolDetails).filter(SchoolDetails.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="School with this email already exists")

    # 1. Ensure school role exists (role_id = 2)
    school_role = db.query(Role).filter((Role.id == 2) | (Role.role_name == "school")).first()
    if not school_role:
        school_role = Role(id=2, role_name="school", description="School Role")
        db.add(school_role)
        db.commit()
        db.refresh(school_role)
    
    # 2. Create SchoolDetails record
    school = SchoolDetails(
        role_id=school_role.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        type=payload.type,
        established=payload.established,
        principal_name=payload.principal_name,
        principal_email=payload.principal_email,
        principal_phone=payload.principal_phone,
        is_live=True,
    )
    db.add(school)
    db.commit()
    db.refresh(school)

    # 3. Generate secure temporary password & create SchoolLogin
    temp_password = generate_secure_password(length=16)
    password_hash = hash_password(temp_password)

    school_login = SchoolLogin(
        school_id=school.id,
        email_id=payload.email,
        password_hash=password_hash,
        is_active=True,
        is_locked=False,
    )
    db.add(school_login)
    db.commit()
    db.refresh(school_login)

    # 4. Send email with login credentials
    email_sent = send_school_credentials_email(
        school_name=payload.name,
        school_email=payload.email,
        temporary_password=temp_password,
    )
    
    if not email_sent:
        logger.warning(f"Failed to send credentials email for school {school.id}, but account was created")
    
    return {
        "id": school.id,
        "name": school.name,
        "email": school.email,
        "profile_url": school.profile_url,
        "type": school.type,
        "phone": school.phone,
        "established": school.established,
        "principal_name": school.principal_name,
        "principal_email": school.principal_email,
        "principal_phone": school.principal_phone,
        "is_live": school.is_live,
        "is_active": school_login.is_active,
        "is_locked": school_login.is_locked,
    }


@app.delete("/schools/{school_id}")
def delete_school(school_id: int, db: Session = Depends(get_db), current_admin: AdminDetails = Depends(require_admin)):
    """Delete a school account."""
    school = db.query(SchoolDetails).filter(SchoolDetails.id == school_id).first()
    
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    db.delete(school)
    db.commit()
    
    logger.info(f"School {school_id} ({school.name}) deleted by admin {current_admin.email_id}")
    
    return {"message": f"School '{school.name}' deleted successfully"}


@app.post("/schools/login", response_model=Token)
def login_school(payload: SchoolLoginRequest, db: Session = Depends(get_db)):
    """School login endpoint with lockout timer and JWT generation."""
    from sqlalchemy.orm import joinedload
    login_record = db.query(SchoolLogin).options(
        joinedload(SchoolLogin.school).joinedload(SchoolDetails.role)
    ).filter(SchoolLogin.email_id == payload.email).first()

    if not login_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    now = datetime.now(timezone.utc)

    locked_until = login_record.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and locked_until <= now:
        login_record.is_locked = False
        login_record.locked_until = None
        login_record.failed_login_attempts = 0
        db.commit()
        locked_until = None

    if login_record.is_locked and locked_until and locked_until > now:
        remaining_seconds = int((locked_until - now).total_seconds())
        minutes = max(1, (remaining_seconds + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked. Please retry after {minutes} minute(s).",
        )

    if not verify_password(payload.password, login_record.password_hash):
        login_record.failed_login_attempts = (login_record.failed_login_attempts or 0) + 1
        if login_record.failed_login_attempts >= 5:
            login_record.is_locked = True
            login_record.locked_until = now + timedelta(minutes=1)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked for 1 minute due to too many failed attempts.",
            )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not login_record.is_active or login_record.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="School account is inactive or locked")

    if not login_record.school.is_live:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="School profile is not live")

    login_record.failed_login_attempts = 0
    login_record.locked_until = None
    login_record.is_locked = False
    login_record.last_login = now
    db.commit()

    access_token = create_access_token(subject=login_record.email_id, role="school")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "redirect_to": "/schools/dashboard",
    }


def get_current_school(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> SchoolDetails:
    """Get current school from token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str | None = payload.get("sub")
        role: str | None = payload.get("role")

        if email is None or role != "school":
            raise credentials_exception
    except Exception:
        raise credentials_exception

    from sqlalchemy.orm import joinedload
    login_record = db.query(SchoolLogin).options(
        joinedload(SchoolLogin.school)
    ).filter(SchoolLogin.email_id == email).first()

    if login_record is None or not login_record.is_active or login_record.is_locked:
        raise credentials_exception

    if not login_record.school.is_live:
        raise credentials_exception

    return login_record.school


@app.get("/schools/me", response_model=SchoolResponse)
def get_school_me(current_school: SchoolDetails = Depends(get_current_school)):
    """Get current school information."""
    return {
        "id": current_school.id,
        "name": current_school.name,
        "email": current_school.email,
        "profile_url": current_school.profile_url,
        "type": current_school.type,
        "phone": current_school.phone,
        "established": current_school.established,
        "principal_name": current_school.principal_name,
        "principal_email": current_school.principal_email,
        "principal_phone": current_school.principal_phone,
        "is_live": current_school.is_live,
        "is_active": current_school.login.is_active if current_school.login else True,
        "is_locked": current_school.login.is_locked if current_school.login else False,
    }


@app.put("/schools/me/profile", response_model=SchoolResponse)
def update_school_profile(
    payload: SchoolProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """Update current school profile information (email is not editable)."""
    if payload.name is not None:
        current_school.name = payload.name
    if payload.phone is not None:
        current_school.phone = payload.phone
    if payload.type is not None:
        current_school.type = payload.type
    if payload.established is not None:
        current_school.established = payload.established
    if payload.principal_name is not None:
        current_school.principal_name = payload.principal_name
    if payload.principal_email is not None:
        current_school.principal_email = payload.principal_email
    if payload.principal_phone is not None:
        current_school.principal_phone = payload.principal_phone

    # Also keep denormalized school fields in sync across all linked LifeCoachDetails
    coaches = db.query(LifeCoachDetails).filter(LifeCoachDetails.school_id == current_school.id).all()
    for coach in coaches:
        coach.school_name = current_school.name
        coach.school_email = current_school.email
        coach.school_phone = current_school.phone

    db.commit()
    db.refresh(current_school)

    return {
        "id": current_school.id,
        "name": current_school.name,
        "email": current_school.email,
        "profile_url": current_school.profile_url,
        "type": current_school.type,
        "phone": current_school.phone,
        "established": current_school.established,
        "principal_name": current_school.principal_name,
        "principal_email": current_school.principal_email,
        "principal_phone": current_school.principal_phone,
        "is_live": current_school.is_live,
        "is_active": current_school.login.is_active if current_school.login else True,
        "is_locked": current_school.login.is_locked if current_school.login else False,
    }


@app.put("/schools/me/password")
def change_school_password(
    payload: SchoolPasswordChangeRequest,
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """Change current school password."""
    if not current_school.login or not verify_password(payload.current_password, current_school.login.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters long")

    current_school.login.password_hash = hash_password(payload.new_password)
    current_school.login.is_first_time_password_changed = True
    current_school.login.password_changed_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password updated successfully"}


# ==========================================
# LIFE COACH ENDPOINTS & SECURITY DEPENDENCY
# ==========================================

def get_current_life_coach(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> LifeCoachDetails:
    """Dependency to get current authenticated life coach from JWT token."""
    from jose import JWTError, jwt
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role != "life_coach":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    login_record = db.query(LifeCoachLogin).filter(LifeCoachLogin.email_id == email).first()
    if not login_record or not login_record.life_coach:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Life coach account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not login_record.is_active or login_record.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Life coach account is inactive or locked",
        )

    return login_record.life_coach


@app.post("/life-coaches", response_model=LifeCoachResponse)
def create_life_coach(
    payload: LifeCoachCreate,
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """School adds a new Life Coach under their school account.
    
    - Validates life coach name and email
    - Ensures life coach email is unique
    - Links to current_school.id
    - Generates temporary password & sends credentials via SMTP email
    """
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Life coach name is required")
    if not payload.email.strip():
        raise HTTPException(status_code=400, detail="Life coach email is required")

    existing = db.query(LifeCoachDetails).filter(LifeCoachDetails.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A Life Coach with this email address already exists")

    life_coach_role = db.query(Role).filter(Role.id == 3).first()
    if not life_coach_role:
        life_coach_role = Role(id=3, role_name="life_coach", description="Life Coach Role")
        db.add(life_coach_role)
        db.commit()
        db.refresh(life_coach_role)

    coach = LifeCoachDetails(
        role_id=life_coach_role.id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone,
        gender=payload.gender,
        school_id=current_school.id,
        school_name=current_school.name,
        school_email=current_school.email,
        school_phone=current_school.phone,
        is_live=True,
    )
    db.add(coach)
    db.commit()
    db.refresh(coach)

    temp_password = generate_secure_password(length=16)
    password_hash = hash_password(temp_password)

    coach_login = LifeCoachLogin(
        life_coach_id=coach.id,
        email_id=coach.email,
        password_hash=password_hash,
        is_active=True,
        is_locked=False,
    )
    db.add(coach_login)
    db.commit()
    db.refresh(coach_login)

    # Send credential email mentioning school details & credentials
    email_sent = send_life_coach_credentials_email(
        coach_name=coach.name,
        coach_email=coach.email,
        school_name=current_school.name,
        school_email=current_school.email,
        temporary_password=temp_password,
    )
    if not email_sent:
        logger.warning(f"Failed to send credentials email for Life Coach {coach.id}")

    return {
        "id": coach.id,
        "role_id": coach.role_id,
        "name": coach.name,
        "email": coach.email,
        "profile_url": coach.profile_url,
        "phone": coach.phone,
        "gender": coach.gender,
        "school_id": coach.school_id,
        "school_name": coach.school_name,
        "school_email": coach.school_email,
        "school_phone": coach.school_phone,
        "is_live": coach.is_live,
        "is_active": coach_login.is_active,
        "is_locked": coach_login.is_locked,
    }


@app.get("/life-coaches", response_model=list[LifeCoachResponse])
def get_life_coaches(
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """Get list of Life Coaches belonging strictly to the current logged-in school."""
    coaches = db.query(LifeCoachDetails).filter(LifeCoachDetails.school_id == current_school.id).all()
    results = []
    for c in coaches:
        results.append({
            "id": c.id,
            "role_id": c.role_id,
            "name": c.name,
            "email": c.email,
            "profile_url": c.profile_url,
            "phone": c.phone,
            "gender": c.gender,
            "school_id": c.school_id,
            "school_name": c.school_name,
            "school_email": c.school_email,
            "school_phone": c.school_phone,
            "is_live": c.is_live,
            "is_active": c.login.is_active if c.login else True,
            "is_locked": c.login.is_locked if c.login else False,
        })
    return results


@app.delete("/life-coaches/{life_coach_id}")
def delete_life_coach(
    life_coach_id: int,
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """School deletes a Life Coach account under their management."""
    coach = db.query(LifeCoachDetails).filter(
        LifeCoachDetails.id == life_coach_id,
        LifeCoachDetails.school_id == current_school.id
    ).first()

    if not coach:
        raise HTTPException(status_code=404, detail="Life Coach not found or not authorized")

    db.delete(coach)
    db.commit()
    return {"detail": "Life Coach deleted successfully"}


@app.post("/life-coaches/login")
def life_coach_login(payload: LifeCoachLoginRequest, db: Session = Depends(get_db)):
    """Authenticate Life Coach credentials, enforcing 5-attempt lockout policy."""
    email_clean = payload.email.strip().lower()
    login_record = db.query(LifeCoachLogin).filter(LifeCoachLogin.email_id == email_clean).first()

    if not login_record or not login_record.life_coach:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    now = datetime.now(timezone.utc)
    locked_until = login_record.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and locked_until <= now:
        login_record.is_locked = False
        login_record.locked_until = None
        login_record.failed_login_attempts = 0
        db.commit()
        locked_until = None

    if login_record.is_locked and locked_until and locked_until > now:
        remaining_seconds = int((locked_until - now).total_seconds())
        minutes = max(1, (remaining_seconds + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked. Please retry after {minutes} minute(s).",
        )

    if not verify_password(payload.password, login_record.password_hash):
        login_record.failed_login_attempts = (login_record.failed_login_attempts or 0) + 1
        if login_record.failed_login_attempts >= 5:
            login_record.is_locked = True
            login_record.locked_until = now + timedelta(minutes=1)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked for 1 minute due to too many failed attempts.",
            )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not login_record.is_active or login_record.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Life coach account is inactive or locked")

    if not login_record.life_coach.is_live:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Life coach profile is not live")

    login_record.failed_login_attempts = 0
    login_record.locked_until = None
    login_record.is_locked = False
    login_record.last_login = now
    db.commit()

    access_token = create_access_token(subject=login_record.email_id, role="life_coach")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "redirect_to": "/lifecoach/dashboard",
    }


@app.get("/life-coaches/me", response_model=LifeCoachResponse)
def get_life_coach_me(current_coach: LifeCoachDetails = Depends(get_current_life_coach)):
    """Get logged in Life Coach profile details including affiliated school details."""
    school = current_coach.school
    return {
        "id": current_coach.id,
        "role_id": current_coach.role_id,
        "name": current_coach.name,
        "email": current_coach.email,
        "profile_url": current_coach.profile_url,
        "phone": current_coach.phone,
        "gender": current_coach.gender,
        "school_id": current_coach.school_id,
        "school_name": school.name if school else current_coach.school_name,
        "school_email": school.email if school else current_coach.school_email,
        "school_phone": school.phone if school else current_coach.school_phone,
        "school_type": school.type if school else None,
        "school_established": school.established if school else None,
        "principal_name": school.principal_name if school else None,
        "principal_email": school.principal_email if school else None,
        "principal_phone": school.principal_phone if school else None,
        "is_live": current_coach.is_live,
        "is_active": current_coach.login.is_active if current_coach.login else True,
        "is_locked": current_coach.login.is_locked if current_coach.login else False,
    }


@app.put("/life-coaches/me/profile", response_model=LifeCoachResponse)
def update_life_coach_profile(
    payload: LifeCoachProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_coach: LifeCoachDetails = Depends(get_current_life_coach),
):
    """Update profile details for current Life Coach (email remains read-only)."""
    if payload.name is not None and payload.name.strip():
        current_coach.name = payload.name.strip()
    if payload.phone is not None:
        current_coach.phone = payload.phone.strip()
    if payload.gender is not None:
        current_coach.gender = payload.gender.strip()

    db.commit()
    db.refresh(current_coach)

    school = current_coach.school
    return {
        "id": current_coach.id,
        "role_id": current_coach.role_id,
        "name": current_coach.name,
        "email": current_coach.email,
        "profile_url": current_coach.profile_url,
        "phone": current_coach.phone,
        "gender": current_coach.gender,
        "school_id": current_coach.school_id,
        "school_name": school.name if school else current_coach.school_name,
        "school_email": school.email if school else current_coach.school_email,
        "school_phone": school.phone if school else current_coach.school_phone,
        "school_type": school.type if school else None,
        "school_established": school.established if school else None,
        "principal_name": school.principal_name if school else None,
        "principal_email": school.principal_email if school else None,
        "principal_phone": school.principal_phone if school else None,
        "is_live": current_coach.is_live,
        "is_active": current_coach.login.is_active if current_coach.login else True,
        "is_locked": current_coach.login.is_locked if current_coach.login else False,
    }


@app.put("/life-coaches/me/password")
def change_life_coach_password(
    payload: LifeCoachPasswordChangeRequest,
    db: Session = Depends(get_db),
    current_coach: LifeCoachDetails = Depends(get_current_life_coach),
):
    """Change current Life Coach password."""
    if not current_coach.login or not verify_password(payload.current_password, current_coach.login.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters long")

    current_coach.login.password_hash = hash_password(payload.new_password)
    current_coach.login.is_first_time_password_changed = True
    current_coach.login.password_changed_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password updated successfully"}


@app.post("/utils/hash-password", response_model=PasswordHashResponse)
def utils_hash_password(payload: PasswordHashRequest):
    """Return bcrypt hash for a plaintext password (convenience/testing only)."""
    hashed = hash_password(payload.password)
    return {"hash": hashed}


# Helper: Get current therapist from JWT token
def get_current_therapist(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> TherapistDetails:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate therapist credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role != "therapist":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    therapist = db.query(TherapistDetails).join(TherapistLogin).filter(
        TherapistLogin.email_id == email,
        TherapistLogin.is_active == True,
    ).first()

    if therapist is None:
        raise credentials_exception

    return therapist


# ==========================================
# MASTER DROPDOWN OPTIONS ENDPOINTS
# ==========================================
@app.get("/master-dropdowns/{category}", response_model=List[DropdownOptionResponse])
def get_master_dropdown_options(category: str, db: Session = Depends(get_db)):
    """Get active master dropdown options for a specific category."""
    options = db.query(MasterDropdownOption).filter(
        MasterDropdownOption.category == category,
        MasterDropdownOption.is_active == True,
    ).all()
    return options


@app.post("/admin/master-dropdowns", response_model=DropdownOptionResponse)
def create_master_dropdown_option(
    payload: DropdownOptionCreate,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin adds a new option to a master dropdown category."""
    category_clean = payload.category.strip().lower()
    val_clean = payload.value.strip()

    if not val_clean:
        raise HTTPException(status_code=400, detail="Option value cannot be empty")

    existing = db.query(MasterDropdownOption).filter(
        MasterDropdownOption.category == category_clean,
        MasterDropdownOption.value == val_clean,
    ).first()

    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
        return existing

    new_opt = MasterDropdownOption(
        category=category_clean,
        value=val_clean,
        is_active=True,
    )
    db.add(new_opt)
    db.commit()
    db.refresh(new_opt)
    return new_opt


@app.delete("/admin/master-dropdowns/{option_id}")
def delete_master_dropdown_option(
    option_id: int,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin removes a master dropdown option."""
    opt = db.query(MasterDropdownOption).filter(MasterDropdownOption.id == option_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Dropdown option not found")

    opt.is_active = False
    db.commit()
    return {"detail": "Option removed successfully"}


# ==========================================
# SCHOOL THERAPIST INVITATION & LIST ENDPOINTS
# ==========================================
@app.post("/schools/therapists/invite")
def invite_therapist_by_school(
    payload: SchoolTherapistInviteRequest,
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """School invites a Therapist by email, creating a pending profile record and sending invitation URL."""
    email_clean = payload.email.strip().lower()

    existing = db.query(TherapistDetails).filter(TherapistDetails.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Therapist with email {email_clean} already registered or invited.")

    first_name = payload.first_name.strip() if payload.first_name else ""
    last_name = payload.last_name.strip() if payload.last_name else ""

    if not first_name and payload.name and payload.name.strip():
        parts = payload.name.strip().split(" ", 1)
        first_name = parts[0]
        if len(parts) > 1:
            last_name = parts[1]

    if not first_name:
        first_name = "Therapist"
    if not last_name:
        last_name = "Invited"

    therapist = TherapistDetails(
        role_id=4,
        first_name=first_name,
        last_name=last_name,
        email=email_clean,
        is_school_associated=True,
        school_id=current_school.id,
        school_name=current_school.name,
        school_email=current_school.email,
        school_phone=current_school.phone,
        approval_status="pending",
        is_live=True,
    )
    db.add(therapist)
    db.commit()
    db.refresh(therapist)

    register_url = f"http://localhost:3000/therapist/register?invite_id={therapist.id}"
    send_therapist_invite_email(
        therapist_name=f"{therapist.first_name} {therapist.last_name}",
        therapist_email=therapist.email,
        school_name=current_school.name,
        school_email=current_school.email,
        register_url=register_url,
    )

    return {
        "id": therapist.id,
        "first_name": therapist.first_name,
        "last_name": therapist.last_name,
        "email": therapist.email,
        "school_id": therapist.school_id,
        "school_name": therapist.school_name,
        "approval_status": therapist.approval_status,
        "register_url": register_url,
    }


@app.get("/schools/therapists")
def get_school_therapists(
    db: Session = Depends(get_db),
    current_school: SchoolDetails = Depends(get_current_school),
):
    """School gets list of therapists associated with their school."""
    therapists = db.query(TherapistDetails).filter(
        TherapistDetails.school_id == current_school.id
    ).all()

    results = []
    for t in therapists:
        results.append({
            "id": t.id,
            "role_id": t.role_id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "email": t.email,
            "phone": t.phone,
            "gender": t.gender,
            "professional_title": t.professional_title,
            "therapist_type": t.therapist_type,
            "is_school_associated": t.is_school_associated,
            "school_id": t.school_id,
            "school_name": t.school_name,
            "approval_status": t.approval_status,
            "is_live": t.is_live,
            "is_active": t.login.is_active if t.login else False,
        })
    return results


# ==========================================
# PUBLIC THERAPIST REGISTRATION ENDPOINTS
# ==========================================
@app.get("/therapists/invite-info/{invite_id}")
def get_therapist_invite_info(invite_id: int, db: Session = Depends(get_db)):
    """Fetch therapist invitation details for registration form pre-filling."""
    therapist = db.query(TherapistDetails).filter(TherapistDetails.id == invite_id).first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return {
        "id": therapist.id,
        "first_name": therapist.first_name,
        "last_name": therapist.last_name,
        "email": therapist.email,
        "is_school_associated": therapist.is_school_associated,
        "school_id": therapist.school_id,
        "school_name": therapist.school_name,
        "school_email": therapist.school_email,
        "school_phone": therapist.school_phone,
    }


@app.post("/therapists/register")
def register_therapist(payload: TherapistRegistrationRequest, db: Session = Depends(get_db)):
    """Therapist submits full registration details (both individual and school-associated)."""
    email_clean = payload.email.strip().lower()
    existing = db.query(TherapistDetails).filter(TherapistDetails.email == email_clean).first()

    if existing:
        therapist = existing
    else:
        therapist = TherapistDetails(
            role_id=4,
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            email=email_clean,
        )
        db.add(therapist)

    # Basic Details
    therapist.first_name = payload.first_name.strip()
    therapist.last_name = payload.last_name.strip()
    raw_phone = payload.mobile_number or payload.phone
    therapist.phone = raw_phone.strip() if raw_phone else None
    therapist.gender = payload.gender
    therapist.date_of_birth = payload.date_of_birth
    therapist.address_line_1 = payload.address_line_1
    therapist.address_line_2 = payload.address_line_2
    therapist.city = payload.city
    therapist.state = payload.state
    therapist.postal_code = payload.postal_code
    therapist.country = payload.country

    # Professional Info
    therapist.professional_title = payload.professional_title
    therapist.therapist_type = payload.therapist_type
    therapist.professional_biography = payload.bio or payload.professional_biography
    therapist.years_of_experience = str(payload.years_of_experience) if payload.years_of_experience is not None else None
    therapist.primary_specialization = payload.primary_specialization
    therapist.additional_specialization = payload.additional_specializations or payload.additional_specialization
    therapist.language_spoken = payload.languages_spoken or payload.language_spoken

    # School Association
    is_school_assoc = payload.is_associated_with_school if payload.is_associated_with_school is not None else payload.is_school_associated
    therapist.is_school_associated = bool(is_school_assoc)
    if is_school_assoc:
        therapist.school_id = payload.school_id
        therapist.school_name = payload.school_name
        therapist.school_email = payload.school_email
        therapist.school_phone = payload.school_phone
    else:
        therapist.school_id = None
        therapist.school_name = None
        therapist.school_email = None
        therapist.school_phone = None

    # License
    therapist.license_type = payload.license_type
    therapist.license_number = payload.license_number
    therapist.licensing_state = payload.licensing_state
    therapist.license_issued_date = payload.license_issued_date
    therapist.license_expiration_date = payload.license_expiration_date
    therapist.license_document_url = payload.license_document_url

    # NPI
    has_npi_val = bool(payload.has_npi)
    therapist.has_npi = has_npi_val
    therapist.npi_number = payload.npi_number if has_npi_val else None
    therapist.npi_type = payload.npi_type if has_npi_val else None
    therapist.provider_taxonomy = payload.provider_taxonomy if has_npi_val else None

    # Education
    therapist.highest_qualification = payload.highest_qualification
    therapist.degree_name = payload.degree_name
    therapist.field_of_study = payload.field_of_study
    therapist.university_institution = payload.university_name or payload.university_institution
    therapist.graduation_year = payload.graduation_year
    therapist.degree_document_url = payload.degree_document_url

    # Insurance & Billing
    accepts_ins_val = bool(payload.accepts_insurance)
    therapist.accepts_insurance = accepts_ins_val
    import json
    ins_raw = payload.insurance_providers or payload.insurance_types
    if isinstance(ins_raw, list):
        therapist.insurance_types = json.dumps(ins_raw)
    elif isinstance(ins_raw, str):
        therapist.insurance_types = ins_raw
    else:
        therapist.insurance_types = None
    therapist.accepts_online_payment = bool(payload.accepts_online_payment)
    has_ehr_val = bool(payload.has_ehr_system if payload.has_ehr_system is not None else payload.has_ehr)
    therapist.has_ehr = has_ehr_val
    therapist.ehr_vendor = (payload.ehr_vendor_name or payload.ehr_vendor) if has_ehr_val else None
    therapist.ehr_product_name = payload.ehr_product_name if has_ehr_val else None

    # HIPAA & Compliance
    therapist.handles_phi = bool(payload.handles_phi)
    hipaa_val = bool(payload.hipaa_training_completed)
    therapist.hipaa_training_completed = hipaa_val
    therapist.hipaa_training_completion_date = (payload.hipaa_completion_date or payload.hipaa_training_completion_date) if hipaa_val else None
    malpractice_val = bool(payload.malpractice_insurance_available)
    therapist.malpractice_insurance_available = malpractice_val
    therapist.malpractice_insurance_expiration_date = (payload.malpractice_expiration_date or payload.malpractice_insurance_expiration_date) if malpractice_val else None
    therapist.malpractice_document_url = payload.malpractice_document_url

    therapist.approval_status = "pending"
    therapist.is_live = True

    db.commit()
    db.refresh(therapist)

    return {
        "id": therapist.id,
        "first_name": therapist.first_name,
        "last_name": therapist.last_name,
        "email": therapist.email,
        "approval_status": therapist.approval_status,
        "detail": "Therapist registration submitted successfully and pending Admin approval.",
    }


# ==========================================
# ADMIN THERAPIST MANAGEMENT & APPROVAL ENDPOINTS
# ==========================================
@app.get("/admin/therapists")
def get_admin_therapists(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin lists therapist applications, optionally filtered by approval status."""
    query = db.query(TherapistDetails)
    if status:
        query = query.filter(TherapistDetails.approval_status == status.strip().lower())

    therapists = query.order_by(TherapistDetails.created_at.desc()).all()

    import json
    results = []
    for t in therapists:
        insurance_arr = []
        if t.insurance_types:
            try:
                insurance_arr = json.loads(t.insurance_types)
            except Exception:
                insurance_arr = []

        results.append({
            "id": t.id,
            "role_id": t.role_id,
            "first_name": t.first_name,
            "last_name": t.last_name,
            "profile_url": t.profile_url,
            "email": t.email,
            "phone": t.phone,
            "gender": t.gender,
            "date_of_birth": t.date_of_birth,
            "address_line_1": t.address_line_1,
            "address_line_2": t.address_line_2,
            "city": t.city,
            "state": t.state,
            "postal_code": t.postal_code,
            "country": t.country,
            # Professional
            "professional_title": t.professional_title,
            "therapist_type": t.therapist_type,
            "professional_biography": t.professional_biography,
            "years_of_experience": t.years_of_experience,
            "primary_specialization": t.primary_specialization,
            "additional_specialization": t.additional_specialization,
            "language_spoken": t.language_spoken,
            # School
            "is_school_associated": t.is_school_associated,
            "school_id": t.school_id,
            "school_name": t.school_name,
            "school_email": t.school_email,
            "school_phone": t.school_phone,
            # License
            "license_type": t.license_type,
            "license_number": t.license_number,
            "licensing_state": t.licensing_state,
            "license_issued_date": t.license_issued_date,
            "license_expiration_date": t.license_expiration_date,
            "license_document_url": t.license_document_url,
            # NPI
            "has_npi": t.has_npi,
            "npi_number": t.npi_number,
            "npi_type": t.npi_type,
            "provider_taxonomy": t.provider_taxonomy,
            # Education
            "highest_qualification": t.highest_qualification,
            "degree_name": t.degree_name,
            "field_of_study": t.field_of_study,
            "university_institution": t.university_institution,
            "graduation_year": t.graduation_year,
            "degree_document_url": t.degree_document_url,
            # Insurance & Billing
            "accepts_insurance": t.accepts_insurance,
            "insurance_types": insurance_arr,
            "accepts_online_payment": t.accepts_online_payment,
            "has_ehr": t.has_ehr,
            "ehr_vendor": t.ehr_vendor,
            "ehr_product_name": t.ehr_product_name,
            # HIPAA
            "handles_phi": t.handles_phi,
            "hipaa_training_completed": t.hipaa_training_completed,
            "hipaa_training_completion_date": t.hipaa_training_completion_date,
            "malpractice_insurance_available": t.malpractice_insurance_available,
            "malpractice_insurance_expiration_date": t.malpractice_insurance_expiration_date,
            "malpractice_document_url": t.malpractice_document_url,
            # Status
            "approval_status": t.approval_status,
            "is_live": t.is_live,
            "is_active": t.login.is_active if t.login else False,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return results


@app.post("/admin/therapists/{therapist_id}/approve")
def approve_therapist(
    therapist_id: int,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin approves therapist, creating/updating login credentials and dispatching approval email."""
    therapist = db.query(TherapistDetails).filter(TherapistDetails.id == therapist_id).first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    therapist.approval_status = "approved"

    temp_password = generate_secure_password(12)
    pwd_hash = hash_password(temp_password)

    if therapist.login:
        therapist.login.password_hash = pwd_hash
        therapist.login.is_active = True
        therapist.login.is_locked = False
        therapist.login.failed_login_attempts = 0
    else:
        therapist_login = TherapistLogin(
            therapist_id=therapist.id,
            email_id=therapist.email,
            password_hash=pwd_hash,
            is_active=True,
            is_locked=False,
        )
        db.add(therapist_login)

    db.commit()

    send_therapist_approval_credentials_email(
        therapist_name=f"{therapist.first_name} {therapist.last_name}",
        therapist_email=therapist.email,
        temporary_password=temp_password,
        login_url="http://localhost:3000/therapist/login",
    )

    return {
        "id": therapist.id,
        "approval_status": "approved",
        "detail": f"Therapist {therapist.first_name} {therapist.last_name} approved successfully. Login credentials sent to {therapist.email}.",
    }


@app.post("/admin/therapists/{therapist_id}/reject")
def reject_therapist(
    therapist_id: int,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin rejects therapist application."""
    therapist = db.query(TherapistDetails).filter(TherapistDetails.id == therapist_id).first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    therapist.approval_status = "rejected"
    if therapist.login:
        therapist.login.is_active = False
    db.commit()

    return {
        "id": therapist.id,
        "approval_status": "rejected",
        "detail": f"Therapist application for {therapist.first_name} {therapist.last_name} rejected.",
    }


@app.delete("/admin/therapists/{therapist_id}")
def delete_therapist(
    therapist_id: int,
    db: Session = Depends(get_db),
    admin: AdminDetails = Depends(require_admin),
):
    """Admin deletes a therapist profile and associated login."""
    therapist = db.query(TherapistDetails).filter(TherapistDetails.id == therapist_id).first()
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found")

    if therapist.login:
        db.delete(therapist.login)

    db.delete(therapist)
    db.commit()

    return {"detail": f"Therapist #{therapist_id} deleted successfully"}


@app.delete("/schools/therapists/{therapist_id}")
def delete_school_therapist(
    therapist_id: int,
    db: Session = Depends(get_db),
    school: SchoolDetails = Depends(get_current_school),
):
    """School deletes an affiliated therapist."""
    therapist = (
        db.query(TherapistDetails)
        .filter(TherapistDetails.id == therapist_id, TherapistDetails.school_id == school.id)
        .first()
    )
    if not therapist:
        raise HTTPException(status_code=404, detail="Therapist not found or not affiliated with your school")

    if therapist.login:
        db.delete(therapist.login)

    db.delete(therapist)
    db.commit()

    return {"detail": f"Therapist #{therapist_id} removed successfully"}


# ==========================================
# THERAPIST LOGIN & PORTAL WORKSPACE ENDPOINTS
# ==========================================
@app.post("/therapists/login")
def therapist_login(payload: TherapistLoginRequest, db: Session = Depends(get_db)):
    """Authenticate Therapist credentials, enforcing 5-attempt lockout policy."""
    email_clean = payload.email.strip().lower()
    login_record = db.query(TherapistLogin).filter(TherapistLogin.email_id == email_clean).first()

    if not login_record or not login_record.therapist:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if login_record.therapist.approval_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your therapist account has not been approved by the Administrator yet.",
        )

    now = datetime.now(timezone.utc)
    locked_until = login_record.locked_until
    if locked_until and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)

    if locked_until and locked_until <= now:
        login_record.is_locked = False
        login_record.locked_until = None
        login_record.failed_login_attempts = 0
        db.commit()
        locked_until = None

    if login_record.is_locked and locked_until and locked_until > now:
        remaining_seconds = int((locked_until - now).total_seconds())
        minutes = max(1, (remaining_seconds + 59) // 60)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked. Please retry after {minutes} minute(s).",
        )

    if not verify_password(payload.password, login_record.password_hash):
        login_record.failed_login_attempts = (login_record.failed_login_attempts or 0) + 1
        if login_record.failed_login_attempts >= 5:
            login_record.is_locked = True
            login_record.locked_until = now + timedelta(minutes=1)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account temporarily locked for 1 minute due to too many failed attempts.",
            )
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not login_record.is_active or login_record.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Therapist account is inactive or locked")

    login_record.failed_login_attempts = 0
    login_record.locked_until = None
    login_record.is_locked = False
    login_record.last_login = now
    db.commit()

    access_token = create_access_token(subject=login_record.email_id, role="therapist")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "redirect_to": "/therapist/dashboard",
    }


@app.get("/therapists/me")
def get_therapist_me(current_therapist: TherapistDetails = Depends(get_current_therapist)):
    """Get logged in Therapist profile details."""
    import json
    insurance_arr = []
    if current_therapist.insurance_types:
        try:
            insurance_arr = json.loads(current_therapist.insurance_types)
        except Exception:
            insurance_arr = []

    return {
        "id": current_therapist.id,
        "role_id": current_therapist.role_id,
        "first_name": current_therapist.first_name,
        "last_name": current_therapist.last_name,
        "profile_url": current_therapist.profile_url,
        "email": current_therapist.email,
        "phone": current_therapist.phone,
        "gender": current_therapist.gender,
        "date_of_birth": current_therapist.date_of_birth,
        "address_line_1": current_therapist.address_line_1,
        "address_line_2": current_therapist.address_line_2,
        "city": current_therapist.city,
        "state": current_therapist.state,
        "postal_code": current_therapist.postal_code,
        "country": current_therapist.country,
        # Professional
        "professional_title": current_therapist.professional_title,
        "therapist_type": current_therapist.therapist_type,
        "professional_biography": current_therapist.professional_biography,
        "years_of_experience": current_therapist.years_of_experience,
        "primary_specialization": current_therapist.primary_specialization,
        "additional_specialization": current_therapist.additional_specialization,
        "language_spoken": current_therapist.language_spoken,
        # School
        "is_school_associated": current_therapist.is_school_associated,
        "school_id": current_therapist.school_id,
        "school_name": current_therapist.school_name,
        "school_email": current_therapist.school_email,
        "school_phone": current_therapist.school_phone,
        # License
        "license_type": current_therapist.license_type,
        "license_number": current_therapist.license_number,
        "licensing_state": current_therapist.licensing_state,
        "license_issued_date": current_therapist.license_issued_date,
        "license_expiration_date": current_therapist.license_expiration_date,
        "license_document_url": current_therapist.license_document_url,
        # NPI
        "has_npi": current_therapist.has_npi,
        "npi_number": current_therapist.npi_number,
        "npi_type": current_therapist.npi_type,
        "provider_taxonomy": current_therapist.provider_taxonomy,
        # Education
        "highest_qualification": current_therapist.highest_qualification,
        "degree_name": current_therapist.degree_name,
        "field_of_study": current_therapist.field_of_study,
        "university_institution": current_therapist.university_institution,
        "graduation_year": current_therapist.graduation_year,
        "degree_document_url": current_therapist.degree_document_url,
        # Insurance
        "accepts_insurance": current_therapist.accepts_insurance,
        "insurance_types": insurance_arr,
        "accepts_online_payment": current_therapist.accepts_online_payment,
        "has_ehr": current_therapist.has_ehr,
        "ehr_vendor": current_therapist.ehr_vendor,
        "ehr_product_name": current_therapist.ehr_product_name,
        # HIPAA
        "handles_phi": current_therapist.handles_phi,
        "hipaa_training_completed": current_therapist.hipaa_training_completed,
        "hipaa_training_completion_date": current_therapist.hipaa_training_completion_date,
        "malpractice_insurance_available": current_therapist.malpractice_insurance_available,
        "malpractice_insurance_expiration_date": current_therapist.malpractice_insurance_expiration_date,
        "malpractice_document_url": current_therapist.malpractice_document_url,
        # Status
        "approval_status": current_therapist.approval_status,
        "is_live": current_therapist.is_live,
        "is_active": current_therapist.login.is_active if current_therapist.login else True,
    }


@app.put("/therapists/me/profile")
def update_therapist_profile(
    payload: TherapistProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_therapist: TherapistDetails = Depends(get_current_therapist),
):
    """Update profile details for current Therapist."""
    if payload.first_name is not None and payload.first_name.strip():
        current_therapist.first_name = payload.first_name.strip()
    if payload.last_name is not None and payload.last_name.strip():
        current_therapist.last_name = payload.last_name.strip()
    if payload.phone is not None:
        current_therapist.phone = payload.phone.strip()
    if payload.gender is not None:
        current_therapist.gender = payload.gender
    if payload.date_of_birth is not None:
        current_therapist.date_of_birth = payload.date_of_birth
    if payload.address_line_1 is not None:
        current_therapist.address_line_1 = payload.address_line_1
    if payload.address_line_2 is not None:
        current_therapist.address_line_2 = payload.address_line_2
    if payload.city is not None:
        current_therapist.city = payload.city
    if payload.state is not None:
        current_therapist.state = payload.state
    if payload.postal_code is not None:
        current_therapist.postal_code = payload.postal_code
    if payload.country is not None:
        current_therapist.country = payload.country

    if payload.professional_title is not None:
        current_therapist.professional_title = payload.professional_title
    if payload.therapist_type is not None:
        current_therapist.therapist_type = payload.therapist_type
    if payload.professional_biography is not None:
        current_therapist.professional_biography = payload.professional_biography
    if payload.years_of_experience is not None:
        current_therapist.years_of_experience = payload.years_of_experience
    if payload.primary_specialization is not None:
        current_therapist.primary_specialization = payload.primary_specialization
    if payload.additional_specialization is not None:
        current_therapist.additional_specialization = payload.additional_specialization
    if payload.language_spoken is not None:
        current_therapist.language_spoken = payload.language_spoken

    db.commit()
    db.refresh(current_therapist)

    return get_therapist_me(current_therapist)


@app.put("/therapists/me/password")
def change_therapist_password(
    payload: TherapistPasswordChangeRequest,
    db: Session = Depends(get_db),
    current_therapist: TherapistDetails = Depends(get_current_therapist),
):
    """Change current Therapist password."""
    if not current_therapist.login or not verify_password(payload.current_password, current_therapist.login.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters long")

    current_therapist.login.password_hash = hash_password(payload.new_password)
    current_therapist.login.is_first_time_password_changed = True
    current_therapist.login.password_changed_at = datetime.now(timezone.utc)
    db.commit()

    return {"detail": "Password updated successfully"}

