// 1. Importujemy narzędzia (w stylu CommonJS)
const express = require('express');
const { PrismaClient } = require('./prisma/generated/client'); // <-- WAŻNE: Poprawna ścieżka
const cors = require('cors'); // <-- DODANE: Do obsługi zapytań z frontendu

// 2. Inicjalizujemy narzędzia
const app = express(); // Tworzymy nową aplikację (serwer)
const prisma = new PrismaClient(); // Tworzymy instancję klienta Prismy
const PORT = process.env.PORT || 3001; // Serwer będzie działał na porcie 3001

// 3. Uczymy serwer czytać JSONy i obsługiwać CORS
app.use(cors()); // <-- DODANE: Pozwala na zapytania z innego portu (np. Reacta)
app.use(express.json()); // (Ważne, żeby API rozumiało dane wysyłane z Reacta)

// --- TUTAJ ZACZYNA SIĘ WASZE API ---

/*
 * Endpoint testowy: GET /api/test
 * Sprawdza, czy serwer w ogóle żyje.
 */
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hej, API działa! Jesteśmy gotowi.' });
});

/*
 * Endpoint: GET /api/users
 * Pobiera wszystkich użytkowników z tabeli 'users'.
 */
app.get('/api/users', async (req, res) => {
  try {
    // To jest magia Prismy. Zero SQL-a.
    const users = await prisma.users.findMany(); // ZNAJDŹ WIELU 'users'
    
    res.json(users); // Wyślij znalezionych userów jako odpowiedź
  } catch (error) {
    console.error("Błąd przy pobieraniu userów:", error);
    res.status(500).json({ error: 'Nie udało się pobrać danych z bazy.' });
  }
});

/*
 * Endpoint: POST /api/login
 * Obsługuje logowanie użytkownika.
 */
app.post('/api/login', async (req, res) => {
  // 1. Pobierz dane wysłane z formularza logowania (z Reacta)
  const { username, password } = req.body;

  // 2. Sprawdź, czy użytkownik w ogóle coś wysłał
  if (!username || !password) {
    return res.status(400).json({ error: 'Musisz podać login i hasło.' });
  }

  try {
    // 3. Znajdź użytkownika w bazie danych po jego emailu (bo email jest @unique)
    const user = await prisma.users.findUnique({
      where: {
        email: username // Zakładamy, że pole 'username' z formularza to email
      }
    });

    // 4. Jeśli nie ma użytkownika LUB hasło się nie zgadza
    // 
    // !!! BARDZO WAŻNE: TO JEST GIGANTYCZNA DZIURA BEZPIECZEŃSTWA !!!
    // Przechowujesz hasła czystym tekstem. Musicie użyć `bcrypt` do hashowania
    // i `bcrypt.compare` do sprawdzania. To jest tylko tymczasowe!
    //
    if (!user || user.hashed_password !== password) {
      return res.status(401).json({ error: 'Błędny login lub hasło.' });
    }

    // 5. Jeśli wszystko się zgadza, wyślij dane użytkownika (bez hasła)
    const { hashed_password, ...userData } = user;
    res.json({ message: 'Logowanie pomyślne!', user: userData });

  } catch (error) {
    console.error("Błąd podczas logowania:", error);
    res.status(500).json({ error: 'Wystąpił błąd serwera.' });
  }
});

// --- KONIEC API ---

// 4. Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`🚀 Serwer API uruchomiony na http://localhost:${PORT}`);
});