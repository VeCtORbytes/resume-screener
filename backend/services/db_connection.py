from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import UUID
from config.settings import settings
from models.models import Base

# Teach SQLite how to compile PostgreSQL UUID fields during mock startup
@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"

# Create database engine safely
db_url = settings.DATABASE_URL or "sqlite:///:memory:"
is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {}
if not is_sqlite:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

# Create database engine safely
db_url = settings.DATABASE_URL or "sqlite:///:memory:"

# Automatically correct legacy postgres:// connection schemes from Render/Heroku
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {}
if not is_sqlite:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

try:
    engine = create_engine(
        db_url,
        echo=settings.DEBUG,  # Log SQL queries if DEBUG=True
        **engine_kwargs
    )
except Exception as e:
    print(f"⚠️ WARNING: Failed to create database engine: {str(e)}")
    print("Falling back to safe SQLite in-memory engine.")
    db_url = "sqlite:///:memory:"
    engine = create_engine(db_url, echo=settings.DEBUG)

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
    """Create all tables safely"""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"❌ DATABASE TABLE CREATION FAILED: {str(e)}")
        raise e