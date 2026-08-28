import os
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import AdminDetails, AdminLogin, Role
from app.security import hash_password

TEST_DATABASE_URL = "sqlite:///./test_admin_lockout.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        role = Role(id=1, role_name="admin", description="admin role")
        db.add(role)
        db.commit()

        admin = AdminDetails(
            id=1,
            role_id=1,
            first_name="Test",
            last_name="User",
            email_id="lockout@test.com",
            mobile_number="1234567890",
            is_live=True,
        )
        db.add(admin)
        db.commit()

        db.add(
            AdminLogin(
                id=1,
                admin_id=1,
                email_id="lockout@test.com",
                password_hash=hash_password("StrongPass!1"),
                is_active=True,
                is_locked=False,
                failed_login_attempts=0,
                locked_until=None,
            )
        )
        db.commit()
    finally:
        db.close()

    yield

    app.dependency_overrides.clear()
    engine.dispose()
    if os.path.exists("./test_admin_lockout.db"):
        try:
            os.remove("./test_admin_lockout.db")
        except Exception:
            pass


def test_admin_login_locks_after_five_failed_attempts():
    client = TestClient(app)

    for _ in range(4):
        resp = client.post("/admin/login", json={"email_id": "lockout@test.com", "password": "WrongPass!2"})
        assert resp.status_code == 401

    locked_resp = client.post("/admin/login", json={"email_id": "lockout@test.com", "password": "WrongPass!2"})
    assert locked_resp.status_code == 403
    assert "locked" in locked_resp.json()["detail"].lower()

    db = TestingSessionLocal()
    try:
        login_record = db.query(AdminLogin).filter(AdminLogin.email_id == "lockout@test.com").first()
        assert login_record is not None
        assert login_record.is_locked is True
        assert login_record.failed_login_attempts >= 5
        locked_until = login_record.locked_until
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        assert locked_until > datetime.now(timezone.utc)
    finally:
        db.close()
