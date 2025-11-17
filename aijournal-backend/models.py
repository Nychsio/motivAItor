from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Relacja: Użytkownik ma wiele zadań
    tasks = relationship("Task", back_populates="owner")

# --- NOWA TABELA: Task ---
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    task_date = Column(Date, nullable=False, index=True)
    points = Column(Integer, default=10)
    
    # Klucz obcy - które zadanie należy do którego użytkownika
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Relacja: Zadanie należy do jednego użytkownika
    owner = relationship("User", back_populates="tasks")