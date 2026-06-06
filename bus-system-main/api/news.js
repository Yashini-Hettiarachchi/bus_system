// Vercel Serverless Function (ESM): GET /api/news\n// Fetches Sri Lanka-focused news from up to three providers in priority order:\n//   1. Currents API  2. GNews  3. NewsData.io\n// Articles are ranked by local relevance and optionally translated to Sinhala.\n// Results are cached in-memory for 10 minutes to reduce upstream API usage.\n\n// \u2500\u2500\u2500 API endpoint URLs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nconst CURRENTS_API_URL = 'https://api.currentsapi.services/v1/search'\nconst GNEWS_API_URL = 'https://gnews.io/api/v4/search'\nconst NEWSDATA_API_URL = 'https://newsdata.io/api/1/latest'\n\n// \u2500\u2500\u2500 Tuning constants \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nconst CACHE_TTL_MS = 10 * 60 * 1000  // In-memory TTL: 10 minutes\nconst RESULT_LIMIT = 20               // Max articles fetched from each provider\nconst TRANSLATION_ARTICLE_LIMIT = 8  // Only translate the first 8 articles (cost/speed trade-off)\n\n// \u2500\u2500\u2500 In-memory cache \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Key: \"news:<lang>\"  Value: { articles: [], expiresAt: <timestamp> }\nconst newsCache = new Map()\n\n// \u2500\u2500\u2500 Sri Lanka relevance signal lists \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n// Domains belonging to Sri Lankan publications \u2014 highest relevance signal (+5)\nconst LOCAL_DOMAINS = [\n  'dailymirror.lk',\n  'newsfirst.lk',\n  'adaderana.lk',\n  'dailynews.lk',\n  'ft.lk',\n  'sundaytimes.lk',\n  'island.lk',\n  'lankadeepa.lk',\n  'hirunews.lk',\n  'colombogazette.com',\n  'economynext.com',\n]\n\n// Display names of those same publications, for source-text matching (+3)\nconst LOCAL_SOURCE_KEYWORDS = [\n  'daily mirror',\n  'newsfirst',\n  'ada derana',\n  'daily news',\n  'the island',\n  'sunday times',\n  'lankadeepa',\n  'hiru',\n  'colombo gazette',\n  'economynext',\n]\n\n// Geographic keywords that indicate Sri Lanka relevance in article body (+2)\nconst SRILANKA_KEYWORDS = ['sri lanka', 'sri lankan', 'colombo', 'kandy', 'jaffna', 'galle']

// Restored runtime constants (the original header text got corrupted into a comment).
const CURRENTS_API_URL = 'https://api.currentsapi.services/v1/search'
const GNEWS_API_URL = 'https://gnews.io/api/v4/search'
const NEWSDATA_API_URL = 'https://newsdata.io/api/1/latest'

const CACHE_TTL_MS = 10 * 60 * 1000
const RESULT_LIMIT = 20
const TRANSLATION_ARTICLE_LIMIT = 8

const newsCache = new Map()

const LOCAL_DOMAINS = [
  'dailymirror.lk',
  'newsfirst.lk',
  'adaderana.lk',
  'dailynews.lk',
  'ft.lk',
  'sundaytimes.lk',
  'island.lk',
  'lankadeepa.lk',
  'hirunews.lk',
  'colombogazette.com',
  'economynext.com',
]

const LOCAL_SOURCE_KEYWORDS = [
  'daily mirror',
  'newsfirst',
  'ada derana',
  'daily news',
  'the island',
  'sunday times',
  'lankadeepa',
  'hiru',
  'colombo gazette',
  'economynext',
]

const SRILANKA_KEYWORDS = ['sri lanka', 'sri lankan', 'colombo', 'kandy', 'jaffna', 'galle']

// ─── Cache helpers ────────────────────────────────────────────────────────────────

// Returns the cached article list if it exists and has not expired, else null.
function getCachedArticles(cacheKey) {
  const cached = newsCache.get(cacheKey)
  if (!cached) {
    return null
  }

  // Evict expired entries so the Map does not grow indefinitely
  if (Date.now() > cached.expiresAt) {
    newsCache.delete(cacheKey)
    return null
  }

  return cached.articles
}

