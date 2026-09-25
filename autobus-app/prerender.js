// prerender.js - Puppeteer-based static HTML generation for Vite React SPA
// Safe to run after `vite build` (production only)

import puppeteer from 'puppeteer'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

// Реальные публичные маршруты из App.jsx — только то, что имеет смысл
// индексировать (без авторизации, без динамических :id/:code параметров)
const ROUTES = [
  '/',
  '/routes',
  '/schedule',
  '/about',
  '/oferta',
  '/privacy',
]

const FALLBACK_ROUTE_PATHS = [
  '/routes/kremenchuk-kyiv',
  '/routes/kremenchuk-kharkiv',
  '/routes/kremenchuk-lviv',
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

async function addRoutePages() {
  const apiBase = process.env.VITE_API_URL || 'http://localhost:3001/api'
  try {
    const response = await fetch(`${apiBase}/routes`)
    if (!response.ok) throw new Error(`API responded with ${response.status}`)
    const routes = await response.json()
    const transliterate = value => String(value || '')
      .toLowerCase()
      .replace(/є/g, 'ye').replace(/ж/g, 'zh').replace(/х/g, 'kh').replace(/ц/g, 'ts')
      .replace(/ч/g, 'ch').replace(/ш/g, 'sh').replace(/щ/g, 'shch').replace(/ю/g, 'yu')
      .replace(/я/g, 'ya').replace(/і/g, 'i').replace(/ї/g, 'yi').replace(/й/g, 'y')
      .replace(/г/g, 'h').replace(/ґ/g, 'g').replace(/ь/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    for (const route of routes) {
      const pathName = `/routes/${transliterate(route.from)}-${transliterate(route.to)}`
      if (!ROUTES.includes(pathName)) ROUTES.push(pathName)
    }
  } catch (error) {
    console.warn(`⚠️ Could not load route URLs for prerender: ${error.message}`)
    FALLBACK_ROUTE_PATHS.forEach(pathName => {
      if (!ROUTES.includes(pathName)) ROUTES.push(pathName)
    })
  }
}

function writeSitemap() {
  const origin = process.env.SITE_URL || 'https://bustour.com.ua'
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    ROUTES.map(route => `  <url><loc>${origin}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8')
}

;(async () => {
  try {
    await addRoutePages()
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
    writeSitemap()
    await close()
    console.log('🎉 Prerendering completed successfully.')
  } catch (err) {
    console.error('💥 Prerendering failed (сайт всё одно задеплоїться, просто без пререндеру):', err)
    process.exit(0)
  }
})()