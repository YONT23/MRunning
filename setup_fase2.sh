#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/MRunning

if [ ! -f src/screens/TrackingScreen.js ] || \
   [ ! -f src/tasks/locationTask.js ] || \
   [ ! -f src/utils/haversine.js ]; then
  echo "ERROR: No se encontró el proyecto MRunning."
  exit 1
fi

if [ -f src/store/autoPauseStore.js ]; then
  echo "La Fase 2 ya parece estar instalada."
  echo "Revisa git status antes de repetirla."
  exit 1
fi

mkdir -p src/utils src/store tests

BACKUP="/tmp/mrunning_fase2_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"

for file in \
  src/screens/TrackingScreen.js \
  src/screens/ActivityTypeScreen.js \
  src/store/runStore.js \
  src/tasks/locationTask.js \
  src/utils/haversine.js \
  src/store/historyStore.js
do
  cp "$file" "$BACKUP/$(echo "$file" | tr / _)"
done

echo "Respaldo creado: $BACKUP"

# ==========================================
# PARTE 14 — MOTOR DE PRECISIÓN GPS
# ==========================================

npx expo install expo-speech

cat > src/utils/precisionEngine.js <<'EOF'
import { haversineDistance } from './haversine.js';

export const MAX_ACCURACY = 35;
export const MAX_GAP_MS = 12000;
export const MAX_RUNNING_SPEED = 10;

export function locationQuality(accuracy) {
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return 'desconocida';
  }

  if (accuracy <= 8) return 'excelente';
  if (accuracy <= 18) return 'buena';
  if (accuracy <= 35) return 'limitada';

  return 'deficiente';
}

export function auditRoute(points = []) {
  const input = Array.isArray(points) ? points : [];

  let rawMeters = 0;
  let acceptedMeters = 0;
  let gaps = 0;
  let badAccuracy = 0;
  let badTimestamp = 0;
  let rejectedSpeed = 0;

  let previous = null;
  const usable = [];

  for (const p of input) {
    if (
      !p ||
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      !Number.isFinite(p.timestamp) ||
      Math.abs(p.latitude) > 90 ||
      Math.abs(p.longitude) > 180
    ) continue;

    if (previous) {
      const dt = p.timestamp - previous.timestamp;

      if (
        dt > 0 &&
        dt <= MAX_GAP_MS &&
        p.segmentId === previous.segmentId
      ) {
        rawMeters += haversineDistance(previous, p);
      }
    }

    previous = p;

    if (
      !Number.isFinite(p.accuracy) ||
      p.accuracy <= 0 ||
      p.accuracy > MAX_ACCURACY
    ) {
      badAccuracy++;
      continue;
    }

    usable.push(p);
  }

  let anchor = null;

  for (const p of usable) {
    if (!anchor) {
      anchor = p;
      continue;
    }

    const dt = p.timestamp - anchor.timestamp;

    if (
      p.segmentId !== anchor.segmentId ||
      dt > MAX_GAP_MS
    ) {
      gaps++;
      anchor = p;
      continue;
    }

    if (dt <= 0) {
      badTimestamp++;
      continue;
    }

    const delta = haversineDistance(anchor, p);
    const speed = delta * 1000 / dt;

    if (
      speed > MAX_RUNNING_SPEED ||
      delta > 150
    ) {
      rejectedSpeed++;
      anchor = p;
      continue;
    }

    // Conservar el ancla ante movimientos mínimos.
    if (delta < 3) continue;

    acceptedMeters += delta;
    anchor = p;
  }

  return {
    rawMeters,
    acceptedMeters,
    totalPoints: input.length,
    validPoints: usable.length,
    badAccuracy,
    badTimestamp,
    rejectedSpeed,
    gaps,
    estimated: true,
  };
}
EOF

# Actualizar el cálculo de segmentos sin modificar
# las funciones públicas de formato.

python3 - <<'PY'
from pathlib import Path

p = Path('src/utils/haversine.js')
s = p.read_text()

start = s.index('// Precisión máxima aceptada')
end = s.index('export function computeDistanceWithStats', start)

