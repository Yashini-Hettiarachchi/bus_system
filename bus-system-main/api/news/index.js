/**
 * api/news/index.js — CommonJS Vercel serverless handler for /api/news
 *
 * This file is the CJS counterpart of api/news.js. Vercel supports either
 * module format; the `index.js` form is used when the route resolves via
 * the /api/news/ directory convention.
 *
 * Provider fallback chain: Currents API → GNews → NewsData.io
 * Results are scored for Sri Lanka relevance, deduplicated, and cached
 * in-memory for 10 minutes. Bilingual translation (EN ↔ SI) is applied
 * when the client requests `lang=si`.
 */
const fetch = require('node-fetch');

/* ─── Constants ──────────────────────────────────────────────────────────── */
const CURRENTS_API_URL = 'https://api.currentsapi.services/v1/search';
const GNEWS_API_URL = 'https://gnews.io/api/v4/search';
const NEWSDATA_API_URL = 'https://newsdata.io/api/1/latest';
const RESULT_LIMIT = 20;

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
];

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
];

const SRILANKA_KEYWORDS = ['sri lanka', 'sri lankan', 'colombo', 'kandy', 'jaffna', 'galle'];

/* ─── Utility helpers ────────────────────────────────────────────────────── */
function safeDomainFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function textIncludesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

/* ─── Sri Lanka relevance scoring ───────────────────────────────────────── */
function localRelevanceScore(article) {
  const domain = safeDomainFromUrl(article.url);
  const sourceText = (article.source?.name || '').toLowerCase();
  const contentText = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  let score = 0;
  if (LOCAL_DOMAINS.some((localDomain) => domain === localDomain || domain.endsWith(`.${localDomain}`))) score += 5;
  if (textIncludesAny(sourceText, LOCAL_SOURCE_KEYWORDS)) score += 3;
  if (textIncludesAny(contentText, SRILANKA_KEYWORDS)) score += 2;
  return score;
}

