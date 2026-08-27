from sqlalchemy import Boolean, String, Text, DateTime, func, BigInteger, SmallInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from datetime import datetime

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class AdminDetails(Base):
    __tablename__ = "admin_details"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    email_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    profile_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    role: Mapped["Role"] = relationship()
    login: Mapped["AdminLogin"] = relationship(back_populates="admin", cascade="all, delete-orphan")


class AdminLogin(Base):
    __tablename__ = "admin_login"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("admin_details.id", ondelete="CASCADE"), nullable=False, unique=True)
    email_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_first_time_password_changed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    admin: Mapped["AdminDetails"] = relationship(back_populates="login")


class SchoolDetails(Base):
    __tablename__ = "school_details"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    established: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    principal_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    principal_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    principal_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    role: Mapped["Role"] = relationship()
    login: Mapped["SchoolLogin"] = relationship(back_populates="school", cascade="all, delete-orphan")


class SchoolLogin(Base):
    __tablename__ = "school_login"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    school_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("school_details.id", ondelete="CASCADE"), nullable=False, unique=True)
    email_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_first_time_password_changed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    school: Mapped["SchoolDetails"] = relationship(back_populates="login")


class LifeCoachDetails(Base):
    __tablename__ = "life_coach_details"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, default=3, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    profile_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    school_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("school_details.id", ondelete="CASCADE"), nullable=False, index=True)
    school_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    school_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    school_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    role: Mapped["Role"] = relationship()
    school: Mapped["SchoolDetails"] = relationship()
    login: Mapped["LifeCoachLogin"] = relationship(back_populates="life_coach", cascade="all, delete-orphan")


class LifeCoachLogin(Base):
    __tablename__ = "life_coach_login"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    life_coach_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("life_coach_details.id", ondelete="CASCADE"), nullable=False, unique=True)
    email_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    failed_login_attempts: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_first_time_password_changed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    life_coach: Mapped["LifeCoachDetails"] = relationship(back_populates="login")
