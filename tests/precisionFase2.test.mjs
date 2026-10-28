import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditRoute,
  locationQuality,
} from '../src/utils/precisionEngine.js';

const p = (
  lat,
  at,
  segmentId=1,
  accuracy=5
) => ({
  latitude:lat,
  longitude:0,
  timestamp:at,
  segmentId,
  accuracy,
});

test('Tramo plausible', () => {
  const report = auditRoute([
    p(0,0),
    p(0.00008,1000),
    p(0.00016,2000),
  ]);

  assert.ok(
    report.acceptedMeters > 16 &&
    report.acceptedMeters < 19
  );
});

test('No conecta dos segmentos separados', () => {
  const report = auditRoute([
    p(0,0),
    p(0.00009,1000),
    p(0.01,2000,2),
    p(0.01009,3000,2),
  ]);

  assert.ok(report.acceptedMeters < 30);
  assert.ok(report.gaps >= 1);
});

test('Detecta lecturas malas', () => {
  const report = auditRoute([
    p(0,0),
    p(0.00009,1000,1,200),
    p(0.01,2000),
    p(0.01009,3000),
  ]);

  assert.equal(report.badAccuracy,1);
  assert.ok(report.rejectedSpeed >= 1);
});

test('Clasifica calidad GPS', () => {
  assert.equal(
    locationQuality(6),
    'excelente'
  );

  assert.equal(
    locationQuality(40),
    'deficiente'
  );
});
