import React, { useState } from 'react';
import '../styles/TodoPage.css'; // Użyjemy styli z Todo, bo pasują (szkło)

const HealthPage = ({ onBack }) => {
  const [meals, setMeals] = useState([]); // Lista posiłków: [{id, name, kcal}]
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Stan dla metryk ogólnych
  const [stats, setStats] = useState({
    sleep: 7.0,
    weight: 0,
    mood: 5
  });

  // 1. Funkcja: Zapytaj AI o kalorie
  const handleAddMeal = async () => {
    if (!input.trim()) return;
    
    setIsAiLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/ai/estimate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      });
      
      const data = await response.json();
      
      const newMeal = {
        id: Date.now(),
        name: input,
        kcal: data.calories || 0 // Wynik z AI
      };
      
      setMeals([...meals, newMeal]);
      setInput(''); // Wyczyść pole
    } catch (error) {
      console.error("AI Error:", error);
      alert("AI dietetyk śpi. Wpisz kalorie ręcznie (wkrótce).");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 2. Sumowanie kalorii
  const totalCalories = meals.reduce((sum, meal) => sum + meal.kcal, 0);

  // 3. Zapisz wszystko do bazy (DailyHealth)
  const handleSaveDay = async () => {
    const token = localStorage.getItem('accessToken');
    const today = new Date().toISOString().split('T')[0];
    
    const payload = {
      date: today,
      sleep_hours: parseFloat(stats.sleep),
      weight: parseFloat(stats.weight),
      calories: totalCalories, // Tu idzie suma z AI!
      mood_score: parseInt(stats.mood),
      note: `Posiłki: ${meals.map(m => m.name).join(', ')}` // Zapiszemy co jadłeś w notatce
    };

    // Strzał do endpointu, który stworzyłeś wcześniej
    await fetch('http://localhost:3001/api/health', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    alert("Dzień zapisany! Siła rośnie.");
    onBack(); // Wróć do dashboardu
  };

  return (
    <div className="todo-container">
       <div className="todo-background">
        <div className="todo-gif-background" style={{backgroundImage: 'url(/assets/steam.gif)'}}></div>
        <div className="todo-overlay"></div>
      </div>

      <div className="todo-content">
        {/* Header */}
        <div className="todo-header-glass">
          <button onClick={onBack} className="todo-back-btn">← Wróć</button>
          <h2 className="todo-title">CENTRUM ZDROWIA & SIŁY</h2>
          <div style={{width: '80px'}}></div>
        </div>

        <div className="todo-main-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          
          {/* KOLUMNA 1: AI KALKULATOR */}
          <div className="todo-glass-card">
            <h3 className="todo-card-title">🍗 AI Dietetyk</h3>
            
            {/* Input Posiłku */}
            <div className="todo-form">
              <input 
                type="text" 
                className="todo-input"
                placeholder="Co zjadłeś? (np. Kebab na cienkim)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMeal()}
              />
              <button 
                onClick={handleAddMeal} 
                className="todo-add-btn"
                disabled={isAiLoading}
              >
                {isAiLoading ? 'Liczenie...' : 'Dodaj'}
              </button>
            </div>

            {/* Lista Posiłków */}
            <div className="todo-list" style={{maxHeight: '300px', overflowY: 'auto'}}>
              {meals.map((meal, index) => (
                <div key={meal.id} className="todo-task-item" style={{justifyContent: 'space-between'}}>
                  <span style={{color: 'rgba(255,255,255,0.8)'}}>
                    <strong>#{index + 1}</strong> {meal.name}
                  </span>
                  <span style={{color: '#12d3b9', fontWeight: 'bold'}}>
                    {meal.kcal} kcal
                  </span>
                </div>
              ))}
              {meals.length === 0 && <p className="todo-empty-text">Dodaj pierwszy posiłek...</p>}
            </div>

            {/* Suma */}
            <div style={{marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', textAlign: 'right'}}>
              <span style={{fontSize: '14px', color: 'rgba(255,255,255,0.6)'}}>SUMA KALORII:</span>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#12d3b9'}}>{totalCalories}</div>
            </div>
          </div>

          {/* KOLUMNA 2: TWARDE DANE (SEN, WAGA) */}
          <div className="todo-glass-card" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <h3 className="todo-card-title">📉 Parametry Życiowe</h3>
            
            <div>
              <label className="focus-label">Sen (godziny): {stats.sleep}</label>
              <input 
                type="range" min="0" max="12" step="0.5" style={{width: '100%'}}
                value={stats.sleep}
                onChange={e => setStats({...stats, sleep: e.target.value})}
              />
            </div>

            <div>
              <label className="focus-label">Waga (kg):</label>
              <input 
                type="number" className="todo-input"
                value={stats.weight}
                onChange={e => setStats({...stats, weight: e.target.value})}
              />
            </div>

             <div>
              <label className="focus-label">Mood (1-10):</label>
              <div style={{display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '12px'}}>
                <span>💀</span><span>🚀</span>
              </div>
              <input 
                type="range" min="1" max="10" style={{width: '100%'}}
                value={stats.mood}
                onChange={e => setStats({...stats, mood: e.target.value})}
              />
            </div>

            <button 
              onClick={handleSaveDay}
              className="todo-add-btn"
              style={{marginTop: 'auto', background: 'linear-gradient(135deg, #ff6b35 0%, #f7931a 100%)'}}
            >
              ZAPISZ RAPORT DNIA
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HealthPage;