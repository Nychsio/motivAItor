from pydantic import BaseModel
from datetime import date

# --- Schematy Zadań (NOWE) ---
class TaskBase(BaseModel):
    content: str
    task_date: date
    is_completed: bool = False
    points: int = 10

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    owner_id: int

    class Config:
        orm_mode = True # Kiedyś `from_attributes = True`

# --- Schematy Użytkownika ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    tasks: list[Task] = []

    class Config:
        orm_mode = True

# --- Schematy Tokenów (NOWE) ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
    
    

# ... (na końcu pliku schemas.py)

# --- Schemat dla AI Brain Dump (NOWY) ---
class BrainDumpRequest(BaseModel):
    text: str
    task_date: date