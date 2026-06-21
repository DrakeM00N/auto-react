// prerender.js - Puppeteer-based static HTML generation for Vite React SPA
// Safe to run after `vite build` (production only)

import puppeteer from 'puppeteer'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

// Реальные публичные маршруты из App.jsx — только то, что имеет смысл
// индексировать (без авторизации, без динамических :id/:code параметров)
const ROUTES = [
  '/',
  '/routes',
  '/schedule',
  '/about',
  '/oferta',
]

const PORT = process.env.PRERENDER_PORT || 4173
const DIST_DIR = path.resolve(process.cwd(), 'dist')

// Без правильного Content-Type Chrome блокирует выполнение
// <script type="module">, и React не монтируется вообще
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

const server = http.createServer((req, res) => {
  // Простой статический сервер
  const urlPath = req.url.split('?')[0]
  const filePath = urlPath === '/' ? '/index.html' : urlPath
  const fullPath = path.join(DIST_DIR, filePath)
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // fallback на index.html для клиентского роутинга
      const indexPath = path.join(DIST_DIR, 'index.html')
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      fs.createReadStream(indexPath).pipe(res)
    } else {
      res.setHeader('Content-Type', getMimeType(fullPath))
      fs.createReadStream(fullPath).pipe(res)
    }
  })
})

const listen = promisify(server.listen).bind(server)
const close = promisify(server.close).bind(server)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

;(async () => {
  try {
    await listen(PORT)
    const address = server.address()
    const port = typeof address === 'string' ? address : address.port
    const baseUrl = `http://localhost:${port}`
    console.log(`🚀 Prerender server listening on ${baseUrl}`)

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    for (const route of ROUTES) {
      try {
        console.log(`🔧 Rendering route: ${route}`)
        const page = await browser.newPage()
        page.setDefaultTimeout(30000)
        page.on('console', (msg) => console.log(`   [browser] ${msg.type()}: ${msg.text()}`))
        page.on('pageerror', (err) => console.log(`   [browser error] ${err.message}`))

        const url = `${baseUrl}${route}`
        await page.goto(url, { waitUntil: 'networkidle0' })

        // Доп. пауза на случай ленивого контента / запросов к API
        await wait(500)

        const content = await page.content()

        let outPath
        if (route === '/' || route === '') {
          outPath = path.join(DIST_DIR, 'index.html')
        } else {
          const cleanRoute = route.replace(/\/$/, '')
          outPath = path.join(DIST_DIR, cleanRoute, 'index.html')
        }

        fs.mkdirSync(path.dirname(outPath), { recursive: true })
        fs.writeFileSync(outPath, content, 'utf8')
        console.log(`✅ Written: ${outPath}`)

        await page.close()
      } catch (err) {
        console.error(`❌ Failed to render ${route}:`, err.message)
        // Продолжаем с остальными маршрутами
      }
    }

   await browser.close()
    await close()
    console.log('🎉 Prerendering completed successfully.')
  } catch (err) {
    console.error('💥 Prerendering failed (сайт всё одно задеплоїться, просто без пререндеру):', err)
    process.exit(0)
  }
})()