import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Role, AdminDetails, AdminLogin, SchoolDetails, SchoolLogin, MasterDropdownOption
from app.security import hash_password, create_access_token

TEST_DATABASE_URL = "sqlite:///./test_therapist.db"

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

    # Seed roles
    db.query(Role).delete()
    admin_role = Role(id=1, role_name="admin", description="Admin Role")
    school_role = Role(id=2, role_name="school", description="School Role")
    life_coach_role = Role(id=3, role_name="life_coach", description="Life Coach Role")
    therapist_role = Role(id=4, role_name="therapist", description="Therapist Role")
    db.add_all([admin_role, school_role, life_coach_role, therapist_role])
    db.commit()

    # Seed admin
    admin = AdminDetails(
        id=1,
        role_id=1,
        first_name="Admin",
        last_name="User",
        email_id="admin@test.com",
        is_live=True
    )
    db.add(admin)
    db.commit()

    admin_login = AdminLogin(
        id=1,
        admin_id=1,
        email_id="admin@test.com",
        password_hash=hash_password("Admin@123"),
        is_active=True,
    )
    db.add(admin_login)

    # Seed master dropdown
    db.add(MasterDropdownOption(id=1, category="institution_type", value="School"))
    db.add(MasterDropdownOption(id=2, category="professional_title", value="Psychologist"))

    # Seed school
    school = SchoolDetails(
        id=10,
        role_id=2,
        name="Greenwood High School",
        email="greenwood@school.com",
        phone="1234567890",
        is_live=True
    )
    db.add(school)
    db.commit()

    school_login = SchoolLogin(
        id=10,
        school_id=10,
        email_id="greenwood@school.com",
        password_hash=hash_password("School@123"),
        is_active=True,
    )
    db.add(school_login)
    db.commit()
    db.close()

    yield

    app.dependency_overrides.clear()
    TestingSessionLocal.remove() if hasattr(TestingSessionLocal, "remove") else None
    engine.dispose()
    if os.path.exists("./test_therapist.db"):
        try:
            os.remove("./test_therapist.db")
        except Exception:
            pass


client = TestClient(app)


def test_master_dropdowns_and_admin_management():
    # Public get dropdown options
    res = client.get("/master-dropdowns/institution_type")
    assert res.status_code == 200
    items = res.json()
    assert any(i["value"] == "School" for i in items)

    # Admin token
    admin_token = create_access_token(subject="admin@test.com", role="admin")

    # Admin add option
    add_res = client.post(
        "/admin/master-dropdowns",
        json={"category": "institution_type", "value": "Charter Academy"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert add_res.status_code == 200
    opt_id = add_res.json()["id"]

    # Verify option listed
    res2 = client.get("/master-dropdowns/institution_type")
    assert any(i["value"] == "Charter Academy" for i in res2.json())

    # Admin delete option
    del_res = client.delete(f"/admin/master-dropdowns/{opt_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 200

    # Verify soft deleted
    res3 = client.get("/master-dropdowns/institution_type")
    assert not any(i["value"] == "Charter Academy" for i in res3.json())


def test_school_therapist_invitation_and_registration_flow():
    school_token = create_access_token(subject="greenwood@school.com", role="school")

    # 1. School invites therapist
    invite_res = client.post(
        "/schools/therapists/invite",
        json={"first_name": "Sarah", "last_name": "Connor", "email": "sarah.therapist@gmail.com"},
        headers={"Authorization": f"Bearer {school_token}"}
    )
    assert invite_res.status_code == 200
    data = invite_res.json()
    therapist_id = data["id"]
    assert data["approval_status"] == "pending"

    # 2. Get invite info
    info_res = client.get(f"/therapists/invite-info/{therapist_id}")
    assert info_res.status_code == 200
    assert info_res.json()["school_name"] == "Greenwood High School"

    # 3. Therapist completes registration
    reg_payload = {
        "first_name": "Sarah",
        "last_name": "Connor",
        "email": "sarah.therapist@gmail.com",
        "phone": "9876543210",
        "gender": "Female",
        "professional_title": "Psychologist",
        "therapist_type": "Licensed Professional Counselor",
        "is_school_associated": True,
        "school_id": 10,
        "school_name": "Greenwood High School",
        "school_email": "greenwood@school.com",
        "license_type": "State Board",
        "license_number": "LIC-998877",
        "highest_qualification": "Master's Degree",
        "accepts_insurance": True,
        "insurance_types": ["Aetna", "Cigna/Evernorth"],
        "handles_phi": True,
        "hipaa_training_completed": True
    }
    reg_res = client.post("/therapists/register", json=reg_payload)
    assert reg_res.status_code == 200
    assert reg_res.json()["approval_status"] == "pending"

    # 4. Admin views pending therapists
    admin_token = create_access_token(subject="admin@test.com", role="admin")
    list_res = client.get("/admin/therapists?status=pending", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_res.status_code == 200
    pending_list = list_res.json()
    assert len(pending_list) == 1
    assert pending_list[0]["email"] == "sarah.therapist@gmail.com"

    # 5. Admin approves therapist
    appr_res = client.post(f"/admin/therapists/{therapist_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
    assert appr_res.status_code == 200
    assert appr_res.json()["approval_status"] == "approved"


def test_therapist_login_lockout_and_profile():
    # Register & Approve individual therapist directly
    reg_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.therapist@gmail.com",
        "phone": "5551234567",
        "is_school_associated": False,
    }
    reg_res = client.post("/therapists/register", json=reg_payload)
    therapist_id = reg_res.json()["id"]

    admin_token = create_access_token(subject="admin@test.com", role="admin")
    client.post(f"/admin/therapists/{therapist_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    # Get approved login details directly from db or test password lockout
    # Test failed login attempts (5 times lockout)
    for _ in range(4):
        err_res = client.post("/therapists/login", json={"email": "john.therapist@gmail.com", "password": "WrongPassword"})
        assert err_res.status_code == 401

    lockout_res = client.post("/therapists/login", json={"email": "john.therapist@gmail.com", "password": "WrongPassword"})
    assert lockout_res.status_code == 403
    assert "locked for 1 minute" in lockout_res.json()["detail"]
