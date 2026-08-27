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
    db.add(admin_role)
    db.add(school_role)
    db.add(life_coach_role)
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

    print("Successfully seeded Admin (admin@gmail.com / Admin@123) and Roles (admin, school).")
finally:
    db.close()

print("Done.")
