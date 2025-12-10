import React, { useState, useEffect } from 'react';
import '../styles/PhysicsTracker.css';
import lmStudioService from '../services/lmStudioService';

const PhysicsTracker = ({ onBack }) => {  // DODANO PROP onBack
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [workouts, setWorkouts] = useState({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null
  });
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [stats, setStats] = useState({
    weeklyVolume: 12500,
    avgSleep: 7.5,
    avgCalories: 2600,
    currentWeight: 75.2
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [lmStudioConnected, setLmStudioConnected] = useState(false);

  // Treningi z Google Forms
  const trainingPlans = [
    {
      id: 'training1',
      name: 'Trening 1 - Push',
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc8In0G1Hq2KZi9H2s5JSZiorCYIWoF7mV9MGF5haifhTsKLA/viewform',
      editUrl: 'https://docs.google.com/forms/d/1_x8oVH_A-tUFrf-5qnOLdqn1M57n4QYhKZFoSrTBLik/edit',
      exercises: ['Bench Press', 'OHP', 'Dips', 'Triceps'],
      color: '#12d3b9'
    },
    {
      id: 'training2', 
      name: 'Trening 2 - Pull',
      formUrl: 'https://docs.google.com/forms/d/1aD0MCBForVOK5A9PssFppNU4CNl5hf5DnSTs0hVZXY0/edit',
      editUrl: 'https://docs.google.com/forms/d/1aD0MCBForVOK5A9PssFppNU4CNl5hf5DnSTs0hVZXY0/edit',
      exercises: ['Deadlift', 'Pull-ups', 'Rows', 'Biceps'],
      color: '#9945ff'
    }
  ];

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekDaysDisplay = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

  // Get current week dates
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Format date for display
  const formatDate = (date) => {
    return `${date.getDate()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Get week range for header
  const getWeekRange = () => {
    const dates = getWeekDates();
    const start = dates[0];
    const end = dates[6];
    return `${formatDate(start)} - ${formatDate(end)}.${end.getFullYear()}`;
  };

  // Drag & Drop handlers
  const handleDragStart = (e, workout, fromDay = null) => {
    setDraggedWorkout({ workout, fromDay });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e, toDay) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedWorkout) return;

    const newWorkouts = { ...workouts };
    
    // Remove from original day if moving
    if (draggedWorkout.fromDay) {
      newWorkouts[draggedWorkout.fromDay] = null;
    }
    
    // Add to new day
    newWorkouts[toDay] = draggedWorkout.workout;
    setWorkouts(newWorkouts);
    setDraggedWorkout(null);
  };

  // Navigate weeks
  const changeWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  // Open form in new tab
  const openForm = (url) => {
    window.open(url, '_blank');
  };

  // Remove workout from day
  const removeWorkout = (day) => {
    const newWorkouts = { ...workouts };
    newWorkouts[day] = null;
    setWorkouts(newWorkouts);
  };

  // Sprawdź połączenie z LM Studio przy mount
  useEffect(() => {
    checkLMStudioConnection();
  }, []);

  const checkLMStudioConnection = async () => {
    const status = await lmStudioService.checkConnection();
    setLmStudioConnected(status.connected);
    if (!status.connected) {
      console.log('LM Studio status:', status.message);
    }
  };

  // Analizuj trening po wypełnieniu formularza
  const analyzeWorkout = async (workoutData) => {
    if (!lmStudioConnected) {
      alert('Uruchom LM Studio najpierw!');
      return;
    }
    setAiLoading(true);
    try {
      const analysis = await lmStudioService.analyzeWorkout({
        date: new Date().toISOString().split('T')[0],
        exercises: workoutData.exercises || [],
        totalVolume: stats.weeklyVolume,
        sleep: stats.avgSleep,
        calories: stats.avgCalories
      });
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Pobierz rekomendacje Gallup
  const getGallupRecommendations = async () => {
    if (!lmStudioConnected) return;
    setAiLoading(true);
    try {
      const recommendations = await lmStudioService.getGallupBasedRecommendation(
        ['Ukierunkowanie', 'Poważanie', 'Bliskość', 'Rozwaga', 'Analityk'],
        'Zwiększenie siły o 10% w 3 miesiące'
      );
      setAiAnalysis(recommendations);
    } catch (error) {
      console.error('Gallup error:', error);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="physics-container">
      {/* Background with blur */}
      <div className="physics-background">
        <div className="physics-gif-background" />
        <div className="physics-overlay" />
      </div>

      {/* Main Content */}
      <div className="physics-content">
        {/* Header */}
        <div className="physics-header">
          <div className="physics-header-top">
            <h1 className="physics-title">🏋️ PHYSICS TRACKER</h1>
            <button 
              className="physics-back-btn"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  window.location.href = '/';
                }
              }}
            >
              ← Powrót
            </button>
          </div>
          <p className="physics-subtitle">System zarządzania treningami z AI</p>
        </div>

        {/* Week Navigation */}
        <div className="physics-week-nav">
          <button 
            className="physics-nav-btn"
            onClick={() => changeWeek(-1)}
          >
            ← Poprzedni tydzień
          </button>
          <span className="physics-current-week">{getWeekRange()}</span>
          <button 
            className="physics-nav-btn"
            onClick={() => changeWeek(1)}
          >
            Następny tydzień →
          </button>
        </div>

        {/* Stats Row */}
        <div className="physics-stats-row">
          <div className="physics-stat-card">
            <span className="physics-stat-value">{stats.weeklyVolume}kg</span>
            <span className="physics-stat-label">Volume tygodniowy</span>
          </div>
          <div className="physics-stat-card">
            <span className="physics-stat-value">{stats.avgSleep}h</span>
            <span className="physics-stat-label">Średni sen</span>
          </div>
          <div className="physics-stat-card">
            <span className="physics-stat-value">{stats.avgCalories}</span>
            <span className="physics-stat-label">Średnie kalorie</span>
          </div>
          <div className="physics-stat-card">
            <span className="physics-stat-value">{stats.currentWeight}kg</span>
            <span className="physics-stat-label">Aktualna waga</span>
          </div>
        </div>

        {/* Training Plans - Draggable */}
        <div className="physics-training-plans">
          <h3 className="physics-section-title">Dostępne treningi - przeciągnij na dzień:</h3>
          <div className="physics-plans-row">
            {trainingPlans.map(plan => (
              <div 
                key={plan.id}
                className="physics-plan-card"
                draggable
                onDragStart={(e) => handleDragStart(e, plan)}
                style={{ borderColor: plan.color }}
              >
                <div className="physics-plan-header">
                  <h4 className="physics-plan-title">{plan.name}</h4>
                  <div className="physics-plan-actions">
                    <button 
                      className="physics-form-btn primary"
                      onClick={() => openForm(plan.formUrl)}
                      title="Wypełnij formularz"
                    >
                      📝 FORMULARZ
                    </button>
                    <button 
                      className="physics-form-btn secondary"
                      onClick={() => openForm(plan.editUrl)}
                      title="Edytuj plan"
                    >
                      ✏️ EDYTUJ
                    </button>
                  </div>
                </div>
                <div className="physics-plan-exercises">
                  {plan.exercises.map((ex, idx) => (
                    <span key={idx} className="physics-exercise-tag">{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Week Calendar Grid */}
        <div className="physics-week-grid">
          {weekDays.map((day, index) => (
            <div 
              key={day}
              className={`physics-day-column ${weekDates[index].toDateString() === new Date().toDateString() ? 'today' : ''}`}
            >
              <div className="physics-day-header">
                <span className="physics-day-name">{weekDaysDisplay[index]}</span>
                <span className="physics-day-date">{formatDate(weekDates[index])}</span>
              </div>
              <div 
                className="physics-drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
              >
                {workouts[day] ? (
                  <div 
                    className="physics-workout-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, workouts[day], day)}
                    style={{ borderColor: workouts[day].color }}
                  >
                    <button 
                      className="physics-remove-btn"
                      onClick={() => removeWorkout(day)}
                    >
                      ×
                    </button>
                    <h5 className="physics-workout-title">{workouts[day].name}</h5>
                    <div className="physics-workout-exercises">
                      {workouts[day].exercises.map((ex, idx) => (
                        <div key={idx} className="physics-exercise-item">• {ex}</div>
                      ))}
                    </div>
                    <div className="physics-workout-actions">
                      <button 
                        className="physics-mini-btn"
                        onClick={() => openForm(workouts[day].formUrl)}
                      >
                        Wypełnij →
                      </button>
                    </div>
                  </div>
                ) : (
                  <span className="physics-empty-text">Przeciągnij trening tutaj</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Google Sheets Integration Info */}
        <div className="physics-integration-info">
          <h3 className="physics-section-title">📊 Integracja z Google Sheets</h3>
          <div className="physics-info-grid">
            <div className="physics-info-card">
              <span className="physics-info-icon">📈</span>
              <span className="physics-info-text">Automatyczny import wyników</span>
            </div>
            <div className="physics-info-card">
              <span className="physics-info-icon">🤖</span>
              <span className="physics-info-text">Analiza AI z LM Studio</span>
            </div>
            <div className="physics-info-card">
              <span className="physics-info-icon">📊</span>
              <span className="physics-info-text">Wizualizacja postępów</span>
            </div>
            <div className="physics-info-card">
              <span className="physics-info-icon">🎯</span>
              <span className="physics-info-text">Personalizowane rekomendacje</span>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="physics-ai-section">
          <div className="physics-ai-header">
            <h3 className="physics-section-title">
              🤖 AI Analysis {lmStudioConnected ? '(Connected)' : '(Disconnected)'}
            </h3>
            <div className="physics-ai-buttons">
              <button 
                className="physics-ai-btn"
                onClick={() => analyzeWorkout({ exercises: ['Bench Press', 'Squat'] })}
                disabled={!lmStudioConnected || aiLoading}
              >
                {aiLoading ? 'Analizuję...' : 'Analizuj ostatni trening'}
              </button>
              <button 
                className="physics-ai-btn secondary"
                onClick={getGallupRecommendations}
                disabled={!lmStudioConnected || aiLoading}
              >
                Rekomendacje Gallup
              </button>
              <button 
                className="physics-ai-btn check"
                onClick={checkLMStudioConnection}
              >
                Sprawdź połączenie
              </button>
            </div>
          </div>
          {aiAnalysis && (
            <div className="physics-ai-results">
              {aiAnalysis.error ? (
                <div className="physics-ai-error">
                  ❌ {aiAnalysis.message}
                </div>
              ) : (
                <>
                  {aiAnalysis.ocena && (
                    <div className="physics-ai-assessment">
                      <h4>Ocena treningu:</h4>
                      <p>{aiAnalysis.ocena}</p>
                    </div>
                  )}
                  {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                    <div className="physics-ai-strengths">
                      <h4>✅ Mocne strony:</h4>
                      <ul>
                        {aiAnalysis.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.improvements && aiAnalysis.improvements.length > 0 && (
                    <div className="physics-ai-improvements">
                      <h4>⚠️ Do poprawy:</h4>
                      <ul>
                        {aiAnalysis.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.recommendation && (
                    <div className="physics-ai-recommendation">
                      <h4>💡 Rekomendacja:</h4>
                      <p>{aiAnalysis.recommendation}</p>
                    </div>
                  )}
                  {aiAnalysis.recommendations && (
                    <div className="physics-ai-gallup">
                      <h4>🎯 Rekomendacje Gallup:</h4>
                      {aiAnalysis.recommendations.map((rec, i) => (
                        <div key={i} className="physics-gallup-item">
                          <strong>{rec.strength}:</strong> {rec.advice}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {!lmStudioConnected && (
            <div className="physics-ai-instructions">
              <h4>📌 Jak uruchomić AI Analysis:</h4>
              <ol>
                <li>Otwórz LM Studio</li>
                <li>Załaduj dowolny model (Mistral, Llama, etc.)</li>
                <li>Idź do zakładki "Server"</li>
                <li>Kliknij "Start Server"</li>
                <li>Kliknij "Sprawdź połączenie" powyżej</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhysicsTracker;