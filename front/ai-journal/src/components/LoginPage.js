import React, { useState } from 'react';
import '../styles/LoginPage.css';
import '../styles/animations.css';
import brainPng from '../assets/brain.png';

// Importuj `onLogin` z App.js
const LoginPage = ({ onLogin }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  // ... (reszta kodu terminala i tła bez zmian) ...
  React.useEffect(() => {
    const terminalMessages = [
      'SYSTEM INITIALIZING...',
      'LOADING AI MODULES...',
      'CONNECTING TO NEURAL NETWORK...',
      'ANALYZING USER PATTERNS...',
      'GALLUP STRENGTHS: LOADED',
      'ACCOUNTABILITY PROTOCOLS: ACTIVE',
      'MONITORING SUBSYSTEMS: ONLINE',
      'AWAITING USER AUTHENTICATION...',
      'SYSTEM STATUS: READY',
    ];

    const interval = setInterval(() => {
      setTerminalLines(prev => {
        const nextIndex = (prev.length % terminalMessages.length);
        const newLines = prev.length > 7 ? prev.slice(1) : prev;
        return [...newLines, `> ${terminalMessages[nextIndex]}`];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);


  const handleLogin = async () => {
    console.log('handleLogin called!');
    setErrorMessage(''); // Wyczyść błędy
    
    if (!username || !password) {
      setErrorMessage('Kurwa, wpisz login i hasło!');
      return;
    }

    setIsLoading(true);
    
    // Zmieniamy na `application/x-www-form-urlencoded` zgodnie z wymogami OAuth2
    const details = {
        'username': username, // FastAPI OAuth2 wymaga pola 'username'
        'password': password,
        'scope': '',
        'client_id': '',
        'client_secret': ''
    };

    // Tworzenie stringa formularza
    let formBody = [];
    for (const property in details) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(details[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");


    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: formBody, // Wysyłamy dane jako formularz
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błędny login lub hasło');
      }

      const data = await response.json(); // Powinien być { access_token: "...", token_type: "bearer" }
      console.log('Login successful, token received.');
      
      // Zapisujemy TOKEN, a nie flagę
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('username', username); // Zapisujemy email do wyświetlania
      
      // Wywołaj funkcję z App.js, która zmieni stan
      onLogin(); 
      
    } catch (error) {
      console.log('Error:', error.message);
      setErrorMessage(error.message + ', kurwa!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Background */}
      <div className="background">
        <div className="gif-background"></div>
        <div className="overlay"></div>
        <div className="particles-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
        <div 
          className="gif-background" 
          style={{ backgroundImage: `url(/assets/tech-bg.gif)` }}
        ></div>
        <div className="tech-grid"></div>
      </div>

      {/* Menu Button */}
      <div className="menu-button">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="menu-btn"
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Side Menu */}
      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-content">
          <div className="menu-header">
            <h3>AI JOURNAL SYSTEM</h3>
            <div className="menu-items">
              <div className="status-card">
                <div className="status-label">Status</div>
                <div className="status-value">Development Mode</div>
              </div>
              <div className="strengths-card">
                <div className="strengths-label">Your Gallup Strengths</div>
                <div className="strengths-value">
                  Ukierunkowanie • Poważanie • Bliskość • Rozwaga • Analityk
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="login-card">
          
          {/* Brain Icon */}
          <div className="brand-section">
            <div className="brain-icon">
              <img src={brainPng} alt="Brain" className="brain-image" />
            </div>
            <h1 className="brand-title">AI JOURNAL</h1>
            <p className="brand-subtitle">Accountability System v1.0</p>
          </div>

          {/* Login Form */}
          <div className="login-form">
            {/* Wyświetlanie błędu */}
            {errorMessage && (
              <div className="login-error-message">
                {errorMessage}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Login (Email):</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Wpisz email (np. piotr@aijournal.com)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Wpisz hasło (np. supertrudnehaslo123)"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className={`login-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  Authenticating...
                </div>
              ) : (
                'ACCESS SYSTEM'
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>Built for accountability & growth</p>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">24/7</div>
            <div className="stat-label">Tracking</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">AI</div>
            <div className="stat-label">Powered</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">100%</div>
            <div className="stat-label">Focus</div>
          </div>
        </div>

        {/* Sci-Fi Terminal */}
        <div className="terminal-container">
          <div className="terminal-header">
            <span className="terminal-prompt">SYSTEM_LOG@AI_JOURNAL:~$</span>
          </div>
          <div className="terminal-content">
            {terminalLines.map((line, index) => (
              <div key={index} className="terminal-line">
                {line}
                {index === terminalLines.length - 1 && <span className="cursor">_</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;