# 📘 AI Journal Core - Specyfikacja Techniczna Backendu

**Wersja:** 4.0 (Deep Dive) **Status:** Produkcyjny (Development) **Data:** 04.12.2025 **Główny Architekt:** Piotr Niemiec

## 1. Architektura Systemu

System oparty jest na architekturze **Monolitycznej (Modular Monolith)** z wykorzystaniem wzorca **Layered Architecture** (Warstwy: Router -> Service/CRUD -> Data Access -> Database).

### 1.1 Stos Technologiczny

- **Runtime:** Python 3.10.x (Zarządzanie przez Conda)
    
- **Web Framework:** FastAPI 0.100+ (Asynchroniczne I/O oparte na Starlette)
    
- **ASGI Server:** Uvicorn (Standard komunikacji asynchronicznej)
    
- **Database:** PostgreSQL 14+ (Relacyjna, ACID, JSONB support)
    
- **ORM:** SQLAlchemy 1.4+ (Tryb synchroniczny z `Session`)
    
- **Data Validation:** Pydantic V2 (Silne typowanie, serializacja)
    
- **LLM Interface:** REST HTTP Client (do lokalnej instancji LM Studio / OpenAI API spec)
    

### 1.2 Przepływ Żądania (Request Flow)

1. **Klient (React):** Wysyła żądanie HTTP z nagłówkiem `Authorization: Bearer <token>`.
    
2. **Middleware (CORS):** Weryfikacja domeny (`localhost:3000`).
    
3. **Dependency Injection (`Depends`):**
    
    - `get_db()`: Otwiera sesję bazy danych.
        
    - `get_current_user()`: Dekoduje JWT, waliduje sygnaturę, pobiera usera z DB.
        
4. **Router (`main.py`):** Kieruje do odpowiedniej funkcji kontrolera.
    
5. **CRUD Layer (`crud.py`):** Wykonuje operacje na modelach ORM.
    
6. **Database:** Wykonanie zapytania SQL.
    
7. **Response:** Serializacja modelu ORM do formatu JSON przez Pydantic (`schemas.py`).
    

## 2. Schemat Bazy Danych (ERD & Schema)

Wszystkie klucze główne (`PK`) są typu `INTEGER` (Auto-increment/Serial). Klucze obce (`FK`) posiadają więzy integralności (`ForeignKey`).

### 2.1 Tabela `users` (Identity)

|Kolumna|Typ SQL|Ograniczenia|Opis|
|---|---|---|---|
|`id`|INTEGER|PK, SERIAL|Unikalny identyfikator|
|`email`|VARCHAR|UNIQUE, NOT NULL, INDEX|Login użytkownika|
|`hashed_password`|VARCHAR|NOT NULL|Hash bcrypt (z solą)|

### 2.2 Tabela `projects` (Core Domain)

Reprezentuje kontenery zadań. Posiada logikę grywalizacji. | Kolumna | Typ SQL | Ograniczenia | Opis | | :--- | :--- | :--- | :--- | | `id` | INTEGER | PK, SERIAL | | | `owner_id` | INTEGER | FK -> users.id | Właściciel | | `name` | VARCHAR | NOT NULL | Nazwa projektu | | `description` | VARCHAR | NULLABLE | Opis (dla człowieka) | | `color` | VARCHAR | DEFAULT '#12d3b9' | Kolor HEX dla UI | | `default_duration` | INTEGER | DEFAULT 25 | Czas sesji Focus (min) |

### 2.3 Tabela `project_contexts` (AI Knowledge)

Relacja 1:1 z `projects`. Przechowuje "pamięć" AI o projekcie. | Kolumna | Typ SQL | Ograniczenia | Opis | | :--- | :--- | :--- | :--- | | `id` | INTEGER | PK, SERIAL | | | `project_id` | INTEGER | FK -> projects.id, UNIQUE | | | `master_prompt` | TEXT | NULLABLE | Instrukcja systemowa dla LLM |

### 2.4 Tabela `tasks` (Action Items)

