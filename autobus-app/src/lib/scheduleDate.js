export function getScheduleDate(searchParams, today) {
  return searchParams.has('date') ? searchParams.get('date') : today
}
