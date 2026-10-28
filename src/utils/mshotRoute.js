const RAD = Math.PI / 180;
const EARTH = 6371000;

function number(value) {
  return Number(value);
}

function normalizePoint(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const point =
    input.coords &&
    typeof input.coords === 'object'
      ? {...input, ...input.coords}
      : input;

  const latitude = number(point.latitude);
  const longitude = number(point.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  const timestamp = number(input.timestamp);
  const accuracy = number(point.accuracy);

  return {
    latitude,
    longitude,
    timestamp:
      input.timestamp != null &&
      Number.isFinite(timestamp)
        ? timestamp
        : null,
    accuracy:
      point.accuracy != null &&
      Number.isFinite(accuracy)
        ? accuracy
        : null,
    segmentId:
      input.segmentId ?? input.segment ?? null,
  };
}

function meters(a, b) {
  const dLat =
    (b.latitude - a.latitude) * RAD;

  const dLon =
    (b.longitude - a.longitude) * RAD;

  const lat1 = a.latitude * RAD;
  const lat2 = b.latitude * RAD;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    EARTH *
    Math.asin(Math.min(1, Math.sqrt(h)))
  );
}

export function routeGeometry(
  input,
  width = 900,
  height = 960
) {
  const points = (
    Array.isArray(input) ? input : []
  )
    .map(normalizePoint)
    .filter(Boolean);

  if (!points.length) {
    return {
      paths: [],
      start: null,
      end: null,
      count: 0,
      simplified: false,
    };
  }

  const origin = points[0];

  const meanLat =
    points.reduce(
      (sum, p) => sum + p.latitude,
      0
    ) / points.length;

  const cosLat = Math.max(
    0.001,
    Math.abs(Math.cos(meanLat * RAD))
  );

  const projected = points.map(p => ({
    x:
      (p.longitude - origin.longitude) *
      RAD *
      EARTH *
      cosLat,
    y:
      -(p.latitude - origin.latitude) *
      RAD *
      EARTH,
    source: p,
  }));

  const xs = projected.map(p => p.x);
  const ys = projected.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX;
  const spanY = maxY - minY;

  const padding = Math.min(
    width,
    height
  ) * 0.09;

  const availableWidth =
    Math.max(1, width - padding * 2);

  const availableHeight =
    Math.max(1, height - padding * 2);

  const scale = Math.min(
    availableWidth / Math.max(spanX, 1),
    availableHeight / Math.max(spanY, 1)
  );

  const drawnWidth = spanX * scale;
  const drawnHeight = spanY * scale;

  const offsetX =
    (width - drawnWidth) / 2;

  const offsetY =
    (height - drawnHeight) / 2;

  const toCanvas = p => ({
    x:
      offsetX +
      (p.x - minX) * scale,
    y:
      offsetY +
      (p.y - minY) * scale,
  });

  const paths = [];
  let current = [];

  projected.forEach((item, index) => {
    const previous = projected[index - 1];

    if (previous) {
      const a = previous.source;
      const b = item.source;

      const distance = meters(a, b);

      const hasTime =
        a.timestamp != null &&
        b.timestamp != null;

      const seconds = hasTime
        ? (b.timestamp - a.timestamp) / 1000
        : null;

      let disconnected = false;

      if (
        a.segmentId != null &&
        b.segmentId != null &&
        a.segmentId !== b.segmentId
      ) {
        disconnected = true;
      }

      if (
        seconds != null &&
        (seconds <= 0 || seconds > 45)
      ) {
        disconnected = true;
      }

      if (
        seconds != null &&
        seconds > 0 &&
        distance / seconds > 12
      ) {
        disconnected = true;
      }

      if (
        seconds == null &&
        distance > 200
      ) {
        disconnected = true;
      }

      if (
        b.accuracy != null &&
        b.accuracy > 75
      ) {
        disconnected = true;
      }

      if (disconnected) {
        if (current.length >= 2) {
          paths.push(current);
        }

        current = [];
      }
    }

    current.push(toCanvas(item));
  });

  if (current.length >= 2) {
    paths.push(current);
  }

  return {
    paths,
    start: toCanvas(projected[0]),
    end: toCanvas(
      projected[projected.length - 1]
    ),
    count: points.length,
    simplified: false,
  };
}