Obsługuje logikę Inbox/Calendar. | Kolumna | Typ SQL | Ograniczenia | Opis | | :--- | :--- | :--- | :--- | | `id` | INTEGER | PK, SERIAL | | | `owner_id` | INTEGER | FK -> users.id | | | `project_id` | INTEGER | FK -> projects.id, NULLABLE | NULL = Inbox (brak projektu) | | `content` | VARCHAR | NOT NULL | Treść zadania | | `is_completed` | BOOLEAN | DEFAULT FALSE | Status wykonania | | `task_date` | DATE | NULLABLE, INDEX | NULL = Inbox, Date = Plan | | `priority` | VARCHAR | DEFAULT 'medium' | Priorytet wizualny | | `order` | INTEGER | DEFAULT 0 | Pozycja na liście (Drag&Drop) | | `completed_at` | TIMESTAMP | NULLABLE | Data wykonania (do Momentum) |

### 2.5 Tabela `pomodoro_sessions` (Work Logs)

|Kolumna|Typ SQL|Ograniczenia|Opis|
|---|---|---|---|
|`id`|INTEGER|PK, SERIAL||
|`owner_id`|INTEGER|FK -> users.id||
|`project_id`|INTEGER|FK -> projects.id, NULLABLE|Przypisanie czasu do projektu|
|`date`|DATE|NOT NULL, INDEX|Data sesji|
|`duration`|INTEGER|DEFAULT 25|Czas w minutach|
|`tag`|VARCHAR|DEFAULT 'work'|Tag analityczny|

### 2.6 Tabela `daily_health` (Metrics)

|Kolumna|Typ SQL|Ograniczenia|Opis|
|---|---|---|---|
|`id`|INTEGER|PK, SERIAL||
|`owner_id`|INTEGER|FK -> users.id||
|`date`|DATE|NOT NULL, INDEX|Data pomiaru|
|`sleep_hours`|FLOAT|DEFAULT 0.0|Sen (h)|
|`weight`|FLOAT|DEFAULT 0.0|Waga (kg)|
|`calories`|INTEGER|DEFAULT 0|Spożycie (kcal)|
|`mood_score`|INTEGER|DEFAULT 5|Skala 1-10|
|`note`|TEXT|NULLABLE|Kontekst dla AI|

## 3. Algorytmy i Logika Biznesowa

### 3.1 Algorytm "Momentum & Rusting" (Mechanika Rdzy)

System oblicza stan zdrowia projektu (`is_rusting`) w czasie rzeczywistym przy każdym zapytaniu `GET /projects`.

**Implementacja:** `crud.get_projects_with_stats` **Parametry:** `RUST_THRESHOLD_DAYS = 5`

**Kroki:**

1. Pobierz projekt `P`.
    
2. Znajdź datę ostatniego ukończonego zadania: `T_last = MAX(Task.completed_at) WHERE Task.project_id == P.id`.
    
3. Znajdź datę ostatniej sesji Pomodoro: `S_last = MAX(Pomodoro.date) WHERE Pomodoro.project_id == P.id`.
    
4. Wyznacz `Last_Activity = MAX(T_last, S_last)`.
    
5. Jeśli `Last_Activity` jest `None` (brak aktywności) ORAZ `Count(Tasks) > 0` -> **RUSTING = TRUE**.
    
6. Jeśli `Current_Date - Last_Activity > 5 dni` -> **RUSTING = TRUE**.
    
7. W przeciwnym razie -> **RUSTING = FALSE**.
    

### 3.2 Context Injection Pipeline (AI Chat)

Proces wzbogacania promptu użytkownika o kontekst biznesowy.

**Implementacja:** `main.chat_with_context`

**Pipeline:**

1. **Input:** `message` (pytanie usera), `context_task_id` (opcjonalne ID zadania).
    
2. **Task Lookup:** Jeśli podano `task_id`, pobierz obiekt `Task` z DB.
    
3. **Project Lookup:** Jeśli `Task` ma `project_id`, pobierz obiekt `Project`.
    
4. **Context Retrieval:** Pobierz `ProjectContext.master_prompt`.
    
5. **Prompt Assembly:**
    
    ```
    SYSTEM: Jesteś mentorem. Odpowiadaj krótko.
    CONTEXT: [Tutaj wklejony Master Prompt Projektu]
    TASK INFO: Zadanie: "Napisać API", Status: Do zrobienia.
    USER: [Pytanie użytkownika]
    ```
    
