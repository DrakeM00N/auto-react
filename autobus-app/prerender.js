// prerender.js - Puppeteer-based static HTML generation for Vite React SPA
// Safe to run after `vite build` (production only)

import puppeteer from 'puppeteer'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { loadEnv } from 'vite'
import { routePath } from './src/lib/routeSlug.js'
import { selectRoutesBySlug } from './src/lib/routeSelection.js'

// Реальные публичные маршруты из App.jsx — только то, что имеет смысл
// индексировать (без авторизации, без динамических :id/:code параметров)
const PUBLIC_ROUTES = [
  '/',
  '/routes',
  '/schedule',
  '/about',
  '/oferta',
  '/privacy',
]
const ROUTES = [...PUBLIC_ROUTES]

const ROUTE_METADATA = new Map()
const BUILD_ENV = loadEnv('production', process.cwd(), 'VITE_')

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
  const apiBase = (process.env.VITE_API_URL || BUILD_ENV.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '')
  console.log(`Fetching prerender routes from ${apiBase}/routes`)
  const fetchApiList = async endpoint => {
    let response
    try {
      response = await fetch(`${apiBase}/${endpoint}`, { signal: AbortSignal.timeout(15000) })
    } catch (error) {
      throw new Error(`Cannot fetch ${endpoint} data from ${apiBase}/${endpoint}: ${error.message}`, { cause: error })
    }
    if (!response.ok) {
      throw new Error(`${endpoint} API ${apiBase}/${endpoint} returned HTTP ${response.status}`)
    }
    const result = await response.json()
    if (!Array.isArray(result)) {
      throw new Error(`${endpoint} API ${apiBase}/${endpoint} must return a JSON array`)
    }
    return result
  }

  const [routes, trips] = await Promise.all([
    fetchApiList('routes'),
    fetchApiList('trips'),
  ])
  if (routes.length === 0) {
    throw new Error(`Route API ${apiBase}/routes returned no routes`)
  }

  const selection = selectRoutesBySlug(routes, trips)
  for (const duplicate of selection.duplicates) {
    const skipped = duplicate.skipped
      .map(item => `id ${item.route.id} (${item.futureTrips} future trips)`)
      .join(', ')
    console.warn(
      `⚠️ Duplicate route slug ${duplicate.routeUrl}: selected id ${duplicate.selected.route.id} ` +
      `(${duplicate.selected.futureTrips} future trips); skipped ${skipped}`,
    )
  }

  for (const route of selection.routes) {
    if (!route?.from || !route?.to) {
      throw new Error('Route API returned a route without from/to city names')
    }
    const pathName = routePath(route)
    ROUTE_METADATA.set(pathName, {
      title: `Автобус ${route.from} — ${route.to}`,
      description: `Автобусний маршрут ${route.from} — ${route.to}: відстань ${route.distance}, тривалість поїздки ${route.duration}, актуальні рейси та онлайн-бронювання квитків.`,
    })
    ROUTES.push(pathName)
  }
  return {
    apiBase,
    routes,
    trips,
    selectedRoutes: selection.routes,
    receivedRoutes: routes.length,
    uniqueSlugs: selection.routes.length,
    skippedDuplicates: routes.length - selection.routes.length,
  }
}

function interceptApiRequests(page, apiBase, routes, trips) {
  const apiUrl = new URL(apiBase)
  const apiPath = apiUrl.pathname.replace(/\/+$/, '')
  page.setRequestInterception(true)
  page.on('request', request => {
    const requestUrl = new URL(request.url())
    if (
      requestUrl.origin !== apiUrl.origin ||
      !requestUrl.pathname.startsWith(`${apiPath}/`)
    ) {
      request.continue()
      return
    }

    const endpoint = requestUrl.pathname.slice(apiPath.length + 1)
    const body = request.method() === 'GET' && endpoint === 'routes'
      ? JSON.stringify(routes)
      : request.method() === 'GET' && endpoint === 'trips'
        ? JSON.stringify(trips)
        : null
    const response = {
      status: body === null ? 204 : 200,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type,authorization',
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
    }
    if (body !== null) {
      response.contentType = 'application/json'
      response.body = body
    }
    request.respond(response)
  })
}

