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

// Precisión máxima aceptada (m) reportada por el GPS.
const MAX_ACCEPTED_ACCURACY_M = 30;
// Velocidad máxima plausible entre lecturas (m/s). 10 m/s ≈ 2:47 min/km.
const MAX_PLAUSIBLE_SPEED_MS = 10;
// Salto máximo permitido dentro de un solo tramo (m).
const MAX_SEGMENT_METERS = 150;

export function isValidPoint(point) {
  return point.accuracy == null || point.accuracy <= MAX_ACCEPTED_ACCURACY_M;
}

function median3(a, b, c) {
  return a + b + c - Math.max(a, b, c) - Math.min(a, b, c);
}

// Filtro anti-picos: quita lecturas con precisión mala y suaviza cada
// posición con la mediana de sus vecinas. Un rebote aislado del GPS
// desaparece en vez de sumar distancia de ida y vuelta.
export function smoothPoints(points) {
  const valid = (points || []).filter((p) => isValidPoint(p));
  if (valid.length < 3) return valid;
  const out = [valid[0]];
  for (let i = 1; i < valid.length - 1; i++) {
    const prev = valid[i - 1];
    const cur = valid[i];
    const next = valid[i + 1];
    out.push({
      ...cur,
      latitude: median3(prev.latitude, cur.latitude, next.latitude),
      longitude: median3(prev.longitude, cur.longitude, next.longitude),
    });
  }
  out.push(valid[valid.length - 1]);
  return out;
}

// Separa los tramos aceptados de los descartados. Es la única fuente de
// verdad para la distancia, así todo sale consistente.
export function walkSegments(points) {
  const total = points ? points.length : 0;
  const pts = smoothPoints(points);
  const segments = [];
  let rejectedSpeedSegments = 0;
  let rejectedSpeedMeters = 0;
  let last = null;

  for (const p of pts) {
    if (!last) {
      last = p;
      continue;
    }
    const dist = haversineDistance(last, p);
    const dt = (p.timestamp - last.timestamp) / 1000;
    if (dt > 0) {
      const speed = dist / dt;
      if (speed <= MAX_PLAUSIBLE_SPEED_MS && dist <= MAX_SEGMENT_METERS) {
        segments.push({ from: last, to: p, dist, dt });
      } else {
        rejectedSpeedSegments++;
        rejectedSpeedMeters += dist;
      }
    }
    last = p;
  }

  return {
    segments,
    total,
    rejectedAccuracy: total - pts.length,
    rejectedSpeedSegments,
    rejectedSpeedMeters,
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
