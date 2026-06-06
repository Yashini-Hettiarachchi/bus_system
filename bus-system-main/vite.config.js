// Vite build and dev-server configuration for BusSync.
// Also loads .env variables at startup so the dev server can read API keys.
import 'dotenv/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import newsHandler from './api/news.js'
import moviesHandler from './api/movies.js'
import categoryPrefsHandler from './api/category-prefs.js'
import feedbackHandler from './api/feedback.js'

// Custom Vite plugin that mirrors the Vercel /api/news serverless route
// locally during `npm run dev`. Without this, the news API would only work
// after deploying to Vercel — not while developing on localhost.
function newsApiDevMiddleware() {
  return {
    name: 'news-api-dev-middleware', // Plugin name shown in Vite logs
    configureServer(server) {
      // Intercept every request to /api/news and forward it to the news handler
      server.middlewares.use('/api/news', async (req, res, next) => {
        // Use the host from the request headers or fallback to 127.0.0.1
        const host = req.headers?.host ? `http://${req.headers.host}` : 'http://127.0.0.1';
        // Parse query-string params from the incoming URL
        const url = new URL(req.url || '/', host);
        const query = Object.fromEntries(url.searchParams.entries());
        let statusCode = 200; // Default HTTP status; overridden by response.status()

        // Minimal response shim that satisfies the same interface as Express / Vercel
        const response = {
          // Stores the status code and returns `this` for chaining (.status(x).json(y))
          status(code) {
            statusCode = code
            return this
          },
          // Serialises the payload as JSON and sends it to the browser
          json(payload) {
            if (res.writableEnded) {
              return // Prevent writing to an already-closed response
            }

            res.statusCode = statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          },
        }

        try {
          await newsHandler({ query }, response)
        } catch (error) {
          response.status(500).json({
            error: error instanceof Error ? error.message : 'Unexpected server error.',
          })
        }

        if (!res.writableEnded) {
          next()
        }
      })
    },
  }
}

// Local dev middleware for /api/movies so Movie tab behavior matches Vercel.
function moviesApiDevMiddleware() {
  return {
    name: 'movies-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/movies', async (req, res, next) => {
        const host = req.headers?.host ? `http://${req.headers.host}` : 'http://127.0.0.1';
        const url = new URL(req.url || '/', host);
        const query = Object.fromEntries(url.searchParams.entries());
        let statusCode = 200;

        const response = {
          status(code) {
            statusCode = code
            return this
          },
          json(payload) {
            if (res.writableEnded) {
              return
            }

            res.statusCode = statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          },
        }

        try {
          await moviesHandler({ query }, response)
        } catch (error) {
          response.status(500).json({
            error: error instanceof Error ? error.message : 'Unexpected server error.',
          })
        }

        if (!res.writableEnded) {
          next()
        }
      })
    },
  }
}

function categoryPrefsApiDevMiddleware() {
  return {
    name: 'category-prefs-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/category-prefs', async (req, res, next) => {
        const host = req.headers?.host ? `http://${req.headers.host}` : 'http://127.0.0.1';
        const url = new URL(req.url || '/', host);
        const query = Object.fromEntries(url.searchParams.entries());
        let statusCode = 200;

        const response = {
          status(code) {
            statusCode = code
            return this
          },
          json(payload) {
            if (res.writableEnded) {
              return
            }
            res.statusCode = statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          },
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const requestObj = {
                method: req.method,
                query,
                body: body ? JSON.parse(body) : {}
              };
              await categoryPrefsHandler(requestObj, response);
            } catch (error) {
              response.status(500).json({
                error: error instanceof Error ? error.message : 'Unexpected server error.',
              });
            }
          });
        } else {
          try {
            const requestObj = {
              method: req.method,
              query,
              body: {}
            };
            await categoryPrefsHandler(requestObj, response);
          } catch (error) {
            response.status(500).json({
              error: error instanceof Error ? error.message : 'Unexpected server error.',
            });
          }
        }

        if (!res.writableEnded) {
          next()
        }
      })
    },
  }
}

function feedbackApiDevMiddleware() {
  return {
    name: 'feedback-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/feedback', async (req, res, next) => {
        const host = req.headers?.host ? `http://${req.headers.host}` : 'http://127.0.0.1';
        const url = new URL(req.url || '/', host);
        const query = Object.fromEntries(url.searchParams.entries());
        let statusCode = 200;

        const response = {
          status(code) {
            statusCode = code
            return this
          },
          json(payload) {
            if (res.writableEnded) {
              return
            }
            res.statusCode = statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(payload))
          },
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              const requestObj = {
                method: req.method,
                query,
                body: body ? JSON.parse(body) : {}
              };
              await feedbackHandler(requestObj, response);
            } catch (error) {
              response.status(500).json({
                error: error instanceof Error ? error.message : 'Unexpected server error.',
              });
            }
          });
        } else {
          try {
            const requestObj = {
              method: req.method,
              query,
              body: {}
            };
            await feedbackHandler(requestObj, response);
          } catch (error) {
            response.status(500).json({
              error: error instanceof Error ? error.message : 'Unexpected server error.',
            });
          }
        }

        if (!res.writableEnded) {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    newsApiDevMiddleware(),
    moviesApiDevMiddleware(),
    categoryPrefsApiDevMiddleware(),
    feedbackApiDevMiddleware()
  ],
})
