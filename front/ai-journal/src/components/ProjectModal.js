import React, { useState } from 'react';
import '../styles/MainPage.css'; // Stylistyka szkła

const ProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#12d3b9', // Domyślny cyjan
    default_duration: 25,
    master_prompt: '' // To jest Twój kontekst dla AI
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name) return alert("Nazwij projekt!");
    
    setLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onProjectCreated(); // Odśwież listę projektów w rodzicu
        onClose();
        setFormData({ ...formData, name: '', description: '', master_prompt: '' }); // Reset
      } else {
        alert('Błąd tworzenia projektu');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="background" style={{ zIndex: 200, position: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="overlay" onClick={onClose} style={{ backdropFilter: 'blur(5px)' }}></div>
      
      <div className="main-stat-card" style={{ width: '500px', zIndex: 201, padding: '30px' }}>
        <div className="card-header" style={{marginBottom: '20px'}}>
          <h3>NOWY PROJEKT</h3>
          <button onClick={onClose} style={{background:'none', border:'none', color:'white', fontSize:'20px', cursor:'pointer'}}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Nazwa i Kolor */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
                <label className="focus-label">Nazwa</label>
                <input 
                  className="focus-input" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="np. Aplikacja AI"
                />
            </div>
            <div>
                <label className="focus-label">Kolor</label>
                <input 
                  type="color" 
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                  style={{ height: '50px', width: '50px', padding: 0, border: 'none', background: 'none' }}
                />
            </div>
          </div>

          {/* Pomodoro Czas */}
          <div>
            <label className="focus-label">Czas Pomodoro (minuty)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
                {[25, 30, 45, 50, 60].map(time => (
                    <button 
                        key={time}
                        onClick={() => setFormData({...formData, default_duration: time})}
                        className="todo-add-btn"
                        style={{ 
                            padding: '8px 12px', 
                            background: formData.default_duration === time ? '#12d3b9' : 'rgba(255,255,255,0.1)',
                            color: formData.default_duration === time ? '#000' : '#fff'
                        }}
                    >
                        {time}
                    </button>
                ))}
            </div>
          </div>

          {/* Master Prompt (Kontekst) */}
          <div>
            <label className="focus-label">🧠 Master Prompt (Kontekst dla AI)</label>
            <textarea 
              className="focus-input" 
              style={{ minHeight: '120px', fontSize: '13px', lineHeight: '1.4' }}
              value={formData.master_prompt}
              onChange={e => setFormData({...formData, master_prompt: e.target.value})}
              placeholder="Opisz projekt technicznie. Np: 'Projekt w Python FastAPI + React. Używamy bazy PostgreSQL. Celem jest stworzenie...'"
            />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '5px' }}>
                To będzie automatycznie doklejane do każdej rozmowy z AI o zadaniach z tego projektu.
            </p>
          </div>

          <button onClick={handleSubmit} className="todo-add-btn" disabled={loading} style={{marginTop: '10px'}}>
            {loading ? 'Tworzenie...' : 'STWÓRZ PROJEKT'}
          </button>

        </div>
      </div>
    </div>
  );
};

export default ProjectModal;