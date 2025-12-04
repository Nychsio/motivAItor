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