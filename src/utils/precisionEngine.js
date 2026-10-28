import { haversineDistance } from './haversine.js';

export const MAX_ACCURACY = 35;
export const MAX_GAP_MS = 12000;
export const MAX_RUNNING_SPEED = 10;

export function locationQuality(accuracy) {
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return 'desconocida';
  }

  if (accuracy <= 8) return 'excelente';
  if (accuracy <= 18) return 'buena';
  if (accuracy <= 35) return 'limitada';

  return 'deficiente';
}

export function auditRoute(points = []) {
  const input = Array.isArray(points) ? points : [];

  let rawMeters = 0;
  let acceptedMeters = 0;
  let gaps = 0;
  let badAccuracy = 0;
  let badTimestamp = 0;
  let rejectedSpeed = 0;

  let previous = null;
  const usable = [];

  for (const p of input) {
    if (
      !p ||
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      !Number.isFinite(p.timestamp) ||
      Math.abs(p.latitude) > 90 ||
      Math.abs(p.longitude) > 180
    ) continue;

    if (previous) {
      const dt = p.timestamp - previous.timestamp;

      if (
        dt > 0 &&
        dt <= MAX_GAP_MS &&
        p.segmentId === previous.segmentId
      ) {
        rawMeters += haversineDistance(previous, p);
      }
    }

    previous = p;

    if (
      !Number.isFinite(p.accuracy) ||
      p.accuracy <= 0 ||
      p.accuracy > MAX_ACCURACY
    ) {
      badAccuracy++;
      continue;
    }

    usable.push(p);
  }

  let anchor = null;

  for (const p of usable) {
    if (!anchor) {
      anchor = p;
      continue;
    }

    const dt = p.timestamp - anchor.timestamp;

    if (
      p.segmentId !== anchor.segmentId ||
      dt > MAX_GAP_MS
    ) {
      gaps++;
      anchor = p;
      continue;
    }

    if (dt <= 0) {
      badTimestamp++;
      continue;
    }

    const delta = haversineDistance(anchor, p);
    const speed = delta * 1000 / dt;

    if (
      speed > MAX_RUNNING_SPEED ||
      delta > 150
    ) {
      rejectedSpeed++;
      anchor = p;
      continue;
    }

    // Conservar el ancla ante movimientos mínimos.
    if (delta < 3) continue;

    acceptedMeters += delta;
    anchor = p;
  }

  return {
    rawMeters,
    acceptedMeters,
    totalPoints: input.length,
    validPoints: usable.length,
    badAccuracy,
    badTimestamp,
    rejectedSpeed,
    gaps,
    estimated: true,
  };
}
