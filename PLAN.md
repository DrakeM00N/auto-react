# Plan for implementing proportional pricing based on segments

## Files to change:

### Backend (autobus-backend):

1. `db.js` - Add new columns and migrate data:
   - Add `distance_km REAL` to `routes` table (nullable)
   - Migrate existing `stops` from string array to object array with `{city, km}` (km nullable for existing stops)
   - Add `amount REAL` to `pending_bookings` table
   - Add `amount REAL` to `bookings` table

2. `services/pricing.js` - New file:
   - Function `computeSegmentPrice({ route, trip, boardingPoint, alightingPoint })`
   - Implements the logic described in the task

3. `services/payments.js` - Modify POST `/create`:
   - Use `computeSegmentPrice` to determine `amountUah`
   - Save the amount in `pending_bookings.amount` during INSERT

4. `services/ticketing.js` - Modify `issueTicket` and related functions:
   - Transfer `amount` from `pending_bookings` to `bookings.amount` on ticket issuance
   - Use `bookings.amount` for display (ticket, email, success page, profile) with fallback to `trip.price`

5. `routes/routes.js`:
   - Update validation schema for `stops` to array of objects `{city: string, km: number}`
   - Add `distance_km` as optional number in validation
   - Ensure GET `/api/routes` returns new fields while maintaining backward compatibility

### Frontend (autobus-app):

6. `src/context/DataContext.jsx` - Update `normalizeStops`:
   - Handle both old string array and new object array formats
   - Convert string array to object array with `km: null` for each stop

7. `src/components/Admin.jsx` - Update stops input:
   - Replace single text field with dynamic fields (city + km) for each stop using useFieldArray
   - Add separate numeric field for `distance_km`
   - Add explanatory text about fallback to full price

8. `src/pages/Routes.jsx`, `src/pages/Schedule.jsx`, `src/pages/Home.jsx` - Update display:
   - Change `route.stops.join(' → ')` to `route.stops.map(s => s.city).join(' → ')`

9. `src/pages/Booking.jsx` - Update boarding/alighting points and price preview:
   - Build `allPoints` as array of objects with city and km (from, stops with km, to)
   - Keep boardingPoint/alightingPoint as city names for dropdowns (for compatibility)
   - Add live price preview using same formula as backend (for UX only)

## Notes:
- All changes should be made in a separate git branch.
- We will not modify: `services/seats.js`, QR generation, authentication, or unrelated routes.
- After implementation, we will test locally with a full scenario.