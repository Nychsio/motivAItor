from sqlalchemy.orm import Session
from sqlalchemy import extract
import models
import schemas
import auth # Używamy do hashowania
from datetime import date

# --- CRUD dla Użytkownika ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- CRUD dla Zadań (NOWE) ---
def get_tasks_by_date(db: Session, user_id: int, task_date: date):
    """Pobiera zadania dla konkretnego użytkownika i konkretnej daty."""
    return db.query(models.Task).filter(
        models.Task.owner_id == user_id,
        models.Task.task_date == task_date
    ).all()

def create_user_task(db: Session, task: schemas.TaskCreate, user_id: int):
    """Tworzy zadanie przypisane do użytkownika."""
    db_task = models.Task(**task.dict(), owner_id=user_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task_by_id(db: Session, task_id: int, user_id: int):
    """Pobiera konkretne zadanie, sprawdzając czy należy do właściciela."""
    return db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == user_id
    ).first()

def toggle_task(db: Session, db_task: models.Task):
    """Przełącza stan zadania."""
    db_task.is_completed = not db_task.is_completed
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, db_task: models.Task):
    """Usuwa zadanie."""
    db.delete(db_task)
    db.commit()
    return {"status": "success", "message": "Task deleted"}