const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const localDay = d =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const dateKey = d =>
  `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;

export function calculateHomeStats(history, now = new Date()) {
  const today = localDay(now);
  const monday = localDay(now);

  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7)
  );

  const sundayEnd = new Date(monday);
  sundayEnd.setDate(sundayEnd.getDate() + 7);

  const weekdays = labels.map(label => ({
    label,
    meters: 0,
    count: 0,
  }));

  const entries = (Array.isArray(history) ? history : [])
    .map(entry => ({
      entry,
      date: new Date(entry?.date),
    }))
    .filter(({ entry, date }) =>
      entry &&
      Number.isFinite(entry.distance) &&
      entry.distance > 0 &&
      Number.isFinite(entry.elapsed) &&
      entry.elapsed > 0 &&
      Number.isFinite(date.getTime()) &&
      date <= now
    )
    .sort((a, b) => b.date - a.date);

  let weekMeters = 0;
  let weekSeconds = 0;
  let weekCount = 0;

  const days = new Set();

  for (const { entry, date } of entries) {
    days.add(dateKey(date));

    if (date >= monday && date < sundayEnd) {
      weekMeters += entry.distance;
      weekSeconds += entry.elapsed;
      weekCount++;

      const index = (date.getDay() + 6) % 7;
      weekdays[index].meters += entry.distance;
      weekdays[index].count++;
    }
  }

  let streakDays = 0;
  const cursor = new Date(today);

  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(dateKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    weekMeters,
    weekSeconds,
    weekCount,
    weekdays,
    streakDays,
    lastActivity: entries[0]?.entry || null,
  };
}
