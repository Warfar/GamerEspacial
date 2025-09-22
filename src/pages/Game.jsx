import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import '../styles/game.css';

// =================== Asignar color único ===================
const getRandomColor = (seed) => {
  const colors = ['cyan', 'lime', 'yellow', 'magenta', 'orange', 'pink', 'red', 'blue'];
  let index = seed ? seed.charCodeAt(0) % colors.length : Math.floor(Math.random()*colors.length);
  return colors[index];
}

export default function Game() {
  const [countdown, setCountdown] = useState(300);
  const [events, setEvents] = useState(['🚀 Inicia el juego!']);
  const [shipSystems, setShipSystems] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [players, setPlayers] = useState([]);
  const [spectators, setSpectators] = useState(0);
  const [showPlayersDropdown, setShowPlayersDropdown] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [particles, setParticles] = useState([]);
  const [riddles, setRiddles] = useState([]);
  const [modalRiddle, setModalRiddle] = useState(null);
  const [modalAnswer, setModalAnswer] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [realtimeBlocked, setRealtimeBlocked] = useState(false); // evita conflictos Realtime

  // =================== Obtener sesión actual ===================
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if(data) setSessionId(data.id);
    }
    getSession();
  }, []);

  // =================== Cargar jugadores ===================
  const loadPlayers = async () => {
    if(!sessionId || realtimeBlocked) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId);
    if(data) {
      const updatedPlayers = data.map(p => ({
        ...p,
        current_position: p.current_position || 1,
        color: p.color || getRandomColor(p.id)
      }));
      setPlayers(updatedPlayers);

      if(!currentTurn && updatedPlayers.length > 0) {
        setCurrentTurn(updatedPlayers[0]);
        await supabase
          .from('game_sessions')
          .update({ current_turn_player_id: updatedPlayers[0].id })
          .eq('id', sessionId);
      }
    }
  }

  // =================== Cargar ship systems ===================
  const loadShipSystems = async () => {
    if(!sessionId) return;
    const { data } = await supabase
      .from('ship_systems')
      .select('*')
      .eq('session_id', sessionId);
    if(data) setShipSystems(data);
  }

  // =================== Cargar acertijos ===================
  const loadRiddles = async () => {
    if(!sessionId) return;
    const { data } = await supabase
      .from('riddles')
      .select('*');
    if(data) setRiddles(data);
  }

  // =================== Cargar turno actual ===================
  const loadCurrentTurn = async () => {
    if(!sessionId || players.length === 0) return;
    const { data } = await supabase
      .from('game_sessions')
      .select('current_turn_player_id')
      .eq('id', sessionId)
      .single();
    if(data && data.current_turn_player_id) {
      const p = players.find(pl => pl.id === data.current_turn_player_id);
      if(p) setCurrentTurn(p);
    }
  }

  // =================== Guardar historial de turno ===================
  const saveTurnHistory = async (playerId, position, turnNumber) => {
    if(!sessionId) return;
    await supabase
      .from('turn_history')
      .insert([{ session_id: sessionId, player_id: playerId, turn_number: turnNumber, position }]);
  }

  // =================== Cambio de turno ===================
  const nextTurn = async () => {
    if(players.length === 0 || !currentTurn) return;
    const currentIndex = players.findIndex(p => p.id === currentTurn.id);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];
    setCurrentTurn(nextPlayer);
    await supabase
      .from('game_sessions')
      .update({ current_turn_player_id: nextPlayer.id })
      .eq('id', sessionId);
  }

  // =================== Manejar respuesta del acertijo ===================
  const handleRiddleAnswer = async () => {
    const riddle = modalRiddle;
    if(riddle) {
      if(modalAnswer.trim().toLowerCase() === riddle.answer.trim().toLowerCase()) {
        setEvents(prev => [`✅ ${currentTurn.name} respondió correctamente: ${modalAnswer}`, ...prev]);
      } else {
        setEvents(prev => [`❌ ${currentTurn.name} respondió mal: ${modalAnswer}`, ...prev]);
        const newPos = Math.max(currentTurn.current_position - 2, 1);
        setPlayers(prev =>
          prev.map(p => p.id === currentTurn.id ? { ...p, current_position: newPos } : p)
        );
        await supabase
          .from('players')
          .update({ current_position: newPos })
          .eq('id', currentTurn.id);
      }
    }
    setModalRiddle(null);
    setModalAnswer('');
    await nextTurn();
    setIsRolling(false);
  }

  // =================== Tirar dado optimizado ===================
 const rollDice = async () => {
  if (!sessionId || !currentTurn || isRolling || modalRiddle) return;

  setIsRolling(true);
  setRealtimeBlocked(true);

  const dice = Math.floor(Math.random() * 6) + 1;
  const redCells = [5, 12, 18, 23, 30, 37, 44, 50];
  const yellowCells = riddles.map(r => r.cell_number);

  let position = currentTurn.current_position;
  let stop = false;

  for (let step = 1; step <= dice; step++) {
    if (stop) break;
    position += 1;

    // Casilla roja
    if (redCells.includes(position)) {
      position = Math.max(position - 2, 1);
      setEvents(prev => [`⚠️ ${currentTurn.name} cayó en casilla roja y retrocede 2 casillas`, ...prev]);
      stop = true;
      break;
    }

    // Casilla amarilla
    if (yellowCells.includes(position)) {
      const riddle = riddles.find(r => r.cell_number === position);
      if (riddle) {
        setModalRiddle(riddle);
        stop = true;
        break;
      }
    }

    // Casilla final
    if (position >= 60) {
      position = 60;
      await supabase.from('ship_systems').update({ level: 100 }).eq('session_id', sessionId);
      setEvents(prev => [`🛠️ ${currentTurn.name} llegó al bloque 60 y reparó la nave!`, ...prev]);
      stop = true;
      break;
    }
  }

  // Actualiza estado y DB solo una vez
  setPlayers(prev =>
    prev.map(p => p.id === currentTurn.id ? { ...p, current_position: position } : p)
  );
  await supabase.from('players').update({ current_position: position }).eq('id', currentTurn.id);
  await saveTurnHistory(currentTurn.id, position, dice);

  // Evento final de la tirada
  if (!modalRiddle) {
    setEvents(prev => [`🎲 ${currentTurn.name} tiró ${dice} y avanzó a casilla ${position}`, ...prev]);
    await nextTurn();
  }

  setRealtimeBlocked(false);
  setIsRolling(false);
};



  // =================== Reiniciar juego ===================
  const resetGame = async () => {
    if(!sessionId) return;
    await supabase.from('players').update({ current_position: 1 }).eq('session_id', sessionId);
    await supabase.from('ship_systems').update({ level: 100 }).eq('session_id', sessionId);
    setEvents(['🔄 Juego reiniciado!']);
    loadPlayers();
  }

  // =================== Borrar toda la base ===================
  const deleteAllData = async () => {
    if(!window.confirm('¿Seguro que quieres borrar todos los datos?')) return;
    await supabase.from('turn_history').delete().neq('id', '');
    await supabase.from('player_actions').delete().neq('id', '');
    await supabase.from('game_events').delete().neq('id', '');
    await supabase.from('ship_systems').delete().neq('id', '');
    await supabase.from('players').delete().neq('id', '');
    await supabase.from('spectators').delete().neq('id', '');
    await supabase.from('game_sessions').delete().neq('id', '');
    setPlayers([]);
    setShipSystems([]);
    setEvents(['🗑️ Todos los datos han sido borrados']);
    setCurrentTurn(null);
  }

  // =================== Realtime ===================
  useEffect(() => {
    if(!sessionId) return;
    const channel = supabase
      .channel('game_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ship_systems' }, () => loadShipSystems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => loadCurrentTurn())
      .subscribe();

    loadPlayers();
    loadShipSystems();
    loadRiddles();
    loadCurrentTurn();
    return () => supabase.removeChannel(channel);
  }, [sessionId, realtimeBlocked]);

  // =================== Countdown ===================
  useEffect(() => {
    const timer = setInterval(() => setCountdown(prev => prev > 0 ? prev -1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  // =================== Brillitos del mouse ===================
  useEffect(() => {
    const handleMouseMove = (e) => {
      const id = Date.now() + Math.random();
      setParticles(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 500);
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // =================== Tablero ===================
  const getCellClass = (i) => {
    const redCells = [5,12,18,23,30,37,44,50];
    const yellowCells = riddles.map(r => r.cell_number);
    if(i === 59) return 'blue';
    if(redCells.includes(i+1)) return 'red';
    if(yellowCells.includes(i+1)) return 'yellow';
    return 'blackhole';
  }

  // =================== Render ===================
  return (
    <div className="game-wrapper">
      {particles.map(p => (
        <div key={p.id} className="cursor-particle" style={{top: p.y, left: p.x}} />
      ))}

      <div className="navbar">
        <div className="navbar-logo">⭐ Estrella Errante</div>
        <div className="navbar-buttons">
          <button onClick={resetGame}>Reiniciar</button>
          <button onClick={rollDice}>Tirar dado</button>
          <button onClick={deleteAllData}>Borrar todo</button>
        </div>
        <div className="navbar-dropdown">
          <button onClick={() => setShowPlayersDropdown(!showPlayersDropdown)}>
            Jugadores ({players.length})
          </button>
          {showPlayersDropdown && (
            <div className="dropdown-menu">
              {players.map((p,i) => (
                <div key={i} className="dropdown-item">
                  <span style={{color:p.color}}>⬤</span> {p.name} - {p.role}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="timer">⏳ {countdown}s | Espectadores: {spectators}</div>
      </div>

      <div className="game-container">
        <div className="dashboard systems">
          <h3>Sistemas de la Nave</h3>
          {shipSystems.map((s,i) => (
            <div key={i}>
              <p>{s.system_name}</p>
              <div className="system-bar">
                <div className="system-level" style={{width: `${s.level}%`}}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="board-container">
          <div className="board">
            {[...Array(60)].map((_, i) => {
              const className = getCellClass(i);
              const playersHere = players.filter(p => p.current_position === i + 1);
              return (
                <div key={i} className={`cell ${className}`}>
                  {i+1}
                  {playersHere.map((p,j) => (
                    <div key={j} className="player-marker" style={{ backgroundColor: p.color }} />
                  ))}
                </div>
              )
            })}
          </div>
          <div className="turn-indicator">Turno de: {currentTurn?.name}</div>
        </div>

        <div className="dashboard events">
          <h3>Eventos</h3>
          {events.map((e,i) => <div key={i} className="event">{e}</div>)}
        </div>
      </div>

      <div className="players-container">
        <table className="players-footer">
          <thead>
            <tr><th>Nombre</th><th>Rol</th><th>Color</th></tr>
          </thead>
          <tbody>
            {players.map((p,i) => (
              <tr key={i}>
                <td>{p.name}</td>
                <td>{p.role}</td>
                <td><span style={{color:p.color}}>⬤</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="astronauta-container">
       <img src='../img/astronauta.png' alt="astronauta" /> 
      </div>

      {modalRiddle && (
        <div className="modal">
          <div className="modal-content">
            <h3>Acertijo: {modalRiddle.question}</h3>
            <input
              type="text"
              value={modalAnswer}
              onChange={e => setModalAnswer(e.target.value)}
              placeholder="Escribe tu respuesta"
            />
            <button onClick={handleRiddleAnswer}>Responder</button>
          </div>
        </div>
      )}
    </div>
  )
}
