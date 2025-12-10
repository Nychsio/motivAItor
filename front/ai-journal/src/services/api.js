// src/services/api.js
const API_URL = 'http://localhost:3001/api';

const getHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const api = {

  // Pobiera zadania na konkretny dzień
  getTasks: async (dateStr) => {
    const res = await fetch(`${API_URL}/tasks/${dateStr}`, { headers: getHeaders() });
    return res.json();
  },

  // 1. Pobieranie Inboxa (zaktualizowane o użycie API_URL i getHeaders)
  getInboxTasks: async () => {
    const res = await fetch(`${API_URL}/tasks/inbox`, { 
      headers: getHeaders() 
    });
    return res.json();
  },

  // 2. Aktualizacja zadania (np. zmiana daty przy Drag & Drop)
  updateTask: async (taskId, updates) => {
    // UWAGA DO BACKENDU (Piotr):
    // Upewnij się, że w main.py istnieje endpoint PUT /api/tasks/{task_id}
    // Przyjmujący model TaskUpdate (lub podobny partial update).
    
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT', // lub PATCH, zależnie od implementacji backendu
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // TO DO: Backend musi obsłużyć zakres dat dla widoku tygodniowego
  // Na razie pobierzemy dzisiejsze jako placeholder
  getWeeklyTasks: async () => {
     // Tutaj w przyszłości: ?start_date=X&end_date=Y
    const dateStr = new Date().toISOString().split('T')[0]; 
    const res = await fetch(`${API_URL}/tasks/${dateStr}`, { headers: getHeaders() });
    return res.json();
  },

  getProjects: async () => {
    const res = await fetch(`${API_URL}/projects`, { headers: getHeaders() });
    return res.json();
  },

  addTask: async (taskData) => {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskData)
    });
    return res.json();
  },

  toggleTask: async (taskId) => {
    const res = await fetch(`${API_URL}/tasks/${taskId}/toggle`, {
        method: 'PUT',
        headers: getHeaders()
    });
    return res.json();
  },

  // Logika Drag & Drop Chat
  chatWithAI: async (message, contextTaskId = null) => {
    const body = { message };
    if (contextTaskId) body.context_task_id = contextTaskId;

    const res = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return res.json();
  },

  processBrainDump: async (text, dateStr) => {
    const res = await fetch(`${API_URL}/ai/process-braindump`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        text: text,
        task_date: dateStr
      })
    });
    return res.json();
  },

  deleteTask: async (taskId) => {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  }
};