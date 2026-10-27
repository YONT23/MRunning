import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import RoutePreview from '../components/RoutePreview';
import { getHistory, updateRun, deleteRun } from '../store/historyStore';
import { formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatLong(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Fecha editable con formato dd/mm/aaaa hh:mm
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

// Acepta mm:ss o h:mm:ss. Devuelve segundos o NaN.
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
  const [editing, setEditing] = useState(false);
  const [km, setKm] = useState('');
  const [time, setTime] = useState('');
  const [when, setWhen] = useState('');

  const load = useCallback(async () => {
    const h = await getHistory();
    const e = h.find((x) => x.id === id) || null;
    setEntry(e);
    if (e) {
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
      Alert.alert(
        'Revisa los datos',
        'Distancia en km, tiempo como mm:ss o h:mm:ss y fecha como dd/mm/aaaa hh:mm.'
      );
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
  statsRow: { flexDirection: 'row', marginBottom: spacing.xl },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
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
