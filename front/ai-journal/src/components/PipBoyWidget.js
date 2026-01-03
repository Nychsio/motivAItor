// src/components/PipBoyWidget.js
import React, { useState, useEffect } from 'react';
import { api } from '../services/api'; // Upewnij się, że dodałeś getGamificationStats do api.js!
import { getAvatarForScore } from '../config/avatarConfig';
import '../styles/MainPage.css'; // Użyjemy styli głównej strony lub stwórz nowe

const PipBoyWidget = () => {
  const [stats, setStats] = useState({ S: 0, W: 0, H: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Pobieramy dane z backendu (gamification.py)
      const data = await api.getGamificationStats();
      setStats(data);
    } catch (error) {
      console.error("Błąd PipBoya:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="pipboy-loading">Ładowanie systemu S.W.H...</div>;

  // Obliczamy który awatar pokazać
  const avatarConfig = getAvatarForScore(stats.S, stats.W, stats.H);

  // Funkcja pomocnicza do koloru paska
  const getBarColor = (val) => {
    if (val < 30) return '#ff4444'; // Czerwony
    if (val < 70) return '#ffbb33'; // Żółty
    return '#00C851'; // Zielony
  };

  return (
    <div className="main-stat-card pipboy-card" style={{ gridRow: 'span 2' }}>
      <div className="card-header">
        <h3>STATUS POSTACI</h3>
        <span className="card-icon">☢️</span>
      </div>
      
      <div className="card-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        
        {/* AWATAR */}
        <div className="pipboy-avatar-container" style={{ 
            width: '120px', 
            height: '120px', 
            borderRadius: '50%', 
            border: `4px solid ${getBarColor((stats.S + stats.W + stats.H) / 3)}`,
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            {/* Jeśli nie masz obrazka, wyświetli tekst */}
            <img 
                src={avatarConfig.image} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText = 'BRAK IMG';}} 
            />
        </div>

        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' }}>
            {avatarConfig.label}
        </div>

        {/* PASKI STATYSTYK */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* STRENGTH */}
            <StatBar label="SIŁA (S)" value={stats.S} color="#ff4444" icon="💪" />
            
            {/* WILLPOWER */}
            <StatBar label="WOLA (W)" value={stats.W} color="#33b5e5" icon="🧠" />
            
            {/* HEALTH */}
            <StatBar label="ZDROWIE (H)" value={stats.H} color="#00C851" icon="❤️" />
            
        </div>
      </div>
    </div>
  );
};

// Mały pod-komponent do paska
const StatBar = ({ label, value, color, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
        <span style={{ minWidth: '20px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{opacity: 0.8}}>{label}</span>
                <span style={{fontWeight: 'bold'}}>{value}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ 
                    width: `${Math.min(100, value)}%`, 
                    height: '100%', 
                    background: color,
                    borderRadius: '3px',
                    transition: 'width 1s ease'
                }} />
            </div>
        </div>
    </div>
);

export default PipBoyWidget;