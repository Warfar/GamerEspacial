import React, { useEffect, useState } from 'react'
import '../styles/Lobby.css'

const roles = [
  'Pilot', 'Engineer', 'Medic', 'Scientist', 'Navigator', 'Commander', 'Observer'
]

export default function Lobby() {
  const [playerName, setPlayerName] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [players, setPlayers] = useState([])
  const [countdown, setCountdown] = useState(120)
  const [joined, setJoined] = useState(false)

  const chooseRole = (role) => {
    if (!playerName) return alert('Escribe tu nombre primero')
    if (players.some(p => p.role === role)) return alert('Ese rol ya fue tomado')

    const newPlayer = { name: playerName, role }
    setPlayers([...players, newPlayer])
    setSelectedRole(role)
    setJoined(true)

    // 💾 Guarda al jugador en localStorage para que Game.jsx pueda leerlo
    localStorage.setItem('player', JSON.stringify(newPlayer))
  }

  useEffect(() => {
    if (joined) {
      // Espera 2 segundos y redirige a la página del juego
      const timer = setTimeout(() => {
        window.location.href = '/game'
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [joined])

  useEffect(() => {
    if (!joined) {
      if (countdown <= 0) return
      const timer = setInterval(() => setCountdown(prev => prev - 1), 1000)
      return () => clearInterval(timer)
    }
  }, [countdown, joined])

  return (
    <div className="container">
      <div className="form-card">
        <div className="title">
          <h1>Escape Galáctico</h1>
          <p>{joined ? `¡Prepárate, ${playerName}!` : 'Selecciona tu rol'}</p>
        </div>

        <div className="scoreboard">
          <h3>Jugadores</h3>
          <ul>
            {players.map((p, i) => (
              <li key={i}>{p.name} - {p.role}</li>
            ))}
          </ul>
        </div>

        {!joined && (
          <>
            <input
              type="text"
              placeholder="Nombre del jugador"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="input-field"
            />
            <div className="roles-container">
              {roles.map(r => (
                <button
                  key={r}
                  className="role-btn"
                  onClick={() => chooseRole(r)}
                  disabled={players.some(p => p.role === r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="countdown">
          Tiempo de espera: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}
