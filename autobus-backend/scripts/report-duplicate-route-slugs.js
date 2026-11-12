require('dotenv').config({ path: require('node:path').resolve(__dirname, '..', '.env'), quiet: true })

const path = require('node:path')
const { pathToFileURL } = require('node:url')

const backendDir = path.resolve(__dirname, '..')
const appLib = path.resolve(backendDir, '..', 'autobus-app', 'src', 'lib')
const apiBase = (
  process.env.ROUTE_REPORT_API_URL ||
  process.env.VITE_API_URL ||
  'https://autobus-backend.onrender.com/api'
).replace(/\/+$/, '')

async function fetchList(endpoint) {
  const response = await fetch(`${apiBase}/${endpoint}`, {
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) {
    throw new Error(`${apiBase}/${endpoint} returned HTTP ${response.status}`)
  }
  const rows = await response.json()
  if (!Array.isArray(rows)) {
    throw new Error(`${apiBase}/${endpoint} did not return a JSON array`)
  }
  return rows
}

async function main() {
  const [{ selectRoutesBySlug }, routes, trips] = await Promise.all([
    import(pathToFileURL(path.join(appLib, 'routeSelection.js'))),
    fetchList('routes'),
    fetchList('trips'),
  ])

  const selection = selectRoutesBySlug(routes, trips)
  console.log(`Read-only API: ${apiBase}`)
  console.log(`Всего маршрутов: ${routes.length}`)
  console.log(`Уникальных slug: ${selection.routes.length}`)
  console.log(`Групп дублей: ${selection.duplicates.length}`)

  if (!selection.duplicates.length) {
    console.log('Дублирующихся slug нет.')
    return
  }

  console.log('\nДубли (будущие рейсы по Europe/Kyiv, только SELECT):')
  for (const duplicate of selection.duplicates) {
    const members = [
      duplicate.selected,
      ...duplicate.skipped,
    ].sort((a, b) => Number(a.route.id) - Number(b.route.id))
    const counts = members
      .map(item => `id ${item.route.id}: ${item.futureTrips}`)
      .join('; ')
    console.log(
      `${duplicate.routeUrl} | выбран id ${duplicate.selected.route.id} ` +
      `(${duplicate.selected.futureTrips} рейсов) | ${counts}`,
    )
  }
}

main()
  .catch(error => {
    console.error(`Не удалось сформировать read-only отчёт: ${error.message}`)
    process.exitCode = 1
  })
