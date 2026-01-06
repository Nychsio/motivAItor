# G:\MotivAItor\aijournal-backend\fix_db.py
from database import engine
from sqlalchemy import text

def add_columns():
    print("🚑 Rozpoczynam naprawę tabeli 'users'...")
    
    with engine.connect() as conn:
        # Rozpoczynamy transakcję
        trans = conn.begin()
        try:
            # 1. Dodajemy stat_strength
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stat_strength FLOAT DEFAULT 0.0;"))
            print("✅ Dodano kolumnę: stat_strength")
            
            # 2. Dodajemy stat_willpower
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stat_willpower FLOAT DEFAULT 0.0;"))
            print("✅ Dodano kolumnę: stat_willpower")
            
            # 3. Dodajemy stat_health
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stat_health FLOAT DEFAULT 0.0;"))
            print("✅ Dodano kolumnę: stat_health")
            
            trans.commit()
            print("🎉 Sukces! Baza danych zaktualizowana.")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Błąd podczas aktualizacji: {e}")

if __name__ == "__main__":
    add_columns()