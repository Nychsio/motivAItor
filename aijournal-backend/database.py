from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Wczytaj zmienne z .env
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("Brakuje DATABASE_URL w pliku .env! Piotr, ogarnij to.")

# Tworzymy silnik bazy danych
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tworzymy fabrykę sesji
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Baza dla modeli (tabel)
Base = declarative_base()

# Funkcja pomocnicza do pobierania bazy (Dependency Injection)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()