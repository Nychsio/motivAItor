from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base # <--- ZMIANA IMPORTU (Nowy standard)
import os
from dotenv import load_dotenv

# Próbujemy załadować .env (dla pracy lokalnej bez Dockera)
# W Dockerze pliku nie będzie, ale to nie szkodzi – zmienne przyjdą z systemu.
load_dotenv()

# Pobieramy URL. 
# W Dockerze: przyjdzie z docker-compose.yml (jako postgresql://admin:password123@db:5432/aijournal_db)
# Lokalnie: przyjdzie z pliku .env (jako postgresql://postgres:haslo@localhost/aijournal)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    # Zostawiam Twój komunikat, jest idealny dla Szymona jakby coś popsuł
    raise ValueError("Brakuje DATABASE_URL w zmiennych środowiskowych! Piotr, ogarnij to (albo sprawdź .env/docker-compose).")

# Tworzymy silnik
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Fabryka sesji
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Baza modeli
Base = declarative_base()

# Dependency Injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()