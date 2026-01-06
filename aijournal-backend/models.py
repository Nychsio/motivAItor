from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Float, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB 
from sqlalchemy.sql import func
from database import Base

# --- UŻYTKOWNIK ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    tasks = relationship("Task", back_populates="owner")
    projects = relationship("Project", back_populates="owner")
    daily_health = relationship("DailyHealth", back_populates="owner")
    pomodoros = relationship("PomodoroSession", back_populates="owner")
    daily_summaries = relationship("DailySummary", back_populates="owner")
    weekly_reports = relationship("WeeklyReport", back_populates="owner")

# --- STATYSTYKI RPG (S.W.H.) ---
    # Skala 0-100 (może wyjść ponad 100 dla "God Mode")
    stat_strength = Column(Float, default=0.0)    # Siłownia
    stat_willpower = Column(Float, default=0.0)   # Zadania/Projekty
    stat_health = Column(Float, default=0.0)      # Sen/Kalorie
    
    # Relacja do workoutów (jeśli jeszcze nie dodałeś po ostatniej wiadomości)
    workouts = relationship("WorkoutSession", back_populates="owner")
    workout_plans = relationship("WorkoutPlan", back_populates="owner")
# --- PROJEKTY ---
class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    color = Column(String, default="#12d3b9")
    
    # NOWE: Domyślny czas Pomodoro dla tego projektu (np. 30 min)
    default_duration = Column(Integer, default=25) 
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project")
    context = relationship("ProjectContext", back_populates="project", uselist=False)
    # NOWE: Relacja do sesji pomodoro
    pomodoros = relationship("PomodoroSession", back_populates="project")

class ProjectContext(Base):
    __tablename__ = "project_contexts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    master_prompt = Column(Text, nullable=True)
    project = relationship("Project", back_populates="context")

# --- ZADANIA ---
class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    task_date = Column(Date, nullable=True, index=True)
    points = Column(Integer, default=10)
    order = Column(Integer, default=0)
    # Dodajemy timestamp ukończenia, żeby liczyć "Momentum" (kiedy ostatnio coś zrobiłeś)
    completed_at = Column(DateTime, nullable=True) 
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    owner = relationship("User", back_populates="tasks")
    project = relationship("Project", back_populates="tasks")

# --- ZDROWIE ---
class DailyHealth(Base):
    __tablename__ = "daily_health"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, nullable=False, index=True)
    sleep_hours = Column(Float, default=0.0)
    weight = Column(Float, default=0.0)
    calories = Column(Integer, default=0)
    mood_score = Column(Integer, default=5)
    note = Column(Text, nullable=True)
    owner = relationship("User", back_populates="daily_health")

# --- POMODORO ---
class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, nullable=False, index=True)
    duration = Column(Integer, default=25)
    tag = Column(String, default="work")
    
    # NOWE: Przypisanie sesji do projektu
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    owner = relationship("User", back_populates="pomodoros")
    project = relationship("Project", back_populates="pomodoros")

# --- PODSUMOWANIA ---
class DailySummary(Base):
    __tablename__ = "daily_summaries"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, nullable=False, index=True)
    ai_reflection = Column(Text) 
    metrics = Column(JSONB)
    owner = relationship("User", back_populates="daily_summaries")

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    ai_summary = Column(Text) 
    ai_strategy = Column(Text)
    metrics_avg = Column(JSONB)
    owner = relationship("User", back_populates="weekly_reports")
    
    
    
# --- MODELS.PY (DODATEK GYM) ---

# Tabela Sesji Treningowej (Nagłówek)
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, nullable=False, index=True)
    name = Column(String, nullable=False) # Np. "Push A"
    duration_minutes = Column(Integer, default=60)
    note = Column(Text, nullable=True) # Jakieś odczucia subiektywne
    
    # Relacja do logów ćwiczeń
    exercises = relationship("ExerciseLog", back_populates="session", cascade="all, delete-orphan")
    owner = relationship("User", back_populates="workouts")

# Tabela Logów Ćwiczeń (Konkretne serie)
class ExerciseLog(Base):
    __tablename__ = "exercise_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"))
    
    exercise_name = Column(String, nullable=False) # Np. "Bench Press"
    sets = Column(Integer, default=3)
    reps = Column(String, default="10") # String, bo czasem wpisujesz "12,10,8"
    weight = Column(Float, default=0.0) # Największy ciężar w serii roboczej
    volume_load = Column(Float, default=0.0) # sets * reps * weight (liczone przez backend/front)
    
    session = relationship("WorkoutSession", back_populates="exercises")

# UWAGA: Dodaj relację 'workouts' w klasie User na górze pliku:
# class User(Base):
#     ...
#     workouts = relationship("WorkoutSession", back_populates="owner")

# G:\MotivAItor\aijournal-backend\models.py

# ... (istniejące modele)

# 1. BIBLIOTEKA ĆWICZEŃ (To pochodzi z Kaggle)
class ExerciseLibrary(Base):
    __tablename__ = "exercise_library"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True) # Nazwa ćwiczenia
    desc = Column(Text, nullable=True) # Opis
    type = Column(String, nullable=True) # np. Strength
    body_part = Column(String, nullable=True) # np. Chest
    equipment = Column(String, nullable=True) # np. Barbell
    level = Column(String, nullable=True) # np. Intermediate

# 2. SZABLON PLANU TRENINGOWEGO (To co widzisz jako karty do przeciągania)
class WorkoutPlan(Base):
    __tablename__ = "workout_plans"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False) # Np. "Push A"
    description = Column(String, nullable=True)
    color = Column(String, default="#12d3b9")
    
    # Przechowujemy strukturę planu jako JSON (prościej niż robić osobną tabelę relacji dla szablonu)
    # Format: [{"name": "Bench Press", "sets": 3, "reps": "10"}, ...]
    exercises_structure = Column(JSONB, default=[]) 

    owner = relationship("User", back_populates="workout_plans")

# Pamiętaj dodać relację w klasie User na górze pliku:
# workout_plans = relationship("WorkoutPlan", back_populates="owner")