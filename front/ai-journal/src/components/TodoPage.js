import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../services/api';
import '../styles/TodoPage.css';
import ProjectModal from './ProjectModal';
import PomodoroTimer from './PomodoroTimer'; // Import dodany dla obsługi Timera

const TodoPage = ({ onNavigate }) => {
  // --- STANY ---
  const [tasks, setTasks] = useState({
    today: [],
    general: [] // Wszystkie zadania bez daty (Inbox + Projekty)
  });
  
  const [projects, setProjects] = useState([]);
  const [collapsedProjects, setCollapsedProjects] = useState({}); // Nowy stan do zwijania szuflad
  
  // Inputy
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newProjectId, setNewProjectId] = useState('');

  // Brain Dump & AI
  const [brainDumpText, setBrainDumpText] = useState('');
  const [isBrainDumpLoading, setIsBrainDumpLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Upuść zadanie tutaj, by pogadać.' }]);
  const [activeContext, setActiveContext] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- EFEKTY ---
  useEffect(() => {
    loadData();
    loadProjects();
  }, [currentDate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- ŁADOWANIE DANYCH ---
  const loadData = async () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    try {
      const [dailyRes, inboxRes] = await Promise.all([
        api.getTasks(dateStr),
        api.getInboxTasks() // Backend zwraca zadania bez daty (zarówno bez projektu, jak i z projektami)
      ]);
      
      const daily = Array.isArray(dailyRes) ? dailyRes : [];
      const inbox = Array.isArray(inboxRes) ? inboxRes : [];

      setTasks({
        today: daily,
        general: inbox
      });
    } catch (error) {
      console.error("Błąd danych:", error);
    }
  };

  const loadProjects = async () => {
    try {
      const proj = await api.getProjects();
      if (Array.isArray(proj)) setProjects(proj);
      else setProjects([]);
    } catch (error) {
      setProjects([]);
    }
  };

  // --- FUNKCJE POMOCNICZE DO SZUFLAD ---
  const toggleCollapse = (projId) => {
    setCollapsedProjects(prev => ({ ...prev, [projId]: !prev[projId] }));
  };

  // Filtrowanie zadań z Inboxa dla konkretnego projektu
  const getProjectTasks = (projId) => tasks.general.filter(t => t.project_id === projId);

  // Filtrowanie zadań bez projektu (Ogólny śmietnik)
  const getUnassignedTasks = () => tasks.general.filter(t => !t.project_id);

  const findTask = (id) => {
      return [...tasks.today, ...tasks.general].find(t => t.id === id);
  };

  // --- NAWIGACJA DATY ---
  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  // --- LOGIKA DRAG & DROP (ZMODYFIKOWANA) ---
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // A. Drop na AI
    if (destination.droppableId === 'ai-chat-zone') {
        const task = findTask(parseInt(draggableId));
        if (task) {
            setActiveContext({ id: task.id, title: task.content });
            setChatMessages(prev => [...prev, { role: 'system', text: `🎯 Kontekst: "${task.content}"` }]);
        }
        return;
    }

    const taskId = parseInt(draggableId);

    // B. Reordering na tej samej liście (Visual only for now)
    if (source.droppableId === destination.droppableId) {
        // Tutaj można dodać logikę sortowania (order), jeśli backend to obsługuje.
        // Na razie tylko aktualizujemy stan lokalny, żeby UI nie skakało.
        
        // Musimy wiedzieć, którą tablicę modyfikujemy
        let listKey = 'general'; // Domyślnie general, bo tam są szuflady
        let filteredList = [];
        
        if (source.droppableId === 'today') {
            listKey = 'today';
            filteredList = [...tasks.today];
        } else {
            // Szuflady operują na tasks.general, ale filtrowanym.
            // Prosta implementacja reorderingu w general jest trudna bez pola 'order'.
            // Pomijamy update stanu dla szuflad w tym prostym przykładzie, 
            // bo wymagałoby to skomplikowanego mapowania całego tasks.general.
            return; 
        }

        if (listKey === 'today') {
            const [removed] = filteredList.splice(source.index, 1);
            filteredList.splice(destination.index, 0, removed);
            setTasks(prev => ({ ...prev, today: filteredList }));
        }
        return;
    }

    // C. Przenoszenie między listami/szufladami (ZMIANA LOGIKI)
    if (source.droppableId !== destination.droppableId) {
      let newDate = null;
      let newProjectId = null;

      // 1. Jeśli cel to 'today' -> ustawiamy datę, PROJEKT ZOSTAJE TEN SAM
      if (destination.droppableId === 'today') {
          newDate = currentDate.toISOString().split('T')[0];
          const task = findTask(taskId);
          newProjectId = task ? task.project_id : null; // Zachowaj projekt
      } 
      // 2. Jeśli cel to szuflada (inbox projektu) -> kasujemy datę, ustawiamy PROJEKT
      else if (destination.droppableId.startsWith('inbox-')) {
          newDate = null; // Wpada do inboxa = traci datę
          const destProjIdStr = destination.droppableId.replace('inbox-', '');
          
          if (destProjIdStr === 'null' || destProjIdStr === 'undefined') {
              newProjectId = null; // Ogólny inbox
          } else {
              newProjectId = parseInt(destProjIdStr); // Konkretny projekt
          }
      }

      // 3. Optymistyczna aktualizacja UI (uproszczona)
      // W przypadku wielu szuflad, pełna optymistyczna aktualizacja jest skomplikowana.
      // Najbezpieczniej jest strzelić do API i przeładować dane.
      try {
          await api.updateTask(taskId, { 
              task_date: newDate,
              project_id: newProjectId,
              // Backend może wymagać contentu, więc pobieramy go
              content: findTask(taskId)?.content 
          });
          // Przeładowanie, żeby zadanie wskoczyło do właściwej szuflady
          loadData();
      } catch (error) {
          console.error("Błąd aktualizacji po dropie:", error);
      }
    }
  };

  // --- AKCJE ---
  const handleAddTask = async (destination = 'general') => {
    if (!newTaskInput.trim()) return;
    
    // Jeśli 'today' -> dzisiejsza data. Jeśli 'general' -> null (Inbox)
    const dateStr = destination === 'today' 
        ? currentDate.toISOString().split('T')[0] 
        : null;
    
    try {
      await api.addTask({
        content: newTaskInput,
        task_date: dateStr,
        is_completed: false,
        priority: newPriority,
        project_id: newProjectId || null
      });
      setNewTaskInput('');
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleToggleTask = async (taskId) => {
    // UI Optimistic update
    const toggleInList = (list) => list.map(t => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t);
    
    setTasks(prev => ({
        today: toggleInList(prev.today),
        general: toggleInList(prev.general)
    }));

    await api.toggleTask(taskId);
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Usunąć to zadanie na zawsze?")) {
        try {
            await api.deleteTask(taskId);
            loadData(); 
        } catch (e) {
            console.error("Błąd usuwania:", e);
        }
    }
  };

  const handleBrainDumpSubmit = async () => {
    if (!brainDumpText.trim()) return;
    setIsBrainDumpLoading(true);
    const dateStr = currentDate.toISOString().split('T')[0];
    try {
      await api.processBrainDump(brainDumpText, dateStr);
      setBrainDumpText('');
      loadData(); 
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'error', text: 'Błąd Brain Dump.' }]);
    } finally {
      setIsBrainDumpLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    
    try {
      const response = await api.chatWithAI(userMsg, activeContext?.id);
      setChatMessages(prev => [...prev, { role: 'ai', text: response.reply }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'error', text: 'Błąd AI.' }]);
    }
  };

  // --- KOMPONENT ZADANIA ---
  const TaskItem = ({ task, index }) => {
    const project = (projects || []).find(p => p.id === task.project_id);
    
    return (
      <Draggable draggableId={String(task.id)} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`todo-task-item ${task.is_completed ? 'completed' : ''} priority-${task.priority}`}
            style={{ 
                ...provided.draggableProps.style,
                borderLeft: `4px solid ${project ? project.color : 'transparent'}`
            }}
          >
            <div className="task-row-main">
                <div className="todo-checkbox" onClick={() => handleToggleTask(task.id)}>
                    {task.is_completed && '✓'}
                </div>
                
                <div className="todo-task-content">
                    <div className="task-header">
                        <span className="task-title">{task.content}</span>
                        <div className="task-badges">
                            {task.priority && task.priority !== 'medium' && (
                                <span className={`badge-priority ${task.priority}`}>{task.priority}</span>
                            )}
                            {project && (
                                <span className="badge-project" style={{color: project.color}}>
                                    {project.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    className="delete-task-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                    }}
                    title="Usuń zadanie"
                >
                    🗑️
                </button>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="todo-container">
        <div className="todo-background">
            <div className="todo-gif-background" style={{ backgroundImage: `url(/assets/steam.gif)` }}></div>
            <div className="todo-overlay"></div>
        </div>
        
        <div className="todo-content">
            {/* HEADER */}
            <div className="todo-header-glass">
                <button className="todo-back-btn" onClick={() => onNavigate('main')}>←</button>
                <div className="todo-date-nav-controls">
                    <button className="nav-arrow" onClick={() => changeDate(-1)}>◀</button>
                    <h2 className="current-date-display">
                        {currentDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h2>
                    <button className="nav-arrow" onClick={() => changeDate(1)}>▶</button>
                </div>
                <div style={{width: '60px'}}></div>
            </div>

            <div className="todo-main-grid">
                
                {/* LEWA KOLUMNA: ZADANIA */}
                <div className="tasks-column">
                    
                    {/* INPUT BAR */}
                    <div className="todo-glass-card mb-4 input-card">
                        <div className="input-options">
                            <select 
                                value={newPriority} 
                                onChange={e => setNewPriority(e.target.value)} 
                                className={`mini-select priority-${newPriority}`}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">🔥 High</option>
                            </select>
                            
                            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <select 
                                    value={newProjectId} 
                                    onChange={e => setNewProjectId(e.target.value)} 
                                    className="mini-select project-select"
                                >
                                    <option value="">Bez projektu</option>
                                    {(Array.isArray(projects) ? projects : []).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.stats?.is_rusting ? '⚠️ ' : ''}{p.name} ({p.stats?.progress}%)
                                        </option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => setIsProjectModalOpen(true)}
                                    className="mini-select"
                                    style={{background: 'rgba(255,255,255,0.1)', cursor: 'pointer', width: '30px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                    title="Nowy Projekt"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="input-main">
                            <input 
                                value={newTaskInput} 
                                onChange={e => setNewTaskInput(e.target.value)}
                                placeholder="Nowe zadanie..."
                                className="todo-input-clean"
                                onKeyPress={e => e.key === 'Enter' && handleAddTask('today')} 
                            />
                            <button onClick={() => handleAddTask('general')} className="add-btn secondary" style={{marginRight: '8px', opacity: 0.8}}>Do Inbox</button>
                            <button onClick={() => handleAddTask('today')} className="add-btn">Na Dziś</button>
                        </div>
                    </div>

                    {/* DZIŚ (TODAY) */}
                    <div className="todo-glass-card">
                        <h3 className="section-title">DZIŚ</h3>
                        <Droppable droppableId="today">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="task-list-drop-zone">
                                    {tasks.today.length > 0 ? (
                                        tasks.today.map((task, index) => <TaskItem key={task.id} task={task} index={index} />)
                                    ) : (
                                        <div className="empty-state">Brak zadań na dziś.</div>
                                    )}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* --- NOWA SEKCJA: PROJEKTY & INBOX --- */}
                    <div className="todo-glass-card mt-4" style={{background:'transparent', border:'none', boxShadow:'none', padding:0}}>
                        <h3 className="section-title" style={{marginBottom:'10px', marginLeft:'10px', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>🗄️ PROJEKTY & INBOX</h3>
                        
                        {/* 1. Luźne Zadania (Bez projektu) */}
                        <div className="project-accordion" style={{background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden'}}>
                            <div 
                                className="accordion-header" 
                                onClick={() => toggleCollapse('unassigned')}
                                style={{padding: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)'}}
                            >
                                <span style={{fontWeight: 'bold'}}>📥 Ogólny Inbox ({getUnassignedTasks().length})</span>
                                <span>{collapsedProjects['unassigned'] ? '▼' : '▲'}</span>
                            </div>
                            {!collapsedProjects['unassigned'] && (
                                <div className="accordion-body" style={{padding: '10px'}}>
                                    <Droppable droppableId="inbox-null">
                                        {(provided) => (
                                            <div ref={provided.innerRef} {...provided.droppableProps} className="task-list-drop-zone" style={{minHeight: '20px'}}>
                                                {getUnassignedTasks().map((task, index) => (
                                                    <TaskItem key={task.id} task={task} index={index} />
                                                ))}
                                                {provided.placeholder}
                                                {getUnassignedTasks().length === 0 && <div className="empty-state" style={{fontSize:'12px', opacity: 0.6, padding: '10px'}}>Pusto</div>}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )}
                        </div>

                        {/* 2. Projekty z Paskami Postępu */}
                        {projects.map(proj => {
                            const pTasks = getProjectTasks(proj.id);
                            const isRusting = proj.stats?.is_rusting;
                            const progress = proj.stats?.progress || 0; // Pobieramy procent z backendu

                            return (
                                <div key={proj.id} className={`project-accordion ${isRusting ? 'rusting' : ''}`} style={{marginTop: '12px'}}>
                                    <div 
                                        className="accordion-header" 
                                        onClick={() => toggleCollapse(proj.id)} 
                                        style={{
                                            borderLeft:`4px solid ${proj.color}`,
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'stretch',
                                            gap: '8px'
                                        }}
                                    >
                                        {/* Górny rząd nagłówka */}
                                        <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
                                            <span style={{fontWeight: '500'}}>
                                                {isRusting && <span className="rust-icon" title="Projekt rdzewieje!">⚠️</span>}
                                                {proj.name} 
                                                <span style={{opacity:0.5, fontSize:'12px', marginLeft: '8px'}}>({pTasks.length} w inboxie)</span>
                                            </span>
                                            <span>{collapsedProjects[proj.id] ? '▼' : '▲'}</span>
                                        </div>

                                        {/* Pasek Postępu wewnątrz nagłówka */}
                                        <div style={{width: '100%', height: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', overflow: 'hidden'}}>
                                            <div 
                                                style={{
                                                    width: `${progress}%`, 
                                                    height: '100%', 
                                                    background: isRusting ? '#ff6b35' : proj.color,
                                                    transition: 'width 0.5s ease'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    
                                    {!collapsedProjects[proj.id] && (
                                        <div className="accordion-body">
                                            <Droppable droppableId={`inbox-${proj.id}`}>
                                                {(provided) => (
                                                    <div ref={provided.innerRef} {...provided.droppableProps} className="task-list-drop-zone">
                                                        {pTasks.map((task, index) => (
                                                            <TaskItem key={task.id} task={task} index={index} />
                                                        ))}
                                                        {provided.placeholder}
                                                        {pTasks.length === 0 && <div className="empty-state" style={{fontSize:'12px'}}>Brak zadań w buforze.</div>}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* PRAWA KOLUMNA: AI & POMODORO */}
                <div className="ai-column">
                    
                    {/* 1. POMODORO TIMER (Nowy) */}
                    <div style={{marginBottom: '24px'}}>
                        <PomodoroTimer projects={projects} />
                    </div>

                    {/* 2. BRAIN DUMP (Bez zmian) */}
                    <div className="todo-glass-card mb-4">
                        <h3 className="card-title">🧠 BRAIN DUMP</h3>
                        <textarea
                            className="brain-dump-area"
                            placeholder="Wylej myśli..."
                            value={brainDumpText}
                            onChange={(e) => setBrainDumpText(e.target.value)}
                        />
                        <button 
                            className="brain-dump-action-btn"
                            onClick={handleBrainDumpSubmit}
                            disabled={isBrainDumpLoading}
                        >
                            {isBrainDumpLoading ? '...' : 'Generuj zadania ↓'}
                        </button>
                    </div>

                    <Droppable droppableId="ai-chat-zone">
                        {(provided, snapshot) => (
                            <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className={`todo-glass-card ai-chat-card ${snapshot.isDraggingOver ? 'drag-over-ai' : ''}`}
                            >
                                <div className="chat-header"><h3>AI ASSISTANT</h3></div>
                                <div className="chat-messages-area">
                                    {chatMessages.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
                                    {snapshot.isDraggingOver && <div className="drop-hint">UPUŚĆ ZADANIE!</div>}
                                    <div ref={chatEndRef} />
                                </div>
                                
                                {activeContext && (
                                    <div className="context-badge">
                                        <span>📎 {activeContext.title}</span>
                                        <button onClick={() => setActiveContext(null)}>✕</button>
                                    </div>
                                )}

                                <div className="chat-input-area">
                                    <input 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder={activeContext ? "Co z tym zrobić?" : "Pytaj..."}
                                        onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button onClick={handleSendMessage}>→</button>
                                </div>
                                <div style={{ display: 'none' }}>{provided.placeholder}</div>
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
        </div>
      </div>
    <ProjectModal 
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={loadProjects}
    />  
    </DragDropContext>
  );
};

export default TodoPage;