// Stores a fresh article list in the cache with an expiry timestamp.
function setCachedArticles(cacheKey, articles) {
  newsCache.set(cacheKey, {
    articles,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

// Returns the cached article list even if it has expired (stale-while-revalidate
// fallback). Used when all upstream providers fail so passengers still see content.
function getStaleCachedArticles(cacheKey) {
  const cached = newsCache.get(cacheKey)
  if (!cached) {
    return null
  }

  return cached.articles
}

// ─── Utility helpers ──────────────────────────────────────────────────────────────

// Safely extracts the lowercase hostname from a URL string.
// Returns an empty string if the URL is missing or cannot be parsed.
function safeDomainFromUrl(url) {
  if (!url) {
    return ''
  }

  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

// Returns true if any needle string is a substring of haystack.
function textIncludesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle))
}

// ─── Sri Lanka relevance scorer ───────────────────────────────────────────────────────────

// Assigns a numeric relevance score to an article based on how Sri Lankan it is.
// Higher score = ranked earlier in the final list.
function localRelevanceScore(article) {
  const domain = safeDomainFromUrl(article.url)
  const sourceText = (article.source?.name || '').toLowerCase()
  const contentText = `${article.title || ''} ${article.description || ''}`.toLowerCase()

  let score = 0

  // +5 if the article URL belongs to a known Sri Lankan news domain
  if (LOCAL_DOMAINS.some((localDomain) => domain === localDomain || domain.endsWith(`.${localDomain}`))) {
    score += 5
  }

  // +3 if the source name matches a known Sri Lankan publication
  if (textIncludesAny(sourceText, LOCAL_SOURCE_KEYWORDS)) {
    score += 3
  }

  // +2 if the title or description mentions key Sri Lankan places
  if (textIncludesAny(contentText, SRILANKA_KEYWORDS)) {
    score += 2
  }

  return score
}

// Parses the article's publishedAt date to a Unix timestamp for secondary sort.
function parsePublishedTime(article) {
  const timestamp = Date.parse(article.publishedAt || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

// Sorts articles by local relevance (descending), then by publish date (newest first),
// and trims the list to the given limit.
function prioritizeLocalArticles(articles, limit = RESULT_LIMIT) {
  return [...articles]
    .sort((left, right) => {
      const scoreDelta = localRelevanceScore(right) - localRelevanceScore(left)
      if (scoreDelta !== 0) {
        return scoreDelta
      }

      return parsePublishedTime(right) - parsePublishedTime(left)
    })
    .slice(0, limit)
}

// ─── Translation helpers ────────────────────────────────────────────────────────────

// Translates a single text string to targetLanguage using Google Translate's
// unofficial client API. Returns the original text on any failure.
async function translateText(text, targetLanguage) {
  // Skip translation if text is empty or language is already English
  if (!text || !targetLanguage || targetLanguage === 'en') {
    return text
  }

  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text)}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return text // Graceful fallback: return original on HTTP error
    }

    const payload = await response.json()
    // The response is a nested array; segment[0] is the translated string
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
      return text
    }

    const translated = payload[0]
      .filter((segment) => Array.isArray(segment) && typeof segment[0] === 'string')
      .map((segment) => segment[0])
      .join('')

    return translated || text
  } catch {
    return text // Network error — return original text silently
  }
}

// Wraps translateText with a timeout so a slow translation call never blocks
// the entire news response. Falls back to the original text on timeout.
async function translateTextWithTimeout(text, targetLanguage, timeoutMs = 2500) {
  if (!text) {
    return text
  }

  // Race: whichever resolves first — real translation or the timeout
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(text), timeoutMs) // Resolve with original on timeout
  })

  return Promise.race([translateText(text, targetLanguage), timeoutPromise])
}

// Translates the title and description of the first TRANSLATION_ARTICLE_LIMIT
// articles. The remaining articles keep their original English text.
async function translateArticles(articles, targetLanguage) {
  // Nothing to do for English — return as-is
  if (targetLanguage === 'en') {
    return articles
  }

  const subset = articles.slice(0, TRANSLATION_ARTICLE_LIMIT) // Articles to translate
  const rest = articles.slice(TRANSLATION_ARTICLE_LIMIT)      // Articles left untranslated

  const translatedSubset = await Promise.all(
    subset.map(async (article) => {
      // Translate title and description in parallel
      const [title, description] = await Promise.all([
        translateTextWithTimeout(article.title, targetLanguage),
        translateTextWithTimeout(article.description, targetLanguage),
      ])

      return {
        ...article,
        title: title || article.title,             // Keep original if translation is empty
        description: description || article.description,
      }
    }),
  )

  return [...translatedSubset, ...rest]
}