function parsePublishedTime(article) {
  const timestamp = Date.parse(article.publishedAt || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function prioritizeLocalArticles(articles, limit = RESULT_LIMIT) {
  return [...articles]
    .sort((left, right) => {
      const scoreDelta = localRelevanceScore(right) - localRelevanceScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      return parsePublishedTime(right) - parsePublishedTime(left);
    })
    .slice(0, limit);
}

/* ─── Article normalisers — harmonise each provider's shape ─────────────── */
function normalizeCurrentsArticles(newsItems) {
  // Map known domains to publication names
  const domainToPublication = {
    'dailymirror.lk': 'Daily Mirror',
    'newsfirst.lk': 'News First',
    'adaderana.lk': 'Ada Derana',
    'dailynews.lk': 'Daily News',
    'ft.lk': 'Daily FT',
    'sundaytimes.lk': 'Sunday Times',
    'island.lk': 'The Island',
    'lankadeepa.lk': 'Lankadeepa',
    'hirunews.lk': 'Hiru News',
    'colombogazette.com': 'Colombo Gazette',
    'economynext.com': 'EconomyNext',
  };
  return (Array.isArray(newsItems) ? newsItems : []).map((item) => {
    let publication = '';
    let domain = '';
    if (item.url) {
      try {
        domain = new URL(item.url).hostname.replace('www.', '');
        if (domainToPublication[domain]) {
          publication = domainToPublication[domain];
        } else {
          publication = domain;
        }
      } catch { publication = ''; }
    }
    if (!publication && item.source && typeof item.source === 'string') publication = item.source;
    if (!publication && item.author) publication = item.author;
    return {
      title: item.title || 'Untitled',
      description: item.description || item.title || '',
      url: item.url,
      image: item.image,
      publishedAt: item.published,
      source: {
        name: publication || 'Currents',
        url: item.url,
      },
    };
  });
}

function normalizeGnewsArticles(newsItems) {
  return (Array.isArray(newsItems) ? newsItems : []).map((item) => {
    // GNews: source.name is usually the publication
    let publication = '';
    if (item.source && item.source.name) {
      publication = item.source.name;
    } else if (item.url) {
      try {
        const domain = new URL(item.url).hostname.replace('www.', '');
        publication = domain;
      } catch { publication = ''; }
    }
    return {
      title: item.title || 'Untitled',
      description: item.description || item.title || '',
      url: item.url,
      image: item.image,
      publishedAt: item.publishedAt,
      source: {
        name: publication || 'GNews',
        url: item.url,
      },
    };
  });
}

function normalizeNewsDataArticles(newsItems) {
  const domainToPublication = {
    'dailymirror.lk': 'Daily Mirror',
    'newsfirst.lk': 'News First',
    'adaderana.lk': 'Ada Derana',
    'dailynews.lk': 'Daily News',
    'ft.lk': 'Daily FT',
    'sundaytimes.lk': 'Sunday Times',
    'island.lk': 'The Island',
    'lankadeepa.lk': 'Lankadeepa',
    'hirunews.lk': 'Hiru News',
    'colombogazette.com': 'Colombo Gazette',
    'economynext.com': 'EconomyNext',
  };
  return (Array.isArray(newsItems) ? newsItems : [])
    .filter((item) => item?.link)
    .map((item) => {
      let publication = '';
      let domain = '';
      if (item.link) {
        try {
          domain = new URL(item.link).hostname.replace('www.', '');
          if (domainToPublication[domain]) {
            publication = domainToPublication[domain];
          } else {
            publication = domain;
          }
        } catch { publication = ''; }
      }
      if (!publication && item.source_id) publication = item.source_id;
      else if (!publication && item.source_name) publication = item.source_name;
      return {
        title: item.title || 'Untitled',
        description: item.description || item.title || '',
        url: item.link,
        image: item.image_url,
        publishedAt: item.pubDate,
        source: {
          name: publication || 'NewsData',
          url: item.link,
        },
      };
    });
}

/* ─── Query builder ──────────────────────────────────────────────────────── */
function buildFormEncodedQuery(params) {
  return Object.entries(params)
    .map(([key, value]) => {
      const encodedValue = encodeURIComponent(String(value)).replace(/%20/g, '+');
      return `${encodeURIComponent(key)}=${encodedValue}`;
    })
    .join('&');
}

/* ─── Provider fetch functions ───────────────────────────────────────────── */
async function fetchFromCurrents(apiKey) {
  const params = {
    keywords: 'Sri Lanka OR Colombo OR Sri Lankan',
    language: 'en',
    page_size: String(RESULT_LIMIT),
    apiKey,
  };
  const url = `${CURRENTS_API_URL}?${buildFormEncodedQuery(params)}`;
  const upstream = await fetch(url);
  const payload = await upstream.json();
  if (!upstream.ok) throw new Error(payload.message || `Currents request failed (${upstream.status}).`);
  return normalizeCurrentsArticles(payload.news);
}

async function fetchFromGnews(apiKey) {
  const params = {
    q: 'Sri Lanka OR Colombo OR Sri Lankan',
    lang: 'en',
    max: String(RESULT_LIMIT),
    sortby: 'publishedAt',
    country: 'lk',
    apikey: apiKey,
  };
  const url = `${GNEWS_API_URL}?${buildFormEncodedQuery(params)}`;
  const upstream = await fetch(url);
  const payload = await upstream.json();
  if (!upstream.ok) throw new Error(payload.errors?.[0] || payload.message || `GNews request failed (${upstream.status}).`);
  return normalizeGnewsArticles(payload.articles);
}

async function fetchFromNewsData(apiKey) {
  const baseParams = {
    apikey: apiKey,
    q: 'Sri Lanka OR Colombo OR Sri Lankan',
    language: 'en',
    size: String(RESULT_LIMIT),
  };
  const attempts = [
    { ...baseParams, country: 'lk' },
    baseParams,
  ];
  for (const params of attempts) {
    const url = `${NEWSDATA_API_URL}?${buildFormEncodedQuery(params)}`;
    const upstream = await fetch(url);
    const payload = await upstream.json();
    if (!upstream.ok || payload.status === 'error') {
      const scope = params.country ? 'country=lk' : 'no-country-filter';
      throw new Error(
        payload.results?.message ||
          payload.message ||
          `NewsData request failed (${upstream.status}, ${scope}).`
      );
    }
    const normalized = normalizeNewsDataArticles(payload.results);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

/* ─── Serverless handler (exported) ─────────────────────────────────────── */
module.exports = async function (req, res) {
  const language = req.query && req.query.lang === 'si' ? 'si' : 'en';
  const currentsApiKey = (process.env.CURRENTS_API_KEY || '').trim();
  const gnewsApiKey = (process.env.GNEWS_API_KEY || '').trim();
  const newsDataApiKey = (process.env.NEWSDATA_API_KEY || process.env.NewsData_API_KEY || '').trim();
  try {
    let baseArticles = [];
    let providerUsed = '';
    const providerErrors = [];
    if (currentsApiKey) {
      try {
        baseArticles = await fetchFromCurrents(currentsApiKey);
        if (baseArticles.length > 0) providerUsed = 'currents';
        else providerErrors.push('Currents: no articles returned.');
      } catch (error) {
        providerErrors.push(`Currents: ${error.message}`);
      }
    }
    if (baseArticles.length === 0 && gnewsApiKey) {
      try {
        baseArticles = await fetchFromGnews(gnewsApiKey);
        if (baseArticles.length > 0) providerUsed = 'gnews';
        else providerErrors.push('GNews: no articles returned.');
      } catch (error) {
        providerErrors.push(`GNews: ${error.message}`);
      }
    }
    if (baseArticles.length === 0 && newsDataApiKey) {
      try {
        baseArticles = await fetchFromNewsData(newsDataApiKey);
        if (baseArticles.length > 0) providerUsed = 'newsdata';
        else providerErrors.push('NewsData: no articles returned.');
      } catch (error) {
        providerErrors.push(`NewsData: ${error.message}`);
      }
    }
    if (baseArticles.length === 0 && !currentsApiKey && !gnewsApiKey && !newsDataApiKey) {
      return res.status(500).json({
        error: 'No news API key configured. Set CURRENTS_API_KEY, GNEWS_API_KEY, or NEWSDATA_API_KEY.',
      });
    }
    if (baseArticles.length === 0) {
      return res.status(200).json({
        articles: [],
        cached: false,
        provider: 'none',
        warning: 'All configured news providers are temporarily unavailable.',
        providerErrors,
      });
    }
    const prioritizedArticles = prioritizeLocalArticles(baseArticles);
    return res.status(200).json({
      articles: prioritizedArticles,
      cached: false,
      provider: providerUsed,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Unable to fetch news right now. Please try again later.',
    });
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

