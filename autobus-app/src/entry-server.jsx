import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './context/DataContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HelmetProvider } from 'react-helmet-async'
import { apiRequest as request } from './lib/api'

export async function render(req) {
  const { url } = req
  const context = {}

  // Fetch data for the server
  let initialData = {}
  try {
    // Fetch routes and trips (public data)
    const [routesData, tripsData] = await Promise.all([
      request('GET', '/routes'),
      request('GET', '/trips'),
    ])

    // Normalize trips (same as in DataContext)
    function mapTrip(raw) {
      return {
        id: raw.id,
        routeId: raw.routeId,
        date: raw.date,
        time: raw.time,
        price: raw.price,
        seats: raw.seats,
        bookedCount: raw.bookedCount || 0,
        departurePoint: raw.departurePoint || '',
        arrivalPoint: raw.arrivalPoint || '',
        busModel: raw.busModel || '',
        busPlate: raw.busPlate || '',
        carrier: raw.carrier || '',
        amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
        intermediateStops: Array.isArray(raw.intermediateStops) ? raw.intermediateStops : [],
      }
    }

    initialData = {
      routes: routesData,
      trips: tripsData.map(mapTrip),
      // For users and bookings, we don't have data on the server for guest users
      // We'll leave them empty, and the DataContext will set them to empty arrays
      users: [],
      bookings: [],
    }
  } catch (e) {
    console.error('Failed to fetch data for SSR:', e.message)
    // If we fail, we still want to render the page, but with empty data
    initialData = {
      routes: [],
      trips: [],
      users: [],
      bookings: [],
    }
  }

  // Render the app
  const html = renderToString(
    <HelmetProvider>
      <AuthProvider>
        <DataProvider initialData={initialData}>
          <ThemeProvider>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
              <StaticRouter location={url} context={context}>
                <App />
              </StaticRouter>
            </GoogleOAuthProvider>
          </ThemeProvider>
        </DataProvider>
      </AuthProvider>
    </HelmetProvider>
  )

  // Get helmet data (title, meta tags, etc.)
  const { title, meta, link, ...rest } = HelmetProvider.renderStatic()

  // We'll create an HTML string with the helmet data injected into the head
  // We assume the index.html has a placeholder for helmet? Actually, we are going to
  // replace the entire HTML string. We'll get the template from index.html and replace
  // the root div and the helmet data.

  // However, for simplicity, we'll generate a full HTML string here.
  // But note: we want to use the existing index.html as a template.

  // We'll read the index.html file and replace the helmet tags and the root div.

  // Since we are in the src directory, we can read the index.html from the public directory?
  // Actually, the index.html is in the root of the project.

  // We'll change strategy: we'll let Vite serve the index.html and then we'll inject the
  // helmet data and the initial data script.

  // But we are not in the Vite server yet. We are creating a custom server.

  // We'll read the index.html from the filesystem.

  const fs = await import('fs')
  const path = await import('path')
  const templatePath = path.resolve(process.cwd(), 'index.html')
  let template = await fs.promises.readFile(templatePath, 'utf-8')

  // Replace the helmet tags in the template
  const helmetString = `
    ${title.toString()}
    ${meta.toString()}
    ${link.toString()}
  `

  // Replace the placeholder for helmet (we'll add a placeholder in index.html later)
  // For now, we'll replace the entire head? That's too heavy.

  // Instead, we'll inject the helmet data into the head by replacing a comment.
  // We'll change the index.html to have a placeholder for helmet.

  // Since we are allowed to change index.html, we'll do that.

  // But note: the user hasn't forbidden changing index.html.

  // We'll add a comment in the head of index.html: <!-- helmet-placeholder -->

  // We'll do that later.

  // For now, we'll assume we have a way to inject.

  // We'll also inject the initial data script before the closing body.

  // We'll do:

  //   template = template.replace('<!-- helmet-placeholder -->', helmetString)
  //   template = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  //   template = template.replace('</body>', `<script>window.__INITIAL_DATA__=${JSON.stringify(
  //     initialData
  //   )}</script></body>`)

  // We'll implement that.

  // Replace helmet placeholder
  template = template.replace('<!-- helmet-placeholder -->', helmetString)

  // Replace the root div
  template = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

  // Inject initial data script before closing body
  template = template.replace('</body>', `<script>window.__INITIAL_DATA__=${JSON.stringify(
    initialData
  )}</script></body>`)

  return template
}