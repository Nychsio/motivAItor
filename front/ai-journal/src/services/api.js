// Adres Twojego tunelu (BEZ PORTU, BEZ UKOŚNIKA NA KOŃCU)
const BASE_URL = 'https://wackier-deliberately-leighann.ngrok-free.dev';

// === SERCE KOMUNIKACJI (WRAPPER) ===
// Ta funkcja obsługuje każde zapytanie w aplikacji
const request = async (endpoint, options = {}) => {
    // 1. Budowanie pełnego URL
    // Jeśli endpoint zaczyna się od /api, zostawiamy, jeśli nie, dodajemy /api
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const url = `${BASE_URL}${path}`;

    // 2. Pobieranie tokenu
    const token = localStorage.getItem('accessToken');

    // 3. Budowanie nagłówków (TO JEST KLUCZOWE DLA NGROKA)
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true', // <--- OMIJA BLOKADĘ NGROKA
        ...(token && { 'Authorization': `Bearer ${token}` }), // Dodaj token jeśli jest
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        // 4. Globalna obsługa wylogowania (gdy token wygaśnie)
        if (response.status === 401) {
            console.warn('Sesja wygasła. Przekierowanie do logowania...');
            localStorage.removeItem('accessToken');
            window.location.href = '/login'; 
            return null;
        }

        // 5. Bezpieczne parsowanie odpowiedzi
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // Jeśli backend nie zwrócił JSON-a (np. pusty sukces 200 OK)
            if (response.ok) return { status: 'ok' };
            return await response.text();
        }
    } catch (error) {
        console.error(`API Error at ${endpoint}:`, error);
        throw error;
    }
};

// === DEFINICJE ENDPOINTÓW ===
export const api = {
    // --- AUTH ---
    login: (credentials) => request('/login', { method: 'POST', body: JSON.stringify(credentials) }),

    // --- TASKS ---
    getTasks: (dateStr) => request(`/tasks/${dateStr}`),
    
    getInboxTasks: () => request('/tasks/inbox'),
    
    // Obsługa tygodnia (tymczasowo dzisiejsza data)
    getWeeklyTasks: () => {
        const dateStr = new Date().toISOString().split('T')[0];
        return request(`/tasks/${dateStr}`);
    },

    addTask: (taskData) => request('/tasks', { 
        method: 'POST', 
        body: JSON.stringify(taskData) 
    }),

    updateTask: (taskId, updates) => request(`/tasks/${taskId}`, { 
        method: 'PUT', 
        body: JSON.stringify(updates) 
    }),

    toggleTask: (taskId) => request(`/tasks/${taskId}/toggle`, { method: 'PUT' }),

    deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),

    // --- PROJECTS ---
    getProjects: () => request('/projects'),

    createProject: (projectData) => request('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
    }),

    // --- CORE AI & BRAIN DUMP ---
    processBrainDump: (text, dateStr) => request('/ai/process-braindump', {
        method: 'POST',
        body: JSON.stringify({ text, task_date: dateStr })
    }),

    chatWithAI: (message, contextTaskId = null) => {
        const body = { message };
        if (contextTaskId) body.context_task_id = contextTaskId;
        return request('/ai/chat', { method: 'POST', body: JSON.stringify(body) });
    },
    
    estimateCalories: (text) => request('/ai/estimate-calories', {
        method: 'POST',
        body: JSON.stringify({ text })
    }),

    // --- GYM & WORKOUTS (SIŁOWNIA) ---
    saveWorkout: (workoutData) => request('/gym/workouts', {
        method: 'POST',
        body: JSON.stringify(workoutData)
    }),

    getWorkouts: () => request('/gym/workouts'),

    getExerciseLibrary: () => request('/gym/exercises'),

    // --- PLANS (Szablony Treningowe) ---
    getPlans: () => request('/gym/plans'),

    createPlan: (planData) => request('/gym/plans', {
        method: 'POST',
        body: JSON.stringify(planData)
    }),

    deletePlan: (planId) => request(`/gym/plans/${planId}`, { method: 'DELETE' }),

    // AI Architect (Generator Planów)
    generatePlanAI: (description) => request('/gym/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ description })
    }),

    // --- GYM AI COACH & ANALYTICS ---
    getGymVolumeStats: () => request('/gym/analytics/volume'),

    chatWithGymCoach: (message) => request('/gym/coach/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
    }),

    // --- GAMIFICATION & HEALTH ---
    getGamificationStats: () => request('/gamification/stats'),

    saveDailyHealth: (healthData) => request('/health', {
        method: 'POST',
        body: JSON.stringify(healthData)
    }),
    
    savePomodoro: (sessionData) => request('/pomodoro', {
        method: 'POST',
        body: JSON.stringify(sessionData)
    }),

    chatRoast: (message) => request('/ai/roast-chat', { 
        method: 'POST', 
        body: JSON.stringify({ message }) 
    }),

    getRoast: () => request('/ai/roast')
    
    
};