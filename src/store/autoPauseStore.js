import AsyncStorage from '@react-native-async-storage/async-storage';

import { getTrainingPrefs } from './trainingPrefs';

import {
  getStatus,
  setStatus,
  beginPause,
  endPause,
  beginNewSegment,
} from './runStore';

const KEY = 'mrunning_auto_pause_candidate';

export async function clearAutoPauseCandidate() {
  await AsyncStorage.removeItem(KEY);
}

// Se usa velocidad GNSS y precisión confiable.
// Si no existen datos suficientes, no se activa
// una pausa automática.
export async function evaluateAutoPause(location) {
  const status = await getStatus();

  if (
    status !== 'running' &&
    status !== 'auto-paused'
  ) {
    return status;
  }

  const prefs = await getTrainingPrefs();

  if (!prefs.autoPause) return status;

  const c = location && location.coords;

  if (
    !c ||
    !Number.isFinite(c.speed) ||
    c.speed < 0 ||
    !Number.isFinite(c.accuracy) ||
    c.accuracy > 18 ||
    !Number.isFinite(location.timestamp)
  ) {
    await clearAutoPauseCandidate();
    return status;
  }

  const raw = await AsyncStorage.getItem(KEY);
  let candidate = raw ? JSON.parse(raw) : null;

  const moving = status === 'auto-paused'
    ? c.speed >= 1.5
    : c.speed > 0.65;

  const type = moving ? 'moving' : 'still';

  if (
    !candidate ||
    candidate.type !== type ||
    location.timestamp < candidate.start ||
    location.timestamp - candidate.last > 12000
  ) {
    candidate = {
      type,
      start: location.timestamp,
      last: location.timestamp,
    };
  } else {
    candidate.last = location.timestamp;
  }

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(candidate)
  );

  const duration = location.timestamp - candidate.start;

  // Detenido durante al menos 12 segundos.
  if (
    status === 'running' &&
    type === 'still' &&
    duration >= 12000
  ) {
    await beginPause();
    await setStatus('auto-paused');
    await clearAutoPauseCandidate();

    return 'auto-paused';
  }

  // Movimiento consistente durante al menos 4 segundos.
  if (
    status === 'auto-paused' &&
    type === 'moving' &&
    duration >= 4000
  ) {
    await beginNewSegment();
    await endPause();
    await setStatus('running');
    await clearAutoPauseCandidate();

    return 'running';
  }

  return status;
}
