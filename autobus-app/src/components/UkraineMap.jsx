// Decorative SVG background map of Ukraine for the footer.
//
// Data sources:
// - Boundary: hand-curated simplified polygon (~43 vertices) coarsened from
//   the publicly-known Ukrainian state border. Accurate enough to be
//   recognisable, lean enough to ship as inline data. Lat/lng pairs only —
//   the same projection turns these into both the outline and the city
//   markers, so they always line up.
// - City coordinates: standard widely-known lat/lng values (Kyiv 50.45/30.52,
//   Lviv 49.84/24.03, Kharkiv 49.99/36.23, etc. — Wikipedia / GeoNames
//   conventional values).
// - Routes: hub-and-spoke from Kyiv plus a handful of inter-regional pairs,
//   matching the kind of inter-city demand the app actually serves.
//   Hardcoded (not derived from DataContext) so the footer stays static and
//   independent of the routes API.

// Pairs are [lat, lng]. Clockwise from the northwest.
const UKRAINE_BORDER = [
  // Northern (Polish + Belarus) border, west → east
  [51.5, 23.6], [51.7, 24.4], [52.0, 25.2], [52.1, 27.1],
  [51.7, 28.5], [51.4, 30.4], [52.4, 31.7],
  // Eastern (Russian) border, north → south
  [52.1, 32.7], [51.5, 34.1], [50.5, 35.3], [50.0, 36.4],
  [49.9, 37.6], [49.5, 38.4], [49.2, 39.1], [48.4, 39.7],
  [47.8, 39.4], [47.1, 38.4],
  // Sea of Azov shore
  [47.0, 37.6], [46.7, 36.8], [46.3, 35.4], [46.0, 34.7],
  // Crimean peninsula (Ukraine's claimed border)
  [45.5, 36.6], [45.0, 35.2], [44.4, 33.5],
  [45.2, 32.7], [45.9, 33.7],
  // Crimean isthmus back to mainland, then west along Black Sea
  [46.2, 33.5], [46.7, 32.6], [46.6, 31.5], [46.4, 30.7],
  [45.7, 30.0], [45.5, 28.6],
  // Romania / Moldova / Hungary / Slovakia border, south → north
  [46.6, 27.8], [48.0, 26.8], [47.8, 25.0], [47.9, 23.7],
  [48.0, 22.6], [48.6, 22.1], [49.0, 22.4],
  // Polish border, south → north (close to start)
  [49.5, 22.6], [50.0, 23.0], [50.6, 23.2], [51.0, 23.5],
]

const CITIES = [
  { name: 'Київ',          lat: 50.45, lng: 30.52, hub: true },
  { name: 'Львів',         lat: 49.84, lng: 24.03 },
  { name: 'Харків',        lat: 49.99, lng: 36.23 },
  { name: 'Одеса',         lat: 46.48, lng: 30.73 },
  { name: 'Дніпро',        lat: 48.46, lng: 35.04 },
  { name: 'Запоріжжя',     lat: 47.84, lng: 35.14 },
  { name: 'Кременчук',     lat: 49.07, lng: 33.42 },
  { name: 'Полтава',       lat: 49.59, lng: 34.55 },
  { name: 'Вінниця',       lat: 49.23, lng: 28.48 },
  { name: 'Кропивницький', lat: 48.51, lng: 32.27 },
  { name: 'Чернівці',      lat: 48.29, lng: 25.94 },
]

const ROUTES = [
  ['Київ', 'Львів'],
  ['Київ', 'Харків'],
  ['Київ', 'Одеса'],
  ['Київ', 'Дніпро'],
  ['Київ', 'Полтава'],
  ['Київ', 'Вінниця'],
  ['Київ', 'Кременчук'],
  ['Львів', 'Чернівці'],
  ['Львів', 'Вінниця'],
  ['Дніпро', 'Запоріжжя'],
  ['Харків', 'Полтава'],
  ['Одеса', 'Кропивницький'],
]

// Projection. Plain equirectangular into an aspect-corrected viewBox: the
// viewBox height is sized so the country isn't horizontally stretched at
// mid-latitude. At Ukraine's scale this looks ~indistinguishable from a
// proper Mercator/Lambert without dragging in d3-geo or a 50KB topojson.
const MIN_LNG = 22, MAX_LNG = 40.5
const MIN_LAT = 44, MAX_LAT = 52.5
const VB_W = 800
const VB_H = Math.round(
  VB_W * (MAX_LAT - MIN_LAT) /
    ((MAX_LNG - MIN_LNG) * Math.cos(((MIN_LAT + MAX_LAT) / 2) * Math.PI / 180))
)

function project(lat, lng) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * VB_W
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * VB_H
  return [x, y]
}

// Precompute all the geometry at module load — no per-render work.
const outlineD =
  'M ' +
  UKRAINE_BORDER.map(([lat, lng]) =>
    project(lat, lng).map(n => n.toFixed(1)).join(' ')
  ).join(' L ') +
  ' Z'

const cityXY = Object.fromEntries(
  CITIES.map(c => [c.name, project(c.lat, c.lng)])
)

const projectedRoutes = ROUTES
  .map(([a, b]) => ({ a, b, A: cityXY[a], B: cityXY[b] }))
  .filter(r => r.A && r.B)

function UkraineMap() {
  return (
    <div className="uk-map" aria-hidden="true">
      <svg
        className="uk-map__svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path className="uk-map__outline" d={outlineD} />

        {projectedRoutes.map(({ a, b, A, B }, i) => (
          <line
            key={`${a}-${b}`}
            className="uk-map__route"
            x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]}
            // --i staggers the dash-flow animation across the route lines
            // so they don't all crest at the same instant.
            style={{ '--i': i }}
          />
        ))}

        {CITIES.map(c => {
          const [x, y] = cityXY[c.name]
          return (
            <g key={c.name}>
              {c.hub && (
                <circle
                  className="uk-map__halo"
                  cx={x} cy={y} r={4}
                  // transform-origin in SVG user units — keeps the pulse
                  // centred on the city dot.
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />
              )}
              <circle
                className={`uk-map__city${c.hub ? ' uk-map__city--hub' : ''}`}
                cx={x} cy={y}
                r={c.hub ? 3.5 : 2.5}
              />
              <text className="uk-map__label" x={x + 6} y={y - 6}>
                {c.name}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="uk-map__scrim" />
    </div>
  )
}

export default UkraineMap
