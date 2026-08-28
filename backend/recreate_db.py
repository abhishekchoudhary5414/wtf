from app.database import Base, engine, SessionLocal
from app.models import Role, AdminDetails, AdminLogin, SchoolDetails, SchoolLogin
from app.security import hash_password

print("Dropping existing tables...")
Base.metadata.drop_all(bind=engine)
print("Creating new tables...")
Base.metadata.create_all(bind=engine)

print("Seeding roles and default admin account...")
db = SessionLocal()
try:
    admin_role = Role(id=1, role_name="admin", description="Admin Role")
    school_role = Role(id=2, role_name="school", description="School Role")
    life_coach_role = Role(id=3, role_name="life_coach", description="Life Coach Role")
    therapist_role = Role(id=4, role_name="therapist", description="Therapist Role")
    db.add(admin_role)
    db.add(school_role)
    db.add(life_coach_role)
    db.add(therapist_role)
    db.commit()

    # Seed Master Dropdown Options
    from app.models import MasterDropdownOption

    institution_types = [
        "School", "College", "University", "Public Educational Institution",
        "Private Educational Institution", "Counseling Center", "Behavioral Health Organization",
        "Healthcare Organization", "Nonprofit", "Other"
    ]
    for val in institution_types:
        db.add(MasterDropdownOption(category="institution_type", value=val))

    professional_titles = [
        "Dr.", "Psychologist", "Psychiatrist", "Licensed Professional Counselor (LPC)",
        "Licensed Clinical Social Worker (LCSW)", "Licensed Marriage and Family Therapist (LMFT)",
        "Licensed Mental Health Counselor (LMHC)", "Behavioral Therapist"
    ]
    for val in professional_titles:
        db.add(MasterDropdownOption(category="professional_title", value=val))

    therapist_types = [
        "Psychologist", "Psychiatrists", "Licensed Professional Counselor",
        "Licensed Clinical Social Worker", "Marriage and Family Therapist",
        "Behavioral Therapist", "Other"
    ]
    for val in therapist_types:
        db.add(MasterDropdownOption(category="therapist_type", value=val))

    insurance_types = [
        "Ambetter", "Beacon Health Options", "Beacon Health Strategies Medicaid",
        "Blue Cross Blue Shield", "Blue Shield", "Boon Chapman", "Bright Healthcare",
        "Carelon Health", "ChampVA", "Cigna Healthsprings", "Cigna/Evernorth",
        "Community Health Choice", "Devoted Health Plan", "Friday Health Plans",
        "Healthy Texas Women", "Humana", "Humana Military Tricare East", "Aetna",
        "Magellan", "Medicaid", "Medicate Part B", "Memorial Herman Health Plan",
        "Molina", "Optum Behavioral Health", "Optum Commercial", "Oscar Health Plan",
        "RR Medicare - Traditional", "Sana Benefits", "Self-Pay", "Superior Health Plan",
        "Texas Medicare Part B", "Traditional Medicaid", "Tricare", "UBH General",
        "UHC Commerial", "United Healthcare", "WellCare", "Wellpoint (Formally Amerigroup)"
    ]
    for val in insurance_types:
        db.add(MasterDropdownOption(category="insurance_type", value=val))

    db.commit()

    admin_details = AdminDetails(
        id=1,
        role_id=admin_role.id,
        first_name="Admin",
        last_name="User",
        email_id="admin@gmail.com",
        mobile_number="+1234567890",
        is_live=True,
    )
    db.add(admin_details)
    db.commit()

    admin_login = AdminLogin(
        admin_id=admin_details.id,
        email_id="admin@gmail.com",
        password_hash=hash_password("Admin@123"),
        is_active=True,
        is_locked=False,
        failed_login_attempts=0,
    )
    db.add(admin_login)
    db.commit()

    print("Successfully seeded Admin (admin@gmail.com / Admin@123), Roles (admin, school, life_coach, therapist), and Master Dropdowns.")
finally:
    db.close()

print("Done.")
