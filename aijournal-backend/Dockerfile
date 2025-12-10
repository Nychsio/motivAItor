# Używamy lekkiego obrazu Pythona
FROM python:3.10-slim

# Ustawiamy katalog roboczy
WORKDIR /app

# Instalujemy zależności systemowe (potrzebne np. do psycopg2 - postgresa)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Kopiujemy plik z zależnościami (Szymon ma to wygenerować, jak nie macie: pip freeze > requirements.txt)
COPY requirements.txt .

# Instalujemy paczki
RUN pip install --no-cache-dir -r requirements.txt

# Kopiujemy resztę kodu
COPY . .

# Odpalamy serwer. UWAGA: host 0.0.0.0 jest konieczny w Dockerze!
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3001", "--reload"]