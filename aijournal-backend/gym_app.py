# G:\MotivAItor\aijournal-backend\gym_app.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel # <--- TO BYŁO BRAKUJĄCE OGNIWO!
import requests
import json
import os
import models
import schemas
import database
import auth
import rag
# Konfiguracja routera
router = APIRouter(
    prefix="/api/gym",
    tags=["gym"]
)

# --- MODELE DANYCH DLA AI ---
class PlanRequest(BaseModel):
    description: str

# --- POMOCNICZE FUNKCJE AI ---
def quick_ai_call(system_prompt: str, user_prompt: str):
    """
    Szybki strzał do AI korzystający z konfiguracji w .env (DeepSeek/LM Studio)
    """
    # 1. Pobieramy konfigurację z .env (tak jak w main.py)
    base_url = os.getenv("AI_BASE_URL", "http://localhost:1234/v1")
    api_key = os.getenv("AI_API_KEY", "lm-studio")
    model_name = os.getenv("AI_MODEL_NAME", "local-model") # <--- WAŻNE: Czyta z env, nie na sztywno!

    # 2. Budujemy poprawny URL
    if "chat/completions" not in base_url:
        url = f"{base_url}/chat/completions"
    else:
        url = base_url
    
    # 3. Nagłówki z autoryzacją (Kluczowe dla DeepSeek)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}" if api_key else ""
    }
    
    payload = {
        "model": model_name, # <--- Tu DeepSeek dostanie swoją nazwę "deepseek-chat"
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.7,
        "stream": False
    }

    try:
        # Pamiętaj o dodaniu headers=headers!
        res = requests.post(url, json=payload, headers=headers, timeout=60)
        
        if res.status_code == 200:
            return res.json()['choices'][0]['message']['content']
        else:
            print(f"Gym AI Error Status: {res.status_code} Body: {res.text}")
            return None
    except Exception as e:
        print(f"Gym AI Connection Error: {e}")
        return None

# --- ENDPOINTY ---

# 1. Pobierz listę wszystkich ćwiczeń (Kaggle Dataset)
@router.get("/exercises", response_model=List[schemas.ExerciseOption])
def get_all_exercises(db: Session = Depends(database.get_db)):
    # Pobieramy wszystko - frontend to sobie przefiltruje
    return db.query(models.ExerciseLibrary).all()

