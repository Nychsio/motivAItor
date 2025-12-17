from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, date, datetime
import uuid
import requests
import json
from typing import List
from pydantic import BaseModel
import time
import random
from sqlalchemy.exc import OperationalError
import os

# Importujemy nasze moduły
from database import get_db, engine
import models
import schemas
import crud
import auth
import rag # <--- TWÓJ MODUŁ RAG (musi być plik rag.py obok)

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
    return current_user

# === ENDPOINTY ZADAŃ ===

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    new_task = crud.create_user_task(db=db, task=task, user_id=current_user.id)
    
    # --- RAG: KARMIENIE BAZY ---
    try:
        rag.add_document(
            doc_id=f"task_{new_task.id}",
            text=new_task.content,
            metadata={
                "type": "task", 
                "date": str(new_task.task_date) if new_task.task_date else "inbox",
                "project_id": str(new_task.project_id or "none")
            }
        )
    except Exception as e:
        print(f"RAG Error (Task): {e}")
    # ---------------------------

    return new_task

@app.get("/api/tasks/inbox", response_model=list[schemas.Task])
def read_inbox_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.get_inbox_tasks(db=db, user_id=current_user.id)

@app.get("/api/tasks/{task_date}", response_model=list[schemas.Task])
def read_tasks_for_date(
    task_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.get_tasks_by_date(db=db, user_id=current_user.id, task_date=task_date)

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int,
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
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return crud.toggle_task(db=db, db_task=db_task)

@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return crud.delete_task(db=db, db_task=db_task)


# === ENDPOINTY PROJEKTÓW ===

@app.get("/api/projects", response_model=List[schemas.Project])
def read_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.get_projects_with_stats(db=db, user_id=current_user.id)

@app.post("/api/projects", response_model=schemas.Project)
def create_new_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_project(db=db, project=project, user_id=current_user.id)

# === AI BRAIN DUMP & TOOLS ===

def call_lm_studio(text: str, system_prompt: str = None) -> str:
    LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
    if not system_prompt:
        system_prompt = "Jesteś asystentem produktywności."
    
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
    system_prompt = """
    Jesteś asystentem GTD. Konwertuj brain dump na listę zadań JSON (lista stringów).
    NP: ["Zadanie 1", "Zadanie 2"]. Tylko JSON.
    """
    try:
        response_text = call_lm_studio(request.text, system_prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        task_list = json.loads(clean_text)
        if not isinstance(task_list, list):
            task_list = [clean_text]
    except Exception:
        task_list = [request.text]

    created_tasks = []
    for content in task_list:
        task_data = schemas.TaskCreate(
            content=str(content),
            task_date=request.task_date,
            is_completed=False,
            points=10
        )
        new_task = crud.create_user_task(db=db, task=task_data, user_id=current_user.id)
        
        # --- RAG INDEXING ---
        rag.add_document(f"task_{new_task.id}", new_task.content, {"type": "task", "date": str(request.task_date or "inbox")})
        # --------------------
        
        created_tasks.append(new_task)
    return created_tasks

def ai_estimate_calories(text: str) -> int:
    # ... (kod bez zmian, można dodać cache RAG w przyszłości)
    LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
    payload = {
        "model": "local-model",
        "messages": [
            {"role": "system", "content": "Jesteś dietetykiem. Podaj TYLKO liczbę kalorii (int)."},
            {"role": "user", "content": f"Oszacuj kalorie: {text}"}
        ],
        "temperature": 0.1
    }
    try:
        response = requests.post(LM_STUDIO_URL, json=payload, timeout=10)
        content = response.json()['choices'][0]['message']['content']
        import re
        numbers = re.findall(r'\d+', content)
        return int(numbers[0]) if numbers else 0
    except:
        return 0

@app.post("/api/ai/estimate-calories")
def estimate_calories(request: schemas.CalorieRequest):
    return {"calories": ai_estimate_calories(request.text)}

# === RAG ENHANCED CHAT ===

@app.post("/api/ai/chat")
def chat_with_context(
    request: schemas.AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # 1. RAG SEARCH (Szukamy wiedzy w bazie)
    context_from_db = rag.search_documents(request.message, n_results=3)
    
    # 2. Budujemy Prompt z kontekstem RAG i Projektem
    project_context = ""
    if request.context_task_id:
        task = crud.get_task_by_id(db, task_id=request.context_task_id, user_id=current_user.id)
        if task and task.project_id:
            project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
            if project and project.context:
                project_context = f"\nMASTER PROMPT PROJEKTU: {project.context.master_prompt}"

    system_prompt = f"""
    Jesteś asystentem produktywności.
    KORZYSTAJ Z TEJ WIEDZY Z BAZY DANYCH (Jeśli pasuje do pytania):
    {context_from_db}
    
    {project_context}
    
    Odpowiadaj krótko i konkretnie.
    """
    
    reply = call_lm_studio(request.message, system_prompt)
    return {"reply": reply}

# === ENDPOINTY HEALTH & POMODORO ===

@app.post("/api/health", response_model=schemas.DailyHealth)
def create_health_entry(
    health: schemas.DailyHealthCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    new_entry = crud.create_daily_health(db=db, health=health, user_id=current_user.id)
    
    # --- RAG INDEXING ---
    # AI musi pamiętać, że byłeś gruby/smutny danego dnia
    note_content = f"Dnia {new_entry.date}: Waga {new_entry.weight}kg, Sen {new_entry.sleep_hours}h. Notatka: {new_entry.note}"
    rag.add_document(f"health_{new_entry.id}", note_content, {"type": "health", "date": str(new_entry.date)})
    # --------------------
    
    return new_entry

@app.post("/api/pomodoro", response_model=schemas.PomodoroSession)
def create_pomodoro_session(
    session: schemas.PomodoroCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_pomodoro(db=db, pomodoro=session, user_id=current_user.id)


# === LOGIKA OCENY I ROASTU (DAN PEÑA MODE + RAG) ===

def calculate_performance_score(db: Session, user_id: int):
    # (Kod bez zmian - logika punktów)
    today = date.today()
    yesterday = today - timedelta(days=1)
    tasks_today = crud.get_tasks_by_date(db, user_id, today)
    completed_today = len([t for t in tasks_today if t.is_completed])
    tasks_yesterday = crud.get_tasks_by_date(db, user_id, yesterday)
    completed_yesterday = len([t for t in tasks_yesterday if t.is_completed])
    projects = crud.get_projects_with_stats(db, user_id)
    rusting_count = len([p for p in projects if p.stats['is_rusting']])
    
    score = 50 
    score += (completed_today * 15)
    score += (completed_yesterday * 5)
    score -= (rusting_count * 20)
    return max(0, min(100, score)), completed_today, rusting_count

@app.get("/api/ai/roast")
def get_daily_roast(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    score, completed, rusting = calculate_performance_score(db, current_user.id)
    
    # RAG dla Roasta - sprawdzamy co user ostatnio robił, żeby go lepiej obrazić
    recent_context = rag.search_documents("wymówki lenistwo problemy", n_results=2)

    system_prompt = f"""
    Jesteś Danem Peña. Wynik usera: {score}/100.
    Ostatnia aktywność usera (z bazy): {recent_context}
    
    Jeśli wynik < 30: Zniszcz go. Wykorzystaj wiedzę z bazy przeciwko niemu.
    Jeśli wynik > 70: Tough love.
    Krótko (2 zdania).
    """
    
    roast_text = call_lm_studio("Roast me", system_prompt)
    if not roast_text: roast_text = "Nawet AI nie chce z tobą gadać."
    return {"roast": roast_text, "score": score}

@app.post("/api/ai/roast-chat")
def chat_with_roast_master(
    request: schemas.AIChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    score, _, _ = calculate_performance_score(db, current_user.id)
    
    # RAG w dyskusji z Danem
    context = rag.search_documents(request.message, n_results=2)

    system_prompt = f"""
    Jesteś Danem Peña. Wynik: {score}/100.
    Użytkownik się tłumaczy: "{request.message}"
    
    FAKTY Z BAZY (Użyj, by wykazać mu kłamstwo):
    {context}
    
    Zmiażdż wymówkę faktami.
    """
    
    reply = call_lm_studio(request.message, system_prompt)
    return {"reply": reply}

# === ADMIN TOOLS (RAG REINDEX) ===
@app.post("/api/admin/reindex-rag")
def reindex_existing_data(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Uruchom to RAZ, żeby wczytać stare dane do ChromaDB.
    """
    # 1. Zadania
    tasks = db.query(models.Task).filter(models.Task.owner_id == current_user.id).all()
    t_count = 0
    for t in tasks:
        rag.add_document(f"task_{t.id}", t.content, {"type": "task", "date": str(t.task_date or "inbox")})
        t_count += 1
        
    # 2. Zdrowie
    healths = db.query(models.DailyHealth).filter(models.DailyHealth.user_id == current_user.id).all()
    h_count = 0
    for h in healths:
        note = f"Dnia {h.date}: Waga {h.weight}, Sen {h.sleep_hours}. {h.note or ''}"
        rag.add_document(f"health_{h.id}", note, {"type": "health", "date": str(h.date)})
        h_count += 1
        
    return {"status": "success", "indexed_tasks": t_count, "indexed_health": h_count}