from pydantic import BaseModel
from datetime import date, datetime

# --- PROJEKTY (NOWE) ---
class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    color: str = "#12d3b9"
    default_duration: int = 25 # Domyślny czas pomodoro dla projektu

class ProjectCreate(ProjectBase):
    master_prompt: str | None = None # Opcjonalny kontekst przy tworzeniu

class Project(ProjectBase):
    id: int
    owner_id: int
    # Pola wyliczane dynamicznie (Momentum)
    stats: dict | None = None # { "progress": 50, "is_rusting": False, "last_activity": "2023..." }
    
    class Config:
        from_attributes = True

# --- ZADANIA ---
class TaskBase(BaseModel):
    content: str
    task_date: date | None = None 
    is_completed: bool = False
    points: int = 10
    priority: str = "medium"

class TaskCreate(TaskBase):
    project_id: int | None = None

class TaskUpdate(BaseModel):
    content: str | None = None
    task_date: date | None = None
    is_completed: bool | None = None
    priority: str | None = None
    order: int | None = None
    project_id: int | None = None

class TaskReorder(BaseModel):
    id: int
    order: int

class Task(TaskBase):
    id: int          
    owner_id: int    
    order: int       
    project_id: int | None = None
    task_date: date | None = None 
    completed_at: datetime | None = None # Data ukończenia

    class Config:
        from_attributes = True

# --- ZDROWIE ---
class DailyHealthBase(BaseModel):
    date: date
    sleep_hours: float
    weight: float
    calories: int
    mood_score: int
    note: str | None = None

class DailyHealthCreate(DailyHealthBase):
    pass

class DailyHealth(DailyHealthBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- POMODORO ---
class PomodoroBase(BaseModel):
    date: date
    duration: int
    tag: str

class PomodoroCreate(PomodoroBase):
    project_id: int | None = None # Możemy przypisać do projektu

class PomodoroSession(PomodoroBase):
    id: int
    user_id: int
    project_id: int | None = None
    class Config:
        from_attributes = True

# --- RESZTA ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int 
    email: str
    is_active: bool = True
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class BrainDumpRequest(BaseModel):
    text: str
    task_date: date | None = None

class CalorieRequest(BaseModel):
    text: str

class AIChatRequest(BaseModel):
    message: str 
    context_task_id: int | None = None
    context_project_id: int | None = None # Dodamy możliwość czatu o projekcie