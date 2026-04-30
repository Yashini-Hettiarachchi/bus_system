import { useEffect, useRef, useState } from 'react'
import './App.css'

const LANGUAGE_OPTIONS = [
  { id: 'en', label: 'English' },
  { id: 'si', label: 'සිංහල' },
]


function App() {
  const [latestNewsOpen, setLatestNewsOpen] = useState(false)
  const [featuredNewsOpen, setFeaturedNewsOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [installEvent, setInstallEvent] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

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


        {/* Latest News Card */}
        {!loading && !error && articles.length > 0 && (
          <div className="latest-news-card" style={{cursor: 'pointer'}} onClick={() => {
            setLatestNewsOpen((open) => !open);
            setFeaturedNewsOpen(false);
          }}>
            <h3 style={{marginTop: 0, marginBottom: latestNewsOpen ? 16 : 0, userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              {language === 'si' ? 'නවතම පුවත්' : 'Latest News'}
              <span style={{fontSize: 18, marginLeft: 8}}>{latestNewsOpen ? '▲' : '▼'}</span>
            </h3>
            {latestNewsOpen && (
              <ul className="news-list" style={{background: 'transparent', boxShadow: 'none', border: 'none', margin: 0, padding: 0}} onClick={e => e.stopPropagation()}>
                {articles.map((article) => {
                  // Format date as yyyy-mm-dd or fallback
                  let pubDate = '';
                  if (article.publishedAt) {
                    const d = new Date(article.publishedAt);
                    if (!isNaN(d)) {
                      pubDate = d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                  }
                  return (
                    <li key={article.url} style={{background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, marginBottom: 18}}>
                      <h4 style={{margin: '0 0 8px', color: '#fff'}}>{article.title}</h4>
                      <p style={{color: '#e0e6ed'}}>{article.description || 'Tap to read full article.'}</p>
                      <div style={{color: '#b8e0ff', fontWeight: 600, fontSize: '0.97em', marginTop: 4}}>
                        {article.source?.name ? article.source.name : 'Unknown Source'}
                        {pubDate && (
                          <span style={{color: '#e0e6ed', fontWeight: 400, marginLeft: 8}}>
                            | {pubDate}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Featured News Card (real categories) */}
        {!loading && !error && articles.length > 0 && (
          <div className="featured-news-card" style={{cursor: 'pointer'}} onClick={() => {
            setFeaturedNewsOpen((open) => !open);
            setLatestNewsOpen(false);
          }}>
            <h3 style={{marginTop: 0, marginBottom: featuredNewsOpen ? 16 : 0, userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              {language === 'si' ? 'විශේෂ පුවත්' : 'Featured News (By Category)'}
              <span style={{fontSize: 18, marginLeft: 8}}>{featuredNewsOpen ? '▲' : '▼'}</span>
            </h3>
            {featuredNewsOpen && (
              <div style={{background: 'transparent', boxShadow: 'none', border: 'none', margin: 0, padding: 0}} onClick={e => e.stopPropagation()}>
                {
                  (() => {
                    // Define category keywords
                    const categoryMap = language === 'si' ? [
                      { name: 'ක්‍රීඩා', keywords: ['ක්‍රීඩා', 'ක්‍රිකට්', 'පන්දුව', 'පාපන්දු', 'තරඟය', 'ඔලිම්පික්', 'ක්‍රීඩකයා'] },
                      { name: 'ව්‍යාපාර', keywords: ['ව්‍යාපාර', 'වෙළඳපොළ', 'කොටස්', 'මුදල්', 'ආර්ථිකය', 'වෙළඳාම', 'සමාගම', 'කොටස්', 'ආයෝජනය'] },
                      { name: 'කෘෂිකර්මය', keywords: ['කෘෂිකර්මය', 'ගොවිතැන', 'ගොවියා', 'බෝග', 'අස්වනු', 'වගා', 'වෙළඳපොළ', 'පැදුරු', 'තේ', 'රබර්'] },
                      { name: 'දේශපාලන', keywords: ['දේශපාලන', 'රජය', 'අමාත්‍ය', 'පාර්ලිමේන්තුව', 'මැතිවරණය', 'නීති', 'ජනාධිපති', 'අග්‍රාමාත්‍ය'] },
                      { name: 'සෞඛ්‍ය', keywords: ['සෞඛ්‍ය', 'රෝහල', 'වෛද්‍ය', 'කොවිඩ්', 'රෝගය', 'ඖෂධ', 'ටිකා', 'වෛද්‍ය'] },
                      { name: 'අධ්‍යාපනය', keywords: ['අධ්‍යාපනය', 'පාසල', 'විශ්වවිද්‍යාලය', 'ශිෂ්‍යයා', 'පරීක්ෂණය', 'ගුරු', 'උපාධිය'] },
                      { name: 'තාක්ෂණය', keywords: ['තාක්ෂණය', 'සොෆ්ට්වෙයාර්', 'හාර්ඩ්වෙයාර්', 'අන්තර්ජාලය', 'ඉන්ටර්නෙට්', 'රොබෝ', 'පරිගණකය', 'යෙදුම'] },
                      { name: 'පරිසරය', keywords: ['පරිසරය', 'කාලගුණය', 'වර්ෂාව', 'පිටාර', 'වනාන්තරය', 'දූෂණය', 'වනජීවී'] },
                      { name: 'අපරාධ', keywords: ['අපරාධ', 'පොලිසිය', 'අත්අඩංගුව', 'අධිකරණය', 'ඝාතනය', 'මංකොල්ලය', 'වංචාව', 'පරීක්ෂණය'] },
                      { name: 'වෙනත්', keywords: [] }
                    ] : [
                      { name: 'Sports', keywords: ['sport', 'cricket', 'football', 'match', 'tournament', 'olympic', 'athlete'] },
                      { name: 'Business', keywords: ['business', 'market', 'stock', 'finance', 'economy', 'trade', 'company', 'shares', 'investment'] },
                      { name: 'Agriculture', keywords: ['agriculture', 'farming', 'farmer', 'crop', 'harvest', 'plantation', 'paddy', 'tea', 'rubber'] },
                      { name: 'Politics', keywords: ['politic', 'government', 'minister', 'parliament', 'election', 'policy', 'president', 'prime minister'] },
                      { name: 'Health', keywords: ['health', 'hospital', 'doctor', 'covid', 'disease', 'medicine', 'vaccine', 'medical'] },
                      { name: 'Education', keywords: ['education', 'school', 'university', 'student', 'exam', 'teacher', 'degree'] },
                      { name: 'Technology', keywords: ['tech', 'technology', 'software', 'hardware', 'internet', 'ai', 'robot', 'computer', 'app'] },
                      { name: 'Environment', keywords: ['environment', 'climate', 'weather', 'rain', 'flood', 'drought', 'wildlife', 'forest', 'pollution'] },
                      { name: 'Crime', keywords: ['crime', 'police', 'arrest', 'court', 'murder', 'theft', 'fraud', 'investigation'] },
                      { name: 'Other', keywords: [] }
                    ];
                    // Assign articles to categories
                    const categorized = {};
                    articles.forEach(article => {
                      const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
                      let found = false;
                      for (const cat of categoryMap) {
                        // Skip 'Other' and 'වෙනත්' when assigning
                        if (cat.name === 'Other' || cat.name === 'වෙනත්') continue;
                        if (cat.keywords.some(kw => text.includes(kw))) {
                          if (!categorized[cat.name]) categorized[cat.name] = [];
                          categorized[cat.name].push(article);
                          found = true;
                          break;
                        }
                      }
                      // Only add to 'Other' or 'වෙනත්' if not found, but do not display later
                      if (!found) {
                        const otherKey = language === 'si' ? 'වෙනත්' : 'Other';
                        if (!categorized[otherKey]) categorized[otherKey] = [];
                        categorized[otherKey].push(article);
                      }
                    });
                    // Remove 'Other'/'වෙනත්' category from display
                    const otherKey = language === 'si' ? 'වෙනත්' : 'Other';
                    const entries = Object.entries(categorized).filter(([cat]) => cat !== otherKey);
                    entries.sort(([a], [b]) => a.localeCompare(b));
                    return entries.map(([category, catArticles]) => (
                      <div key={category} style={{marginBottom: 18}}>
                        <h4 style={{margin: '0 0 8px', color: '#fff', textTransform: 'capitalize'}}>{category}</h4>
                        <div className="category-cards-row" style={{display: 'flex', flexWrap: 'wrap', gap: '12px', margin: 0, padding: 0}}>
                          {catArticles.map((article) => {
                            let pubDate = '';
                            if (article.publishedAt) {
                              const d = new Date(article.publishedAt);
                              if (!isNaN(d)) {
                                pubDate = d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
                              }
                            }
                            return (
                              <div key={article.url} className="category-news-card" style={{background: '#fff', color: '#222', borderRadius: 10, boxShadow: '0 2px 8px rgba(44,62,80,0.10)', padding: 12, minWidth: 220, maxWidth: 260, flex: '1 1 220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                                <div style={{fontWeight: 700, color: '#e74c3c', marginBottom: 4, fontSize: '0.98em'}}>{category}</div>
                                <div style={{fontWeight: 700, marginBottom: 4}}>{article.title}</div>
                                <div style={{color: '#555', fontSize: '0.97em', marginBottom: 6}}>{article.description || 'Tap to read full article.'}</div>
                                <div style={{color: '#888', fontSize: '0.92em', marginTop: 'auto'}}>
                                  {pubDate && (
                                    <span style={{marginRight: 8}}>{pubDate}</span>
                                  )}
                                  {article.source?.name && (
                                    <span>{article.source.name}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()
                }
              </div>
            )}
          </div>
        )}

        {/* Zones Card removed */}
      </section>


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
