import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validatePlan,
  trainingProgress,
} from '../src/utils/trainingPlan.js';

test('Objetivo 5K', () => {
  const plan = validatePlan({
    kind:'distance',
    meters:5000,
  });

  assert.equal(
    trainingProgress(plan,1500,4999).complete,
    false
  );

  assert.equal(
    trainingProgress(plan,1500,5000).complete,
    true
  );
});

test('Intervalos', () => {
  const plan = {
    kind:'intervals',
    sets:3,
    warmup:300,
    work:120,
    recovery:60,
    cooldown:180,
  };

  assert.equal(
    trainingProgress(plan,250,0).stage,
    'warmup'
  );

  assert.equal(
    trainingProgress(plan,320,0).stage,
    'work-0'
  );

  assert.equal(
    trainingProgress(plan,430,0).stage,
    'recovery-0'
  );

  assert.equal(
    trainingProgress(plan,960,0).complete,
    true
  );
});

test('Tiempo y ritmo', () => {
  assert.equal(
    trainingProgress({
      kind:'time',
      seconds:1800,
    },1800,0).complete,
    true
  );

  assert.throws(() =>
    validatePlan({
      kind:'pace',
      paceSeconds:0,
    })
  );
});
