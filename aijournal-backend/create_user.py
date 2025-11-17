from database import SessionLocal
import models
import auth 
import schemas
from sqlalchemy.orm import Session

db: Session = SessionLocal()

# Dane nowego użytkownika
user_data = schemas.UserCreate(
    email="piotr@aijournal.com",
    password="supertrudnehaslo123"
)

# --- TU BYŁ BŁĄD, POPRAWIONE: ---
# Sprawdź czy user już nie istnieje (bez nadpisywania models.User!)
db_user = db.query(models.User).filter(models.User.email == user_data.email).first()

if db_user:
    print(f"Użytkownik {user_data.email} już istnieje.")
    db.close()
else:
    try:
        # Stwórz użytkownika używając funkcji z auth
        hashed_password = auth.get_password_hash(user_data.password)
        
        # Model User teraz działa poprawnie
        db_user = models.User(email=user_data.email, hashed_password=hashed_password)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        print("--- Sukces! ---")
        print(f"Stworzono użytkownika: {db_user.email}")
        print(f"ID Użytkownika (UUID): {db_user.id}")
        print(f"Hasło: {user_data.password}")
        print("-----------------")
        print("Użyj tych danych, aby zalogować się w aplikacji.")
    except Exception as e:
        db.rollback()
        print(f"Błąd podczas tworzenia użytkownika: {e}")
    finally:
        db.close()