from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config.settings import settings
from models.models import Base

# Create database engine safely
db_url = settings.DATABASE_URL or "sqlite:///:memory:"
is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {}
if not is_sqlite:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(
    db_url,
    echo=settings.DEBUG,  # Log SQL queries if DEBUG=True
    **engine_kwargs
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency injection for database sessions in FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)