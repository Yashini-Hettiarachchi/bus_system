const CURRENTS_API_URL = 'https://api.currentsapi.services/v1/search'
const GNEWS_API_URL = 'https://gnews.io/api/v4/search'
const NEWSDATA_API_URL = 'https://newsdata.io/api/1/latest'
const CACHE_TTL_MS = 10 * 60 * 1000
const RESULT_LIMIT = 6
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

function getCachedArticles(cacheKey) {
  const cached = newsCache.get(cacheKey)
  if (!cached) {
    return null
  }

  if (Date.now() > cached.expiresAt) {
    newsCache.delete(cacheKey)
    return null
  }

  return cached.articles
}

function setCachedArticles(cacheKey, articles) {
  newsCache.set(cacheKey, {
    articles,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

function getStaleCachedArticles(cacheKey) {
  const cached = newsCache.get(cacheKey)
  if (!cached) {
    return null
  }

  return cached.articles
}

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

function textIncludesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle))
}

function localRelevanceScore(article) {
  const domain = safeDomainFromUrl(article.url)
  const sourceText = (article.source?.name || '').toLowerCase()
  const contentText = `${article.title || ''} ${article.description || ''}`.toLowerCase()

  let score = 0

  if (LOCAL_DOMAINS.some((localDomain) => domain === localDomain || domain.endsWith(`.${localDomain}`))) {
    score += 5
  }

  if (textIncludesAny(sourceText, LOCAL_SOURCE_KEYWORDS)) {
    score += 3
  }

  if (textIncludesAny(contentText, SRILANKA_KEYWORDS)) {
    score += 2
  }

  return score
}

function parsePublishedTime(article) {
  const timestamp = Date.parse(article.publishedAt || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

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

async function translateText(text, targetLanguage) {
  if (!text || !targetLanguage || targetLanguage === 'en') {
    return text
  }

  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(text)}`

  const response = await fetch(url)
  if (!response.ok) {
    return text
  }

  const payload = await response.json()
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return text
  }

  const translated = payload[0]
    .filter((segment) => Array.isArray(segment) && typeof segment[0] === 'string')
    .map((segment) => segment[0])
    .join('')

  return translated || text
}

async function translateArticles(articles, targetLanguage) {
  if (targetLanguage === 'en') {
    return articles
  }

  return Promise.all(
    articles.map(async (article) => {
      const [translatedTitle, translatedDescription] = await Promise.all([
        translateText(article.title, targetLanguage),
        translateText(article.description, targetLanguage),
      ])

      return {
        ...article,
        title: translatedTitle,
        description: translatedDescription,
      }
    }),
  )
}

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

function normalizeGnewsArticles(newsItems) {
  return Array.isArray(newsItems) ? newsItems : []
}

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

function buildFormEncodedQuery(params) {
  return Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = encodeURIComponent(String(value)).replace(/%20/g, '+')
      return `${encodeURIComponent(key)}=${encodedValue}`
    })
    .join('&')
}

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

  return normalizeCurrentsArticles(payload.news)
}

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

export default async function handler(request, response) {
  const language = request.query?.lang === 'si' ? 'si' : 'en'
  const cacheKey = `news:${language}`
  const cachedArticles = getCachedArticles(cacheKey)

  if (cachedArticles) {
    return response.status(200).json({
      articles: cachedArticles,
      cached: true,
    })
  }

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
    let providerUsed = ''
    const providerErrors = []

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

    if (baseArticles.length === 0 && !currentsApiKey && !gnewsApiKey && !newsDataApiKey) {
      return response.status(500).json({
        error:
          'No news API key configured. Set CURRENTS_API_KEY, GNEWS_API_KEY, or NEWSDATA_API_KEY.',
      })
    }

    if (baseArticles.length === 0) {
      const staleArticles = getStaleCachedArticles(cacheKey)
      if (staleArticles && staleArticles.length > 0) {
        return response.status(200).json({
          articles: staleArticles,
          cached: true,
          stale: true,
          provider: 'stale-cache',
        })
      }

      return response.status(200).json({
        articles: [],
        cached: false,
        provider: 'none',
        warning: 'All configured news providers are temporarily unavailable.',
        providerErrors,
      })
    }

    const prioritizedArticles = prioritizeLocalArticles(baseArticles)
    const localizedArticles = await translateArticles(prioritizedArticles, language)
    setCachedArticles(cacheKey, localizedArticles)

    return response.status(200).json({
      articles: localizedArticles,
      cached: false,
      provider: providerUsed,
    })
  } catch (error) {
    return response.status(502).json({
      error: 'Unable to fetch news right now. Please try again later.',
    })
  }
}
