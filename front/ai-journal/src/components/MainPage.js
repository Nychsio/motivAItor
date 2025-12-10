import React, { useState, useEffect } from 'react';
import '../styles/MainPage.css';
import PomodoroTimer from './PomodoroTimer'; 

const MainPage = ({ onNavigate, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayFocus, setTodayFocus] = useState('');
  
  // --- STANY DANYCH ---
  const [projects, setProjects] = useState([]);
  const [physicsData, setPhysicsData] = useState({
    sleep: 0, weight: 0, calories: 0, calorieGoal: 2200
  });
  const [username, setUsername] = useState('');
  
  const [todoWidgetData, setTodoWidgetData] = useState({
    count: 0, tasks: [], loading: true
  });

  // --- ZEGAR ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- ŁADOWANIE DANYCH ---
  useEffect(() => {
    loadUserData();
    fetchTodayTasks();
    fetchProjects(); // Kluczowe dla sekcji Project Health
    
    const savedUser = localStorage.getItem('username') || 'Użytkowniku';
    setUsername(savedUser.split('@')[0]); 
  }, []);

  const loadUserData = () => {
    const savedFocus = localStorage.getItem('todayFocus') || 'Zdefiniuj dzisiejszy priorytet...';
    setTodayFocus(savedFocus);
  };

  const updateTodayFocus = (newFocus) => {
    setTodayFocus(newFocus);
    localStorage.setItem('todayFocus', newFocus);
  };

  // --- API CALLS ---
  const fetchProjects = async () => {
    try {
        const res = await fetch('http://localhost:3001/api/projects', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if(res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTodayTasks = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const dateStr = new Date().toISOString().split('T')[0];
    try {
        const response = await fetch(`http://localhost:3001/api/tasks/${dateStr}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setTodoWidgetData({ count: data.length, tasks: data.slice(0, 3), loading: false });
        }
    } catch (error) { console.error(error); }
  };

  // --- UI HELPERS ---
  const formatTime = (date) => date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const getGreeting = () => {
    const hour = currentTime.getHours();
    return hour < 12 ? 'Dzień dobry' : (hour < 18 ? 'Dzień dobry' : 'Dobry wieczór');
  };
  const getCaloriesProgress = () => Math.min((physicsData.calories / physicsData.calorieGoal) * 100, 100);

  return (
    <div className="main-container">
      {/* TŁO */}
      <div className="background">
        <div className="gif-background" style={{ backgroundImage: `url(/assets/steam.gif)` }}></div>
        <div className="overlay"></div>
      </div>

      {/* HEADER */}
      <div className="main-header">
        <div className="header-left">
          <h1 className="header-title">AI JOURNAL</h1>
          <p className="header-subtitle">Accountability Dashboard</p>
        </div>
        <div className="header-right">
          <div className="time-display">
            <div className="current-time">{formatTime(currentTime)}</div>
            <div className="current-date">{formatDate(currentTime)}</div>
          </div>
          <button onClick={onLogout} className="logout-btn">Wyloguj</button>
        </div>
      </div>

      <div className="main-content">
        
        {/* HERO SECTION */}
        <div className="hero-dashboard">
          <div className="hero-header">
            <h2>{getGreeting()}, {username}</h2>
            <p>Twój główny talent: <strong>UKIERUNKOWANIE</strong></p>
          </div>
          <div className="focus-card">
            <label className="focus-label">Dzisiejszy główny cel:</label>
            <input type="text" value={todayFocus} onChange={(e) => updateTodayFocus(e.target.value)} className="focus-input" placeholder="Na czym się dziś skupiasz?" />
          </div>
          <div className="quick-stats">
            <div className="main-stat-item"><span className="stat-icon">😴</span><span className="main-stat-value">{physicsData.sleep}h</span><span className="main-stat-label">Sen</span></div>
            <div className="main-stat-item"><span className="stat-icon">⚖️</span><span className="main-stat-value">{physicsData.weight}kg</span><span className="main-stat-label">Waga</span></div>
            <div className="main-stat-item"><span className="stat-icon">🔥</span><span className="main-stat-value">{physicsData.calories}</span><span className="main-stat-label">Kalorie</span></div>
            <div className="stat-progress">
              <div className="progress-bar"><div className="progress-fill" style={{width: `${getCaloriesProgress()}%`}}></div></div>
              <span className="progress-label">{Math.round(getCaloriesProgress())}% celu</span>
            </div>
          </div>
        </div>

        <div className="project-links">
          <a href="#" className="project-link" onClick={(e) => e.preventDefault()}>
            <span className="project-icon">🔍</span>
            <div className="project-text"><div className="project-title">Perplexity Project</div><div className="project-subtitle">EVO 2025 Research Space</div></div>
            <span className="project-arrow">↗</span>
          </a>
        </div>

        {/* --- GRID (TETRIS BEZ DZIUR) --- */}
        <div className="main-stats-grid">
          
          {/* 1. TODO (Lewa Góra) */}
          <div className="main-stat-card todo-card" onClick={() => onNavigate('todo')}>
            <div className="card-header"><h3>COMMAND CENTER</h3><span className="card-icon">✅</span></div>
            <div className="card-content">
              <div className="todo-stats"><div className="todo-stat"><span className="todo-number">{todoWidgetData.count}</span><span className="todo-text">na dziś</span></div></div>
              <div className="todo-widget-list">
                {todoWidgetData.loading ? <div className="widget-loading">Ładowanie...</div> : 
                 todoWidgetData.tasks.slice(0,3).map(t => (
                   <div key={t.id} className="widget-task-row">
                      <span className={`widget-dot ${t.is_completed ? 'completed':''}`}></span>
                      <span className={`widget-task-text ${t.is_completed ? 'completed':''}`}>{t.content}</span>
                   </div>
                 ))}
              </div>
            </div>
            <div className="card-action">Zarządzaj →</div>
          </div>

          {/* 2. GYM / IRON TEMPLE (Prawa Góra - Obok Todo) */}
          <div className="main-stat-card" onClick={() => onNavigate('gym')} style={{ cursor: 'pointer' }}>
            <div className="card-header"><h3>IRON TEMPLE</h3><span className="card-icon">🏋️</span></div>
            <div className="card-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', flexDirection: 'column'}}>
                <div style={{opacity: 0.7, textAlign: 'center'}}>
                    <div style={{fontSize: '20px', marginBottom: '5px'}}>Ostatni trening</div>
                    <div style={{color: '#12d3b9'}}>Sprawdź w PhysicsTracker</div>
                </div>
            </div>
            <div className="card-action">Otwórz Tracker →</div>
          </div>

          {/* 3. PROJEKTY (Środek - Cała szerokość) */}
          <div className="main-stat-card" style={{gridColumn: 'span 2'}}>
            <div className="card-header"><h3>PROJECT HEALTH</h3><span className="card-icon">📊</span></div>
            <div className="card-content" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                {projects.map(p => (
                    <div key={p.id} className={`project-card-mini ${p.stats?.is_rusting ? 'rusting' : ''}`} style={{padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'12px', border: p.stats?.is_rusting ? '1px solid #ff6b35' : '1px solid rgba(255,255,255,0.1)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                            <span style={{fontWeight:'bold', color: p.color}}>{p.name}</span>
                            <span style={{fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>{p.stats?.progress}%</span>
                        </div>
                        {p.stats?.is_rusting && <div style={{fontSize:'10px', color:'#ff6b35', marginBottom:'4px'}}>⚠️ Zaniedbany!</div>}
                        <div className="project-progress-bar">
                            <div className="project-progress-fill" style={{width: `${p.stats?.progress}%`, background: p.stats?.is_rusting ? '#ff6b35' : p.color}}></div>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && <div style={{opacity:0.5, padding:'10px'}}>Brak projektów. Dodaj je w Command Center!</div>}
            </div>
          </div>
          
          {/* 4. HEALTH / PHYSICS METRICS (Lewy Dół) */}
          <div className="main-stat-card physics-card" onClick={() => onNavigate('health')} style={{ cursor: 'pointer' }}>
            <div className="card-header"><h3>PHYSICS METRICS</h3><span className="card-icon">🥗</span></div>
            <div className="card-content">
              <div className="metric-row"><span>Sen:</span><span className="metric-value">{physicsData.sleep || '--'}h</span></div>
              <div className="metric-row"><span>Waga:</span><span className="metric-value">{physicsData.weight || '--'}kg</span></div>
              <div className="metric-row"><span>Kcal:</span><span className="metric-value">{physicsData.calories || '--'}</span></div>
            </div>
            <div className="card-action">Panel zdrowia (AI) →</div>
          </div>

          {/* 5. GALLUP (Prawy Dół) */}
          <div className="main-stat-card gallup-card" onClick={() => alert('Gallup - wkrótce')}>
            <div className="card-header"><h3>GALLUP INSIGHTS</h3><span className="card-icon">🧠</span></div>
            <div className="card-content">
              <div className="strength-item active"><span className="strength-name">Ukierunkowanie</span><span className="strength-level">Aktywne</span></div>
            </div>
            <div className="card-action">Zobacz analizę →</div>
          </div>

          {/* 6. POMODORO (Szeroki na samym dole) */}
          <div style={{gridColumn: 'span 2'}}>
             <PomodoroTimer projects={projects} />
          </div>

        </div>

        {/* STATUS FOOTER */}
        <div className="system-status">
          <div className="status-item"><span className="status-dot online"></span><span>System operacyjny</span></div>
          <div className="status-item"><span className="status-dot online"></span><span>API Backend</span></div>
        </div>

      </div>
    </div>
  );
};

export default MainPage;