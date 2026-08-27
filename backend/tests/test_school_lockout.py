import os
from datetime import datetime, timezone

os.environ["DATABASE_URL"] = "sqlite:///./test_school_lockout.db"

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Role, SchoolDetails, SchoolLogin
from app.security import hash_password


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        role = Role(id=2, role_name="school", description="school role")
        db.add(role)
        db.commit()
        db.refresh(role)

        school = SchoolDetails(
            id=1,
            role_id=role.id,
            name="Test School",
            email="school@test.com",
            is_live=True,
        )
        db.add(school)
        db.commit()
        db.refresh(school)

        db.add(
            SchoolLogin(
                id=1,
                school_id=school.id,
                email_id="school@test.com",
                password_hash=hash_password("SchoolPass!1"),
                is_active=True,
                is_locked=False,
                failed_login_attempts=0,
                locked_until=None,
            )
        )
        db.commit()
    finally:
        db.close()


def test_school_login_locks_after_five_failed_attempts():
    client = TestClient(app)

    for _ in range(4):
        resp = client.post("/schools/login", json={"email": "school@test.com", "password": "WrongPass!2"})
        assert resp.status_code == 401

    locked_resp = client.post("/schools/login", json={"email": "school@test.com", "password": "WrongPass!2"})
    assert locked_resp.status_code == 403
    assert "locked" in locked_resp.json()["detail"].lower()

    db = SessionLocal()
    try:
        login_record = db.query(SchoolLogin).filter(SchoolLogin.email_id == "school@test.com").first()
        assert login_record is not None
        assert login_record.is_locked is True
        assert login_record.failed_login_attempts >= 5
        locked_until = login_record.locked_until
        if locked_until and locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        assert locked_until > datetime.now(timezone.utc)
    finally:
        db.close()
