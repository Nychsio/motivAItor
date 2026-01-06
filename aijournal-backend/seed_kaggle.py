# G:\MotivAItor\aijournal-backend\seed_kaggle.py
import pandas as pd
from database import SessionLocal, engine
import models

# Upewnij się, że tabele istnieją
models.Base.metadata.create_all(bind=engine)

def seed_exercises():
    db = SessionLocal()
    
    # Sprawdź czy już coś jest
    if db.query(models.ExerciseLibrary).count() > 0:
        print("Biblioteka ćwiczeń nie jest pusta. Pomijam import.")
        return

    print("⏳ Wczytywanie CSV z Kaggle...")
    try:
        # Dostosuj nazwę pliku, jeśli masz inną
        df = pd.read_csv("megaGymDataset.csv") 
        
        # Kaggle dataset ma kolumny: Title, Desc, Type, BodyPart, Equipment, Level...
        # Iterujemy i wrzucamy do bazy
        exercises_to_add = []
        count = 0
        
        for index, row in df.iterrows():
            ex = models.ExerciseLibrary(
                title=str(row['Title']),
                desc=str(row['Desc']) if pd.notna(row['Desc']) else "",
                type=str(row['Type']) if pd.notna(row['Type']) else "Strength",
                body_part=str(row['BodyPart']) if pd.notna(row['BodyPart']) else "General",
                equipment=str(row['Equipment']) if pd.notna(row['Equipment']) else "None",
                level=str(row['Level']) if pd.notna(row['Level']) else "Beginner"
            )
            exercises_to_add.append(ex)
            count += 1
            
            # Batch commit co 500 rekordów (żeby nie zajechać pamięci)
            if len(exercises_to_add) >= 500:
                db.bulk_save_objects(exercises_to_add)
                db.commit()
                exercises_to_add = []
                print(f"Zaimportowano {count} ćwiczeń...")

        # Reszta
        if exercises_to_add:
            db.bulk_save_objects(exercises_to_add)
            db.commit()

        print(f"✅ SUKCES! Zaimportowano łącznie {count} ćwiczeń do bazy.")

    except Exception as e:
        print(f"❌ Błąd: {e}")
        print("Upewnij się, że plik .csv jest w tym samym folderze co skrypt!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_exercises()