import React, { useState, useEffect, useRef } from 'react';
import '../styles/PhysicsTracker.css';
import lmStudioService from '../services/lmStudioService';
import { api } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getAvatarForScore } from '../config/avatarConfig';

const PhysicsTracker = ({ onBack }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeTab, setActiveTab] = useState('calendar'); 
  
  // DANE
  const [myPlans, setMyPlans] = useState([]); 
  const [exerciseLib, setExerciseLib] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [volumeData, setVolumeData] = useState([]);

  // RPG & AVATAR
  const [rpgStats, setRpgStats] = useState({ S: 0, W: 0, H: 0 });
  const [stats, setStats] = useState({ weeklyVolume: 0, avgSleep: 7, avgCalories: 2500, currentWeight: 0 });

  // CHAT
  const [chatHistory, setChatHistory] = useState([{role: 'ai', text: 'Witaj w Świątyni Żelaza. Co dzisiaj trenujemy?'}]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // UI
  const [searchTerm, setSearchTerm] = useState("");
  const [workouts, setWorkouts] = useState({});
  const [draggedWorkout, setDraggedWorkout] = useState(null);

  // MODALE
  const [activeSession, setActiveSession] = useState(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  
  // DANE DLA KREATORA
  const [newPlanData, setNewPlanData] = useState({ name: '', color: '#12d3b9', exercises: [] });
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // INNE
  const [lmStudioConnected, setLmStudioConnected] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekDaysDisplay = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  // --- IMAGES ---
  // Używamy linków bezpośrednich lub local assets
  const VAULT_BOY_GIF = "/assets/fallout_walk.png"; 
  const BUFFOUT_ICON = "/assets/strenght.png";

  useEffect(() => {
    checkLMStudioConnection();
    fetchRpgStats();
    loadGymData();
    loadAnalytics();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, activeTab]);

  useEffect(() => {
    if (searchTerm === "") {
        setFilteredExercises(exerciseLib.slice(0, 50)); 
    } else {
        const lower = searchTerm.toLowerCase();
        const filtered = exerciseLib.filter(ex => 
            ex.title.toLowerCase().includes(lower) || 
            ex.body_part.toLowerCase().includes(lower)
        ).slice(0, 20); 
        setFilteredExercises(filtered);
    }
  }, [searchTerm, exerciseLib]);

  // API Calls
  const loadGymData = async () => {
      try {
          const plans = await api.getPlans();
          if (Array.isArray(plans)) setMyPlans(plans);
          const lib = await api.getExerciseLibrary();
          if (Array.isArray(lib)) {
              setExerciseLib(lib);
              setFilteredExercises(lib.slice(0, 50));
          }
      } catch (e) { console.error("Gym data error", e); }
  };

  const loadAnalytics = async () => {
      try {
          const vol = await api.getGymVolumeStats();
          if(Array.isArray(vol)) setVolumeData(vol);
      } catch(e) {}
  }

  const fetchRpgStats = async () => {
      try {
          const rpg = await api.getGamificationStats();
          if(rpg) {
              setRpgStats(rpg);
              setStats(prev => ({...prev, weeklyVolume: rpg.S * 100}));
          }
      } catch(e) {}
  };

  const checkLMStudioConnection = async () => { 
      const s = await lmStudioService.checkConnection(); 
      setLmStudioConnected(s.connected); 
  };

  const handleSendToCoach = async () => {
      if(!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput("");
      setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);
      setChatLoading(true);
      try {
          const res = await api.chatWithGymCoach(userMsg);
          setChatHistory(prev => [...prev, {role: 'ai', text: res.reply}]);
      } catch(e) {
          setChatHistory(prev => [...prev, {role: 'ai', text: "Trener nie odpowiada."}]);
      } finally { setChatLoading(false); }
  };

  // Kreator Planu
  const addExerciseToPlan = (exercise) => setNewPlanData(prev => ({ ...prev, exercises: [...prev.exercises, { name: exercise.title, sets: 3, reps: '10' }] }));
  const removeExerciseFromPlan = (idx) => { const u = newPlanData.exercises.filter((_, i) => i !== idx); setNewPlanData({ ...newPlanData, exercises: u }); };
  const updatePlanExercise = (idx, field, val) => { const u = [...newPlanData.exercises]; u[idx][field] = val; setNewPlanData({ ...newPlanData, exercises: u }); };
  const saveNewPlan = async () => {
      if (!newPlanData.name) return alert("Nazwij plan!");
      try {
          await api.createPlan({ name: newPlanData.name, color: newPlanData.color, exercises_structure: newPlanData.exercises });
          alert("Plan zapisany."); setIsCreatorOpen(false); setNewPlanData({ name: '', color: '#12d3b9', exercises: [] }); loadGymData();
      } catch (e) { alert("Błąd zapisu."); }
  };
  
  const handleDeletePlan = async (e, planId) => {
      e.stopPropagation();
      if(window.confirm("Usunąć plan?")) { await api.deletePlan(planId); loadGymData(); }
  };

  const handleAiGeneration = async () => {
      if (!aiPrompt.trim()) return alert("Opisz cel.");
      setIsGenerating(true);
      try {
          const generated = await api.generatePlanAI(aiPrompt);
          if (Array.isArray(generated)) {
              setNewPlanData(prev => ({
                  ...prev,
                  exercises: [...prev.exercises, ...generated.map(ex => ({ name: ex.name, sets: ex.sets || 3, reps: ex.reps || '10' }))]
              }));
              if(!newPlanData.name) setNewPlanData(prev => ({...prev, name: `Plan: ${aiPrompt.substring(0, 10)}...`}));
          }
      } catch (e) { alert("AI Error."); } finally { setIsGenerating(false); }
  };

  // UI Helpers
  const getWeekDates = () => { const d = []; const s = new Date(currentWeek); const day = s.getDay(); s.setDate(s.getDate() - day + (day===0?-6:1)); for(let i=0;i<7;i++){ const x = new Date(s); x.setDate(s.getDate()+i); d.push(x); } return d; };
  const weekDates = getWeekDates();
  const formatDate = (d) => `${d.getDate()}.${(d.getMonth()+1).toString().padStart(2,'0')}`;
  const getWeekRange = () => `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`;
  const changeWeek = (dir) => { const n = new Date(currentWeek); n.setDate(n.getDate()+(dir*7)); setCurrentWeek(n); };
  const handleDragStart = (e, w, fd=null) => { setDraggedWorkout({ workout: w, fromDay: fd }); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
  const handleDrop = (e, toDay) => {
    e.preventDefault(); e.currentTarget.classList.remove('drag-over');
    if (!draggedWorkout) return;
    const nw = { ...workouts }; if (draggedWorkout.fromDay) nw[draggedWorkout.fromDay] = null; nw[toDay] = draggedWorkout.workout;
    setWorkouts(nw); setDraggedWorkout(null);
  };
  const removeWorkout = (d) => { const nw = { ...workouts }; nw[d] = null; setWorkouts(nw); };

  // Sesja
  const openSessionModal = (plan) => {
    const initEx = plan.exercises_structure.map(ex => ({ exercise_name: ex.name, sets: ex.sets || 3, reps: ex.reps || '10', weight: 0 }));
    setActiveSession({ name: plan.name, date: new Date().toISOString().split('T')[0], duration: 60, exercises: initEx });
  };

  const handleFinishWorkout = async () => {
      setSessionLoading(true);
      try {
          await api.saveWorkout({
              date: activeSession.date, name: activeSession.name, duration_minutes: parseInt(activeSession.duration), note: "Sesja",
              exercises: activeSession.exercises.map(ex => ({ exercise_name: ex.exercise_name, sets: parseInt(ex.sets), reps: ex.reps.toString(), weight: parseFloat(ex.weight) }))
          });
          alert("Trening zaliczony! +XP"); setActiveSession(null); loadAnalytics(); fetchRpgStats();
      } catch (e) { alert("Błąd."); } finally { setSessionLoading(false); }
  };

  const analyzeCurrentSession = async () => {
      if (!lmStudioConnected || !activeSession) return;
      setAiLoading(true);
      try {
          const analysis = await lmStudioService.analyzeWorkout({ date: activeSession.date, exercises: activeSession.exercises, totalVolume: 0, sleep: stats.avgSleep, calories: stats.avgCalories });
          setAiAnalysis(analysis);
      } catch (error) { console.error(error); } finally { setAiLoading(false); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
          return (
              <div className="chart-tooltip">
                  <h4>🗓️ {label}</h4>
                  <p>🏋️ <strong style={{color:'#fff'}}>{payload[0].payload.name}</strong></p>
                  <p>🔥 <strong style={{color:'#12d3b9', fontSize:'16px'}}>{payload[0].value.toLocaleString()} kg</strong></p>
              </div>
          );
      }
      return null;
  };
  
  return (
    <div className="physics-container">
      <div className="physics-background"><div className="physics-gif-background" /><div className="physics-overlay" /></div>

      <div className="physics-content">
        
        {/* HEADER Z NOWYM AVATAREM I BUFFOUTEM */}
        <div className="physics-header" style={{paddingBottom: '10px'}}>
          <div className="physics-header-top" style={{display:'flex', alignItems:'center', gap:'20px'}}>
            
            {/* 1. ANIMOWANY VAULT BOY (GIF) */}
            <div className="gym-avatar-container" style={{background: '#000', border: '3px solid #12d3b9'}}>
                <img 
                    src={VAULT_BOY_GIF} 
                    alt="Vault Boy" 
                    className="gym-avatar-img"
                    style={{transform: 'scale(1.2)'}} // Lekkie powiększenie bo gif ma marginesy
                />
            </div>

            <div>
                <h1 className="physics-title" style={{marginBottom:'5px'}}>IRON TEMPLE</h1>
                <div style={{fontSize:'13px', color:'#12d3b9', opacity:0.8, letterSpacing:'1px'}}>
                    STATUS: {getAvatarForScore(rpgStats.S, rpgStats.W, rpgStats.H).label}
                </div>
            </div>

            {/* 2. IKONA BUFFOUT (PAKER) PO PRAWEJ */}
            <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'20px'}}>
                <img 
                    src={BUFFOUT_ICON} 
                    alt="Buffout" 
                    className="buffout-icon"
                    style={{height: '60px', width: 'auto'}}
                />
                <button className="physics-back-btn" onClick={() => onBack ? onBack() : window.location.href='/'}>← Menu</button>
            </div>
          </div>
          
          <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
              <button className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>📅 PLANER</button>
              <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>📈 PROGRES</button>
              <button className={`tab-btn ${activeTab === 'coach' ? 'active' : ''}`} onClick={() => setActiveTab('coach')}>🤖 AI TRENER</button>
          </div>
        </div>

        {/* ... TAB 1 & 2 & 3 (Bez większych zmian logicznych) ... */}
        {activeTab === 'calendar' && (
            <>
                <div className="physics-week-nav">
                    <button className="physics-nav-btn" onClick={() => changeWeek(-1)}>←</button>
                    <span className="physics-current-week">{getWeekRange()}</span>
                    <button className="physics-nav-btn" onClick={() => changeWeek(1)}>→</button>
                </div>
                <div className="physics-training-plans">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                        <h3 className="physics-section-title">Szablony:</h3>
                        <button className="physics-mini-btn" onClick={() => setIsCreatorOpen(true)} style={{background:'#12d3b9', color:'#000', fontWeight:'bold', padding: '8px 16px'}}>+ NOWY PLAN</button>
                    </div>
                    <div className="physics-plans-row">
                        {myPlans.map(plan => (
                        <div key={plan.id} className="physics-plan-card" draggable onDragStart={(e) => handleDragStart(e, plan)} style={{ borderColor: plan.color }}>
                            <div className="physics-plan-header">
                                <h4 className="physics-plan-title">{plan.name}</h4>
                                <button className="physics-mini-btn" onClick={() => openSessionModal(plan)}>▶ START</button>
                            </div>
                            <div className="physics-plan-exercises">
                                {plan.exercises_structure.slice(0,3).map((ex, idx) => <span key={idx} className="physics-exercise-tag">{ex.name}</span>)}
                            </div>
                            <button onClick={(e) => handleDeletePlan(e, plan.id)} style={{background:'none', border:'none', color:'#555', fontSize:'10px', marginTop:'5px', cursor:'pointer'}}>usuń</button>
                        </div>
                        ))}
                        {myPlans.length === 0 && <div style={{opacity:0.5}}>Brak planów.</div>}
                    </div>
                </div>
                <div className="physics-week-grid">
                {weekDays.map((day, index) => (
                    <div key={day} className={`physics-day-column ${weekDates[index].toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                    <div className="physics-day-header"><span className="physics-day-name">{weekDaysDisplay[index]}</span><span className="physics-day-date">{formatDate(weekDates[index])}</span></div>
                    <div className="physics-drop-zone" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, day)}>
                        {workouts[day] ? (
                        <div className="physics-workout-card" draggable onDragStart={(e) => handleDragStart(e, workouts[day], day)} style={{ borderColor: workouts[day].color }}>
                            <button className="physics-remove-btn" onClick={() => removeWorkout(day)}>×</button>
                            <h5 className="physics-workout-title">{workouts[day].name}</h5>
                            <div className="physics-workout-actions"><button className="physics-form-btn primary" onClick={() => openSessionModal(workouts[day])}>📝 WYPEŁNIJ</button></div>
                        </div>
                        ) : ( <span className="physics-empty-text">+</span> )}
                    </div>
                    </div>
                ))}
                </div>
            </>
        )}

        {activeTab === 'analytics' && (
            <div className="analytics-container" style={{background:'rgba(20, 20, 30, 0.6)', padding:'20px', borderRadius:'16px', marginTop:'20px', border:'1px solid rgba(255,255,255,0.05)'}}>
                <h2 style={{color:'#fff', marginBottom:'5px'}}>📊 Objętość Treningowa</h2>
                <div style={{width:'100%', height:'400px'}}>
                    {volumeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={volumeData}>
                                <defs><linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#12d3b9" stopOpacity={0.4}/><stop offset="95%" stopColor="#12d3b9" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" tick={{fontSize: 12}} />
                                <YAxis stroke="#666" tick={{fontSize: 12}} width={40} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="volume" stroke="#12d3b9" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" activeDot={{r: 6, strokeWidth: 0, fill: '#fff'}} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : ( <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#aaa'}}>Brak danych.</div> )}
                </div>
            </div>
        )}

        {activeTab === 'coach' && (
            <div className="coach-chat-container" style={{display:'flex', flexDirection:'column', height:'60vh', background:'rgba(0,0,0,0.4)', borderRadius:'16px', marginTop:'20px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)'}}>
                <div className="chat-messages" style={{flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'15px'}}>
                    {chatHistory.map((msg, i) => (
                        <div key={i} style={{alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth:'75%'}}>
                            <div style={{padding:'12px 16px', borderRadius:'12px', background: msg.role === 'user' ? '#12d3b9' : '#2a2a35', color: msg.role === 'user' ? '#000' : '#ddd', fontSize:'14px'}}>{msg.text}</div>
                        </div>
                    ))}
                    {chatLoading && <div style={{color:'#aaa', fontStyle:'italic', fontSize:'12px'}}>...</div>}
                    <div ref={chatEndRef} />
                </div>
                <div style={{padding:'15px', background:'rgba(0,0,0,0.3)', display:'flex', gap:'10px'}}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendToCoach()} placeholder="Zapytaj trenera..." style={{flex:1, padding:'12px', borderRadius:'8px', border:'1px solid #444', background:'rgba(0,0,0,0.5)', color:'#fff'}} />
                    <button onClick={handleSendToCoach} style={{padding:'0 25px', background:'#9945ff', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer'}}>→</button>
                </div>
            </div>
        )}

      </div>

      {/* --- KREATOR PLANU --- */}
      {isCreatorOpen && (
          <div className="session-modal-overlay">
              <div className="session-modal-glass creator-modal" style={{maxWidth: '900px', height:'85vh', display:'flex', flexDirection:'column'}}>
                  <div className="session-modal-header"><h2>🛠️ Kreator Planu</h2><button className="close-modal-btn" onClick={() => setIsCreatorOpen(false)}>✕</button></div>
                  <div style={{paddingBottom:'15px', borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                      <div className="ai-architect-bar">
                          <input type="text" placeholder="AI Architect: Np. 'Trening nóg pod siłę'" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiGeneration()} disabled={isGenerating} />
                          <button onClick={handleAiGeneration} disabled={isGenerating}>{isGenerating ? '...' : '✨ GENERUJ'}</button>
                      </div>
                      <div className="session-meta-row" style={{marginTop:'15px'}}>
                          <input type="text" value={newPlanData.name} onChange={e => setNewPlanData({...newPlanData, name: e.target.value})} placeholder="Nazwa Planu" style={{flex:2, fontSize:'16px', padding:'10px'}}/>
                          <input type="color" value={newPlanData.color} onChange={e => setNewPlanData({...newPlanData, color: e.target.value})} style={{flex:0.2, height:'42px', padding:0, border:'none', cursor:'pointer'}} />
                      </div>
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', flex:1, overflow:'hidden', marginTop:'15px'}}>
                      <div className="scrollable-col">
                          <h4 style={{color:'#12d3b9', marginBottom:'10px'}}>📚 Baza Ćwiczeń</h4>
                          <input placeholder="Szukaj..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input" />
                          <div className="items-list">
                              {filteredExercises.map(ex => (
                                  <div key={ex.id} onClick={() => addExerciseToPlan(ex)} className="library-item">
                                      <span>{ex.title}</span><span className="plus-icon" style={{color:'#12d3b9'}}>+</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      <div className="scrollable-col" style={{borderLeft:'1px solid rgba(255,255,255,0.1)', paddingLeft:'15px'}}>
                          <h4 style={{color:'#fff', marginBottom:'10px'}}>📋 Twój Plan</h4>
                          <div className="items-list">
                              {newPlanData.exercises.map((ex, idx) => (
                                  <div key={idx} className="plan-item-row" style={{background:'rgba(255,255,255,0.05)', borderLeft:'3px solid #12d3b9'}}>
                                      <div style={{display:'flex', justifyContent:'space-between', width:'100%', fontWeight:'bold', marginBottom:'8px'}}>
                                          <span>{ex.name}</span>
                                          <button onClick={() => removeExerciseFromPlan(idx)} className="del-btn" style={{color:'#ff4444'}}>✕</button>
                                      </div>
                                      <div className="sets-reps-inputs">
                                          <input type="number" value={ex.sets} onChange={e => updatePlanExercise(idx, 'sets', e.target.value)} /> s
                                          <input type="text" value={ex.reps} onChange={e => updatePlanExercise(idx, 'reps', e.target.value)} /> reps
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div style={{marginTop:'auto', paddingTop:'15px', borderTop:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'flex-end'}}>
                      <button onClick={saveNewPlan} className="save-session-btn" style={{width:'auto', padding:'12px 40px', fontSize:'16px'}}>ZAPISZ SZABLON</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: SESJA TRENINGOWA (LOGGER) - Z NAPRAWIONYM LAYOUTEM --- */}
      {activeSession && (
          <div className="session-modal-overlay">
              {/* ZWIĘKSZAMY SZEROKOŚĆ DO 800px (BYŁO 700px) */}
              <div className="session-modal-glass" style={{maxWidth:'800px', height:'90vh'}}>
                  <div className="session-modal-header">
                      <h2 style={{color:'#fff', textShadow:'0 0 10px rgba(18,211,185,0.5)'}}>🔥 {activeSession.name}</h2>
                      <button className="close-modal-btn" onClick={() => setActiveSession(null)}>✕</button>
                  </div>
                  
                  <div className="session-meta-row" style={{background:'rgba(0,0,0,0.3)', padding:'10px', borderRadius:'8px', marginBottom:'15px'}}>
                      <label>Czas (min): <input type="number" value={activeSession.duration} onChange={e => setActiveSession({...activeSession, duration: e.target.value})} style={{width:'60px', textAlign:'center'}}/></label>
                      <label>Data: <input type="date" value={activeSession.date} onChange={e => setActiveSession({...activeSession, date: e.target.value})} /></label>
                  </div>

                  <div className="session-exercises-list">
                      {activeSession.exercises.map((ex, idx) => (
                          <div key={idx} className="exercise-card">
                              <div className="exercise-header">
                                  <span className="exercise-title">{ex.exercise_name}</span>
                                  <button className="delete-exercise-btn" onClick={() => {
                                      const u = activeSession.exercises.filter((_, i) => i !== idx);
                                      setActiveSession({...activeSession, exercises: u});
                                  }}>🗑️</button>
                              </div>
                              <div className="exercise-inputs">
                                  <div className="input-group">
                                      <label>SERIE</label>
                                      <input className="big-input" type="number" value={ex.sets} onChange={e => {
                                          const u = [...activeSession.exercises]; u[idx].sets = e.target.value; setActiveSession({...activeSession, exercises: u});
                                      }} />
                                  </div>
                                  <div className="input-group">
                                      <label>REPS</label>
                                      <input className="big-input" type="text" value={ex.reps} onChange={e => {
                                          const u = [...activeSession.exercises]; u[idx].reps = e.target.value; setActiveSession({...activeSession, exercises: u});
                                      }} />
                                  </div>
                                  <div className="input-group">
                                      <label style={{color:'#12d3b9'}}>CIĘŻAR (KG)</label>
                                      <input className="big-input" type="number" value={ex.weight} style={{borderColor:'#12d3b9', color:'#12d3b9'}} onChange={e => {
                                          const u = [...activeSession.exercises]; u[idx].weight = e.target.value; setActiveSession({...activeSession, exercises: u});
                                      }} />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>

                  {aiAnalysis && (
                      <div className="modal-ai-box" style={{marginTop:'15px', border:'1px solid #9945ff'}}>
                          <strong style={{color:'#e0d0ff'}}>💡 Trener mówi:</strong> {aiAnalysis.recommendation || aiAnalysis.ocena}
                      </div>
                  )}

                  <div className="session-footer-actions" style={{marginTop:'auto', paddingTop:'15px'}}>
                      <button className="analyze-btn" onClick={analyzeCurrentSession} disabled={aiLoading || !lmStudioConnected} style={{flex:1}}>
                          {aiLoading ? 'Myślę...' : '🧠 AI Analiza'}
                      </button>
                      <button className="save-session-btn" onClick={handleFinishWorkout} disabled={sessionLoading} style={{flex:2, fontSize:'16px'}}>
                          {sessionLoading ? 'Zapisywanie...' : '✅ ZAKOŃCZ TRENING'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PhysicsTracker;