import os
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite:///./test_admin_lockout.db"

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import AdminDetails, AdminLogin, Role
from app.security import hash_password


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        role = Role(id=1, role_name="admin", description="admin role")
        db.add(role)
        db.commit()
        db.refresh(role)

        admin = AdminDetails(
            id=1,
            role_id=role.id,
            first_name="Test",
            last_name="User",
            email_id="lockout@test.com",
            mobile_number="1234567890",
            is_live=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        db.add(
            AdminLogin(
                id=1,
                admin_id=admin.id,
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


def test_admin_login_locks_after_five_failed_attempts():
    client = TestClient(app)

    for _ in range(4):
        resp = client.post("/admin/login", json={"email_id": "lockout@test.com", "password": "WrongPass!2"})
        assert resp.status_code == 401

    locked_resp = client.post("/admin/login", json={"email_id": "lockout@test.com", "password": "WrongPass!2"})
    assert locked_resp.status_code == 403
    assert "locked" in locked_resp.json()["detail"].lower()

    db = SessionLocal()
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
