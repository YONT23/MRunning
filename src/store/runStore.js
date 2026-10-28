import AsyncStorage from '@react-native-async-storage/async-storage';

// El task de ubicación corre aunque la pantalla no esté montada, así que el
// estado se guarda en AsyncStorage y la pantalla lo lee al volver.
const POINTS_KEY = 'rbt_run_points';
const STATUS_KEY = 'rbt_run_status'; // 'idle' | 'running' | 'paused'
const STARTED_AT_KEY = 'rbt_started_at';
const PAUSED_ACCUM_KEY = 'rbt_paused_accum_ms';
const PAUSE_STARTED_AT_KEY = 'rbt_pause_started_at';

export async function appendPoint(point) {
  const existing = await getPoints();
  existing.push(point);
  await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(existing));
  return existing;
}

export async function getPoints() {
  const raw = await AsyncStorage.getItem(POINTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearPoints() {
  await AsyncStorage.removeItem(POINTS_KEY);
}

export async function setStatus(status) {
  await AsyncStorage.setItem(STATUS_KEY, status);
}

export async function getStatus() {
  const s = await AsyncStorage.getItem(STATUS_KEY);
  return s || 'idle';
}

// Cronómetro por reloj real: se guarda la hora de inicio y el tiempo total
// en pausas. Así el tiempo sigue corriendo aunque el sistema haya pausado la
// app con la pantalla bloqueada.
export async function startSessionClock() {
  await AsyncStorage.setItem(STARTED_AT_KEY, String(Date.now()));
  await AsyncStorage.setItem(PAUSED_ACCUM_KEY, '0');
  await AsyncStorage.removeItem(PAUSE_STARTED_AT_KEY);
}

export async function beginPause() {
  await AsyncStorage.setItem(PAUSE_STARTED_AT_KEY, String(Date.now()));
}

export async function endPause() {
  const pauseStartedRaw = await AsyncStorage.getItem(PAUSE_STARTED_AT_KEY);
  if (pauseStartedRaw) {
    const accumRaw = await AsyncStorage.getItem(PAUSED_ACCUM_KEY);
    const accum = accumRaw ? Number(accumRaw) : 0;
    await AsyncStorage.setItem(
      PAUSED_ACCUM_KEY,
      String(accum + (Date.now() - Number(pauseStartedRaw)))
    );
  }
  await AsyncStorage.removeItem(PAUSE_STARTED_AT_KEY);
}

export async function clearSessionClock() {
  await AsyncStorage.removeItem(STARTED_AT_KEY);
  await AsyncStorage.removeItem(PAUSED_ACCUM_KEY);
  await AsyncStorage.removeItem(PAUSE_STARTED_AT_KEY);
}

// Segundos reales transcurridos. Si está en pausa, no avanza.
export async function getElapsedSeconds() {
  const startedRaw = await AsyncStorage.getItem(STARTED_AT_KEY);
  if (!startedRaw) return 0;
  const accumRaw = await AsyncStorage.getItem(PAUSED_ACCUM_KEY);
  let pausedMs = accumRaw ? Number(accumRaw) : 0;
  const pauseStartedRaw = await AsyncStorage.getItem(PAUSE_STARTED_AT_KEY);
  if (pauseStartedRaw) {
    pausedMs += Date.now() - Number(pauseStartedRaw);
  }
  const elapsedMs = Date.now() - Number(startedRaw) - pausedMs;
  return Math.max(0, Math.floor(elapsedMs / 1000));
}

// Identificador para separar trayectos entre pausas.
const SEGMENT_KEY = 'mrunning_segment_id';

export async function beginNewSegment() {
  const current = Number(
    (await AsyncStorage.getItem(SEGMENT_KEY)) || '0'
  );

  const next = current + 1;

  await AsyncStorage.setItem(
    SEGMENT_KEY,
    String(next)
  );

  return next;
}

export async function getSegmentId() {
  return Number(
    (await AsyncStorage.getItem(SEGMENT_KEY)) || '0'
  );
}
