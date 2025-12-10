import React, { useState } from 'react';
import { api } from '../services/api';
import '../styles/AIChatSidebar.css'; // Zaraz stworzymy ten CSS

const AIChatSidebar = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Cześć! Przeciągnij tutaj zadanie, jeśli chcesz o nim pogadać, albo po prostu zapytaj.' }
  ]);
  const [input, setInput] = useState('');
  const [draggedContext, setDraggedContext] = useState(null); // Tutaj trzymamy info o "upuszczonym" zadaniu
  const [isLoading, setIsLoading] = useState(false);

  // --- OBSŁUGA DRAG & DROP ---
  const handleDragOver = (e) => {
    e.preventDefault(); // Niezbędne, żeby pozwolić na Drop
    e.currentTarget.classList.add('drag-over'); // Dodaj klasę wizualną
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData("taskId");
    const taskContent = e.dataTransfer.getData("taskContent");

    if (taskId) {
      setDraggedContext({ id: taskId, title: taskContent });
      // Automatycznie dodaj wiadomość systemową, że kontekst został ustawiony
      setMessages(prev => [...prev, { 
        role: 'system', 
        text: `🎯 Kontekst ustawiony: "${taskContent}". O co chcesz zapytać?` 
      }]);
    }
  };

  // --- WYSYŁANIE WIADOMOŚCI ---
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      // Wywołujemy backend z kontekstem (jeśli jest)
      const response = await api.chatWithAI(userMsg, draggedContext?.id);
      
      setMessages(prev => [...prev, { role: 'ai', text: response.reply }]);
      
      // Opcjonalnie: Czyścimy kontekst po odpowiedzi, lub zostawiamy
      // setDraggedContext(null); 
    } catch (error) {
      setMessages(prev => [...prev, { role: 'error', text: 'Błąd połączenia z mózgiem AI.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`ai-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="ai-header">
        <h3>AI MENTOR</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      {/* STREFA DROP */}
      <div 
        className="ai-chat-window"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && <div className="chat-msg ai loading">Myślę...</div>}
        
        {/* Wskaźnik aktywnego kontekstu */}
        {draggedContext && (
          <div className="active-context-badge">
            Rozmawiamy o: <strong>{draggedContext.title}</strong>
            <button onClick={() => setDraggedContext(null)}>✕</button>
          </div>
        )}
      </div>

      <div className="ai-input-area">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={draggedContext ? "Zapytaj o to zadanie..." : "Wpisz wiadomość..."}
        />
        <button onClick={handleSend}>→</button>
      </div>
    </div>
  );
};

export default AIChatSidebar;