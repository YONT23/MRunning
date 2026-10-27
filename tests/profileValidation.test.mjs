import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProfileDraft,
} from '../src/utils/profileValidation.js';

test('Normaliza nombre, peso y meta', () => {
  assert.deepEqual(
    normalizeProfileDraft(
      '  Ana   Ríos ',
      '67,5',
      '25'
    ),
    {
      name: 'Ana Ríos',
      weightKg: 67.5,
      goalKm: 25,
    }
  );
});

test('Permite nombre y peso vacíos', () => {
  assert.deepEqual(
    normalizeProfileDraft('', '', '10'),
    {
      name: '',
      weightKg: null,
      goalKm: 10,
    }
  );
});

test('Rechaza pesos inválidos', () => {
  assert.throws(() =>
    normalizeProfileDraft('Ana', '-2', '10')
  );

  assert.throws(() =>
    normalizeProfileDraft('Ana', 'abc', '10')
  );
});

test('Rechaza metas fuera de rango', () => {
  assert.throws(() =>
    normalizeProfileDraft('Ana', '', '0')
  );

  assert.throws(() =>
    normalizeProfileDraft('Ana', '', '501')
  );
});

test('Valida longitud máxima del nombre', () => {
  assert.throws(() =>
    normalizeProfileDraft(
      'a'.repeat(61),
      '',
      '25'
    )
  );
});
