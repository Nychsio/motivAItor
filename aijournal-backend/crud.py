from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import date, datetime, timedelta
import models
import schemas
import auth

# --- UŻYTKOWNIK ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- PROJEKTY I MOMENTUM (NOWE) ---
def get_projects_with_stats(db: Session, user_id: int):
    projects = db.query(models.Project).filter(models.Project.owner_id == user_id).all()
    
    # Data sprzed 5 dni - próg rdzewienia
    rust_threshold = datetime.now() - timedelta(minutes=1)
    
    results = []
    for p in projects:
        # 1. Postęp zadań
        total_tasks = len(p.tasks)
        completed_tasks = len([t for t in p.tasks if t.is_completed])
        progress_pct = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0
        
        # 2. Sprawdzenie Momentum (Aktywność)
        # Szukamy ostatniego ukończonego zadania
        last_task = db.query(models.Task.completed_at).filter(
            models.Task.project_id == p.id,
            models.Task.is_completed == True
        ).order_by(models.Task.completed_at.desc()).first()
        
        # Szukamy ostatniego Pomodoro
        last_pomodoro = db.query(models.PomodoroSession.date).filter(
            models.PomodoroSession.project_id == p.id
        ).order_by(models.PomodoroSession.date.desc()).first()
        
        # Konwersja dat na datetime dla porównania
        last_activity = None
        
        if last_task and last_task.completed_at:
            last_activity = last_task.completed_at
            
        if last_pomodoro and last_pomodoro.date:
            # Pomodoro ma tylko date, zamieniamy na datetime (północ)
            pomo_dt = datetime.combine(last_pomodoro.date, datetime.min.time())
            if last_activity is None or pomo_dt > last_activity:
                last_activity = pomo_dt
        
        # Decyzja: Czy rdzewieje?
        is_rusting = False
        if last_activity:
            if last_activity < rust_threshold:
                is_rusting = True
        elif total_tasks > 0: 
            # Jeśli są zadania, ale żadne nie zrobione i brak pomodoro -> rdzewieje od razu
            is_rusting = True
            
        # Zapisujemy statystyki do obiektu (Pydantic to odczyta)
        p.stats = {
            "progress": progress_pct,
            "is_rusting": is_rusting,
            "last_activity": last_activity.isoformat() if last_activity else None,
            "total_pomodoros": len(p.pomodoros)
        }
        results.append(p)
        
    return results

def create_project(db: Session, project: schemas.ProjectCreate, user_id: int):
    db_project = models.Project(
        name=project.name,
        description=project.description,
        color=project.color,
        default_duration=project.default_duration, # <-- Custom czas
        owner_id=user_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    if project.master_prompt:
        db_context = models.ProjectContext(
            project_id=db_project.id,
            master_prompt=project.master_prompt
        )
        db.add(db_context)
        db.commit()
    
    return db_project

# --- ZADANIA ---
def get_tasks_by_date(db: Session, user_id: int, task_date: date):
    return db.query(models.Task).filter(
        models.Task.owner_id == user_id,
        models.Task.task_date == task_date
    ).order_by(models.Task.order.asc()).all()

def get_inbox_tasks(db: Session, user_id: int):
    return db.query(models.Task).filter(
        models.Task.owner_id == user_id,
        models.Task.task_date == None
    ).order_by(models.Task.order.asc()).all()

def create_user_task(db: Session, task: schemas.TaskCreate, user_id: int):
    target_date = task.task_date 
    query = db.query(models.Task).filter(models.Task.owner_id == user_id)
    if target_date:
        query = query.filter(models.Task.task_date == target_date)
    else:
        query = query.filter(models.Task.task_date == None)
        
    last_task = query.order_by(models.Task.order.desc()).first()
    new_order = (last_task.order + 1) if last_task else 0

    db_task = models.Task(
        content=task.content,
        task_date=target_date,
        is_completed=task.is_completed,
        points=task.points,
        order=new_order,
        owner_id=user_id,
        project_id=task.project_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task_by_id(db: Session, task_id: int, user_id: int):
    return db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.owner_id == user_id
    ).first()

def toggle_task(db: Session, db_task: models.Task):
    db_task.is_completed = not db_task.is_completed
    # Aktualizujemy datę wykonania dla Momentum!
    if db_task.is_completed:
        db_task.completed_at = datetime.now()
    else:
        db_task.completed_at = None
        
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate, user_id: int):
    db_task = get_task_by_id(db, task_id, user_id)
    if not db_task:
        return None
    
    update_data = task_update.dict(exclude_unset=True)
    if 'task_date' in update_data:
        new_date = update_data['task_date']
        query = db.query(models.Task).filter(models.Task.owner_id == user_id)
        if new_date:
            query = query.filter(models.Task.task_date == new_date)
        else:
            query = query.filter(models.Task.task_date == None)
        last_task = query.order_by(models.Task.order.desc()).first()
        update_data['order'] = (last_task.order + 1) if last_task else 0

    for key, value in update_data.items():
        setattr(db_task, key, value)

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, db_task: models.Task):
    db.delete(db_task)
    db.commit()
    return {"status": "success"}

def reorder_tasks(db: Session, reorder_data: list[schemas.TaskReorder], user_id: int):
    for item in reorder_data:
        db.query(models.Task).filter(
            models.Task.id == item.id,
            models.Task.owner_id == user_id
        ).update({"order": item.order})
    db.commit()
    return {"status": "success"}

# --- HEALTH & POMODORO ---
def create_daily_health(db: Session, health: schemas.DailyHealthCreate, user_id: int):
    db_health = models.DailyHealth(**health.dict(), user_id=user_id)
    db.add(db_health)
    db.commit()
    db.refresh(db_health)
    return db_health

def create_pomodoro(db: Session, pomodoro: schemas.PomodoroCreate, user_id: int):
    db_pomodoro = models.PomodoroSession(**pomodoro.dict(), user_id=user_id)
    db.add(db_pomodoro)
    db.commit()
    db.refresh(db_pomodoro)
    return db_pomodoro