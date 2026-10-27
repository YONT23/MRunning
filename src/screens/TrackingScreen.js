import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, AppState, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import ScreenContainer from '../components/ScreenContainer';
import { LOCATION_TASK_NAME } from '../tasks/locationTask';
import {
  getPoints,
  clearPoints,
  setStatus,
  getStatus,
  startSessionClock,
  beginPause,
  endPause,
  clearSessionClock,
  getElapsedSeconds,
} from '../store/runStore';
import { addRun } from '../store/historyStore';
import { getUnits } from '../store/settingsStore';
import { computeDistanceWithStats, formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';

const MI_IN_M = 1609.34;

export default function TrackingScreen({ navigation, route }) {
  const activityType = route.params?.activityType || 'running';
  const isWalking = activityType === 'walking';
  const { width } = useWindowDimensions();
  const bigSize = Math.max(56, Math.min(84, width * 0.2));

  const [runState, setRunState] = useState('idle');
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gps, setGps] = useState(null);
  const [units, setUnitsState] = useState('km');
  const [busy, setBusy] = useState(false);
  const pointsTimer = useRef(null);
  const clockTimer = useRef(null);

  const refreshFromStore = useCallback(async () => {
    const pts = await getPoints();
    const stats = computeDistanceWithStats(pts);
    setDistance(stats.totalMeters);
    setGps(stats);
    setElapsed(await getElapsedSeconds());
  }, []);

  useEffect(() => {
    getUnits().then(setUnitsState);
    // Si la app se cerró con un recorrido en curso, se retoma.
    (async () => {
      const s = await getStatus();
      if (s === 'running' || s === 'paused') {
        setRunState(s);
        await refreshFromStore();
      }
    })();
  }, [refreshFromStore]);

  // Al volver a la app desde segundo plano, se actualiza todo de inmediato.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const s = await getStatus();
      setRunState(s === 'running' || s === 'paused' ? s : 'idle');
      if (s === 'running' || s === 'paused') await refreshFromStore();
    });
    return () => sub.remove();
  }, [refreshFromStore]);

  // Mientras corre: cronómetro cada segundo y distancia cada 2 segundos.
  useEffect(() => {
    if (runState !== 'running') {
      clearInterval(pointsTimer.current);
      clearInterval(clockTimer.current);
      return;
    }
    clockTimer.current = setInterval(async () => setElapsed(await getElapsedSeconds()), 1000);
    pointsTimer.current = setInterval(refreshFromStore, 2000);
    return () => {
      clearInterval(pointsTimer.current);
      clearInterval(clockTimer.current);
    };
  }, [runState, refreshFromStore]);

  const requestPermissions = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos tu ubicación precisa para registrar el recorrido.');
      return false;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      Alert.alert(
        'Permiso en segundo plano',
        'Elige "Permitir siempre" en el permiso de ubicación para seguir registrando con la pantalla bloqueada.'
      );
      return false;
    }
    return true;
  };

  const startTracking = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await requestPermissions())) return;
      await clearPoints();
      await setStatus('running');
      await startSessionClock();
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!started) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 2,
          timeInterval: 2000,
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.Fitness,
          foregroundService: {
            notificationTitle: 'MRunning',
            notificationBody: isWalking
              ? 'Caminata activa: registrando tu ruta'
              : 'Entrenamiento activo: registrando tu ruta',
            notificationColor: colors.blue,
            killServiceOnDestroy: false,
          },
        });
      }
      setDistance(0);
      setElapsed(0);
      setGps(null);
      setRunState('running');
    } catch (e) {
      Alert.alert('No se pudo iniciar el GPS', e.message);
    } finally {
      setBusy(false);
    }
  };

  const pauseTracking = async () => {
    await setStatus('paused');
    await beginPause();
    setRunState('paused');
    await refreshFromStore();
  };

  const resumeTracking = async () => {
    await endPause();
    await setStatus('running');
    setRunState('running');
  };

  // Detiene el GPS, guarda el recorrido en el historial y muestra el resumen.
  const doFinish = async () => {
    try {
      await setStatus('idle');
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      const finalElapsed = await getElapsedSeconds();
      const finalPoints = await getPoints();
      const finalDistance = computeDistanceWithStats(finalPoints).totalMeters;
      await clearSessionClock();
      if (finalDistance > 0 && finalElapsed > 0) {
        await addRun({ distance: finalDistance, elapsed: finalElapsed, activityType, points: finalPoints });
      }
      await clearPoints();
      setRunState('idle');
      setElapsed(finalElapsed);
      setDistance(finalDistance);
      Alert.alert(
        'Recorrido guardado',
        `${formatDistance(finalDistance)} km · ${formatDuration(finalElapsed)} · ${formatPace(finalDistance, finalElapsed)} /km`,
        [{ text: 'OK', onPress: () => navigation.popToTop() }]
      );
    } catch (e) {
      Alert.alert('Ocurrió un problema al terminar', e.message);
    }
  };

  const finishTracking = () => {
    Alert.alert('Terminar recorrido', '¿Quieres terminar este recorrido?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: doFinish },
    ]);
  };

  const isMi = units === 'mi';
  const distValue = isMi ? (distance / MI_IN_M).toFixed(2) : formatDistance(distance);
  const distUnit = isMi ? 'mi' : 'km';
  const paceValue = formatPace(isMi ? (distance * 1000) / MI_IN_M : distance, elapsed);
  const paceUnit = isMi ? '/mi' : '/km';

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.badge}>{isWalking ? 'CAMINATA' : 'RUNNING'}</Text>
      </View>

      <View style={styles.statsBox}>
        <Text style={[styles.bigStat, { fontSize: bigSize }]}>{distValue}</Text>
        <Text style={styles.bigUnit}>{distUnit}</Text>
        <View style={styles.row}>
          <Stat label="Tiempo" value={formatDuration(elapsed)} />
          <Stat label="Ritmo" value={`${paceValue} ${paceUnit}`} />
        </View>
        {gps && runState !== 'idle' ? (
          <Text style={styles.diag}>
            {gps.totalPoints} puntos GPS · {gps.rejectedAccuracy} descartados por precisión
          </Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        {runState === 'idle' && (
          <Button label="Iniciar" color={colors.blue} onPress={startTracking} wide disabled={busy} />
        )}
        {runState === 'running' && (
          <>
            <Button label="Pausar" outline onPress={pauseTracking} />
            <Button label="Terminar" color={colors.red} onPress={finishTracking} />
          </>
        )}
        {runState === 'paused' && (
          <>
            <Button label="Reanudar" color={colors.blue} onPress={resumeTracking} />
            <Button label="Terminar" color={colors.red} onPress={finishTracking} />
          </>
        )}
      </View>

      <Text style={styles.hint}>
        {runState === 'running'
          ? 'Puedes bloquear la pantalla: el registro continúa en segundo plano.'
          : runState === 'paused'
          ? 'Recorrido en pausa.'
          : 'Presiona Iniciar para comenzar tu recorrido.'}
      </Text>
    </ScreenContainer>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Button({ label, color, onPress, wide, outline, disabled }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: outline ? 'transparent' : color },
        outline && styles.buttonOutline,
        wide && { flex: 1 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.md },
  badge: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  statsBox: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  bigStat: { color: colors.white, fontWeight: '800', letterSpacing: -1 },
  bigUnit: { color: colors.textMuted, fontSize: 16, marginTop: -4 },
  row: { flexDirection: 'row', marginTop: spacing.xl, gap: spacing.xxl },
  statItem: { alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  diag: { color: colors.textFaint, fontSize: 11, marginTop: spacing.lg, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  button: { flex: 1, paddingVertical: 17, borderRadius: radius.pill, alignItems: 'center' },
  buttonOutline: { borderWidth: 1.5, borderColor: colors.border },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginBottom: spacing.lg },
});