replacement = '''
// MPrecision: segmentación conservadora.
// No se unen intervalos largos ni segmentos de pausa.
const MAX_ACCEPTED_ACCURACY_M = 35;

export function isValidPoint(p) {
  return p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180 &&
    Number.isFinite(p.timestamp) &&
    Number.isFinite(p.accuracy) &&
    p.accuracy > 0 &&
    p.accuracy <= MAX_ACCEPTED_ACCURACY_M;
}

export function smoothPoints(points) {
  // No alterar coordenadas originales mediante
  // medianas que podrían recortar curvas reales.
  return (points || []).filter(isValidPoint);
}

export function walkSegments(points) {
  const total = Array.isArray(points)
    ? points.length
    : 0;

  const pts = smoothPoints(points);
  const segments = [];

  let rejectedSpeedSegments = 0;
  let rejectedSpeedMeters = 0;
  let rejectedGapSegments = 0;
  let anchor = null;

  for (const p of pts) {
    if (!anchor) {
      anchor = p;
      continue;
    }

    const dt = (p.timestamp - anchor.timestamp) / 1000;

    if (
      p.segmentId !== anchor.segmentId ||
      dt > 12
    ) {
      rejectedGapSegments++;
      anchor = p;
      continue;
    }

    if (dt <= 0) continue;

    const dist = haversineDistance(anchor, p);

    if (
      dist / dt > 10 ||
      dist > 150
    ) {
      rejectedSpeedSegments++;
      rejectedSpeedMeters += dist;
      anchor = p;
      continue;
    }

    if (dist < 3) continue;

    segments.push({
      from: anchor,
      to: p,
      dist,
      dt,
    });

    anchor = p;
  }

  return {
    segments,
    total,
    rejectedAccuracy: total - pts.length,
    rejectedSpeedSegments,
    rejectedSpeedMeters,
    rejectedGapSegments,
  };
}

'''

s = s[:start] + replacement + s[end:]

s = s.replace(
    '    rejectedSpeedMeters: w.rejectedSpeedMeters,',
    '    rejectedSpeedMeters: w.rejectedSpeedMeters,\n'
    '    rejectedGapSegments: w.rejectedGapSegments,'
)

p.write_text(s)
PY

# ==========================================
# PARTE 15 — PAUSA Y ALERTAS
# ==========================================

cat > src/store/trainingPrefs.js <<'EOF'
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mrunning_training_prefs_v2';

export const DEFAULT_PREFS = {
  autoPause: false,
  voice: false,
  vibration: true,
  kilometerAlerts: true,
};

export async function getTrainingPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);

    return {
      ...DEFAULT_PREFS,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setTrainingPrefs(values) {
  const next = {
    ...DEFAULT_PREFS,
    ...values,
  };

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(next)
  );

  return next;
}
EOF

cat >> src/store/runStore.js <<'EOF'

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
EOF

cat > src/store/autoPauseStore.js <<'EOF'
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
EOF

# Integrar la pausa en la tarea de ubicación
# que ya está registrada por Expo.

python3 - <<'PY'
from pathlib import Path

p = Path('src/tasks/locationTask.js')
s = p.read_text()

s = s.replace(
    "import { appendPoint, getStatus } from '../store/runStore';",
    "import { appendPoint, getStatus, getSegmentId } "
    "from '../store/runStore';\n"
    "import { evaluateAutoPause } "
    "from '../store/autoPauseStore';"
)

s = s.replace(
    "  if (status !== 'running') return; // en pausa se ignoran lecturas\n\n"
    "  const { locations } = data;",
    "  if (status !== 'running' && status !== 'auto-paused') return;\n\n"
    "  const { locations } = data;"
)

s = s.replace(
    "  for (const loc of locations) {\n"
    "    await appendPoint({",
    "  for (const loc of locations || []) {\n"
    "    const state = await evaluateAutoPause(loc);\n"
    "    if (state !== 'running') continue;\n"
    "    const segmentId = await getSegmentId();\n"
    "    await appendPoint({\n"
    "      segmentId,"
)

