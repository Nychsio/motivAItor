import React, { useState, useEffect } from 'react';
import '../styles/MainPage.css';
import PomodoroTimer from './PomodoroTimer'; 

const MainPage = ({ onNavigate, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // --- STANY DANYCH ---
  const [projects, setProjects] = useState([]);
  const [physicsData, setPhysicsData] = useState({
    sleep: 0, weight: 0, calories: 0, calorieGoal: 2200
  });
  const [username, setUsername] = useState('');
  
  const [todoWidgetData, setTodoWidgetData] = useState({
    count: 0, tasks: [], loading: true
  });

  // --- STANY ROAST MASTER ---
  // roastData.roast -> To jest tekst, który wyświetla się w Hero (odpowiedź AI)
  const [roastData, setRoastData] = useState({ roast: 'Inicjalizacja łącza z Danem...', score: 50 });
  const [chatInput, setChatInput] = useState(''); // Stan dolnego paska
  const [isSending, setIsSending] = useState(false); // Żeby zablokować enter podczas wysyłania

  // --- ZEGAR ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- ŁADOWANIE DANYCH ---
  useEffect(() => {
    fetchTodayTasks();
    fetchProjects(); 
    fetchRoast(); // <-- Pobieramy pierwszy komentarz na start
    
    const savedUser = localStorage.getItem('username') || 'Studencie';
    setUsername(savedUser.split('@')[0]); 
  }, []);

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

  const fetchRoast = async () => {
    const token = localStorage.getItem('accessToken');
    try {
        const res = await fetch('http://localhost:3001/api/ai/roast', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setRoastData(data);
        }
    } catch (e) { console.error(e); }
  };

  // --- NOWA LOGIKA CZATU (Z DOLNEGO PASKA) ---
  const handleGlobalChat = async () => {
    if (!chatInput.trim() || isSending) return;
    
    const userMsg = chatInput;
    setChatInput(''); // Czyścimy pasek
    setIsSending(true);
    
    // Optymistyczna aktualizacja (żebyś widział, że coś się dzieje)
    const oldRoast = roastData.roast;
    setRoastData(prev => ({ ...prev, roast: "Myślę nad ripostą..." }));

    const token = localStorage.getItem('accessToken');
    try {
        const res = await fetch('http://localhost:3001/api/ai/roast-chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ message: userMsg })
        });
        
        if (res.ok) {
            const data = await res.json();
            // Odpowiedź AI trafia na górę do Hero Section
            setRoastData(prev => ({ ...prev, roast: data.reply }));
        } else {
            setRoastData(prev => ({ ...prev, roast: "Błąd połączenia. Dan poszedł na kawę." }));
        }
    } catch (e) {
        setRoastData(prev => ({ ...prev, roast: oldRoast })); // Przywracamy stary tekst w razie błędu
    } finally {
        setIsSending(false);
    }
  };

  // --- UI HELPERS ---
  const formatTime = (date) => date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const getGreeting = () => {
    const hour = currentTime.getHours();
    return hour < 12 ? 'Dzień dobry' : (hour < 18 ? 'Dzień dobry' : 'Dobry wieczór');
  };

  const getScoreColor = (score) => {
      if (score < 40) return '#ff4d4d'; // Czerwony
      if (score < 75) return '#f7931a'; // Pomarańcz
      return '#12d3b9'; // Cyjan
  };

  return (
    <div className="main-container" style={{ paddingBottom: '100px' }}> 
      {/* paddingBottom żeby dolny pasek nie zasłaniał treści na dole */}

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
        
        {/* --- HERO SECTION: TYLKO WYŚWIETLACZ (EKRAN DANA) --- */}
        <div className="hero-dashboard" style={{ 
            transition: 'all 0.3s ease', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            borderLeft: `6px solid ${getScoreColor(roastData.score)}` // Kolorowy pasek z boku
        }}>
          
          {/* Górna belka: Wynik + Emotka */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
             <div>
                <h2 style={{margin:0, fontSize: '24px'}}>{getGreeting()}, {username}</h2>
                <div style={{fontSize: '13px', opacity: 0.7, marginTop: '4px'}}>
                    Performance Score: <strong style={{color: getScoreColor(roastData.score), fontSize: '18px'}}>{roastData.score}/100</strong>
                </div>
             </div>
             <div style={{ fontSize: '48px', opacity: 0.9 }}>
                 {roastData.score < 40 ? '🤬' : (roastData.score < 80 ? '😤' : '🗿')}
             </div>
          </div>

          {/* Wyświetlacz Tekstu AI */}
          <div style={{ flex: 1 }}>
              <p style={{ 
                  fontSize: '18px', 
                  lineHeight: '1.6', 
                  fontStyle: 'italic', 
                  color: 'rgba(255,255,255,0.95)', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  margin: 0
              }}>
                  "{roastData.roast}"
              </p>
          </div>
        </div>

        {/* --- GRID (TETRIS) --- */}
        <div className="main-stats-grid">
          
          {/* 1. TODO */}
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
          </div>

          {/* 2. GYM */}
          <div className="main-stat-card" onClick={() => onNavigate('gym')} style={{ cursor: 'pointer' }}>
            <div className="card-header"><h3>IRON TEMPLE</h3><span className="card-icon">🏋️</span></div>
            <div className="card-content" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', flexDirection: 'column'}}>
                <div style={{opacity: 0.7, textAlign: 'center'}}>
                    <div style={{fontSize: '20px', marginBottom: '5px'}}>Ostatni trening</div>
                    <div style={{color: '#12d3b9'}}>Sprawdź w PhysicsTracker</div>
                </div>
            </div>
          </div>

          {/* 3. PROJEKTY */}
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
                {projects.length === 0 && <div style={{opacity:0.5, padding:'10px'}}>Brak projektów.</div>}
            </div>
          </div>
          
          {/* 4. HEALTH */}
          <div className="main-stat-card physics-card" onClick={() => onNavigate('health')} style={{ cursor: 'pointer' }}>
            <div className="card-header"><h3>PHYSICS METRICS</h3><span className="card-icon">🥗</span></div>
            <div className="card-content">
              <div className="metric-row"><span>Sen:</span><span className="metric-value">{physicsData.sleep || '--'}h</span></div>
              <div className="metric-row"><span>Waga:</span><span className="metric-value">{physicsData.weight || '--'}kg</span></div>
              <div className="metric-row"><span>Kcal:</span><span className="metric-value">{physicsData.calories || '--'}</span></div>
            </div>
          </div>

          {/* 5. GALLUP */}
          <div className="main-stat-card gallup-card" onClick={() => alert('Gallup - wkrótce')}>
            <div className="card-header"><h3>GALLUP INSIGHTS</h3><span className="card-icon">🧠</span></div>
            <div className="card-content">
              <div className="strength-item active"><span className="strength-name">Ukierunkowanie</span><span className="strength-level">Aktywne</span></div>
            </div>
          </div>

          {/* 6. POMODORO */}
          <div style={{gridColumn: 'span 2'}}>
             <PomodoroTimer projects={projects} />
          </div>

        </div>

        {/* STATUS FOOTER */}
        <div className="system-status">
          <div className="status-item"><span className="status-dot online"></span><span>RAG Memory</span></div>
          <div className="status-item"><span className="status-dot online"></span><span>API Backend</span></div>
        </div>

      </div>

      {/* --- FLOATING COMMAND BAR (NOWOŚĆ) --- */}
      <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '600px',
          zIndex: 9999, // Zawsze na wierzchu
          display: 'flex',
          gap: '10px',
          padding: '10px',
          background: 'rgba(20, 20, 30, 0.8)', // Ciemne, półprzezroczyste tło
          backdropFilter: 'blur(12px)', // Efekt szkła
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
          <input 
            type="text"
            placeholder={isSending ? "Dan myśli..." : "Pisz tutaj (np. 'Co robić?')..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalChat()}
            disabled={isSending}
            style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '16px',
                padding: '8px',
                outline: 'none'
            }}
          />
          <button 
            onClick={handleGlobalChat}
            disabled={isSending}
            style={{
                background: '#12d3b9',
                border: 'none',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                cursor: isSending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: '#000',
                transition: 'transform 0.2s'
            }}
          >
            {isSending ? '⏳' : '➤'}
          </button>
      </div>

    </div>
  );
};

export default MainPage;