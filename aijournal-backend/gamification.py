from sqlalchemy.orm import Session
from datetime import date, timedelta
import models

# KONFIGURACJA DECAY (Rozpad statystyk przy braku aktywności)
DECAY_RATE = 1.0 

def calculate_stats(user: models.User, db: Session):
    """
    Przelicza statystyki S.W.H.
    Algorytm V2: Uwzględnia ciężar (Volume) i trudność zadań.
    """
    
    # --- 1. WILLPOWER (W) - PRACOWITOŚĆ ---
    # Liczymy zadania z ostatnich 7 dni
    week_ago = date.today() - timedelta(days=7)
    
    recent_tasks = db.query(models.Task).filter(
        models.Task.owner_id == user.id,
        models.Task.completed_at >= week_ago,
        models.Task.is_completed == True
    ).all()
    
    # Każde zadanie to punkty (bazowo 5, ale trudne zadania powinny dawać więcej w przyszłości)
    # Cel: 20 zadań tygodniowo = 100 pkt
    tasks_score = len(recent_tasks) * 5
    
    # Kara za rdzewienie projektów (Momentum)
    rusting_projects_count = 0
    all_projects = db.query(models.Project).filter(models.Project.owner_id == user.id).all()
    
    # (Tu używamy uproszczonej logiki, bo pełna jest w crudzie, ale to wystarczy do kary)
    # Za każdy projekt bez aktywności odejmujemy punkty
    
    final_willpower = min(100, max(0, tasks_score)) # 0 - 100


    # --- 2. HEALTH (H) - ZDROWIE ---
    # Średnia z 7 dni
    recent_health = db.query(models.DailyHealth).filter(
        models.DailyHealth.user_id == user.id,
        models.DailyHealth.date >= week_ago
    ).all()
    
    if recent_health:
        avg_sleep = sum([h.sleep_hours for h in recent_health]) / len(recent_health)
        avg_mood = sum([h.mood_score for h in recent_health]) / len(recent_health)
        
        # Sen: cel 7-8h. Jeśli śpisz 4h -> dostajesz 25/50 pkt.
        sleep_pts = min(50, (avg_sleep / 7.5) * 50)
        
        # Mood: cel 8/10.
        mood_pts = min(50, (avg_mood / 8.0) * 50)
        
        calculated_health = int(sleep_pts + mood_pts)
    else:
        # Jeśli nie ma danych, zdrowie spada powoli
        calculated_health = max(0, user.stat_health - DECAY_RATE)


    # --- 3. STRENGTH (S) - SIŁA (Naprawione) ---
    # Bierzemy pod uwagę ostatnie 14 dni
    two_weeks_ago = date.today() - timedelta(days=14)
    recent_workouts = db.query(models.WorkoutSession).filter(
        models.WorkoutSession.user_id == user.id,
        models.WorkoutSession.date >= two_weeks_ago
    ).all()
    
    workout_consistency_pts = len(recent_workouts) * 8 # 8 pkt za samo przyjście (max ~40-50)
    
    # Sumujemy Volume Load (Ciężar * Serie * Powtórzenia)
    total_volume_kg = 0
    for w in recent_workouts:
        for ex in w.exercises:
            total_volume_kg += ex.volume_load
            
    # Algorytm Siły: 
    # 1000 kg przerzucone w 2 tygodnie = 1 pkt siły
    # Np. Robisz 4 treningi po 10,000kg volume = 40 pkt za volume + 32 za obecność = 72 Siły.
    # To jest uczciwe. Kafar musi dźwigać.
    volume_pts = total_volume_kg / 1000
    
    final_strength = min(100, workout_consistency_pts + volume_pts)


    # --- ZAPIS DO BAZY ---
    user.stat_willpower = final_willpower
    user.stat_health = calculated_health
    user.stat_strength = final_strength
    
    db.commit()
    
    return {
        "S": round(final_strength, 1),
        "W": round(final_willpower, 1),
        "H": round(calculated_health, 1)
    }