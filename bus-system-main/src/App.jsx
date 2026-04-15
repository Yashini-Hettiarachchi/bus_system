import { useEffect, useRef, useState } from 'react'
import './App.css'

const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English' },
  { id: 'si', label: 'සිංහල' },
]

const GAME_TOTAL_SECONDS = 900
const STOP_EVERY = 85
const AUTO_SKIP = 22
const ARRIVE_AT = 30
const PASSENGER_WALK_MS = 1200
const PASSENGER_DEPART_MS = 1000

const BUS_GAME_QUESTIONS = [
  {
    id: 'comfort',
    passenger: 'Kamala',
    emoji: '👩',
    question: 'How comfortable was the ride today?',
    options: ['Very comfortable', 'Quite good', 'It was okay', 'Rather bumpy'],
  },
  {
    id: 'crowding',
    passenger: 'Rajan',
    emoji: '👨',
    question: 'How crowded was the bus?',
    options: ['Plenty of seats', 'Some seats free', 'Had to stand', 'Very crowded'],
  },
  {
    id: 'time',
    passenger: 'Priya',
    emoji: '👩‍💼',
    question: 'Did the bus arrive on time?',
    options: ['Right on time', '5–10 min late', '10–30 min late', 'Over 30 min late'],
  },
  {
    id: 'safety',
    passenger: 'Sunil',
    emoji: '👴',
    question: 'Did you feel safe during the journey?',
    options: ['Very safe', 'Mostly safe', 'A little worried', 'Not safe at all'],
  },
  {
    id: 'driver',
    passenger: 'Nadeeka',
    emoji: '👧',
    question: "How was the driver's behavior?",
    options: ['Excellent', 'Professional', 'Average', 'Needs improvement'],
  },
  {
    id: 'cleanliness',
    passenger: 'Thilak',
    emoji: '🧔',
    question: 'How clean was the bus interior?',
    options: ['Spotless!', 'Pretty clean', 'Could be better', 'Quite dirty'],
  },
  {
    id: 'app',
    passenger: 'Amara',
    emoji: '👩‍🦱',
    question: 'How useful is BusSync during your trip?',
    options: ['Very useful!', 'Quite helpful', 'Somewhat useful', 'Not useful'],
  },
  {
    id: 'value',
    passenger: 'Chamara',
    emoji: '🧑‍💻',
    question: 'Was the bus fare good value for money?',
    options: ['Excellent value', 'Good value', 'Average', 'Too expensive'],
  },
  {
    id: 'recommend',
    passenger: 'Dilini',
    emoji: '👩‍🦰',
    question: 'Would you recommend this service to others?',
    options: ['Definitely!', 'Probably yes', 'Not sure', 'Probably not'],
  },
  {
    id: 'overall',
    passenger: 'Asanka',
    emoji: '🧑‍🔧',
    question: 'Overall, how would you rate this trip?',
    options: ['Excellent', 'Good', 'Average', 'Below average'],
  },
]

const GOOGLE_SHEET_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxyFpIb0eRiUvQNfUCi7Zh-aP7eq4wgkixD6gSic4MhOt38TfFZ9HreLdvmmT1vyc7A/exec'
const GOOGLE_DEPLOYMENT_ID = 'AKfycbxyFpIb0eRiUvQNfUCi7Zh-aP7eq4wgkixD6gSic4MhOt38TfFZ9HreLdvmmT1vyc7A'