// ─── Article normalisers ────────────────────────────────────────────────────────────
// Each provider returns a different JSON shape. These functions convert them
// into the common article format consumed by the React front-end.

// Converts Currents API news items into the standard shape.
function normalizeCurrentsArticles(newsItems) {
  return (Array.isArray(newsItems) ? newsItems : []).map((item) => ({
    title: item.title || 'Untitled',
    description: item.description || item.title || '',
    url: item.url,
    image: item.image,
    publishedAt: item.published,
    source: {
      name: item.author || item.id || 'Currents',
      url: item.url,
    },
  }))
}

// Converts GNews articles (already in a near-standard shape) into the common format.
function normalizeGnewsArticles(newsItems) {
  return Array.isArray(newsItems) ? newsItems : []
}

// Converts NewsData.io results into the common format.
// Filters out items with no link, since they are unusable by the UI.
function normalizeNewsDataArticles(newsItems) {
  return (Array.isArray(newsItems) ? newsItems : [])
    .filter((item) => item?.link)
    .map((item) => ({
      title: item.title || 'Untitled',
      description: item.description || item.title || '',
      url: item.link,
      image: item.image_url,
      publishedAt: item.pubDate,
      source: {
        name: item.source_name || 'NewsData',
        url: item.link,
      },
    }))
}

// ─── Query string builder ────────────────────────────────────────────────────────────

// Serialises a plain object into an application/x-www-form-urlencoded string.
// Spaces are encoded as "+" (form-style) to match what most news API SDKs expect.
function buildFormEncodedQuery(params) {
  return Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = encodeURIComponent(String(value)).replace(/%20/g, '+')
      return `${encodeURIComponent(key)}=${encodedValue}`
    })
    .join('&')
}

// ─── Provider fetch functions ───────────────────────────────────────────────────────────

// Fetches Sri Lanka news from the Currents API and returns normalised articles.
async function fetchFromCurrents(apiKey) {
  const params = {
    keywords: 'Sri Lanka OR Colombo OR Sri Lankan',
    language: 'en',
    page_size: String(RESULT_LIMIT),
    apiKey,
  }

  const url = `${CURRENTS_API_URL}?${buildFormEncodedQuery(params)}`
  const upstream = await fetch(url)
  const payload = await upstream.json()

  if (!upstream.ok) {
    throw new Error(payload.message || `Currents request failed (${upstream.status}).`)
  }

  return normalizeCurrentsArticles(payload.news) // payload.news is the article array
}

// Fetches Sri Lanka news from GNews and returns normalised articles.
async function fetchFromGnews(apiKey) {
  const params = {
    q: 'Sri Lanka OR Colombo OR Sri Lankan',
    lang: 'en',
    max: String(RESULT_LIMIT),
    sortby: 'publishedAt',
    country: 'lk',
    apikey: apiKey,
  }

  const url = `${GNEWS_API_URL}?${buildFormEncodedQuery(params)}`
  const upstream = await fetch(url)
  const payload = await upstream.json()

  if (!upstream.ok) {
    throw new Error(payload.errors?.[0] || payload.message || `GNews request failed (${upstream.status}).`)
  }

  return normalizeGnewsArticles(payload.articles)
}

// Fetches Sri Lanka news from NewsData.io. Tries country=lk filter first;
// if that returns nothing, retries without the country filter as a fallback.
async function fetchFromNewsData(apiKey) {
  const baseParams = {
    apikey: apiKey,
    q: 'Sri Lanka OR Colombo OR Sri Lankan',
    language: 'en',
    size: String(RESULT_LIMIT),
  }

  const attempts = [
    { ...baseParams, country: 'lk' },
    baseParams,
  ]

  for (const params of attempts) {
    const url = `${NEWSDATA_API_URL}?${buildFormEncodedQuery(params)}`
    const upstream = await fetch(url)
    const payload = await upstream.json()

    if (!upstream.ok || payload.status === 'error') {
      const scope = params.country ? 'country=lk' : 'no-country-filter'
      throw new Error(
        payload.results?.message ||
          payload.message ||
          `NewsData request failed (${upstream.status}, ${scope}).`,
      )
    }

    const normalized = normalizeNewsDataArticles(payload.results)
    if (normalized.length > 0) {
      return normalized
    }
  }

  return []
}

