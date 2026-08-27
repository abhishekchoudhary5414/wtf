from app.database import Base, engine
from app.models import AdminLogin


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")
