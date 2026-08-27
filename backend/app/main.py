from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse, HTMLResponse
import logging
from datetime import datetime, timezone, timedelta
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from uuid import uuid4

from app.database import Base, engine, get_db
from app.models import AdminLogin, AdminDetails, Role, SchoolDetails, SchoolLogin, LifeCoachDetails, LifeCoachLogin
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
from app.services.email_service import send_school_credentials_email, send_life_coach_credentials_email


Base.metadata.create_all(bind=engine)


app = FastAPI(title="WTF Backend", version="1.0.0")

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
