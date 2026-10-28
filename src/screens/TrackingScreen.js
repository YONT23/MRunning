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
  beginNewSegment,
} from '../store/runStore';
import { addRun } from '../store/historyStore';
import { getUnits } from '../store/settingsStore';
import { computeDistanceWithStats, formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';
import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';
import { getTrainingPrefs } from '../store/trainingPrefs';
import {
  getCurrentPlan,
  setCurrentPlan,
  clearCurrentPlan,
} from '../store/trainingPlanStore';
import {
  clearAutoPauseCandidate,
} from '../store/autoPauseStore';
import { trainingProgress } from '../utils/trainingPlan';
import {
  auditRoute,
  locationQuality,
} from '../utils/precisionEngine';
import RunMap from '../components/RunMap';
import MetricPicker from '../components/MetricPicker';
import {useAppTheme} from '../theme/useAppTheme';
import {getMetricPrefs,setMetricPrefs,DEFAULT_METRICS} from '../store/metricPrefs';

const MI_IN_M = 1609.34;

export default function TrackingScreen({ navigation, route }) {
  const activityType = route.params?.activityType || 'running';
  const isWalking = activityType === 'walking';
  const theme=useAppTheme();
  const [mode,setMode]=useState('metrics');
  const [picker,setPicker]=useState(false);
  const [metricIds,setMetricIds]=useState(DEFAULT_METRICS);
  const [trail,setTrail]=useState([]);
  const [accuracyNow,setAccuracyNow]=useState(null);
  const { width } = useWindowDimensions();
  const bigSize = Math.max(56, Math.min(84, width * 0.2));

  const [runState, setRunState] = useState('idle');
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gps, setGps] = useState(null);
  const [units, setUnitsState] = useState('km');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(
    route.params?.trainingPlan || {kind:'free'}
  );
  const [prefs, setPrefs] = useState(null);
  const [quality, setQuality] = useState('desconocida');
  const lastAlert = useRef('');
  const pointsTimer = useRef(null);
  const clockTimer = useRef(null);

  const refreshFromStore = useCallback(async () => {
    const pts = await getPoints();
    const stats = computeDistanceWithStats(pts);
    setTrail(pts);
    const last = pts.length ? pts[pts.length - 1] : null;
    setAccuracyNow(last && Number.isFinite(last.accuracy) ? Math.round(last.accuracy) : null);
    setDistance(stats.totalMeters);
    setGps(stats);

    const latest = [...pts].reverse().find(
      p => Number.isFinite(p.accuracy)
    );

    setQuality(
      locationQuality(latest?.accuracy)
    );

    const current = await getStatus();
    setRunState(current);
    setElapsed(await getElapsedSeconds());
  }, []);

  useEffect(() => {
    getUnits().then(setUnitsState);

    getTrainingPrefs()
      .then(setPrefs)
      .catch(() => {});

    getCurrentPlan()
      .then(p => {
        if (!route.params?.trainingPlan) setPlan(p);
      })
      .catch(() => {});
    getMetricPrefs().then(setMetricIds).catch(()=>{});
    // Si la app se cerró con un recorrido en curso, se retoma.
    (async () => {
      const s = await getStatus();
      if (['running','paused','auto-paused'].includes(s)) {
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
      setRunState(['running','paused','auto-paused'].includes(s) ? s : 'idle');
      if (['running','paused','auto-paused'].includes(s)) await refreshFromStore();
    });
    return () => sub.remove();
  }, [refreshFromStore]);

  // Mientras corre: cronómetro cada segundo y distancia cada 2 segundos.
  useEffect(() => {
    if (!['running','auto-paused','paused'].includes(runState)) {
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
      await clearAutoPauseCandidate();
      await beginNewSegment();
      await setCurrentPlan(plan);
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
      await setStatus('idle').catch(() => {});
      await clearSessionClock().catch(() => {});

      Alert.alert('No se pudo iniciar el GPS', e.message);
    } finally {
      setBusy(false);
    }
  };

  const pauseTracking = async () => {
    await beginPause();
    await setStatus('paused');
    await clearAutoPauseCandidate();
    setRunState('paused');
    await refreshFromStore();
  };

  const resumeTracking = async () => {
    await beginNewSegment();
    await endPause();
    await setStatus('running');
    await clearAutoPauseCandidate();
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
        await addRun({
          distance: finalDistance,
          elapsed: finalElapsed,
          activityType,
          points: finalPoints,
          trainingPlan: plan,
          precision: auditRoute(finalPoints),
        });
      }
      await clearPoints();
      await clearCurrentPlan();
      await clearAutoPauseCandidate();
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

  const progress = trainingProgress(
    plan, elapsed, distance
  );

  useEffect(() => {
    if (runState !== 'running' || !prefs) return;

    const alertKey = progress.complete
      ? 'complete'
      : progress.stage;

    if (alertKey !== lastAlert.current) {
      if (
        lastAlert.current &&
        progress.stage !== 'free'
      ) {
        if (prefs.vibration) Vibration.vibrate(250);

        if (prefs.voice) {
          Speech.speak(progress.title, {
            language:'es-ES',
            rate:0.96,
          });
        }
      }

      lastAlert.current = alertKey;
    }
  }, [
    runState,
    progress.stage,
    progress.complete,
    prefs,
  ]);

  const lastKm = useRef(0);

  useEffect(() => {
    if (
      runState !== 'running' ||
      !prefs?.kilometerAlerts
    ) return;

    const km = Math.floor(distance / 1000);

    if (km > lastKm.current) {
      if (prefs.vibration) Vibration.vibrate(200);

      if (prefs.voice) {
        Speech.speak('Kilómetro ' + km, {
          language:'es-ES',
        });
      }
    }

    lastKm.current = km;
  }, [distance,runState,prefs]);

  const isMi = units === 'mi';
  const distValue = isMi ? (distance / MI_IN_M).toFixed(2) : formatDistance(distance);
  const distUnit = isMi ? 'mi' : 'km';
  const paceValue = formatPace(isMi ? (distance * 1000) / MI_IN_M : distance, elapsed);
  const paceUnit = isMi ? '/mi' : '/km';

  const m = trail.length ? trail[trail.length-1] : null;
  const currentLocation = m && Number.isFinite(m.latitude) && Number.isFinite(m.longitude)
    ? {latitude:m.latitude, longitude:m.longitude} : null;
  const speedKmH = elapsed>0 ? distance / elapsed * 3.6 : 0;
  const values = {
    time:formatDuration(elapsed),pace:`${paceValue} ${paceUnit}`,
    speed:`${speedKmH.toFixed(1)} km/h`,
    accuracy:accuracyNow==null?'Sin señal':`±${accuracyNow} m`,
    points:String(gps?.totalPoints||0),rejected:String((gps?.rejectedAccuracy||0)+(gps?.rejectedSpeedSegments||0))
  };
  const labels={time:'TIEMPO',pace:'RITMO MEDIO',speed:'VELOCIDAD MEDIA',accuracy:'GPS',points:'LECTURAS',rejected:'DESCARTADOS'};
  const saveMetrics = async selected => {
    try { await setMetricPrefs(selected);setMetricIds(selected);setPicker(false); }
    catch(e){Alert.alert('Error',e.message)}
  };
  return (
    <ScreenContainer adaptive>
      <View style={{paddingTop:15,paddingBottom:10}}>
        <Text style={{color:theme.blue,fontWeight:'800',letterSpacing:1.2,fontSize:12}}>{isWalking?'CAMINATA':'CARRERA'} · {runState==='running'?'EN CURSO':(runState==='paused'||runState==='auto-paused')?'EN PAUSA':'PREPARADA'}</Text>
      </View>
      <View style={[styles.statsBox,{flex:0,paddingVertical:12}]}>
        <Text style={[styles.bigStat,{fontSize:bigSize,color:theme.text}]}>{distValue}</Text>
        <Text style={[styles.bigUnit,{color:theme.muted}]}>{distUnit}</Text>
      </View>
      <View style={{flexDirection:'row',backgroundColor:theme.surface,borderRadius:14,padding:4,marginBottom:10}}>
        {['metrics','map'].map(choice=><TouchableOpacity key={choice} onPress={()=>setMode(choice)} style={{flex:1,padding:12,borderRadius:11,alignItems:'center',backgroundColor:mode===choice?theme.blue:'transparent'}}>
          <Text style={{color:mode===choice?'#FFFFFF':theme.text,fontWeight:'800'}}>{choice==='metrics'?'Métricas':'Mapa'}</Text>
        </TouchableOpacity>)}
      </View>
      {mode==='map'?<View style={{flex:1,justifyContent:'center'}}><RunMap location={currentLocation} points={trail} height={290}/>
        <Text style={{color:theme.muted,fontSize:11,marginTop:8,textAlign:'center'}}>Ruta en vivo · el GPS continúa aunque cambies de pantalla</Text></View>:
        <View style={{flex:1,justifyContent:'center'}}>
          <TouchableOpacity onPress={()=>setPicker(true)} style={{alignSelf:'flex-end',padding:8}}><Text style={{color:theme.blue,fontWeight:'800'}}>⚙ Personalizar</Text></TouchableOpacity>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{metricIds.map(id=><View key={id} style={{width:'48%',flexGrow:1,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,borderRadius:17,padding:14}}>
            <Text style={{color:theme.muted,fontSize:10,fontWeight:'800'}}>{labels[id]}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={{color:theme.text,fontSize:22,fontWeight:'800',marginTop:8}}>{values[id]}</Text>
          </View>)}</View>
        </View>}
      {gps && runState!=='idle' && <Text style={{color:theme.muted,fontSize:11,textAlign:'center',marginBottom:8}}>{gps.totalPoints} lecturas · {gps.rejectedAccuracy} puntos rechazados por precisión</Text>}
      <View style={{
        backgroundColor:colors.bgElevated,
        borderWidth:1,
        borderColor:colors.border,
        borderRadius:14,
        padding:12,
        marginBottom:10,
      }}>
        <Text style={{
          color:colors.blue,
          fontWeight:'800',
          fontSize:12,
        }}>
          {progress.title}
        </Text>

        <Text style={{
          color:colors.white,
          fontSize:13,
          marginTop:4,
        }}>
          {progress.detail}
        </Text>

        <Text style={{
          color:colors.textMuted,
          fontSize:11,
          marginTop:5,
        }}>
          GPS: {quality} · {
            runState === 'auto-paused'
              ? 'Pausa automática'
              : runState === 'paused'
                ? 'Pausa manual'
                : 'Seguimiento activo'
          }
        </Text>

        {progress.progress !== null && (
          <View style={{
            height:5,
            backgroundColor:colors.border,
            marginTop:9,
            borderRadius:4,
          }}>
            <View style={{
              width:(progress.progress*100)+'%',
              backgroundColor:colors.blue,
              height:5,
              borderRadius:4,
            }}/>
          </View>
        )}
      </View>
      <View style={styles.controls}>
        {runState === 'idle' && <Button label="Iniciar" color={theme.blue} onPress={startTracking} wide disabled={busy}/>}
        {runState === 'running' && <><Button label="Pausar" outline textColor={theme.text} borderColor={theme.border} onPress={pauseTracking}/><Button label="Terminar" color={theme.red} onPress={finishTracking}/></>}
        {runState === 'paused' && <><Button label="Reanudar" color={theme.blue} onPress={resumeTracking}/><Button label="Terminar" color={theme.red} onPress={finishTracking}/></>}
      </View>
      <Text style={[styles.hint,{color:theme.muted}]}>{runState==='running'?'Puedes bloquear la pantalla; el GPS sigue en segundo plano.':(runState==='paused'||runState==='auto-paused')?'Recorrido en pausa.':'Presiona Iniciar para comenzar.'}</Text>
      <MetricPicker visible={picker} selected={metricIds} onCancel={()=>setPicker(false)} onSave={saveMetrics}/>
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

function Button({ label, color, onPress, wide, outline, disabled, textColor, borderColor }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: outline ? 'transparent' : color },
        outline && styles.buttonOutline,
        outline && borderColor && { borderColor },
        wide && { flex: 1 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[styles.buttonText, textColor && { color: textColor }]}>{label}</Text>
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
