from database import engine
from sqlalchemy import text
import models # Musi być zaimportowane, żeby metadata wiedziało co tworzyć

def reset_database():
    print("🗑️  Usuwanie starych tabel...")
    with engine.connect() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE;"))
        connection.execute(text("CREATE SCHEMA public;"))
        connection.commit()
    print("✅ Baza wyczyszczona.")
    
    print("🏗️  Tworzenie nowych tabel (Integer ID)...")
    models.Base.metadata.create_all(bind=engine)
    print("✅ Nowe tabele gotowe!")

if __name__ == "__main__":
    reset_database()