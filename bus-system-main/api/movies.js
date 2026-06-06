// Vercel Serverless Function: GET /api/movies
// Fetches popular movies from TMDB (The Movie Database) and returns a
// normalised list for the BusSync Movie tab.
// Results are cached in-memory for 10 minutes to avoid hammering the TMDB API.

// ─── Constants ────────────────────────────────────────────────────────────────

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'        // TMDB REST API base
const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w500'  // CDN prefix for poster images (500 px wide)
const MOVIE_LIMIT = 12                                       // Max movies returned to the client
const CACHE_TTL_MS = 10 * 60 * 1000                         // Cache duration: 10 minutes

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Key: "movies:<locale>"  Value: { movies: [], expiresAt: <timestamp> }
const moviesCache = new Map()

// ─── Fallback data ────────────────────────────────────────────────────────────
// Shown when TMDB_API_KEY is absent so the Movie tab is never completely empty.
const fallbackMovies = [
  {
    id: 'fallback-1',
    title: 'The Great Escape',
    overview: 'A classic adventure film perfect for road-trip mood.',
    rating: '8.2',
    poster: '',
  },
  {
    id: 'fallback-2',
    title: 'The Pursuit of Happyness',
    overview: 'A heartfelt story about resilience and hope.',
    rating: '8.0',
    poster: '',
  },
  {
    id: 'fallback-3',
    title: 'Interstellar',
    overview: 'A visually rich sci-fi journey with emotional depth.',
    rating: '8.7',
    poster: '',
  },
]

// ─── Cache helpers ────────────────────────────────────────────────────────────

// Returns cached movies for the given key, or null if missing / expired.
function getCachedMovies(cacheKey) {
  const cached = moviesCache.get(cacheKey)
  if (!cached) {
    return null
  }

  // Evict the entry if it has passed its TTL
  if (Date.now() > cached.expiresAt) {
    moviesCache.delete(cacheKey)
    return null
  }

  return cached.movies
}

// Stores movies in the cache with an expiry timestamp.
function setCachedMovies(cacheKey, movies) {
  moviesCache.set(cacheKey, {
    movies,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

// ─── URL builder ──────────────────────────────────────────────────────────────

// Builds the TMDB /discover/movie endpoint URL for a given locale and API key.
// Sorted by popularity, excludes adult content and videos.
function buildTmdbUrl(language, apiKey) {
  const params = new URLSearchParams({
    api_key: apiKey,
    include_adult: 'false',
    include_video: 'false',
    language,           // Locale, e.g. "en-US" or "si-LK"
    page: '1',          // Only fetch the first page
    sort_by: 'popularity.desc',
  })

  return `${TMDB_BASE_URL}/discover/movie?${params.toString()}`
}

// ─── Normaliser ───────────────────────────────────────────────────────────────

// Converts raw TMDB movie objects into a consistent shape understood by the UI.
// Caps the list at MOVIE_LIMIT and discards movies with missing data.
function normalizeMovies(results) {
  return (Array.isArray(results) ? results : []).slice(0, MOVIE_LIMIT).map((movie) => ({
    id: movie.id,
    title: movie.title || movie.original_title || 'Untitled',
    overview: movie.overview || '',
    // Format rating to one decimal place; null if unavailable
    rating:
      typeof movie.vote_average === 'number' && Number.isFinite(movie.vote_average)
        ? movie.vote_average.toFixed(1)
        : null,
    // Prepend CDN base URL to the relative poster path, or return empty string
    poster: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : '',
  }))
}

// ─── Serverless handler ───────────────────────────────────────────────────────

export default async function handler(request, response) {
  // Map the ?lang=si query param to TMDB's locale format
  const lang = request.query?.lang === 'si' ? 'si-LK' : 'en-US'
  const cacheKey = `movies:${lang}`

  // Return immediately if valid cached data exists
  const cachedMovies = getCachedMovies(cacheKey)
  if (cachedMovies) {
    return response.status(200).json({
      movies: cachedMovies,
      cached: true,
    })
  }

  // Read TMDB API key from environment (supports both plain and VITE_ prefixed names)
  const tmdbApiKey = (process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '').trim()

  // No API key — serve the hardcoded fallback list and cache it
  if (!tmdbApiKey) {
    setCachedMovies(cacheKey, fallbackMovies)
    return response.status(200).json({
      movies: fallbackMovies,
      cached: false,
      provider: 'fallback',
      warning: 'TMDB_API_KEY is not configured. Showing fallback movies.',
    })
  }

  try {
    // Fetch live data from TMDB
    const upstream = await fetch(buildTmdbUrl(lang, tmdbApiKey))
    const payload = await upstream.json()

    // TMDB returns 4xx/5xx with a status_message field on errors
    if (!upstream.ok) {
      throw new Error(payload.status_message || `TMDB request failed (${upstream.status}).`)
    }

    const normalizedMovies = normalizeMovies(payload.results)
    setCachedMovies(cacheKey, normalizedMovies) // Cache for next request

    return response.status(200).json({
      movies: normalizedMovies,
      cached: false,
      provider: 'tmdb',
    })
  } catch (error) {
    // Upstream error — return 502 Bad Gateway so the client can show a friendly message
    return response.status(502).json({
      error: error instanceof Error ? error.message : 'Unable to fetch movies right now.',
    })
  }
}
