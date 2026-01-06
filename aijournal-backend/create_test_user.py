from database import SessionLocal
import models
import auth 
import schemas
from sqlalchemy.orm import Session

# 1. Otwieramy połączenie
db: Session = SessionLocal()

# 2. Definiujemy dane (Używamy formatu email, żeby Pydantic nie krzyczał)
target_email = "test@test.com"
target_password = "test"

print(f"--- Próba stworzenia użytkownika: {target_email} ---")

# 3. Sprawdzamy czy istnieje
db_user = db.query(models.User).filter(models.User.email == target_email).first()

if db_user:
    print(f"⚠️ Użytkownik {target_email} już istnieje w bazie!")
    print(f"Możesz się logować hasłem, które ustawiłeś wcześniej.")
else:
    try:
        # 4. Hashowanie hasła (To kluczowe - nie zapisujemy "test" jawnym tekstem!)
        hashed_password = auth.get_password_hash(target_password)
        
        # 5. Tworzenie obiektu
        new_user = models.User(
            email=target_email, 
            hashed_password=hashed_password
        )
        
        # 6. Zapis do DB
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ SUKCES!")
        print(f"Stworzono użytkownika: {new_user.email}")
        print(f"Hasło: {target_password}")
        print("------------------------------------------------")
        print("Teraz wejdź na Frontend i zaloguj się tymi danymi.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Błąd krytyczny: {e}")
    finally:
        db.close()