p.write_text(s)
PY

# ==========================================
# PARTE 16 — ENTRENAMIENTOS PROGRAMADOS
# ==========================================

cat > src/store/trainingPlanStore.js <<'EOF'
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mrunning_current_training_plan';

export const FREE = { kind: 'free' };

export async function setCurrentPlan(plan) {
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(plan || FREE)
  );
}

export async function getCurrentPlan() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : FREE;
  } catch {
    return FREE;
  }
}

export async function clearCurrentPlan() {
  await AsyncStorage.removeItem(KEY);
}
EOF

cat > src/utils/trainingPlan.js <<'EOF'
export function validatePlan(p) {
  if (!p || p.kind === 'free') {
    return { kind: 'free' };
  }

  if (
    p.kind === 'distance' &&
    Number.isFinite(p.meters) &&
    p.meters >= 500 &&
    p.meters <= 100000
  ) {
    return {
      kind: 'distance',
      meters: p.meters,
    };
  }

  if (
    p.kind === 'time' &&
    Number.isFinite(p.seconds) &&
    p.seconds >= 60 &&
    p.seconds <= 21600
  ) {
    return {
      kind: 'time',
      seconds: p.seconds,
    };
  }

  if (
    p.kind === 'pace' &&
    Number.isFinite(p.paceSeconds) &&
    p.paceSeconds >= 120 &&
    p.paceSeconds <= 1200
  ) {
    return {
      kind: 'pace',
      paceSeconds: p.paceSeconds,
    };
  }

  if (
    p.kind === 'intervals' &&
    Number.isInteger(p.sets) &&
    p.sets >= 1 &&
    p.sets <= 30 &&
    [p.warmup, p.work, p.recovery, p.cooldown].every(
      v => Number.isInteger(v) && v >= 0 && v <= 7200
    ) &&
    p.work > 0
  ) {
    return {
      kind: 'intervals',
      sets: p.sets,
      warmup: p.warmup,
      work: p.work,
      recovery: p.recovery,
      cooldown: p.cooldown,
    };
  }

  throw new Error('Plan de entrenamiento inválido');
}

export function trainingProgress(
  plan,
  seconds = 0,
  meters = 0
) {
  const p = validatePlan(plan);
  const t = Math.max(0, seconds);
  const d = Math.max(0, meters);

  if (p.kind === 'free') {
    return {
      title: 'Carrera libre',
      detail: 'Sin objetivo',
      progress: null,
      stage: 'free',
      complete: false,
    };
  }

  if (p.kind === 'distance') {
    return {
      title: 'Objetivo distancia',
      detail:
        (d / 1000).toFixed(2) +
        ' / ' +
        (p.meters / 1000).toFixed(1) +
        ' km',
      progress: Math.min(1, d / p.meters),
      stage: 'distance',
      complete: d >= p.meters,
    };
  }

  if (p.kind === 'time') {
    return {
      title: 'Objetivo tiempo',
      detail:
        Math.floor(t / 60) +
        ' / ' +
        Math.floor(p.seconds / 60) +
        ' min',
      progress: Math.min(1, t / p.seconds),
      stage: 'time',
      complete: t >= p.seconds,
    };
  }

  if (p.kind === 'pace') {
    const current = d >= 300 && t >= 60
      ? t / (d / 1000)
      : null;

    return {
      title: 'Ritmo objetivo',
      detail: current === null
        ? 'Recorre 300 m para comparar'
        : current <= p.paceSeconds
          ? 'En ritmo objetivo'
          : 'Por encima del tiempo objetivo',
      progress: null,
      stage: 'pace',
      complete: false,
    };
  }

  let remaining = t;

  if (remaining < p.warmup) {
    return {
      title: 'Calentamiento',
      detail: 'Inicio suave',
      progress: remaining / Math.max(1, p.warmup),
      stage: 'warmup',
      complete: false,
    };
  }

  remaining -= p.warmup;

  for (let i = 0; i < p.sets; i++) {
    if (remaining < p.work) {
      return {
        title: 'Serie ' + (i + 1) + '/' + p.sets,
        detail: 'Ritmo de trabajo',
        progress: remaining / p.work,
        stage: 'work-' + i,
        complete: false,
      };
    }

    remaining -= p.work;

    if (i < p.sets - 1 && p.recovery > 0) {
      if (remaining < p.recovery) {
        return {
          title: 'Recuperación ' + (i + 1),
          detail: 'Camina o trota suave',
          progress: remaining / p.recovery,
          stage: 'recovery-' + i,
          complete: false,
        };
      }

      remaining -= p.recovery;
    }
  }

  if (remaining < p.cooldown) {
    return {
      title: 'Vuelta a la calma',
      detail: 'Baja el ritmo',
      progress: remaining / Math.max(1, p.cooldown),
      stage: 'cooldown',
      complete: false,
    };
  }

  return {
    title: 'Intervalos completados',
    detail: 'Puedes finalizar la carrera',
    progress: 1,
    stage: 'finished',
    complete: true,
  };
}
EOF

