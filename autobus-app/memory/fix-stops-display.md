---
name: fix-stops-display
description: Fixed React error #31 by mapping stop objects to city names before rendering in JSX
metadata:
  type: user
---

Fixed the following files to ensure intermediate stops (stops) are displayed as city strings instead of '[object Object]':

1. `autobus-app/src/components/TicketCard.jsx`:
   - Changed `const routeLine = [ticket.fromCity, ...(ticket.stops || []), ticket.toCity].join(' → ')` to `const routeLine = [ticket.fromCity, ...(ticket.stops?.map(s => s.city) || []), ticket.toCity].join(' → ')`

2. `autobus-app/src/pages/Booking.jsx`:
   - Changed the `allPoints` computation from `[selectedRoute.from, ...(selectedRoute.stops || []), selectedRoute.to]` to `[selectedRoute.from, ...(selectedRoute.stops?.map(s => s.city) || []), selectedRoute.to]` to ensure select options render city strings.

3. `autobus-app/src/pages/Routes.jsx` (previously fixed):
   - Line 32: `const allPoints = [route.from, ...(route.stops?.map(s => s.city) || []), route.to]`
   - Line 163: `{route.from} {route.stops?.length ? `→ ${route.stops.map(s => s.city).join(' → ')} →` : '→'} {route.to}`

4. `autobus-app/src/pages/Schedule.jsx` (previously fixed):
   - Line 182: `const allPoints = [route.from, ...(route.stops?.map(s => s.city) || []), route.to]`
   - Line 201: `const stopsText = route.stops?.map(s => s.city).join(' ') || ''`
   - Line 360: `{route?.from} {route?.stops?.length ? `→ ${route.stops.map(s => s.city).join(' → ')} →` : '→'} {route?.to}`

All changes ensure that only strings or numbers are passed as JSX children, eliminating React error #31. The data structure (array of objects with `city` and `km` properties) remains unchanged in state and API logic.