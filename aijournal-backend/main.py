from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta, date

# Importujemy nasze nowe, czyste moduły
from database import get_db, engine
import models
import schemas
import crud
import auth
import requests
import json

# Tworzy tabele w bazie (w tym nową tabelę Task)
models.Base.metadata.create_all(bind=engine)

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
    Nowy endpoint logowania. Używa OAuth2 form (username=...&password=...)
    zamiast JSON, bo tego oczekuje FastAPI. Zwraca token JWT.
    """
    user = crud.get_user_by_email(db, email=form_data.username) # form_data.username to email
    
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

# === ENDPOINTY ZADAŃ (NOWE) ===
# Wszystkie te endpointy są "chronione" przez Depends(auth.get_current_active_user)
# Jeśli token jest zły, FastAPI automatycznie zwróci błąd 401.

@app.post("/api/tasks", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Tworzy nowe zadanie dla zalogowanego użytkownika."""
    return crud.create_user_task(db=db, task=task, user_id=current_user.id)

@app.get("/api/tasks/{task_date}", response_model=list[schemas.Task])
def read_tasks_for_date(
    task_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Pobiera listę zadań dla zalogowanego użytkownika na dany dzień."""
    return crud.get_tasks_by_date(db=db, user_id=current_user.id, task_date=task_date)

@app.put("/api/tasks/{task_id}/toggle", response_model=schemas.Task)
def toggle_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Zmienia status (ukończone/nieukończone) zadania."""
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
    """Usuwa zadanie."""
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return crud.delete_task(db=db, db_task=db_task)

# === ENDPOINT AI BRAIN DUMP (NOWY) ===
# ... (reszta endpointów) ...

# === ENDPOINT DLA AI (DODAJ NA SAMYM DOLE) ===

def call_lm_studio(text: str) -> list[str]:
    """
    Wywołuje LM Studio z promptem systemowym, aby przetworzyć tekst na listę zadań.
    """
    LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"
    
    SYSTEM_PROMPT = """
    Jesteś agentem produktywności. Twoim zadaniem jest konwertowanie
    luźnego tekstu (brain dump) na listę konkretnych zadań w formacie JSON.
    
    ZASADY:
    1. Odpowiadaj WYŁĄCZNIE surowym JSONem. Żadnego "Oto twoja lista" ani markdowna ```json.
    2. Format to lista stringów: ["Zadanie 1", "Zadanie 2"].
    3. Rozbijaj duże zadania na mniejsze kroki, jeśli to ma sens.
    
    PRZYKŁAD:
    User: "Muszę zrobić projekt i kupić mleko"
    AI: ["Zrobić projekt", "Kupić mleko"]
    """
    
    payload = {
        "model": "gemma-3-12b-it", # Tu wpisz nazwę swojego modelu z LM Studio, ale "local-model" też zadziała
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
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
            raise HTTPException(status_code=503, detail=f"Błąd LM Studio: {response.status_code}")
            
        data = response.json()
        raw_content = data['choices'][0]['message']['content']
        print(f"AI Response Raw: {raw_content}")
        
        # Czyszczenie odpowiedzi (Gemma czasem dodaje ```json na początku)
        clean_content = raw_content.replace("```json", "").replace("```", "").strip()
        
        task_list = json.loads(clean_content)
        return task_list
            
    except Exception as e:
        print(f"AI Critical Error: {e}")
        # Fallback: Jeśli AI zwariuje, zwróć po prostu tekst użytkownika jako jedno zadanie
        return [text]

@app.post("/api/ai/process-braindump", response_model=list[schemas.Task])
def process_braindump_with_ai(
    request: schemas.BrainDumpRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    print(f"AI: Przetwarzam tekst: '{request.text}'")
    
    # 1. Pytamy AI
    task_strings = call_lm_studio(request.text)
    
    created_tasks = []
    # 2. Zapisujemy wyniki w bazie
    for task_content in task_strings:
        task_data = schemas.TaskCreate(
            content=str(task_content),
            task_date=request.task_date,
            is_completed=False,
            points=10
        )
        new_task = crud.create_user_task(db=db, task=task_data, user_id=current_user.id)
        created_tasks.append(new_task)
        
    return created_tasks