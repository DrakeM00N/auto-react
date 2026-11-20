// Normalize a trip coming back from the backend — defensively fill in the
// extended fields with empty values so consumers can always rely on the
// shape even on rows added before the busfor-style migration.
export function mapTrip(raw) {
  return {
    id: raw.id,
    routeId: raw.routeId,
    date: raw.date,
    time: raw.time,
    arrivalDate: raw.arrivalDate || '',
    arrivalTime: raw.arrivalTime || '',
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
    stopsTimeline: Array.isArray(raw.stopsTimeline) ? raw.stopsTimeline : [],
  }
}
