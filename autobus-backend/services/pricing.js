// Pricing service for calculating segment-based prices
const MIN_FARE_RATIO = 0.3; // Minimum fare ratio to prevent very low prices for short segments

/**
 * Compute the price for a segment of a trip based on distance.
 * @param {Object} params - The parameters for price calculation
 * @param {Object} params.route - The route object from the database
 * @param {Object} params.trip - The trip object from the database
 * @param {string} params.boardingPoint - The city where the passenger boards
 * @param {string} params.alightingPoint - The city where the passenger alights
 * @returns {number} The price for the segment (in UAH), rounded to the nearest integer
 */
function computeSegmentPrice({ route, trip, boardingPoint, alightingPoint }) {
  // If boardingPoint or alightingPoint are not provided, it's a full route booking
  if (!boardingPoint || !alightingPoint) {
    return trip.price;
  }

  // Build an ordered list of points with accumulated distance
  // Format: [{city: string, km: number}]
  const points = [];

  // Starting point: from_city with km = 0
  points.push({ city: route.from_city, km: 0 });

  // Add intermediate stops if they have km values
  let stops = [];
  try {
    stops = JSON.parse(route.stops);
  } catch (e) {
    // If parsing fails, treat as empty array
    stops = [];
  }

  // If stops are objects with city and km, we add them in order
  // We assume they are already sorted by km (as they should be)
  if (Array.isArray(stops) && stops.length > 0 && typeof stops[0] === 'object' && stops[0].hasOwnProperty('city')) {
    stops.forEach(stop => {
      // Only add if km is a number (not null)
      if (typeof stop.km === 'number') {
        points.push({ city: stop.city, km: stop.km });
      }
    });
  }

  // Ending point: to_city with km = distance_km (if available)
  if (typeof route.distance_km === 'number') {
    points.push({ city: route.to_city, km: route.distance_km });
  } else {
    // If distance_km is not set, we cannot calculate proportional price
    // Fall back to full price
    return trip.price;
  }

  // Find the indices of boardingPoint and alightingPoint in the points array
  const boardingIndex = points.findIndex(p => p.city === boardingPoint);
  const alightingIndex = points.findIndex(p => p.city === alightingPoint);

  // Validate that both points exist and boarding is before alighting
  if (boardingIndex === -1 || alightingIndex === -1 || boardingIndex >= alightingIndex) {
    // Invalid points or order - fall back to full price
    return trip.price;
  }

  // Calculate the segment distance and total distance
  const segmentKm = points[alightingIndex].km - points[boardingIndex].km;
  const totalKm = points[points.length - 1].km; // Last point's km is the total distance

  // If totalKm is zero (should not happen) or segmentKm is zero, fall back to full price
  if (totalKm <= 0 || segmentKm <= 0) {
    return trip.price;
  }

  // Calculate the raw price proportional to distance
  let rawPrice = trip.price * (segmentKm / totalKm);

  // Apply the minimum fare ratio to prevent too low prices
  const minPrice = trip.price * MIN_FARE_RATIO;
  if (rawPrice < minPrice) {
    rawPrice = minPrice;
  }

  // Round to the nearest integer (since we deal with whole UAH)
  return Math.round(rawPrice);
}

module.exports = { computeSegmentPrice };