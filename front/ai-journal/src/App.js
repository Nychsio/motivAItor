import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import MainPage from './components/MainPage';
import TodoPage from './components/TodoPage';
import HealthPage from './components/HealthPage'; 
import PhysicsTracker from './components/PhysicsTracker'; // <--- O TU JEST TWOJA SIŁOWNIA
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); 

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) setIsLoggedIn(true);
  }, []);

  const handleLogin = () => setIsLoggedIn(true);
  
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
    setCurrentPage('main');
  };

  const navigateTo = (page) => {
    console.log("Nawigacja do:", page);
    setCurrentPage(page);
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <>
          {/* STRONA GŁÓWNA */}
          {currentPage === 'main' && (
            <MainPage 
              onNavigate={navigateTo} 
              onLogout={handleLogout} 
            />
          )}
          
          {/* COMMAND CENTER (Zadania) */}
          {currentPage === 'todo' && (
            <TodoPage onNavigate={navigateTo} />
          )}

          {/* HEALTH & DIET (Nowy plik HealthPage.js - Sen, Dieta) */}
          {currentPage === 'health' && (
            <HealthPage onBack={() => navigateTo('main')} />
          )}

          {/* IRON TEMPLE (Twój stary plik PhysicsTracker.js - Siłownia) */}
          {currentPage === 'gym' && (
            <PhysicsTracker 
                onBack={() => navigateTo('main')} 
                onNavigate={navigateTo} // Przekazuję też onNavigate, na wszelki wypadek jakbyś używał tam innej nazwy
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;