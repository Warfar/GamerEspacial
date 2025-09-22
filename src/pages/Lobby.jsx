import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import '../styles/Lobby.css'

const roles = [
  'Pilot', 'Engineer', 'Medic', 'Scientist', 'Navigator', 'Commander', 'Observer'
]

export default function Lobby() {
  const [playerName, setPlayerName] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [players, setPlayers] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [countdown, setCountdown] = useState(120)
  const [joined, setJoined] = useState(false)

  const createSession = async () => {
    if(sessionId) return sessionId
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{ status: 'countdown_roles' }])
        .select().single()
      if(error) { console.error(error); return null }
      setSessionId(data.id)
      return data.id
    } catch(err) { console.error(err); return null }
  }

  const loadPlayers = async (currentSessionId) => {
    if(!currentSessionId) return
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', currentSessionId)
    if(error) { console.error(error); return }
    setPlayers(data)
  }

  const chooseRole = async (role) => {
    if(!playerName) return alert('Escribe tu nombre primero')
    const currentSession = await createSession()
    if(!currentSession) return alert('No se pudo crear la sesión.')

    const { data: existingRoles, error } = await supabase
      .from('players')
      .select('role')
      .eq('session_id', currentSession)
    if(error) return console.error(error)
    if(existingRoles.some(p => p.role === role)) return alert('Ese rol ya fue tomado')

    const { data, error: insertError } = await supabase
      .from('players')
      .insert([{ name: playerName, role, session_id: currentSession, is_ready: true }])
      .select().single()
    if(insertError) return console.error(insertError)
    
    setSelectedRole(role)
    setJoined(true)
    loadPlayers(currentSession)
  }

  useEffect(() => {
    if(!sessionId) return
    const subscription = supabase
      .channel('players_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        loadPlayers(sessionId)
      })
      .subscribe()
    return () => supabase.removeChannel(subscription)
  }, [sessionId])

  useEffect(() => {
    if(countdown <= 0) {
      window.location.href = '/game'
      return
    }
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [countdown])

  return (
    <div className="container">
      <div className="form-card">
        <div className="title">
          <h1>Escape Galáctico</h1>
          <p>{joined ? `Prepárate, ${playerName}` : 'Selecciona tu rol'}</p>
        </div>

        <div className="scoreboard">
          <h3>Jugadores</h3>
          <ul>
            {players.map(p => <li key={p.id}>{p.name} - {p.role}</li>)}
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
          Tiempo de espera: {Math.floor(countdown/60)}:{(countdown%60).toString().padStart(2,'0')}
        </div>
      </div>
    </div>
  )
}
