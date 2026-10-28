import AsyncStorage from '@react-native-async-storage/async-storage';
import { smoothPoints } from '../utils/haversine';
import * as FileSystem from 'expo-file-system';
import { computeSplits, computeElevationGain, averageAccuracy } from '../utils/analysis';

const HISTORY_KEY = 'rbt_run_history';
const MAX_ENTRIES = 100;
const MAX_ROUTE_POINTS = 60;

function downsample(points, max) {
  if (!points || points.length <= max) return points || [];
  const step = points.length / max;
  const result = [];
  for (let i = 0; i < max; i++) {
    result.push(points[Math.floor(i * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
}

export async function getHistory() {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Guarda un recorrido terminado con sus parciales, desnivel y precisión GPS.
export async function addRun({ distance, elapsed, activityType, points, trainingPlan=null, precision=null }) {
  const history = await getHistory();
  const entry = {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    distance, // metros
    elapsed, // segundos
    activityType,
    trainingPlan,
    precision,
    routePreview: downsample(smoothPoints(points), MAX_ROUTE_POINTS),
    splits: computeSplits(points),
    elevationGain: computeElevationGain(points),
    avgAccuracy: averageAccuracy(points),
  };
  // Guardar las coordenadas completas para auditoría.
  try {
    const dir = FileSystem.documentDirectory +
      'mrunning-tracks/';

    await FileSystem.makeDirectoryAsync(
      dir,
      { intermediates: true }
    );

    const file = dir + entry.id + '.json';

    await FileSystem.writeAsStringAsync(
      file,
      JSON.stringify(points)
    );

    entry.rawTrackUri = file;
  } catch (e) {
    console.warn(
      'No se guardó el track completo:',
      e.message
    );
  }

  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return entry;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// Si cambia la distancia, los parciales y el desnivel del GPS original ya no
// corresponden, así que se borran.
export async function updateRun(id, updates) {
  const history = await getHistory();
  const idx = history.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const reset = updates.distance !== undefined ? { splits: null, elevationGain: null } : {};
  const updated = { ...history[idx], ...updates, ...reset };
  history[idx] = updated;
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return updated;
}

export async function deleteRun(id) {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}
