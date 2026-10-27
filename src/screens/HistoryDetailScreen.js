import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import RoutePreview from '../components/RoutePreview';
import SplitsChart from '../components/SplitsChart';
import { getHistory, updateRun, deleteRun } from '../store/historyStore';
import { compareRuns } from '../utils/analysis';
import { formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatLong(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseWhen(text) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseTime(text) {
  const parts = text.trim().split(':').map((p) => Number(p));
  if (parts.some((n) => isNaN(n) || n < 0)) return NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return NaN;
}

export default function HistoryDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const [entry, setEntry] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [editing, setEditing] = useState(false);
  const [km, setKm] = useState('');
  const [time, setTime] = useState('');
  const [when, setWhen] = useState('');

  const load = useCallback(async () => {
    const h = await getHistory();
    const e = h.find((x) => x.id === id) || null;
    setEntry(e);
    if (e) {
      setComparison(compareRuns(e, h));
      setKm((e.distance / 1000).toFixed(2));
      setTime(formatDuration(e.elapsed));
      setWhen(formatWhen(e.date));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!entry) return <ScreenContainer />;

  const label = entry.activityType === 'walking' ? 'Caminata' : 'Running';

  const save = async () => {
    const kmNum = parseFloat(km.replace(',', '.'));
    const secs = parseTime(time);
    const iso = parseWhen(when);
    if (isNaN(kmNum) || kmNum <= 0 || isNaN(secs) || secs <= 0 || !iso) {
      Alert.alert('Revisa los datos', 'Distancia en km, tiempo como mm:ss o h:mm:ss y fecha como dd/mm/aaaa hh:mm.');
      return;
    }
    await updateRun(id, { distance: kmNum * 1000, elapsed: secs, date: iso });
    setEditing(false);
    await load();
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar recorrido', '¿Seguro? Esto no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{label}</Text>
        <TouchableOpacity onPress={() => setEditing((e) => !e)} hitSlop={12}>
          <Text style={styles.editLink}>{editing ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.routeWrap}>
          <RoutePreview points={entry.routePreview} size={200} strokeColor={colors.blue} />
        </View>

        {!editing ? (
          <>
            <Text style={styles.dateText}>{formatLong(entry.date)}</Text>
            <View style={styles.statsRow}>
              <Stat label="DISTANCIA" value={`${formatDistance(entry.distance)} km`} />
              <Stat label="TIEMPO" value={formatDuration(entry.elapsed)} />
              <Stat label="RITMO" value={`${formatPace(entry.distance, entry.elapsed)} /km`} />
            </View>

            {entry.elevationGain != null && entry.elevationGain > 0 ? (
              <Text style={styles.extra}>Desnivel positivo: {entry.elevationGain} m</Text>
            ) : null}
            {entry.avgAccuracy != null ? (
              <Text style={styles.extra}>Precisión GPS media: ±{entry.avgAccuracy} m</Text>
            ) : null}

            <Text style={styles.sectionLabel}>PARCIALES POR KM</Text>
            <View style={styles.card}>
              <SplitsChart splits={entry.splits} />
            </View>

            <Text style={styles.sectionLabel}>COMPARACIÓN</Text>
            <View style={styles.card}>
              <ComparisonBox comparison={comparison} />
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
              <Text style={styles.deleteText}>Eliminar recorrido</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View>
            <Field label="Distancia (km)" value={km} onChangeText={setKm} keyboardType="decimal-pad" />
            <Field label="Tiempo (mm:ss o h:mm:ss)" value={time} onChangeText={setTime} />
            <Field label="Fecha y hora (dd/mm/aaaa hh:mm)" value={when} onChangeText={setWhen} />
            <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
              <Text style={styles.saveText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// Resumen de la comparación: mejora frente a la carrera anterior y frente al
// mejor registro de distancia similar. Positivo = mejora.
function ComparisonBox({ comparison }) {
  if (!comparison) return <Text style={styles.muted}>Sin datos para comparar.</Text>;
  const { vsLast, best } = comparison;
  return (
    <View>
      {vsLast ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>
            {vsLast.paceImprovement >= 0 ? 'Mejoraste' : 'Más lento'} frente a tu carrera anterior
          </Text>
          <Text style={[styles.delta, { color: vsLast.paceImprovement >= 0 ? colors.blue : colors.red }]}>
            {vsLast.paceImprovement >= 0 ? '▲' : '▼'} {Math.abs(Math.round(vsLast.paceImprovement))} s/km
          </Text>
          <Text style={styles.muted}>
            {vsLast.timeSaved >= 0 ? 'Ahorraste' : 'Perdiste'} {Math.abs(Math.round(vsLast.timeSaved))} s en esta distancia
          </Text>
        </View>
      ) : (
        <Text style={styles.muted}>Es tu primera carrera registrada.</Text>
      )}

      {best ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>
            {best.isNewRecord ? '¡Nuevo récord en esta distancia!' : 'Tu mejor registro en esta distancia'}
          </Text>
          <Text style={styles.muted}>Mejor ritmo anterior: {formatPace(1000, best.pace)} /km</Text>
        </View>
      ) : (
        <Text style={styles.muted}>Primer registro de esta distancia.</Text>
      )}
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  back: { color: colors.blue, fontSize: 16 },
  title: { color: colors.white, fontSize: 17, fontWeight: '700' },
  editLink: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  routeWrap: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  dateText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', marginBottom: spacing.md },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
  extra: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  block: { marginBottom: spacing.md },
  blockTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  delta: { fontSize: 26, fontWeight: '800', marginVertical: 4 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  deleteBtn: { alignItems: 'center', paddingVertical: spacing.lg },
  deleteText: { color: colors.red, fontSize: 14, fontWeight: '600' },
});
