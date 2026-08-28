import os
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Role, SchoolDetails, SchoolLogin, LifeCoachDetails, LifeCoachLogin
from app.security import hash_password, create_access_token

TEST_DATABASE_URL = "sqlite:///./test_lifecoach.db"
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
        role_school = Role(id=2, role_name="school", description="school role")
        role_coach = Role(id=3, role_name="life_coach", description="life coach role")
        db.add_all([role_school, role_coach])
        db.commit()

        # School A
        school_a = SchoolDetails(id=1, role_id=2, name="School Alpha", email="alpha@school.com", is_live=True)
        db.add(school_a)
        db.commit()
        db.add(SchoolLogin(id=1, school_id=1, email_id="alpha@school.com", password_hash=hash_password("Pass!123"), is_active=True))

        # School B
        school_b = SchoolDetails(id=2, role_id=2, name="School Beta", email="beta@school.com", is_live=True)
        db.add(school_b)
        db.commit()
        db.add(SchoolLogin(id=2, school_id=2, email_id="beta@school.com", password_hash=hash_password("Pass!123"), is_active=True))

        # Coach under School A
        coach_a = LifeCoachDetails(id=1, role_id=3, name="Coach Alpha", email="coach.alpha@test.com", school_id=1, is_live=True)
        db.add(coach_a)
        db.commit()
        db.add(LifeCoachLogin(id=1, life_coach_id=1, email_id="coach.alpha@test.com", password_hash=hash_password("CoachPass!1"), is_active=True))

        # Coach under School B
        coach_b = LifeCoachDetails(id=2, role_id=3, name="Coach Beta", email="coach.beta@test.com", school_id=2, is_live=True)
        db.add(coach_b)
        db.commit()
        db.add(LifeCoachLogin(id=2, life_coach_id=2, email_id="coach.beta@test.com", password_hash=hash_password("CoachPass!1"), is_active=True))

        db.commit()
    finally:
        db.close()

    yield

    app.dependency_overrides.clear()
    engine.dispose()
    if os.path.exists("./test_lifecoach.db"):
        try:
            os.remove("./test_lifecoach.db")
        except Exception:
            pass


def test_life_coach_login_locks_after_five_failed_attempts():
    client = TestClient(app)

    for _ in range(4):
        resp = client.post("/life-coaches/login", json={"email": "coach.alpha@test.com", "password": "WrongPassword!1"})
        assert resp.status_code == 401

    locked_resp = client.post("/life-coaches/login", json={"email": "coach.alpha@test.com", "password": "WrongPassword!1"})
    assert locked_resp.status_code == 403
    assert "locked" in locked_resp.json()["detail"].lower()

    db = TestingSessionLocal()
    try:
        login_record = db.query(LifeCoachLogin).filter(LifeCoachLogin.email_id == "coach.alpha@test.com").first()
        assert login_record is not None
        assert login_record.is_locked is True
        assert login_record.failed_login_attempts >= 5
    finally:
        db.close()


def test_school_isolation_life_coaches():
    client = TestClient(app)

    # Token for School A
    token_a = create_access_token(subject="alpha@school.com", role="school")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Token for School B
    token_b = create_access_token(subject="beta@school.com", role="school")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # School A fetches life coaches
    res_a = client.get("/life-coaches", headers=headers_a)
    assert res_a.status_code == 200
    coaches_a = res_a.json()
    assert len(coaches_a) == 1
    assert coaches_a[0]["email"] == "coach.alpha@test.com"

    # School B fetches life coaches
    res_b = client.get("/life-coaches", headers=headers_b)
    assert res_b.status_code == 200
    coaches_b = res_b.json()
    assert len(coaches_b) == 1
    assert coaches_b[0]["email"] == "coach.beta@test.com"