function App() {
    const [newsOpen, setNewsOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [installEvent, setInstallEvent] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  // Game state
  const [gamePhase, setGamePhase] = useState('idle')
  const [gameRunning, setGameRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_TOTAL_SECONDS)
  const [stopsServed, setStopsServed] = useState(0)
  const [currentQ, setCurrentQ] = useState(null)
  const [passengerAnim, setPassengerAnim] = useState('hidden')
  const [autoSkipLeft, setAutoSkipLeft] = useState(0)
  const [answers, setAnswers] = useState([])
  const [gameNickname, setGameNickname] = useState('')
  const [gameRoute, setGameRoute] = useState('')

  const gameRef = useRef({
    phase: 'idle',
    timeLeft: GAME_TOTAL_SECONDS,
    nextStopIn: STOP_EVERY,
    stopIdx: 0,
    autoSkipIn: 0,
    answers: [],
    currentQ: null,
  })
  const walkTimerRef = useRef(null)
  const departTimerRef = useRef(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallEvent(event)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadNews() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/news?lang=${language}`, {
          signal: controller.signal,
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load headlines.')
        }

        setArticles(Array.isArray(payload.articles) ? payload.articles : [])
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Unable to load headlines.')
          setArticles([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadNews()

    return () => {
      controller.abort()
    }
  }, [language])

  // Single stable interval — starts/stops only when gameRunning flips, never on phase changes
  useEffect(() => {
    if (!gameRunning) return undefined

    const g = gameRef.current

    function depart() {
      g.phase = 'departing'
      setPassengerAnim('walk-out')
      clearTimeout(departTimerRef.current)
      departTimerRef.current = window.setTimeout(() => {
        setPassengerAnim('hidden')
        setCurrentQ(null)
        g.phase = 'driving'
        g.nextStopIn = STOP_EVERY
        setGamePhase('driving')
      }, PASSENGER_DEPART_MS)
    }

    const tick = window.setInterval(() => {
      g.timeLeft -= 1
      setTimeLeft(g.timeLeft)

      if (g.timeLeft <= 0) {
        g.phase = 'finished'
        setGamePhase('finished')
        setGameRunning(false)
        return
      }

      if (g.timeLeft <= ARRIVE_AT && g.phase === 'driving') {
        g.phase = 'arriving'
        setGamePhase('arriving')
        return
      }

      if (g.phase === 'driving') {
        g.nextStopIn -= 1
        if (g.nextStopIn <= 0) {
          const q = BUS_GAME_QUESTIONS[g.stopIdx % BUS_GAME_QUESTIONS.length]
          g.stopIdx += 1
          g.currentQ = q
          g.autoSkipIn = AUTO_SKIP
          g.phase = 'stopped'
          setCurrentQ(q)
          setStopsServed((c) => c + 1)
          setPassengerAnim('walk-in')
          setAutoSkipLeft(AUTO_SKIP)
          setGamePhase('stopped')
          clearTimeout(walkTimerRef.current)
          walkTimerRef.current = window.setTimeout(
            () => setPassengerAnim('at-stop'),
            PASSENGER_WALK_MS,
          )
        }
      } else if (g.phase === 'stopped') {
        g.autoSkipIn -= 1
        setAutoSkipLeft(g.autoSkipIn)
        if (g.autoSkipIn <= 0) {
          const q = g.currentQ
          if (q) {
            g.answers = [
              ...g.answers,
              {
                questionId: q.id,
                question: q.question,
                passenger: q.passenger,
                answer: null,
                skipped: true,
                timestamp: new Date().toISOString(),
              },
            ]
            setAnswers([...g.answers])
          }
          depart()
        }
      }
    }, 1000)

    return () => {
      window.clearInterval(tick)
      clearTimeout(walkTimerRef.current)
      clearTimeout(departTimerRef.current)
    }
  }, [gameRunning])

  // Submit answers to Google Sheets when game finishes
  useEffect(() => {
    if (gamePhase !== 'finished') return

    const g = gameRef.current
    const allAnswers = g.answers
    if (allAnswers.length === 0) return

    const answered = allAnswers.filter((a) => !a.skipped)
    const flatAnswers = Object.fromEntries(answered.map((a) => [a.questionId, a.answer]))

    const postBody = new URLSearchParams({
      deploymentId: GOOGLE_DEPLOYMENT_ID,
      timestamp: new Date().toISOString(),
      nickname: gameNickname || '',
      route: gameRoute || '',
      gameMode: 'bus-route-stop',
      totalStops: String(allAnswers.length),
      answeredStops: String(answered.length),
      ...Object.fromEntries(Object.entries(flatAnswers).map(([k, v]) => [k, String(v)])),
      payload: JSON.stringify(allAnswers),
    })

    fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: postBody.toString(),
    }).catch(() => {})
  }, [gamePhase, gameNickname, gameRoute])

  async function installApp() {
    if (!installEvent) {
      setShowInstallPrompt(false)
      return
    }

    installEvent.prompt()
    await installEvent.userChoice.catch(() => {})
    setInstallEvent(null)
    setShowInstallPrompt(false)
  }

  function formatBusTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function startBusGame() {
    const g = gameRef.current
    g.phase = 'driving'
    g.timeLeft = GAME_TOTAL_SECONDS
    g.nextStopIn = STOP_EVERY
    g.stopIdx = 0
    g.autoSkipIn = 0
    g.answers = []
    g.currentQ = null
    setGamePhase('driving')
    setTimeLeft(GAME_TOTAL_SECONDS)
    setStopsServed(0)
    setAnswers([])
    setCurrentQ(null)
    setPassengerAnim('hidden')
    setAutoSkipLeft(0)
    setGameRunning(true)
  }

  function handleBusAnswer(answer) {
    const g = gameRef.current
    if (g.phase !== 'stopped') return

    const q = g.currentQ
    g.answers = [
      ...g.answers,
      {
        questionId: q.id,
        question: q.question,
        passenger: q.passenger,
        answer,
        timestamp: new Date().toISOString(),
      },
    ]
    setAnswers([...g.answers])
    g.phase = 'departing'
    setPassengerAnim('walk-out')
    clearTimeout(departTimerRef.current)
    departTimerRef.current = window.setTimeout(() => {
      setPassengerAnim('hidden')
      setCurrentQ(null)
      g.phase = 'driving'
      g.nextStopIn = STOP_EVERY
      setGamePhase('driving')
    }, PASSENGER_DEPART_MS)
  }

  return (
    <div className="page">
      <main className="website-view">
        <p className="label">BusSync</p>
        <h1>Sri Lanka Daily News</h1>
        <p className="message">
          Stay updated with public interest stories from Sri Lanka and switch languages instantly.
        </p>

        <div className="language-tabs" aria-label="Select language">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`lang-tab ${language === option.id ? 'active' : ''}`}
              onClick={() => setLanguage(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </main>


      <section className="news-section" aria-live="polite">
        <div className="news-head">
          <h2>Updated on each language change</h2>
          {/* <p>Updated on each language change</p> */}
        </div>

        {loading && <p className="news-note">Loading headlines...</p>}
        {error && !loading && <p className="news-error">{error}</p>}

        {!loading && !error && articles.length === 0 && (
          <p className="news-note">No headlines available right now.</p>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="latest-news-card" style={{cursor: 'pointer'}} onClick={() => setNewsOpen((open) => !open)}>
            <h3 style={{marginTop: 0, marginBottom: newsOpen ? 16 : 0, userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              Latest News
              <span style={{fontSize: 18, marginLeft: 8}}>{newsOpen ? '▲' : '▼'}</span>
            </h3>
            {newsOpen && (
              <ul className="news-list" style={{background: 'transparent', boxShadow: 'none', border: 'none', margin: 0, padding: 0}} onClick={e => e.stopPropagation()}>
                {articles.map((article) => (
                  <li key={article.url} style={{background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, marginBottom: 18}}>
                    <a href={article.url} target="_blank" rel="noreferrer">
                      <h4 style={{margin: '0 0 8px', color: '#fff'}}>{article.title}</h4>
                      <p style={{color: '#e0e6ed'}}>{article.description || 'Tap to read full article.'}</p>
                      <span style={{color: '#b8e0ff', fontWeight: 600}}>Read story</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* <section className="bus-game-section" aria-label="Bus route feedback game">
        <div className="section-head">
          <h2>Travel Feedback Quest</h2>
          <p>Drive the Colombo – Anuradhapura route. Stop at each bus stop and collect one passenger feedback.</p>
        </div>

        {(gamePhase === 'idle' || gamePhase === 'finished') && (
          <div className="bus-game-overlay">
            {gamePhase === 'idle' ? (
              <>
                <div className="overlay-bus-icon">🚌</div>
                <h3>Colombo – Anuradhapura Route</h3>
                <p>
                  The bus stops automatically at each stop. Ask passengers one question and collect their feedback. The route lasts 15 minutes.
                </p>
                <div className="start-fields">
                  <input
                    value={gameNickname}
                    onChange={(e) => setGameNickname(e.target.value)}
                    placeholder="Your nickname (optional)"
                    className="start-input"
                  />
                  <input
                    value={gameRoute}
                    onChange={(e) => setGameRoute(e.target.value)}
                    placeholder="Bus route / number (e.g. 15)"
                    className="start-input"
                  />
                </div>
                <button type="button" className="install-btn" onClick={startBusGame}>
                  Start Route
                </button>
              </>
            ) : (
              <>
                <div className="overlay-bus-icon">🏁</div>
                <h3>Final Station Reached!</h3>
                <p>
                  You visited {stopsServed} stops and collected{' '}
                  {answers.filter((a) => !a.skipped).length} passenger responses.
                </p>
                {answers.filter((a) => !a.skipped).length > 0 && (
                  <ul className="bus-game-summary">
                    {answers
                      .filter((a) => !a.skipped)
                      .map((a) => (
                        <li key={`${a.questionId}-${a.timestamp}`}>
                          <strong>{a.passenger}</strong>: {a.answer}
                        </li>
                      ))}
                  </ul>
                )}
                <p className="news-note">Responses sent to your Google Sheet.</p>
                <button type="button" className="install-btn" onClick={startBusGame}>
                  New Route
                </button>
              </>
            )}
          </div>
        )}

        {gamePhase !== 'idle' && gamePhase !== 'finished' && (
          <>
            <div className="bus-game-hud">
              <span className={`hud-timer${timeLeft <= 60 ? ' hud-warn' : ''}`}>
                🕐 {formatBusTime(timeLeft)}
              </span>
              <span className="hud-stops">🚏 Stops: {stopsServed}</span>
              <span className="hud-route">Colombo → Anuradhapura</span>
            </div>

            <div className="bus-game-scene">
              <div className="bg-sky" />
              <div className={`bg-scenery${gamePhase === 'stopped' ? ' scene-paused' : ''}`}>
                <span>🌳</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌳</span>
                <span>🏢</span>
                <span>🌿</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌴</span>
                <span>🏢</span>
                <span>🌳</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌳</span>
                <span>🌴</span>
                <span>🌳</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌳</span>
                <span>🏢</span>
                <span>🌿</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌴</span>
                <span>🏢</span>
                <span>🌳</span>
                <span>🏠</span>
                <span>🌳</span>
                <span>🌳</span>
                <span>🌴</span>
              </div>

              <div className="bg-road">
                <div
                  className={`road-center-line${gamePhase === 'stopped' ? ' scene-paused' : ''}`}
                />
              </div>

              {gamePhase === 'stopped' && (
                <div className="bus-stop-marker">
                  <span>🚏</span>
                  <span className="stop-tag">BUS STOP</span>
                </div>
              )}

              {gamePhase === 'arriving' && (
                <div className="bus-station-marker">
                  <span>🏛️</span>
                  <span className="stop-tag">FINAL STATION</span>
                </div>
              )}

              <div
                className={`game-bus-emoji ${
                  gamePhase === 'stopped'
                    ? 'bus-halted'
                    : gamePhase === 'arriving'
                      ? 'bus-arriving'
                      : 'bus-moving'
                }`}
              >
                🚌
              </div>

              <div className={`game-passenger-figure anim-${passengerAnim}`}>
                {currentQ && (
                  <>
                    <div className="pax-emoji">{currentQ.emoji}</div>
                    <div className="pax-name">{currentQ.passenger}</div>
                  </>
                )}
              </div>

              {passengerAnim === 'at-stop' && currentQ && (
                <div className="driver-speech">
                  <div className="driver-bubble">
                    <span className="driver-tag">🚌 Driver asks:</span>
                    <p>{currentQ.question}</p>
                    <span className="auto-hint">Auto-skip in {autoSkipLeft}s</span>
                  </div>
                </div>
              )}

              {gamePhase === 'arriving' && (
                <p className="arriving-msg">🏁 Approaching final station…</p>
              )}
            </div>

            {passengerAnim === 'at-stop' && currentQ && (
              <div className="bus-answer-grid">
                {currentQ.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="bus-answer-btn"
                    onClick={() => handleBusAnswer(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {gamePhase === 'driving' && (
              <p className="bus-status-msg">🚌 Driving to next stop…</p>
            )}
          </>
        )}
      </section>

      <footer className="footer">
        <p>BusSync PWA – Travel Feedback Quest</p>
      </footer> */}

      {showInstallPrompt && (
        <div className="prompt-layer" role="presentation">
          <div
            className="prompt-card"
            role="dialog"
            aria-modal="true"
            aria-label="Install BusSync"
          >
            <h2>Install BusSync</h2>
            <p>Add this app to your home screen for a faster launch.</p>
            <p className="help-note">
              If install does not appear, use your browser menu and choose install.
            </p>
            <div className="prompt-actions">
              <button type="button" className="install-btn" onClick={installApp}>
                Install
              </button>
              <button
                type="button"
                className="later-btn"
                onClick={() => setShowInstallPrompt(false)}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
