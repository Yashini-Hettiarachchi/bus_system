import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [showPrompt, setShowPrompt] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowPrompt(false)
      return
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  return (
    <main className="page">
      <section className="website-view">
        <p className="label">BusSync Website</p>
        <h1>Bus service website is live.</h1>
        <p className="message">
          This is now a website view. You can continue adding more sections in your
          next prompt.
        </p>
      </section>

      {showPrompt && (
        <section className="prompt-layer" aria-live="polite">
          <div className="prompt-card" role="dialog" aria-modal="true" aria-label="Add to home prompt">
            <h2>Add to Home</h2>
            <p>
              Add this website to your home screen for quicker access.
            </p>
            <div className="prompt-actions">
              <button type="button" className="install-btn" onClick={handleInstall}>
                Add to Home
              </button>
              <button type="button" className="later-btn" onClick={() => setShowPrompt(false)}>
                Later
              </button>
            </div>
          </div>
        </section>
      )}

      <footer className="footer">
        <p>Copyright 2026 BusSync. All rights reserved.</p>
      </footer>
    </main>
  )
}

export default App