6. **Execution:** Wyślij do LLM -> Zwróć odpowiedź.
    

## 4. Bezpieczeństwo i Autoryzacja

### 4.1 JWT Flow

- **Algorytm:** HS256 (HMAC with SHA-256).
    
- **Payload:** `{"sub": "user_email", "exp": timestamp}`.
    
- **Expiration:** Domyślnie 30 minut (konfigurowalne w `.env`).
    

### 4.2 Password Security

- **Hashing:** bcrypt (zaimplementowany przez `passlib`).
    
- **Weryfikacja:** Porównanie hasha przy logowaniu. Hasła w formie jawnej **nigdy** nie są zapisywane.
    

## 5. Integracja z AI (LM Studio)

### 5.1 Endpointy LLM

- **URL:** `http://localhost:1234/v1/chat/completions` (Standard OpenAI).
    
- **Model:** `local-model` (nazwa symboliczna, LM Studio używa załadowanego modelu).
    
- **Temperatura:**
    
    - `0.1` dla zadań analitycznych (liczenie kalorii).
        
    - `0.3` dla konwersji Brain Dump (kreatywność kontrolowana).
        
    - `0.7` dla czatu mentorskiego (większa swoboda).
        

### 5.2 Parsowanie JSON (Brain Dump)

Model AI często zwraca tekst otoczony markdownem (np. `json [...]` ). **Logika czyszcząca (`main.process_braindump_with_ai`):**

1. Pobierz surowy tekst (`content`).
    
2. Usuń frazy ` ```json ` i ` ``` `.
    
3. Użyj `json.loads()`.
    
4. Jeśli parsowanie się nie uda (np. model zwrócił zwykły tekst), potraktuj cały tekst jako jedno zadanie (Fallback).
    

## 6. Struktura Katalogów i Plików

```
aijournal-backend/
├── main.py             # Router API, Konfiguracja FastAPI, Endpointy
├── models.py           # Definicje tabel SQLAlchemy (User, Project, Task...)
├── schemas.py          # Modele Pydantic (Request/Response DTOs)
├── crud.py             # Warstwa dostępu do danych (Logika biznesowa SQL)
├── auth.py             # Logika bezpieczeństwa (JWT, Hashowanie)
├── database.py         # Konfiguracja połączenia z PostgreSQL (Engine, Session)
├── reset_db.py         # Skrypt narzędziowy: DROP ALL + CREATE ALL
├── create_user.py      # Skrypt narzędziowy: Seedowanie pierwszego użytkownika
└── .env                # Zmienne środowiskowe (Secret Key, DB URL)
```

## 7. Przewodnik po API (Endpoints Reference)

|Metoda|Ścieżka|Opis|Wymagany Auth|
|---|---|---|---|
|**AUTH**||||
|POST|`/api/login`|Logowanie (zwraca token)|NIE|
|GET|`/api/users/me`|Pobranie profilu|TAK|
|**PROJECTS**||||
|GET|`/api/projects`|Lista projektów + statystyki Rdzy|TAK|
|POST|`/api/projects`|Utworzenie projektu|TAK|
|**TASKS**||||
|GET|`/api/tasks/inbox`|Zadania bez daty (Inbox)|TAK|
|GET|`/api/tasks/{date}`|Zadania na dzień (Kalendarz)|TAK|
|POST|`/api/tasks`|Dodanie zadania (Inbox lub Dziś)|TAK|
|PUT|`/api/tasks/{id}`|Edycja (zmiana daty/projektu)|TAK|
|PUT|`/api/tasks/{id}/toggle`|Toggle Status (Done/Undone)|TAK|
|DELETE|`/api/tasks/{id}`|Usunięcie zadania|TAK|
|**AI & TOOLS**||||
|POST|`/api/ai/chat`|Czat kontekstowy|TAK|
|POST|`/api/ai/process-braindump`|Text -> Tasks (JSON)|TAK|
|POST|`/api/ai/estimate-calories`|Text -> Int (Kcal)|TAK|
|POST|`/api/pomodoro`|Logowanie sesji|TAK|
|POST||||
