export function formatShort(totalMinutes) {
  const totalSeconds = Math.round((totalMinutes || 0) * 60);
  if (totalSeconds === 0) return "0m";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export function endTime(startedAt, durationMinutes) {
  return new Date(
    new Date(startedAt).getTime() + (durationMinutes || 0) * 60000,
  );
}
