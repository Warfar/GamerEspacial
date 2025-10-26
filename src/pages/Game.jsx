// src/pages/Game.jsx
import React, { useEffect, useRef, useState } from 'react';
import '../styles/game.css';

// 🎨 Colores posibles
const colors = ['cyan', 'lime', 'yellow', 'magenta', 'orange', 'pink', 'red', 'blue'];

// 🎨 Asigna color según nombre
const getRandomColor = (seed) => {
  let index = seed ? seed.charCodeAt(0) % colors.length : Math.floor(Math.random() * colors.length);
  return colors[index];
};

export default function Game() {
  const [countdown, setCountdown] = useState(300);
  const [events, setEvents] = useState(['🚀 Inicia el juego!']);
  const [players, setPlayers] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [riddles, setRiddles] = useState([]);
  const [modalRiddle, setModalRiddle] = useState(null);
  const [modalAnswer, setModalAnswer] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [particles, setParticles] = useState([]);
  const [shipLevel, setShipLevel] = useState(100);
  const [repairing, setRepairing] = useState(false);

  const riddleTimerRef = useRef(null);
  const botTimerRef = useRef(null);

  const RIDDLE_RESPONSE_SECONDS = 10;
  const BOT_CORRECT_PROBABILITY = 0.6;
  const RIDDLE_SUCCESS_JUMPS = 2;

  // 🧩 Acertijos
  useEffect(() => {
    setRiddles([
      { cell_number: 4, question: '¿Qué planeta es el más cercano al Sol?', answer: 'Mercurio' },
      { cell_number: 7, question: '¿Cuántos planetas hay en el sistema solar?', answer: '8' },
      { cell_number: 10, question: '¿Cuál es el planeta más grande?', answer: 'Júpiter' },
      { cell_number: 12, question: '¿Cuál es el satélite natural de la Tierra?', answer: 'Luna' },
      { cell_number: 15, question: '¿Qué planeta es conocido como el Planeta Rojo?', answer: 'Marte' },
      { cell_number: 19, question: '¿Cuál es la estrella más cercana a la Tierra?', answer: 'Sol' },
      { cell_number: 24, question: '¿El agua hierve a 100 grados en qué escala?', answer: 'Celsius' },
      { cell_number: 28, question: '¿Cuál planeta tiene anillos visibles?', answer: 'Saturno' },
      { cell_number: 33, question: '¿Qué gas respiramos principalmente?', answer: 'Oxígeno' },
      { cell_number: 38, question: '¿Cuál es la velocidad aproximada de la luz (km/s)?', answer: '300000' },
      { cell_number: 42, question: '¿Qué planeta tiene una gran mancha roja?', answer: 'Júpiter' },
      { cell_number: 47, question: '¿Cuál es el gas más abundante en el universo?', answer: 'Hidrógeno' },
      { cell_number: 53, question: '¿En qué unidad medimos la energía eléctrica?', answer: 'Joule' },
      { cell_number: 57, question: '¿Cuál es el planeta más frío del sistema solar?', answer: 'Neptuno' },
    ]);
  }, []);

  // 🧍‍♂️ Jugador + Bot
  useEffect(() => {
    const savedPlayer = JSON.parse(localStorage.getItem('player'));
    if (!savedPlayer) {
      alert('No se encontró jugador, regresando al lobby...');
      window.location.href = '/';
      return;
    }

    const human = {
      id: 'human',
      name: savedPlayer.name || 'Jugador',
      role: savedPlayer.role || 'Pilot',
      color: getRandomColor(savedPlayer.name),
      current_position: 1,
      isBot: false,
    };

    const bot = {
      id: 'bot',
      name: 'BOT-01',
      role: 'Bot',
      color: getRandomColor('bot'),
      current_position: 1,
      isBot: true,
    };

    setPlayers([human, bot]);
    setCurrentTurnIndex(0);
  }, []);

  // 🕑 Countdown + daño progresivo
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      setShipLevel(prev => (!repairing && prev > 0 ? Math.max(prev - 0.05, 0) : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [repairing]);

  // ✨ Partículas
  useEffect(() => {
    const handleMouseMove = (e) => {
      const id = Date.now() + Math.random();
      setParticles(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 500);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const pushEvent = (text) => setEvents(prev => [text, ...prev].slice(0, 100));
  const getRedCells = () => [5, 12, 18, 23, 30, 37, 44, 50];
  const getYellowCells = () => riddles.map(r => r.cell_number);
  const getCellClass = (i) => {
    const redCells = getRedCells();
    const yellowCells = getYellowCells();
    if (i === 59) return 'blue';
    if (redCells.includes(i + 1)) return 'red';
    if (yellowCells.includes(i + 1)) return 'yellow';
    return 'blackhole';
  };

  const advanceTurn = (nextIndex = null) => {
    setModalRiddle(null);
    setModalAnswer('');
    setIsRolling(false);
    setCurrentTurnIndex(prev => {
      const newIndex = nextIndex !== null ? nextIndex : (prev + 1) % players.length;
      const nextPlayer = players[newIndex];
      if (nextPlayer && nextPlayer.isBot) {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
        botTimerRef.current = setTimeout(() => botPlay(newIndex), 1000 + Math.random() * 800);
      }
      return newIndex;
    });
  };

  const updatePlayerById = (id, patch) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const movePlayerStepByStep = async (playerId, targetPosition) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const start = player.current_position;
    for (let pos = start + 1; pos <= targetPosition; pos++) {
      await new Promise(res => setTimeout(res, 300));
      updatePlayerById(playerId, { current_position: pos });
    }
  };

  const handleReachedGoal = (player) => {
    setRepairing(true);
    pushEvent(`🏆 ${player.name} llegó a la casilla 60 y comienza la reparación de la nave!`);
    let level = shipLevel;
    const interval = setInterval(() => {
      level = Math.min(100, level + 2);
      setShipLevel(level);
      if (level >= 100) {
        clearInterval(interval);
        setRepairing(false);
        pushEvent('🛠️ Nave reparada. ¡Misión completada!');
      }
    }, 120);
  };

  const performRollForIndex = async (index) => {
    const player = players[index];
    if (!player) return;

    const dice = Math.floor(Math.random() * 6) + 1;
    const redCells = getRedCells();
    const yellowCells = getYellowCells();
    let targetPos = player.current_position + dice;
    if (targetPos >= 60) targetPos = 60;

    pushEvent(`🎲 ${player.name} tiró ${dice}`);

    await movePlayerStepByStep(player.id, targetPos);

    if (targetPos === 60) {
      pushEvent(`${player.name} llegó a la meta!`);
      handleReachedGoal(player);
      advanceTurn();
      return;
    }

    if (redCells.includes(targetPos)) {
      const newPos = Math.max(targetPos - 2, 1);
      updatePlayerById(player.id, { current_position: newPos });
      pushEvent(`⚠️ ${player.name} cayó en casilla roja y retrocede a ${newPos}`);
      advanceTurn();
      return;
    }

    if (yellowCells.includes(targetPos)) {
      const riddle = riddles.find(r => r.cell_number === targetPos);
      setModalRiddle({ ...riddle, playerId: player.id });
      setModalAnswer('');
      if (riddleTimerRef.current) clearTimeout(riddleTimerRef.current);
      riddleTimerRef.current = setTimeout(() => {
        pushEvent(`⏱️ Tiempo agotado: ${player.name} no respondió y retrocede`);
        const newPos = Math.max(player.current_position - 2, 1);
        updatePlayerById(player.id, { current_position: newPos });
        setModalRiddle(null);
        advanceTurn();
      }, RIDDLE_RESPONSE_SECONDS * 1000);
      pushEvent(`🎲 ${player.name} cayó en casilla amarilla (acertijo)`);
      updatePlayerById(player.id, { temp_position: targetPos });
      return;
    }

    advanceTurn();
  };

  const handleUserRoll = () => {
    const current = players[currentTurnIndex];
    if (!current || current.isBot || isRolling || modalRiddle) return;
    setIsRolling(true);
    performRollForIndex(currentTurnIndex);
  };

  const botPlay = (botIndex) => {
    const bot = players[botIndex];
    if (!bot || !bot.isBot) return;
    setIsRolling(true);
    setTimeout(() => performRollForIndex(botIndex), 700 + Math.random() * 700);
  };

  const handleRiddleAnswer = (fromBot = false) => {
    if (!modalRiddle) return;
    if (riddleTimerRef.current) clearTimeout(riddleTimerRef.current);

    const playerId = modalRiddle.playerId;
    const player = players.find(p => p.id === playerId);
    const correct = fromBot
      ? Math.random() < BOT_CORRECT_PROBABILITY
      : modalAnswer.trim().toLowerCase() === modalRiddle.answer.trim().toLowerCase();

    if (correct) {
      const target = player.temp_position || player.current_position;
      let newPos = target + RIDDLE_SUCCESS_JUMPS;
      if (newPos >= 60) newPos = 60;
      updatePlayerById(playerId, { current_position: newPos, temp_position: undefined });
      pushEvent(`✅ ${player.name} respondió correctamente y salta a ${newPos}`);
      if (newPos === 60) handleReachedGoal(player);
    } else {
      const newPos = Math.max(player.current_position - 2, 1);
      updatePlayerById(playerId, { current_position: newPos, temp_position: undefined });
      pushEvent(`❌ ${player.name} falló el acertijo y retrocede a ${newPos}`);
    }

    setModalRiddle(null);
    setModalAnswer('');
    setIsRolling(false);
    advanceTurn();
  };

  // 🤖 Auto-respuesta del bot en acertijo
  useEffect(() => {
    if (!modalRiddle) return;
    const p = players.find(x => x.id === modalRiddle.playerId);
    if (p && p.isBot) {
      const delay = 1000 + Math.random() * (RIDDLE_RESPONSE_SECONDS * 1000 - 1500);
      if (riddleTimerRef.current) clearTimeout(riddleTimerRef.current);
      riddleTimerRef.current = setTimeout(() => handleRiddleAnswer(true), delay);
    }
  }, [modalRiddle, players]);

  useEffect(() => {
    return () => {
      if (riddleTimerRef.current) clearTimeout(riddleTimerRef.current);
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  const currentTurn = players[currentTurnIndex];

  // 🔄 Función para reiniciar juego
  const handleRestartGame = () => {
    setPlayers(prev => prev.map(p => ({
      ...p,
      current_position: 1,
      temp_position: undefined,
    })));
    setEvents(['🚀 Juego reiniciado']);
    setCurrentTurnIndex(0);
    setCountdown(300);
    setShipLevel(100);
    setModalRiddle(null);
    setModalAnswer('');
    setIsRolling(false);
  };

  return (
    <div className="game-wrapper">
      {particles.map(p => (
        <div key={p.id} className="cursor-particle" style={{ top: p.y, left: p.x }} />
      ))}

      <div className="navbar">
        <div className="navbar-logo">⭐ Estrella Errante</div>
        <div className="navbar-buttons">
          <button onClick={() => window.location.href = '/'}>Salir</button>
          <button
            onClick={handleUserRoll}
            disabled={isRolling || !!modalRiddle || !currentTurn || currentTurn.isBot}
          >
            🎲 Tirar dado
          </button>
          <button
            onClick={handleRestartGame}
            disabled={isRolling || !!modalRiddle}
          >
            🔄 Reiniciar
          </button>
        </div>
        <div className="timer">⏳ {countdown}s</div>
      </div>

      <div className="game-container">
        {/* 🚀 Sistema de la Nave */}
        <div className="dashboard systems">
          <h3>Sistemas de la Nave</h3>
          <div className="system-bar">
            <div className="system-level" style={{ width: `${shipLevel}%` }} />
          </div>
          <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
            {repairing ? '🛠️ Reparando...' : 'La nave se deteriora con el tiempo'}
          </p>
        </div>

        {/* 🧑‍🚀 Astronauta flotando */}
        <div className="astronaut-container">
          <img src="img/astronauta.png" alt="Astronauta" className="astronaut" />
        </div>

        {/* Tablero */}
        <div className="board-container">
          <div className="board">
            {[...Array(60)].map((_, i) => {
              const className = getCellClass(i);
              const playersHere = players.filter(p => p.current_position === i + 1);
              return (
                <div key={i} className={`cell ${className}`}>
                  {i + 1}
                  {playersHere.map((p, j) => (
                    <div key={j} className="player-marker" style={{ backgroundColor: p.color }} />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="turn-indicator">
            Turno de: {currentTurn ? currentTurn.name + (currentTurn.isBot ? ' (bot)' : '') : '—'}
          </div>
        </div>

        {/* Eventos */}
        <div className="dashboard events">
          <h3>Eventos</h3>
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {events.map((e, i) => <div key={i} className="event">{e}</div>)}
          </div>
        </div>
      </div>

      {/* Jugadores */}
      <div className="players-container">
        <table className="players-footer">
          <thead>
            <tr><th>Nombre</th><th>Rol</th><th>Pos</th><th>Color</th></tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i} style={{ opacity: currentTurnIndex === i ? 1 : 0.9 }}>
                <td>{p.name}{p.isBot ? ' 🤖' : ''}</td>
                <td>{p.role}</td>
                <td>{p.current_position}</td>
                <td><span style={{ color: p.color }}>⬤</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Acertijo */}
      {modalRiddle && (
        <div className="modal">
          <div className="modal-content">
            <h3>Acertijo (Casilla {modalRiddle.cell_number}):</h3>
            <p>{modalRiddle.question}</p>

            {(() => {
              const p = players.find(x => x.id === modalRiddle.playerId);
              if (p && p.isBot) return <p>El bot está pensando... 🤖</p>;
              return (
                <>
                  <input
                    type="text"
                    value={modalAnswer}
                    onChange={e => setModalAnswer(e.target.value)}
                    placeholder="Escribe tu respuesta"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleRiddleAnswer(false)}>Responder</button>
                    <button onClick={() => {
                      if (riddleTimerRef.current) clearTimeout(riddleTimerRef.current);
                      const playerId = modalRiddle.playerId;
                      const player = players.find(p => p.id === playerId);
                      const newPos = Math.max(player.current_position - 2, 1);
                      updatePlayerById(playerId, { current_position: newPos, temp_position: undefined });
                      pushEvent(`✋ ${player.name} se rindió y retrocede a ${newPos}`);
                      setModalRiddle(null);
                      setModalAnswer('');
                      advanceTurn();
                    }}>Rendirse</button>
                  </div>
                </>
              );
            })()}
            <p style={{ marginTop: 10, fontSize: '0.85rem' }}>
              Tienes {RIDDLE_RESPONSE_SECONDS} segundos para responder
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
