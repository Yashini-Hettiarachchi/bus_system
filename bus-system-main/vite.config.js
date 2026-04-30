import 'dotenv/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import newsHandler from './api/news.js'

function newsApiDevMiddleware() {
  return {
    name: 'news-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res, next) => {
        // Use the host from the request headers or fallback to 127.0.0.1
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), newsApiDevMiddleware()],
})