// ─── Serverless handler ───────────────────────────────────────────────────────────

export default async function handler(request, response) {
  // Determine language from ?lang= query param; default to English
  const language = request.query?.lang === 'si' ? 'si' : 'en'
  const cacheKey = `news:${language}`

  // Serve from cache if still fresh
  const cachedArticles = getCachedArticles(cacheKey)
  if (cachedArticles) {
    return response.status(200).json({
      articles: cachedArticles,
      cached: true,
    })
  }

  // Read API keys from environment variables (supports both plain and VITE_ prefixed names)
  const currentsApiKey =
    (process.env.CURRENTS_API_KEY || process.env.VITE_CURRENTS_API_KEY || '').trim()
  const gnewsApiKey = (process.env.GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY || '').trim()
  const newsDataApiKey =
    (
      process.env.NEWSDATA_API_KEY ||
      process.env.NewsData_API_KEY ||
      process.env.VITE_NEWSDATA_API_KEY ||
      ''
    ).trim()

  try {
    let baseArticles = []
    let providerUsed = ''       // Tracks which provider succeeded (for the response metadata)
    const providerErrors = []   // Collects error messages from failed provider attempts

    // Try Currents first — fall through to next provider if it fails or returns nothing
    if (currentsApiKey) {
      try {
        baseArticles = await fetchFromCurrents(currentsApiKey)
        if (baseArticles.length > 0) {
          providerUsed = 'currents'
        } else {
          providerErrors.push('Currents: no articles returned.')
        }
      } catch (error) {
        providerErrors.push(`Currents: ${error.message}`)
      }
    }

    // Try GNews if Currents didn't yield results
    if (baseArticles.length === 0 && gnewsApiKey) {
      try {
        baseArticles = await fetchFromGnews(gnewsApiKey)
        if (baseArticles.length > 0) {
          providerUsed = 'gnews'
        } else {
          providerErrors.push('GNews: no articles returned.')
        }
      } catch (error) {
        providerErrors.push(`GNews: ${error.message}`)
      }
    }

    // Try NewsData.io as last resort
    if (baseArticles.length === 0 && newsDataApiKey) {
      try {
        baseArticles = await fetchFromNewsData(newsDataApiKey)
        if (baseArticles.length > 0) {
          providerUsed = 'newsdata'
        } else {
          providerErrors.push('NewsData: no articles returned.')
        }
      } catch (error) {
        providerErrors.push(`NewsData: ${error.message}`)
      }
    }

    // No keys configured at all — fail fast with a setup hint
    if (baseArticles.length === 0 && !currentsApiKey && !gnewsApiKey && !newsDataApiKey) {
      return response.status(500).json({
        error:
          'No news API key configured. Set CURRENTS_API_KEY, GNEWS_API_KEY, or NEWSDATA_API_KEY.',
      })
    }

    // All providers failed — serve stale cached data if available, otherwise empty
    if (baseArticles.length === 0) {
      const staleArticles = getStaleCachedArticles(cacheKey)
      if (staleArticles && staleArticles.length > 0) {
        return response.status(200).json({
          articles: staleArticles,
          cached: true,
          stale: true,             // Client can show a "may be outdated" notice
          provider: 'stale-cache',
        })
      }

      return response.status(200).json({
        articles: [],
        cached: false,
        provider: 'none',
        warning: 'All configured news providers are temporarily unavailable.',
        providerErrors, // Included so the dev can diagnose which provider failed and why
      })
    }

    // Rank articles by Sri Lanka relevance, translate if Sinhala, then cache
    const prioritizedArticles = prioritizeLocalArticles(baseArticles)
    const localizedArticles = await translateArticles(prioritizedArticles, language)
    setCachedArticles(cacheKey, localizedArticles)

    return response.status(200).json({
      articles: localizedArticles,
      cached: false,
      provider: providerUsed,
    })
  } catch (error) {
    // Catch-all for unexpected errors — return 502 Bad Gateway
    return response.status(502).json({
      error: 'Unable to fetch news right now. Please try again later.',
    })
  }
}
