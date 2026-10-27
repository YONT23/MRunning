import AsyncStorage from '@react-native-async-storage/async-storage';
import { smoothPoints } from '../utils/haversine';

const HISTORY_KEY = 'rbt_run_history';
const MAX_ENTRIES = 100;
const MAX_ROUTE_POINTS = 60; // suficiente para dibujar la ruta en miniatura

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

// Guarda un recorrido terminado. Se guarda una versión reducida de la ruta
// para poder dibujarla sin ocupar demasiado espacio.
export async function addRun({ distance, elapsed, activityType, points }) {
  const history = await getHistory();
  const entry = {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    distance, // metros
    elapsed, // segundos
    activityType,
    routePreview: downsample(smoothPoints(points), MAX_ROUTE_POINTS),
  };
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return entry;
}

export async function clearHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// Corrige una entrada (por ejemplo con datos de Strava). Si cambia la
// distancia, los datos derivados del GPS original se borran.
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
