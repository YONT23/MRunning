import * as TaskManager from 'expo-task-manager';
import { appendPoint, getStatus, getSegmentId } from '../store/runStore';
import { evaluateAutoPause } from '../store/autoPauseStore';

export const LOCATION_TASK_NAME = 'RBT_BACKGROUND_LOCATION_TASK';

// Se define en el alcance global del módulo y se importa una vez desde App.js,
// para que Android pueda ejecutar el task con la pantalla bloqueada.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Error en background location task:', error.message);
    return;
  }
  if (!data) return;

  const status = await getStatus();
  if (status !== 'running' && status !== 'auto-paused') return;

  const { locations } = data;
  for (const loc of locations || []) {
    const state = await evaluateAutoPause(loc);
    if (state !== 'running') continue;
    const segmentId = await getSegmentId();
    await appendPoint({
      segmentId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      speed: loc.coords.speed,
      altitude: loc.coords.altitude != null ? loc.coords.altitude : null,
      timestamp: loc.timestamp,
    });
  }
});
