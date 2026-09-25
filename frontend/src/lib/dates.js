export function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addISODate(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localISODate(date);
}

export function choreTimeLabel(time) {
  if (!time) return '';
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

export function choreTimeRange(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) return '';
  const [hours, minutes] = startTime.slice(0, 5).split(':').map(Number);
  const end = hours * 60 + minutes + Number(durationMinutes);
  return `${choreTimeLabel(startTime)} – ${choreTimeLabel(`${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`)}`;
}