function getOrigin() {
  return (process.env.VITE_SITE_URL || BUILD_ENV.VITE_SITE_URL || 'https://bustoria.com.ua').replace(/\/+$/, '')
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function replaceOrAdd(html, pattern, tag) {
  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace('</head>', `  ${tag}\n  </head>`)
}

function applyRouteMetadata(html, routePathname) {
  const metadata = ROUTE_METADATA.get(routePathname)
  if (!metadata) return html

  const canonical = escapeHtml(`${getOrigin()}${routePathname}`)
  const title = escapeHtml(metadata.title)
  const description = escapeHtml(metadata.description)
  let result = replaceOrAdd(html, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
  result = replaceOrAdd(
    result,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${description}" />`,
  )
  result = replaceOrAdd(
    result,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonical}" />`,
  )
  return replaceOrAdd(
    result,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`,
  )
}

function removeBrowserInjectedAssets(html) {
  return html
    .replace(
      /<style\b(?=[^>]*\bid=["']googleidentityservice_button_styles["'])[^>]*>[\s\S]*?<\/style\s*>/gi,
      '',
    )
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, script => (
      /googleads\.g\.doubleclick\.net/i.test(script) && /localhost/i.test(script) ? '' : script
    ))
}

function writeSitemap(selectedRoutes) {
  const origin = getOrigin()
  const sitemapRoutes = [...PUBLIC_ROUTES, ...selectedRoutes.map(routePath)]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapRoutes.map(route => `  <url><loc>${origin}${route}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf8')
}

function countSitemapRouteUrls() {
  const sitemap = fs.readFileSync(path.join(DIST_DIR, 'sitemap.xml'), 'utf8')
  return (sitemap.match(/<loc>[^<]*\/routes\/[^<]*<\/loc>/g) || []).length
}

function writeRobots() {
  const robotsPath = path.join(DIST_DIR, 'robots.txt')
  if (!fs.existsSync(robotsPath)) return
  const text = fs.readFileSync(robotsPath, 'utf8')
    .replace(/^Sitemap:.*\r?\n?/gm, '')
    .trimEnd() + `\n\nSitemap: ${getOrigin()}/sitemap.xml\n`
  fs.writeFileSync(robotsPath, text, 'utf8')
}

;(async () => {
  let browser
  try {
    const routeSummary = await addRoutePages()
    writeSitemap(routeSummary.selectedRoutes)
    const sitemapRouteCount = countSitemapRouteUrls()
    if (routeSummary.uniqueSlugs !== sitemapRouteCount) {
      throw new Error(
        `Route API returned ${routeSummary.uniqueSlugs} unique slugs but sitemap has ${sitemapRouteCount} route URLs`,
      )
    }

    await listen(PORT)
    const address = server.address()
    const port = typeof address === 'string' ? address : address.port
    const baseUrl = `http://localhost:${port}`
    console.log(`🚀 Prerender server listening on ${baseUrl}`)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    let createdRoutePages = 0
    let skippedRoutePages = 0
    for (const route of ROUTES) {
      const metadata = ROUTE_METADATA.get(route)
      const page = await browser.newPage()
      try {
        console.log(`🔧 Rendering route: ${route}`)
        page.setDefaultTimeout(30000)
        interceptApiRequests(page, routeSummary.apiBase, routeSummary.routes, routeSummary.trips)
        page.on('console', (msg) => console.log(`   [browser] ${msg.type()}: ${msg.text()}`))
        page.on('pageerror', (err) => console.log(`   [browser error] ${err.message}`))

        const url = `${baseUrl}${route}`
        await page.goto(url, { waitUntil: 'networkidle0' })
        if (metadata) {
          await page.waitForFunction(
            (expectedTitle) => document.title === expectedTitle ||
              document.querySelector('[data-route-not-found="true"]'),
            { timeout: 30000 },
            metadata.title,
          )
          const routeFound = await page.evaluate(
            expectedTitle => document.title === expectedTitle,
            metadata.title,
          )
          if (!routeFound) {
            skippedRoutePages += 1
            console.warn(`⚠️ Skipping ${route}: route was not found by the client app`)
            continue
          }
        }

        // Доп. пауза на случай ленивого контента / запросов к API
        await wait(500)

        const content = removeBrowserInjectedAssets(
          applyRouteMetadata(await page.content(), route),
        )

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
        if (metadata) createdRoutePages += 1
      } catch (err) {
        console.error(`❌ Failed to render ${route}:`, err.message)
        if (metadata) skippedRoutePages += 1
      } finally {
        await page.close()
      }
    }

    writeRobots()
    console.log(
      `📊 Routes: ${routeSummary.receivedRoutes} received, ${routeSummary.uniqueSlugs} unique slugs, ` +
      `${routeSummary.skippedDuplicates} duplicates skipped, ${createdRoutePages} pages created; ` +
      `${skippedRoutePages} route pages skipped, sitemap: ${sitemapRouteCount} route URLs`,
    )
    if (createdRoutePages !== sitemapRouteCount) {
      throw new Error(
        `Created ${createdRoutePages} route pages but sitemap lists ${sitemapRouteCount}; refusing incomplete build`,
      )
    }
    console.log('🎉 Prerendering completed successfully.')
  } catch (err) {
    console.error('💥 Prerendering failed:', err.message)
    process.exitCode = 1
  } finally {
    if (browser) await browser.close()
    if (server.listening) await close()
  }
})()