import React, { useState, useEffect } from 'react';
import '../styles/MainPage.css';

const PomodoroTimer = ({ projects = [] }) => {
  // Domyślne ustawienia
  const DEFAULT_TIME = 25 * 60;
  
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' | 'break'
  const [selectedProjectId, setSelectedProjectId] = useState(''); // ID wybranego projektu

  // Jeśli zmienimy projekt, aktualizujemy czas (jeśli projekt ma customowy czas)
  useEffect(() => {
    if (selectedProjectId && mode === 'work' && !isActive) {
        const project = projects.find(p => p.id === parseInt(selectedProjectId));
        if (project && project.default_duration) {
            setTimeLeft(project.default_duration * 60);
        }
    }
  }, [selectedProjectId, projects, mode, isActive]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft => timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleFinish = async () => {
    if (mode === 'work') {
      // Dźwięk? Powiadomienie?
      alert("Pomodoro zakończone! Dobra robota.");
      await saveSession();
      setMode('break');
      setTimeLeft(5 * 60); // 5 min przerwy
    } else {
      setMode('work');
      setTimeLeft(DEFAULT_TIME);
      // Reset do czasu projektu jeśli wybrany
      if (selectedProjectId) {
          const project = projects.find(p => p.id === parseInt(selectedProjectId));
          if (project) setTimeLeft(project.default_duration * 60);
      }
    }
  };

  const saveSession = async () => {
    const token = localStorage.getItem('accessToken');
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const payload = {
          date: today,
          duration: Math.floor((mode === 'work' ? (selectedProjectId ? 25 : 25) : 5)), // Uproszczenie, w wersji PRO bierzemy realny czas
          tag: 'work',
          project_id: selectedProjectId ? parseInt(selectedProjectId) : null
      };

      await fetch('https://wackier-deliberately-leighann.ngrok-free.dev/api/pomodoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      console.log('Pomodoro zapisane dla projektu:', selectedProjectId);
    } catch (error) {
      console.error('Błąd zapisu Pomodoro', error);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    if (selectedProjectId) {
        const project = projects.find(p => p.id === parseInt(selectedProjectId));
        setTimeLeft((project?.default_duration || 25) * 60);
    } else {
        setTimeLeft(DEFAULT_TIME);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="main-stat-card" style={{ 
        borderColor: isActive ? '#f7931a' : 'rgba(255,255,255,0.15)',
        background: isActive ? 'rgba(247, 147, 26, 0.05)' : 'rgba(255,255,255,0.05)'
    }}>
      <div className="card-header" style={{marginBottom: '10px'}}>
        <h3>{mode === 'work' ? 'FOCUS TIMER' : 'PRZERWA'}</h3>
        <span className="card-icon">{mode === 'work' ? '🍅' : '☕'}</span>
      </div>
      
      <div className="card-content" style={{ textAlign: 'center' }}>
        
        {/* WYBÓR PROJEKTU */}
        <select 
            className="mini-select" 
            style={{width: '100%', marginBottom: '15px', padding: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'}}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={isActive}
        >
            <option value="">-- Przypisz do Projektu --</option>
            {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.default_duration} min)</option>
            ))}
        </select>

        <div style={{ fontSize: '42px', fontWeight: 'bold', color: '#fff', marginBottom: '16px', fontFamily: 'monospace', letterSpacing: '2px' }}>
          {formatTime(timeLeft)}
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={toggleTimer}
            className="todo-add-btn"
            style={{ flex: 1, background: isActive ? 'rgba(255, 107, 53, 0.8)' : 'linear-gradient(135deg, #12d3b9 0%, #09d0d7 100%)', color: isActive ? 'white' : 'black' }}
          >
            {isActive ? 'PAUZA' : 'START'}
          </button>
          <button 
            onClick={resetTimer}
            className="logout-btn"
            style={{ padding: '12px 16px' }}
          >
            ↺
          </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;