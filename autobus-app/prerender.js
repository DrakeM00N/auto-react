// prerender.js - Puppeteer-based static HTML generation for Vite React SPA
// Safe to run after `vite build` (production only)

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// List of routes to prerender (must match React Router paths)
const ROUTES = [
  '/',
  '/routes',
  '/about',
  '/contact',
  '/city/odesa',
  '/city/kyiv',
  '/city/lviv',
  '/route/odesa-kyiv',
  '/route/kyiv-lviv'
];

const PORT = process.env.PRERENDER_PORT || 0; // 0 = random free port
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const server = http.createServer((req, res) => {
  // Very simple static file server
  const filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = path.join(DIST_DIR, filePath);
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // fallback to index.html for client-side routing
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.createReadStream(indexPath).pipe(res);
    } else {
      fs.createReadStream(fullPath).pipe(res);
    }
  });
});

const listen = promisify(server.listen).bind(server);
const close = promisify(server.close).bind(server);

(async () => {
  try {
    await listen(PORT);
    const address = server.address();
    const port = typeof address === 'string' ? address : address.port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`🚀 Prerender server listening on ${baseUrl}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const route of ROUTES) {
      try {
        console.log(`🔧 Rendering route: ${route}`);
        const page = await browser.newPage();
        // Set default timeout
        page.setDefaultTimeout(30000);

        const url = `${baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle0' });

        // Additional wait for any lazy content (optional)
        await page.waitForTimeout(500);

        const content = await page.content();

        // Determine output file path
        let outPath;
        if (route === '/' || route === '') {
          outPath = path.join(DIST_DIR, 'index.html');
        } else {
          // Ensure no trailing slash
          const cleanRoute = route.replace(/\/$/, '');
          outPath = path.join(DIST_DIR, cleanRoute, 'index.html');
        }

        // Ensure directory exists
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, content, 'utf8');
        console.log(`✅ Written: ${outPath}`);

        await page.close();
      } catch (err) {
        console.error(`❌ Failed to render ${route}:`, err.message);
        // Continue with other routes
      }
    }

    await browser.close();
    await close();
    console.log('🎉 Prerendering completed successfully.');
  } catch (err) {
    console.error('💥 Prerendering failed:', err);
    process.exit(1);
  }
})();