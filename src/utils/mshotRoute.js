const RAD = Math.PI / 180;
const EARTH_RADIUS = 6371000;

function valid(point) {
  return (
    point &&
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude)) &&
    Math.abs(Number(point.latitude)) <= 90 &&
    Math.abs(Number(point.longitude)) <= 180
  );
}

function distanceMeters(a, b) {
  const lat1 = Number(a.latitude) * RAD;
  const lat2 = Number(b.latitude) * RAD;

  const dLat = lat2 - lat1;
  const dLon =
    (Number(b.longitude) - Number(a.longitude)) * RAD;

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS *
    Math.asin(Math.min(1, Math.sqrt(value)))
  );
}

export function routeGeometry(
  points,
  width = 900,
  height = 960
) {
  const raw = (Array.isArray(points) ? points : [])
    .filter(valid);

  if (!raw.length) {
    return {
      paths: [],
      start: null,
      end: null,
      count: 0,
    };
  }

  const meanLat =
    raw.reduce(
      (sum, point) => sum + Number(point.latitude),
      0
    ) / raw.length;

  const factor = Math.max(
    0.01,
    Math.cos(meanLat * RAD)
  );

  const originLat = Number(raw[0].latitude);
  const originLon = Number(raw[0].longitude);

  const coordinates = raw.map(point => ({
    x:
      (Number(point.longitude) - originLon) *
      factor *
      111320,
    y:
      -(Number(point.latitude) - originLat) *
      111320,
    point,
  }));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  coordinates.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  const padding = 80;

  const scale = Math.min(
    (width - padding) / Math.max(10, rangeX),
    (height - padding) / Math.max(10, rangeY)
  );

  const offsetX = (width - rangeX * scale) / 2;
  const offsetY = (height - rangeY * scale) / 2;

  const project = point => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  });

  const paths = [];
  let current = [];

  coordinates.forEach((item, index) => {
    const previous = coordinates[index - 1];
    let connected = true;

    if (previous) {
      const a = previous.point;
      const b = item.point;

      const dt =
        (Number(b.timestamp) - Number(a.timestamp)) /
        1000;

      const distance = distanceMeters(a, b);

      if (
        a.segmentId != null &&
        b.segmentId != null &&
        a.segmentId !== b.segmentId
      ) {
        connected = false;
      }

      if (
        Number.isFinite(dt) &&
        (dt <= 0 || dt > 30)
      ) {
        connected = false;
      }

      if (distance > 150) {
        connected = false;
      }

      if (
        Number.isFinite(dt) &&
        dt > 0 &&
        distance / dt > 10
      ) {
        connected = false;
      }

      if (
        b.accuracy != null &&
        Number(b.accuracy) > 50
      ) {
        connected = false;
      }
    }

    if (!connected && current.length) {
      paths.push(current);
      current = [];
    }

    current.push(project(item));
  });

  if (current.length) {
    paths.push(current);
  }

  return {
    paths: paths.filter(path => path.length >= 2),
    start: project(coordinates[0]),
    end: project(coordinates[coordinates.length - 1]),
    count: raw.length,
  };
}
