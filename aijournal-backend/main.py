from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, date
import uuid
import requests
import json
from typing import List
from pydantic import BaseModel
import time
from sqlalchemy.exc import OperationalError
# Importujemy nasze moduły
from database import get_db, engine
import models
import schemas
import crud
import auth
import os

# Pętla oczekiwania na bazę danych (Retry Pattern)
MAX_RETRIES = 10
WAIT_SECONDS = 3

for i in range(MAX_RETRIES):
    try:
        print(f"Próba połączenia z bazą ({i+1}/{MAX_RETRIES})...")
        models.Base.metadata.create_all(bind=engine)
        print("Sukces! Baza danych podłączona.")
        break
    except OperationalError:
        print(f"Baza jeszcze nie gotowa. Czekam {WAIT_SECONDS}s...")
        time.sleep(WAIT_SECONDS)
else:
    print("Nie udało się połączyć z bazą po wielu próbach.")

app = FastAPI()

# Konfiguracja CORS
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === ENDPOINTY AUTENTYKACJI ===

@app.post("/api/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Logowanie. Zwraca token JWT.
    """
    user = crud.get_user_by_email(db, email=form_data.username)
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    """Pobiera dane zalogowanego użytkownika."""
    return current_user

# === ENDPOINTY ZADAŃ ===

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_user_task(db=db, task=task, user_id=current_user.id)

# WAŻNE: Ten endpoint musi być PRZED /{task_date}, żeby "inbox" nie zostało potraktowane jako data!
@app.get("/api/tasks/inbox", response_model=list[schemas.Task])
def read_inbox_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Pobiera zadania z Brain Dumpa (bez daty)."""
    return crud.get_inbox_tasks(db=db, user_id=current_user.id)

@app.get("/api/tasks/{task_date}", response_model=list[schemas.Task])
def read_tasks_for_date(
    task_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.get_tasks_by_date(db=db, user_id=current_user.id, task_date=task_date)

# NOWY ENDPOINT: UPDATE (Dla Drag & Drop)
@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int, # <--- int, nie UUID!
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    updated_task = crud.update_task(db, task_id, task_update, current_user.id)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated_task

@app.put("/api/tasks/{task_id}/toggle", response_model=schemas.Task)
def toggle_task_status(
    task_id: int, # <--- int, nie UUID!
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return crud.toggle_task(db=db, db_task=db_task)

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int, # <--- int, nie UUID!
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return crud.delete_task(db=db, db_task=db_task)


# === ENDPOINTY PROJEKTÓW (NOWE) ===

@app.get("/api/projects", response_model=List[schemas.Project])
def read_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Pobiera projekty wraz ze statystykami (Momentum, Rdzewienie).
    CRUD automatycznie wylicza 'is_rusting' i 'progress'.
    """
    return crud.get_projects_with_stats(db=db, user_id=current_user.id)

@app.post("/api/projects", response_model=schemas.Project)
def create_new_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Tworzy projekt z opcjonalnym Master Promptem (kontekstem).
    """
    return crud.create_project(db=db, project=project, user_id=current_user.id)

# (Opcjonalnie) Endpoint do aktualizacji czasu pomodoro lub kontekstu
# @app.put("/api/projects/{project_id}") ... (zrobimy jak będzie potrzebne)


# === AI BRAIN DUMP ===

# W pliku main.py

def call_lm_studio(text: str, system_prompt: str = None) -> str:
    """
    Wywołuje LM Studio. Jeśli podano system_prompt, nadpisuje domyślny.
    """
    LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
    
    # Domyślny prompt, jeśli nie podano innego
    if not system_prompt:
        system_prompt = """
        Jesteś agentem produktywności. Twoim zadaniem jest konwertowanie
        luźnego tekstu (brain dump) na listę konkretnych zadań w formacie JSON.
        """
    
    payload = {
        "model": "local-model",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        "temperature": 0.3,
        "stream": False
    }

    try:
        print(f"AI Request: Wysyłam do {LM_STUDIO_URL}...")
        response = requests.post(LM_STUDIO_URL, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
        
        if response.status_code != 200:
            print(f"AI Error: Status {response.status_code}, Body: {response.text}")
            # Zwracamy pusty string lub rzucamy błąd, żeby obsłużyć to wyżej
            return "[]" 
            
        data = response.json()
        return data['choices'][0]['message']['content']
            
    except Exception as e:
        print(f"AI Critical Error: {e}")
        return "[]"

@app.post("/api/ai/process-braindump", response_model=list[schemas.Task])
def process_braindump_with_ai(
    request: schemas.BrainDumpRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    print(f"AI: Przetwarzam Brain Dump: '{request.text}'")
    
    # Wywołanie AI (używa tej samej funkcji co czat, ale z innym promptem)
    system_prompt = """
    Jesteś asystentem GTD (Getting Things Done). 
    Twoim zadaniem jest przekonwertowanie luźnego strumienia myśli (brain dump) 
    na listę konkretnych, wykonalnych zadań w formacie JSON.
    Zwróć TYLKO listę stringów, np.: ["Kupić mleko", "Napisać raport"].
    """
    
    # Musimy zmodyfikować call_lm_studio, by zwracało listę, LUB parsujemy tu ręcznie.
    # Dla uproszczenia zakładam, że AI zwróci JSON string.
    try:
        response_text = call_lm_studio(request.text, system_prompt)
        # Proste czyszczenie markdowna, jeśli AI go doda
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        task_list = json.loads(clean_text)
        
        if not isinstance(task_list, list):
            task_list = [clean_text] # Fallback
            
    except Exception as e:
        print(f"Błąd parsowania AI: {e}")
        task_list = [request.text] # Fallback: cała treść jako jedno zadanie

    created_tasks = []
    for content in task_list:
        # Tworzymy zadanie
        task_data = schemas.TaskCreate(
            content=str(content),
            task_date=request.task_date,
            is_completed=False,
            points=10
        )
        new_task = crud.create_user_task(db=db, task=task_data, user_id=current_user.id)
        created_tasks.append(new_task)
        
    return created_tasks
# Wklej to do main.py (upewnij się, że masz importy schemas i crud)


# W main.py, obok innych funkcji AI

def ai_estimate_calories(text: str) -> int:
    """
    Pyta LM Studio o kaloryczność posiłku.
    """
    LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
    
    SYSTEM_PROMPT = """
    Jesteś dietetykiem. Twoim zadaniem jest oszacowanie kalorii w opisanym posiłku.
    ZASADY:
    1. Odpowiedz TYLKO jedną liczbą całkowitą (ilość kcal).
    2. Żadnego tekstu, żadnych wyjaśnień. Tylko liczba (np. 450).
    3. Jeśli nie wiesz, zgaduj na podstawie średnich wartości.
    """
    
    payload = {
        "model": "local-model",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Oszacuj kalorie dla: {text}"}
        ],
        "temperature": 0.1, # Niska temperatura, żeby nie zmyślał dziwnych liczb
        "stream": False
    }

    try:
        response = requests.post(LM_STUDIO_URL, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
        data = response.json()
        content = data['choices'][0]['message']['content'].strip()
        
        # Próbujemy wyciągnąć liczbę z odpowiedzi (czyszczenie z kropki itp)
        import re
        numbers = re.findall(r'\d+', content)
        if numbers:
            return int(numbers[0])
        return 0
    except Exception as e:
        print(f"AI Diet Error: {e}")
        return 0


# --- ENDPOINT ---
@app.post("/api/ai/estimate-calories")
def estimate_calories(request: schemas.CalorieRequest):
    calories = ai_estimate_calories(request.text)
    return {"calories": calories}

@app.post("/api/ai/chat")
@app.post("/api/ai/chat")
def chat_with_context(
    request: schemas.AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Endpoint obsługujący czat z kontekstem zadania i projektu.
    """
    
    # 1. Budowanie kontekstu
    context_info = ""
    project_context = "" 
    
    if request.context_task_id:
        # Używamy poprawnej funkcji crud (bez _simple)
        task = crud.get_task_by_id(db, task_id=request.context_task_id, user_id=current_user.id)
        
        if task:
            status_txt = "Zrobione" if task.is_completed else "Do zrobienia"
            
            # --- USUNĄŁEM LINIJKĘ O SUBTASKS BO ICH NIE MA W BAZIE ---
            
            context_info += (
                f"\nKONTEKST ZADANIA:\n"
                f"- Tytuł: {task.content}\n"
                f"- Status: {status_txt}\n"
            )
            
            # 2. Wyciągamy kontekst PROJEKTU (jeśli zadanie ma projekt)
            if task.project_id:
                project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
                if project and project.context:
                    project_context = f"\n💡 MASTER PROMPT PROJEKTU '{project.name}':\n{project.context.master_prompt}\n"
    
    # 3. Tworzenie Promptu Systemowego
    system_prompt = f"""
    Jesteś mentorem 'Tough Love'. Jesteś krótki, konkretny i pomocny.
    {project_context}
    JEŚLI użytkownik prosi o rozbicie zadania na kroki:
    - Zwróć je w formacie listy Markdown.
    - Bądź zwięzły.
    """
    
    # 4. Zapytanie do AI
    full_message = f"{context_info}\nPYTANIE UŻYTKOWNIKA: {request.message}"
    
    ai_response = call_lm_studio(full_message, system_prompt)
    
    return {"reply": ai_response}





# === ENDPOINTY HEALTH & POMODORO ===

@app.post("/api/health", response_model=schemas.DailyHealth)
def create_health_entry(
    health: schemas.DailyHealthCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Zapisuje dzienne statystyki zdrowia."""
    return crud.create_daily_health(db=db, health=health, user_id=current_user.id)

@app.post("/api/pomodoro", response_model=schemas.PomodoroSession)
def create_pomodoro_session(
    session: schemas.PomodoroCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Loguje zakończoną sesję Pomodoro."""
    return crud.create_pomodoro(db=db, pomodoro=session, user_id=current_user.id)


# W main.py pod innymi endpointami zadań

@app.get("/api/tasks/inbox", response_model=list[schemas.Task])
def read_inbox_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Pobiera zadania z Brain Dumpa (bez daty)."""
    return crud.get_inbox_tasks(db=db, user_id=current_user.id)