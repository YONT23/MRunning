import { walkSegments, smoothPoints } from './haversine';

// Parciales por kilómetro. El tiempo de cada cruce de km se interpola entre
// las dos lecturas que lo rodean. Si sobra un tramo final de 100 m o más, se
// agrega como parcial. Devuelve [{ km, seconds, partial, meters? }].
export function computeSplits(points) {
  const { segments } = walkSegments(points);
  if (segments.length === 0) return [];

  const splits = [];
  let cum = 0;
  let nextKm = 1000;
  let lastKmTime = segments[0].from.timestamp;

  for (const s of segments) {
    const segStart = cum;
    const segEnd = cum + s.dist;
    while (nextKm <= segEnd) {
      const frac = (nextKm - segStart) / s.dist;
      const t = s.from.timestamp + frac * (s.to.timestamp - s.from.timestamp);
      splits.push({ km: splits.length + 1, seconds: (t - lastKmTime) / 1000, partial: false });
      lastKmTime = t;
      nextKm += 1000;
    }
    cum = segEnd;
  }

  const remainder = cum - splits.length * 1000;
  if (remainder >= 100) {
    const endT = segments[segments.length - 1].to.timestamp;
    splits.push({
      km: splits.length + 1,
      seconds: (endT - lastKmTime) / 1000,
      partial: true,
      meters: remainder,
    });
  }
  return splits;
}

// Desnivel positivo acumulado (m). Aproximado: solo cuentan subidas mayores a
// 2 m entre lecturas, porque la altitud del GPS es ruidosa.
export function computeElevationGain(points) {
  const pts = smoothPoints(points).filter((p) => p.altitude != null);
  let gain = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i].altitude - pts[i - 1].altitude;
    if (d > 2) gain += d;
  }
  return Math.round(gain);
}

// Precisión media de las lecturas (m). Indica qué tan buena fue la señal.
export function averageAccuracy(points) {
  const vals = (points || []).map((p) => p.accuracy).filter((a) => a != null && a > 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

const SIMILAR_TOLERANCE = 0.1; // ±10% de distancia para "distancia similar"

function paceOf(entry) {
  return entry.elapsed / (entry.distance / 1000); // segundos por km
}

// Compara un recorrido con los anteriores del mismo tipo, por RITMO, para que
// carreras de distinta longitud se puedan juzgar. Valores positivos = mejora:
// paceImprovement > 0 es más rápido; timeSaved > 0 es tiempo ahorrado en la
// distancia de esta carrera.
export function compareRuns(current, history) {
  const curKm = current.distance / 1000;
  if (!curKm || !current.elapsed) return null;

  const paceNow = current.elapsed / curKm;
  const others = (history || []).filter(
    (e) =>
      e.id !== current.id &&
      e.activityType === current.activityType &&
      e.distance > 0 &&
      e.elapsed > 0
  );
  const timeSavedVs = (other) => paceOf(other) * curKm - current.elapsed;

  let vsLast = null;
  if (others.length > 0) {
    const o = others[0]; // historial del más reciente al más antiguo
    vsLast = {
      entry: o,
      paceBefore: paceOf(o),
      paceImprovement: paceOf(o) - paceNow,
      timeSaved: timeSavedVs(o),
    };
  }

  const similar = others.filter(
    (e) => Math.abs(e.distance / 1000 - curKm) / curKm <= SIMILAR_TOLERANCE
  );
  let bestEntry = null;
  for (const e of similar) {
    if (!bestEntry || paceOf(e) < paceOf(bestEntry)) bestEntry = e;
  }

  let best = null;
  if (bestEntry) {
    const bestPace = paceOf(bestEntry);
    best = {
      entry: bestEntry,
      pace: bestPace,
      paceImprovement: bestPace - paceNow,
      timeSaved: timeSavedVs(bestEntry),
      isNewRecord: paceNow < bestPace,
    };
  }

  return { paceNow, vsLast, best, similarCount: similar.length };
}