# Nueva pantalla para preparar carreras.

cat > src/screens/ActivityTypeScreen.js <<'EOF'
import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
} from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing, radius } from '../theme/colors';
import { setLastActivity } from '../store/settingsStore';
import { validatePlan } from '../utils/trainingPlan';

import {
  getTrainingPrefs,
  setTrainingPrefs,
} from '../store/trainingPrefs';

const options = [
  {
    id: 'free',
    name: 'Carrera libre',
    hint: 'Corre sin objetivo fijado',
  },
  {
    id: 'distance',
    name: 'Distancia',
    hint: 'Meta de kilómetros',
  },
  {
    id: 'time',
    name: 'Tiempo',
    hint: 'Meta en minutos',
  },
  {
    id: 'pace',
    name: 'Ritmo objetivo',
    hint: 'Ritmo en min/km',
  },
  {
    id: 'intervals',
    name: 'Intervalos',
    hint: 'Calentamiento, series y recuperación',
  },
];

export default function ActivityTypeScreen({ navigation }) {
  const [kind, setKind] = useState('free');
  const [activity, setActivity] = useState('running');

  const [km, setKm] = useState('5');
  const [mins, setMins] = useState('30');
  const [pace, setPace] = useState('5:30');

  const [sets, setSets] = useState('5');
  const [work, setWork] = useState('2');
  const [rest, setRest] = useState('1');

  const [prefs, setPrefs] = useState(null);

  React.useEffect(() => {
    getTrainingPrefs()
      .then(setPrefs)
      .catch(() => {});
  }, []);

  const toggle = async (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    try {
      await setTrainingPrefs(next);
    } catch {
      Alert.alert('Error', 'No se guardó la preferencia.');
    }
  };

  const parse = n => Number(
    String(n).trim().replace(',', '.')
  );

  const build = () => {
    if (kind === 'free') {
      return { kind: 'free' };
    }

    if (kind === 'distance') {
      return validatePlan({
        kind,
        meters: parse(km) * 1000,
      });
    }

    if (kind === 'time') {
      return validatePlan({
        kind,
        seconds: Math.round(parse(mins) * 60),
      });
    }

    if (kind === 'pace') {
      const match = /^(\d{1,2}):(\d{2})$/.exec(
        pace.trim()
      );

      if (!match || +match[2] > 59) {
        throw new Error(
          'Usa el ritmo mm:ss, por ejemplo 5:30'
        );
      }

      return validatePlan({
        kind,
        paceSeconds:
          +match[1] * 60 + (+match[2]),
      });
    }

    return validatePlan({
      kind,
      sets: parse(sets),
      warmup: 300,
      work: Math.round(parse(work) * 60),
      recovery: Math.round(parse(rest) * 60),
      cooldown: 180,
    });
  };

  const open = async () => {
    try {
      const trainingPlan = build();

      await setLastActivity(activity);

      navigation.navigate('Tracking', {
        activityType: activity,
        trainingPlan,
      });
    } catch (e) {
      Alert.alert('Revisa tu objetivo', e.message);
    }
  };

  const field = (label, value, setter) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={setter}
        keyboardType={
          label.includes('Ritmo')
            ? 'default'
            : 'decimal-pad'
        }
        style={styles.input}
      />
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{paddingBottom:40}}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop:12, marginBottom:14 }}
        >
          <Text style={{color:colors.blue}}>‹ Atrás</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Preparar entrenamiento
        </Text>

        <Text style={styles.help}>
          Elige cómo quieres correr. El GPS no inicia
          hasta pulsar Iniciar en la siguiente pantalla.
        </Text>

        <View style={styles.row}>
          {['running','walking'].map(v => (
            <TouchableOpacity
              key={v}
              onPress={() => setActivity(v)}
              style={[
                styles.chip,
                activity === v && styles.active,
              ]}
            >
              <Text style={styles.chipText}>
                {v === 'running' ? 'Correr' : 'Caminar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>MODALIDAD</Text>

        <View style={styles.list}>
          {options.map(o => (
            <TouchableOpacity
              key={o.id}
              onPress={() => setKind(o.id)}
              style={[
                styles.option,
                kind === o.id && styles.selected,
              ]}
            >
              <View>
                <Text style={styles.optionText}>
                  {o.name}
                </Text>
                <Text style={styles.help}>
                  {o.hint}
                </Text>
              </View>

              <Text style={{
                color: kind === o.id
                  ? colors.blue
                  : colors.textMuted,
                fontSize: 19,
              }}>
                {kind === o.id ? '◉' : '○'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {kind === 'distance' &&
          field('Distancia (km)', km, setKm)}

        {kind === 'time' &&
          field('Tiempo (minutos)', mins, setMins)}

        {kind === 'pace' &&
          field('Ritmo (mm:ss por km)', pace, setPace)}

        {kind === 'intervals' && (
          <View style={styles.card}>
            <Text style={styles.optionText}>
              Series programadas
            </Text>

            <Text style={styles.help}>
              5 minutos de calentamiento y
              3 de vuelta a la calma.
            </Text>

            {field('Número de series', sets, setSets)}
            {field('Trabajo (minutos)', work, setWork)}
            {field('Recuperación (minutos)', rest, setRest)}
          </View>
        )}

        <Text style={styles.section}>PREFERENCIAS</Text>

        {prefs && [
          ['autoPause','Pausa automática GPS'],
          ['vibration','Vibración'],
          ['voice','Avisos por voz (pantalla activa)'],
          ['kilometerAlerts','Aviso cada kilómetro'],
        ].map(([key,label]) => (
          <View key={key} style={styles.toggle}>
            <Text style={{
              color: colors.white,
              flex: 1,
              fontSize: 13,
            }}>
              {label}
            </Text>

            <Switch
              value={!!prefs[key]}
              onValueChange={v => toggle(key,v)}
              trackColor={{true:colors.blue}}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={open}
          style={styles.primary}
        >
          <Text style={{
            color:'#FFF',
            fontWeight:'800',
            fontSize:16,
          }}>
            Continuar al GPS
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title:{
    color:colors.white,fontSize:25,fontWeight:'800',
  },
  help:{
    color:colors.textMuted,fontSize:12,
    marginTop:4,lineHeight:18,
  },
  row:{
    flexDirection:'row',gap:10,marginVertical:16,
  },
  chip:{
    flex:1,borderWidth:1,borderColor:colors.border,
    borderRadius:13,padding:12,alignItems:'center',
  },
  active:{
    borderColor:colors.blue,
    backgroundColor:colors.blueDark,
  },
  chipText:{
    color:colors.white,fontWeight:'700',
  },
  section:{
    color:colors.blue,fontSize:11,fontWeight:'800',
    letterSpacing:1.5,marginTop:16,marginBottom:8,
  },
  list:{gap:6},
  option:{
    flexDirection:'row',alignItems:'center',
    justifyContent:'space-between',
    borderRadius:14,borderColor:colors.border,
    borderWidth:1,padding:13,
  },
  selected:{
    borderColor:colors.blue,
    backgroundColor:colors.bgElevated,
  },
  optionText:{
    color:colors.white,fontSize:15,fontWeight:'800',
  },
  field:{marginTop:12},
  label:{
    color:colors.textMuted,marginBottom:5,fontSize:12,
  },
  input:{
    color:colors.white,borderColor:colors.border,
    borderWidth:1,borderRadius:12,padding:12,fontSize:17,
  },
  card:{
    backgroundColor:colors.bgElevated,
    borderRadius:14,padding:14,marginTop:12,
  },
  toggle:{
    flexDirection:'row',alignItems:'center',
    paddingVertical:10,borderBottomWidth:1,
    borderColor:colors.border,
  },
  primary:{
    backgroundColor:colors.blue,borderRadius:15,
    padding:17,alignItems:'center',marginTop:25,
  },
});
EOF

# ==========================================
# 4. GUARDAR OBJETIVOS Y DATOS ORIGINALES
# ==========================================

python3 - <<'PY'
from pathlib import Path

p = Path('src/store/historyStore.js')
s = p.read_text()

s = s.replace(
    "import { smoothPoints } from '../utils/haversine';",
    "import { smoothPoints } from '../utils/haversine';\n"
    "import * as FileSystem from 'expo-file-system';"
)

s = s.replace(
    'export async function addRun({ distance, elapsed, activityType, points }) {',
    'export async function addRun({ distance, elapsed, activityType, points, trainingPlan=null, precision=null }) {'
)

s = s.replace(
    '    activityType,\n    routePreview:',
    '    activityType,\n'
    '    trainingPlan,\n'
    '    precision,\n'
    '    routePreview:'
)

s = s.replace(
    '  const updated = [entry, ...history].slice(0, MAX_ENTRIES);',
    '''  // Guardar las coordenadas completas para auditoría.
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

  const updated = [entry, ...history].slice(0, MAX_ENTRIES);'''
)

p.write_text(s)
PY

# ==========================================
# 5. INTEGRACIÓN EN TRACKING
# ==========================================

python3 - <<'PY'
from pathlib import Path

p = Path('src/screens/TrackingScreen.js')
s = p.read_text()

assert 'const startTracking = async' in s
assert 'const doFinish = async' in s

s = s.replace(
    '  getElapsedSeconds,\n}',
    '  getElapsedSeconds,\n  beginNewSegment,\n}'
)

s = s.replace(
    "import { colors, spacing, radius } from '../theme/colors';",
    """import { colors, spacing, radius } from '../theme/colors';
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
} from '../utils/precisionEngine';"""
)

s = s.replace(
    "  const [busy, setBusy] = useState(false);",
    """  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(
    route.params?.trainingPlan || {kind:'free'}
  );
  const [prefs, setPrefs] = useState(null);
  const [quality, setQuality] = useState('desconocida');
  const lastAlert = useRef('');"""
)

s = s.replace(
    '    setGps(stats);',
    """    setGps(stats);

    const latest = [...pts].reverse().find(
      p => Number.isFinite(p.accuracy)
    );

    setQuality(
      locationQuality(latest?.accuracy)
    );

    const current = await getStatus();
    setRunState(current);""",
    1
)

s = s.replace(
    '    getUnits().then(setUnitsState);',
    """    getUnits().then(setUnitsState);

    getTrainingPrefs()
      .then(setPrefs)
      .catch(() => {});

    getCurrentPlan()
      .then(p => {
        if (!route.params?.trainingPlan) setPlan(p);
      })
      .catch(() => {});""",
    1
)

s = s.replace(
    "if (s === 'running' || s === 'paused')",
    "if (['running','paused','auto-paused'].includes(s))"
)

s = s.replace(
    "setRunState(s === 'running' || s === 'paused' ? s : 'idle');",
    "setRunState(['running','paused','auto-paused'].includes(s) ? s : 'idle');"
)

s = s.replace(
    "if (runState !== 'running') {",
    "if (!['running','auto-paused','paused'].includes(runState)) {"
)

s = s.replace(
    "      await clearPoints();\n      await setStatus('running');",
    """      await clearPoints();
      await clearAutoPauseCandidate();
      await beginNewSegment();
      await setCurrentPlan(plan);
      await setStatus('running');"""
)

s = s.replace(
    "      Alert.alert('No se pudo iniciar el GPS', e.message);",
    """      await setStatus('idle').catch(() => {});
      await clearSessionClock().catch(() => {});

      Alert.alert('No se pudo iniciar el GPS', e.message);"""
)

s = s.replace(
    "    await setStatus('paused');\n    await beginPause();",
    """    await beginPause();
    await setStatus('paused');
    await clearAutoPauseCandidate();"""
)

s = s.replace(
    "    await endPause();\n    await setStatus('running');",
    """    await beginNewSegment();
    await endPause();
    await setStatus('running');
    await clearAutoPauseCandidate();"""
)

s = s.replace(
    "        await addRun({ distance: finalDistance, elapsed: finalElapsed, activityType, points: finalPoints });",
    """        await addRun({
          distance: finalDistance,
          elapsed: finalElapsed,
          activityType,
          points: finalPoints,
          trainingPlan: plan,
          precision: auditRoute(finalPoints),
        });"""
)

s = s.replace(
    "      await clearPoints();\n      setRunState('idle');",
    """      await clearPoints();
      await clearCurrentPlan();
      await clearAutoPauseCandidate();
      setRunState('idle');"""
)

marker = "  const isMi = units === 'mi';"

assert marker in s

s = s.replace(
    marker,
    """  const progress = trainingProgress(
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

""" + marker
)

needle = '      <View style={styles.controls}>'

assert needle in s

insertion = """      <View style={{
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
"""

s = s.replace(needle, insertion + needle, 1)

s = s.replace(
    "        {runState === 'paused' && (",
    "        {(runState === 'paused' || runState === 'auto-paused') && ("
)

s = s.replace(
    "runState === 'paused'\n          ? 'Recorrido en pausa.'",
    "(runState === 'paused' || runState === 'auto-paused')\n"
    "          ? 'Recorrido en pausa.'"
)

s = s.replace(
    "runState==='paused'?'EN PAUSA'",
    "(runState==='paused'||runState==='auto-paused')?'EN PAUSA'"
)

s = s.replace(
    "runState==='paused'?'Recorrido en pausa.'",
    "(runState==='paused'||runState==='auto-paused')?'Recorrido en pausa.'"
)

p.write_text(s)
PY

# ==========================================
# 6. PRUEBAS DE LA FASE 2
# ==========================================

cat > tests/fase2.test.mjs <<'EOF'
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
EOF

cat > tests/precisionFase2.test.mjs <<'EOF'
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
EOF

node --experimental-default-type=module \
  --test tests/fase2.test.mjs tests/precisionFase2.test.mjs

python3 - <<'PY'
from pathlib import Path

required = [
  'src/screens/ActivityTypeScreen.js',
  'src/screens/TrackingScreen.js',
  'src/store/autoPauseStore.js',
  'src/utils/precisionEngine.js',
  'src/store/trainingPlanStore.js',
  'src/store/trainingPrefs.js',
]

for name in required:
    if not Path(name).exists():
        raise SystemExit('Falta ' + name)

s = Path('src/screens/TrackingScreen.js').read_text()

for token in [
    'startLocationUpdatesAsync',
    'stopLocationUpdatesAsync',
    'doFinish',
    'trainingProgress',
]:
    assert token in s, token

print('Verificación estructural: OK')
PY

if [ ! -f src/components/RunMap.js ]; then
  echo ""
  echo "AVISO: no se encontró RunMap.js de Fase 1."
  echo "La Fase 2 conserva el GPS existente."
  echo "El nuevo mapa todavía debe integrarse."
fi

echo ""
echo "=========================================="
echo "MRUNNING 2.0 — FASE 2 PREPARADA"
echo "=========================================="
echo "Parte 14: motor de precisión"
echo "Parte 15: pausa automática y alertas"
echo "Parte 16: objetivos e intervalos"
echo "=========================================="

git diff --check
git status --short

