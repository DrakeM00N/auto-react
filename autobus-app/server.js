import express from 'express'
import compression from 'compression'
import { createServer as createViteServer } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function createServer() {
  const app = express()

  app.use(compression())
  app.use(
    '/assets',
    express.static(resolve(__dirname, 'dist/client/assets'), {
      index: false,
    })
  )

  let vite
  if (process.env.NODE_ENV === 'development') {
    // In development, create Vite server and use its middleware
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    // In production, we need to render using the built SSR bundle
    const { render } = await import('./dist/server/entry-server.js')
    app.use('*', async (req, res) => {
      try {
        const url = req.originalUrl
        const html = await render(req)

        res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
      } catch (e) {
        console.error(`Error rendering ${req.originalUrl}:`, e)
        res.status(500).end('Internal Server Error')
      }
    })
  }

  const port = process.env.PORT || 5173
  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`)
  })
}

createServer().catch((err) => {
  console.error(err)
  process.exit(1)
})