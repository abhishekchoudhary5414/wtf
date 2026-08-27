from datetime import datetime, timedelta
from typing import Any
import secrets
import string

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AdminLogin, AdminDetails
from sqlalchemy.orm import joinedload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def generate_secure_password(length: int = 16) -> str:
    """Generate a secure random password.
    
    Args:
        length: Length of the generated password (default: 16)
        
    Returns:
        A secure random password string
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(length))


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminDetails:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email_id: Any = payload.get("sub")
        role: Any = payload.get("role")

        if email_id is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    login_record = db.query(AdminLogin).options(
        joinedload(AdminLogin.admin).joinedload(AdminDetails.role)
    ).filter(AdminLogin.email_id == email_id).first()
    
    if login_record is None or not login_record.is_active or login_record.is_locked:
        raise credentials_exception

    return login_record.admin


def require_admin(current_user: AdminDetails = Depends(get_current_admin)) -> AdminDetails:
    if not current_user.is_live:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
