// Distancia en metros entre dos coordenadas (fórmula de Haversine).
export function haversineDistance(coord1, coord2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


// MPrecision: segmentación conservadora.
// No se unen intervalos largos ni segmentos de pausa.
const MAX_ACCEPTED_ACCURACY_M = 35;

export function isValidPoint(p) {
  return p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    Number.isFinite(p.timestamp) &&
    Number.isFinite(p.accuracy) &&
    p.accuracy > 0 &&
    p.accuracy <= MAX_ACCEPTED_ACCURACY_M;
}

export function smoothPoints(points) {
  // No alterar coordenadas originales mediante
  // medianas que podrían recortar curvas reales.
  return (points || []).filter(isValidPoint);
}

export function walkSegments(points) {
  const total = Array.isArray(points)
    ? points.length
    : 0;

  const pts = smoothPoints(points);
  const segments = [];

  let rejectedSpeedSegments = 0;
  let rejectedSpeedMeters = 0;
  let rejectedGapSegments = 0;
  let anchor = null;

  for (const p of pts) {
    if (!anchor) {
      anchor = p;
      continue;
    }

    const dt = (p.timestamp - anchor.timestamp) / 1000;

    if (
      p.segmentId !== anchor.segmentId ||
      dt > 12
    ) {
      rejectedGapSegments++;
      anchor = p;
      continue;
    }

    if (dt <= 0) continue;

    const dist = haversineDistance(anchor, p);

    if (
      dist / dt > 10 ||
      dist > 150
    ) {
      rejectedSpeedSegments++;
      rejectedSpeedMeters += dist;
      anchor = p;
      continue;
    }

    if (dist < 3) continue;

    segments.push({
      from: anchor,
      to: p,
      dist,
      dt,
    });

    anchor = p;
  }

  return {
    segments,
    total,
    rejectedAccuracy: total - pts.length,
    rejectedSpeedSegments,
    rejectedSpeedMeters,
    rejectedGapSegments,
  };
}

export function computeDistanceWithStats(points) {
  const w = walkSegments(points);
  return {
    totalMeters: w.segments.reduce((sum, s) => sum + s.dist, 0),
    totalPoints: w.total,
    rejectedAccuracy: w.rejectedAccuracy,
    rejectedSpeedSegments: w.rejectedSpeedSegments,
    rejectedSpeedMeters: w.rejectedSpeedMeters,
    rejectedGapSegments: w.rejectedGapSegments,
    usedSegments: w.segments.length,
  };
}

export function computeTotalDistance(points) {
  return computeDistanceWithStats(points).totalMeters;
}

export function formatDistance(meters) {
  return (meters / 1000).toFixed(2);
}

export function formatDuration(totalSeconds) {
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Ritmo en min/km a partir de metros y segundos.
export function formatPace(meters, seconds) {
  if (!meters || !seconds || meters <= 0 || seconds <= 0) return '--:--';
  const paceTotal = Math.round(seconds / (meters / 1000));
  const min = Math.floor(paceTotal / 60);
  const sec = paceTotal % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}