# 2. Stwórz nowy Plan (Szablon)
@router.post("/plans", response_model=schemas.WorkoutPlan)
def create_workout_plan(
    plan: schemas.WorkoutPlanCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_plan = models.WorkoutPlan(
        owner_id=current_user.id,
        name=plan.name,
        description=plan.description,
        color=plan.color,
        exercises_structure=plan.exercises_structure
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

# 3. Pobierz Plany Użytkownika
@router.get("/plans", response_model=List[schemas.WorkoutPlan])
def get_my_plans(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    plans = db.query(models.WorkoutPlan).filter(models.WorkoutPlan.owner_id == current_user.id).all()
    return plans

# 4. Usuń Plan
@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    plan = db.query(models.WorkoutPlan).filter(models.WorkoutPlan.id == plan_id, models.WorkoutPlan.owner_id == current_user.id).first()
    if plan:
        db.delete(plan)
        db.commit()
    return {"status": "deleted"}

# 5. GENERATOR AI (AI ARCHITECT)
@router.post("/ai-generate", response_model=List[dict])
def generate_ai_plan(
    req: PlanRequest,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    print(f"AI Generuje plan dla: {req.description}")
    
    # Bardzo ścisły prompt, żeby AI nie lało wody
    system_prompt = """
    Jesteś profesjonalnym trenerem siłowym. 
    Twoim zadaniem jest ułożenie planu treningowego (listy ćwiczeń) na podstawie opisu.
    
    ZASADY:
    1. Zwróć TYLKO czysty JSON w formacie listy. Żadnego tekstu przed ani po.
    2. Format obiektu: {"name": "Nazwa Ćwiczenia (Angielska)", "sets": liczba_int, "reps": "string"}
    3. Wybieraj popularne ćwiczenia (np. Bench Press, Squat, Deadlift, Pull Up).
    4. Dobierz serie i powtórzenia do celu użytkownika.
    
    Przykład odpowiedzi:
    [{"name": "Squat", "sets": 4, "reps": "6-8"}, {"name": "Leg Press", "sets": 3, "reps": "12"}]
    """

    raw_response = quick_ai_call(system_prompt, req.description)
    
    if not raw_response:
        raise HTTPException(status_code=500, detail="Błąd połączenia z AI.")

    # Czyszczenie odpowiedzi (AI czasem dodaje ```json)
    clean_json = raw_response.replace("```json", "").replace("```", "").strip()
    
    try:
        plan_structure = json.loads(clean_json)
        if not isinstance(plan_structure, list):
             # Czasem AI zwraca obiekt {"exercises": [...]}, naprawmy to
            if isinstance(plan_structure, dict) and "exercises" in plan_structure:
                plan_structure = plan_structure["exercises"]
            else:
                raise ValueError("AI nie zwróciło listy")
        return plan_structure
    except Exception as e:
        print(f"Błąd parsowania JSON: {clean_json}")
        # Fallback - zwracamy pustą listę zamiast wywalać błąd 500
        raise HTTPException(status_code=422, detail="AI zwróciło błędny format danych.")

# 6. Zapisywanie wykonanego treningu (Logbook)
@router.post("/workouts", response_model=schemas.WorkoutSession)
def log_workout(
    workout: schemas.WorkoutSessionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_session = models.WorkoutSession(
        user_id=current_user.id,
        date=workout.date,
        name=workout.name,
        duration_minutes=workout.duration_minutes,
        note=workout.note
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    total_vol = 0
    exercise_summaries = []

    for ex in workout.exercises:
        calc_reps = 0
        try:
            first_rep_str = ex.reps.replace('/', ',').split(',')[0].strip()
            calc_reps = int(first_rep_str)
        except:
            calc_reps = 0
            
        calculated_volume = ex.sets * calc_reps * ex.weight
        total_vol += calculated_volume

        # Zbieramy info do RAG
        exercise_summaries.append(f"{ex.exercise_name}: {ex.sets}x{ex.reps} @ {ex.weight}kg")

        db_log = models.ExerciseLog(
            session_id=db_session.id,
            exercise_name=ex.exercise_name,
            sets=ex.sets,
            reps=ex.reps,
            weight=ex.weight,
            volume_load=calculated_volume
        )
        db.add(db_log)
    
    db.commit()
    db.refresh(db_session)

    # --- RAG SYNC (NOWOŚĆ) ---
    # Tworzymy notatkę tekstową dla AI
    rag_content = f"Trening '{workout.name}' (Czas: {workout.duration_minutes}min, Objętość: {total_vol}kg). Ćwiczenia: {', '.join(exercise_summaries)}. Notatka: {workout.note or ''}"
    
    try:
        rag.add_document(
            doc_id=f"workout_{db_session.id}", 
            text=rag_content, 
            metadata={
                "type": "workout", 
                "date": str(workout.date)
            },
            user_id=current_user.id  # <--- DODANO TO: Bezpieczeństwo
        )
        print(f"[GYM] Trening zindeksowany w RAG dla User {current_user.id}")
    except Exception as e:
        print(f"[GYM] Błąd indeksowania RAG: {e}")
    # -------------------------

    return db_session

# 7. Pobieranie historii
@router.get("/workouts", response_model=List[schemas.WorkoutSession])
def get_workouts(
    skip: int = 0, limit: int = 20,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return db.query(models.WorkoutSession)\
        .filter(models.WorkoutSession.user_id == current_user.id)\
        .order_by(models.WorkoutSession.date.desc())\
        .offset(skip).limit(limit).all()

# 8. Usuwanie
@router.delete("/workouts/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    workout = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.id == workout_id,
        models.WorkoutSession.user_id == current_user.id
    ).first()
    if workout:
        db.delete(workout)
        db.commit()
    return {"status": "deleted"}


# G:\MotivAItor\aijournal-backend\gym_app.py

# ... (poprzednie importy i kod) ...

# NOWY MODEL DLA CHATU
class GymChatRequest(BaseModel):
    message: str

# 9. ENDPOINT ANALITYCZNY (DANE DO WYKRESU)
@router.get("/analytics/volume", response_model=List[dict])
def get_volume_analytics(
    days: int = 30,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Zwraca sumę Volume Load dla każdego treningu z ostatnich X dni."""
    import datetime
    cutoff_date = datetime.date.today() - datetime.timedelta(days=days)
    
    sessions = db.query(models.WorkoutSession)\
        .filter(models.WorkoutSession.user_id == current_user.id)\
        .filter(models.WorkoutSession.date >= cutoff_date)\
        .order_by(models.WorkoutSession.date.asc())\
        .all()
    
    data = []
    for s in sessions:
        # Oblicz volume dla sesji
        total_vol = sum([l.volume_load for l in s.exercises])
        data.append({
            "date": s.date.strftime("%Y-%m-%d"),
            "name": s.name,
            "volume": total_vol
        })
    return data

# 10. AI COACH CHAT (Z KONTEKSTEM HISTORII)
@router.post("/coach/chat")
def chat_with_gym_coach(
    req: GymChatRequest,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # 1. Pobierz ostatnie 5 treningów jako kontekst
    recent_workouts = db.query(models.WorkoutSession)\
        .filter(models.WorkoutSession.user_id == current_user.id)\
        .order_by(models.WorkoutSession.date.desc())\
        .limit(5).all()
    
    history_context = "OSTATNIE TRENINGI UŻYTKOWNIKA:\n"
    for w in recent_workouts:
        history_context += f"- {w.date} ({w.name}): "
        exercises_str = ", ".join([f"{e.exercise_name} ({e.weight}kg)" for e in w.exercises[:5]])
        history_context += exercises_str + "...\n"

    system_prompt = f"""
    Jesteś doświadczonym trenerem personalnym (Iron Mentor).
    Masz wgląd w historię treningową użytkownika.
    
    {history_context}
    
    Użytkownik pyta: "{req.message}"
    
    Odpowiadaj krótko, merytorycznie i motywująco. 
    Odnoś się do jego ostatnich wyników (np. "Wczoraj zrobiłeś ładny wynik na klatę, więc dziś odpocznij").
    """
    
    response = quick_ai_call(system_prompt, req.message)
    return {"reply": response or "Trener poszedł na białko (Błąd AI)."}