import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RoutePreview from './RoutePreview';
import { formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors } from '../theme/colors';

// Tarjetas pensadas para exportarse como PNG con fondo TRANSPARENTE: no llevan
// fondo, bordes ni recortes. Solo texto, barras de color y la marca. El texto
// tiene una sombra suave para leerse sobre cualquier foto o video.

const CARD_W = 300;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
};
const MAX_BAR = 170;

function Brand() {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandText}>MRUNNING</Text>
    </View>
  );
}

function Metric({ label, value, unit }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function StatsCard({ distance, elapsed, activityType, avgAccuracy, calories }) {
  const kicker = activityType === 'walking' ? 'CAMINATA' : 'RUNNING';
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{kicker}</Text>
      <View style={styles.bigRow}>
        <Text style={styles.big}>{formatDistance(distance)}</Text>
        <Text style={styles.bigUnit}>km</Text>
      </View>
      <View style={styles.metricsRow}>
        <Metric label="RITMO" value={formatPace(distance, elapsed)} unit="/km" />
        <Metric label="TIEMPO" value={formatDuration(elapsed)} />
        {calories != null ? <Metric label="KCAL" value={`${calories}`} /> : null}
      </View>
      {avgAccuracy != null ? (
        <Text style={styles.footnote}>Precisión GPS media ±{avgAccuracy} m</Text>
      ) : null}
      <Brand />
    </View>
  );
}

export function SplitsCard({ splits }) {
  if (!splits || splits.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>PARCIALES</Text>
        <Text style={styles.footnote}>Sin parciales para este recorrido</Text>
        <Brand />
      </View>
    );
  }
  const full = splits.filter((s) => !s.partial);
  const fastest = full.length > 0 ? Math.min(...full.map((s) => s.seconds)) : 1;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>TIEMPOS PARCIALES</Text>
      <Text style={styles.sectionTitle}>Por km</Text>
      {splits.map((s) => {
        const barW = s.seconds > 0 ? Math.max(10, (fastest / s.seconds) * MAX_BAR) : 10;
        const paceText = s.partial ? formatPace(s.meters, s.seconds) : formatPace(1000, s.seconds);
        const label = s.partial ? `${(s.meters / 1000).toFixed(1)}` : `${s.km}`;
        return (
          <View key={`${s.km}-${s.partial ? 'p' : 'f'}`} style={styles.splitRow}>
            <Text style={styles.splitKm}>{label}</Text>
            <View style={styles.splitBarArea}>
              <View style={[styles.splitBar, { width: barW }]} />
            </View>
            <Text style={styles.splitPace}>{paceText}</Text>
          </View>
        );
      })}
      <Brand />
    </View>
  );
}

export function RouteCard({ points }) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>MI RUTA</Text>
      <RoutePreview points={points} size={260} strokeColor={colors.blue} />
      <Brand />
    </View>
  );
}

export function CompareCard({ comparison }) {
  const c = comparison;
  const last = c ? c.vsLast : null;
  const best = c ? c.best : null;
  const improved = last ? last.paceImprovement >= 0 : false;

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>COMPARACIÓN</Text>
      {!c ? (
        <Text style={styles.compareSub}>Sin datos para comparar aún</Text>
      ) : (
        <>
          {last ? (
            <View style={styles.compareBlock}>
              <Text style={styles.compareTitle}>
                {improved ? 'Mejoraste vs. tu carrera anterior' : 'Más lento que tu carrera anterior'}
              </Text>
              <Text style={[styles.compareDelta, { color: improved ? colors.blue : colors.red }]}>
                {improved ? '▲' : '▼'} {Math.abs(Math.round(last.paceImprovement))} s/km
              </Text>
              <Text style={styles.compareSub}>
                Ritmo antes {formatPace(1000, last.paceBefore)} → hoy {formatPace(1000, c.paceNow)}
              </Text>
              <Text style={styles.compareSub}>
                {last.timeSaved >= 0 ? 'Ahorraste' : 'Perdiste'} {Math.abs(Math.round(last.timeSaved))} s en esta distancia
              </Text>
            </View>
          ) : (
            <Text style={styles.compareSub}>Primera carrera registrada: aquí empieza tu historial</Text>
          )}
          {best ? (
            <View style={styles.compareBlock}>
              <Text style={styles.compareTitle}>
                {best.isNewRecord ? '¡NUEVO RÉCORD en esta distancia!' : 'Tu mejor registro en esta distancia'}
              </Text>
              <Text style={styles.compareSub}>Mejor ritmo anterior: {formatPace(1000, best.pace)} /km</Text>
            </View>
          ) : (
            <Text style={styles.compareSub}>Primer registro de esta distancia</Text>
          )}
        </>
      )}
      <Brand />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  kicker: { color: colors.blue, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4, ...SHADOW },
  sectionTitle: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: 12, ...SHADOW },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  big: { color: colors.white, fontSize: 76, fontWeight: '800', letterSpacing: -2, ...SHADOW },
  bigUnit: { color: colors.white, fontSize: 20, fontWeight: '600', marginBottom: 12, ...SHADOW },
  metricsRow: { flexDirection: 'row', gap: 18, marginTop: 12, justifyContent: 'center' },
  metric: { alignItems: 'center' },
  metricLabel: { color: 'rgba(245,247,250,0.85)', fontSize: 10, letterSpacing: 1, ...SHADOW },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 2 },
  metricValue: { color: colors.white, fontSize: 24, fontWeight: '800', ...SHADOW },
  metricUnit: { color: colors.white, fontSize: 12, marginBottom: 3, ...SHADOW },
  footnote: { color: 'rgba(245,247,250,0.8)', fontSize: 11, marginTop: 12, textAlign: 'center', ...SHADOW },
  brand: { marginTop: 16, backgroundColor: colors.blue, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 6 },
  brandText: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  splitRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 7 },
  splitKm: { color: colors.white, fontSize: 14, fontWeight: '700', width: 34, ...SHADOW },
  splitBarArea: { flex: 1, justifyContent: 'center' },
  splitBar: { height: 14, borderRadius: 7, backgroundColor: colors.blue },
  splitPace: { color: colors.white, fontSize: 14, fontWeight: '700', width: 56, textAlign: 'right', ...SHADOW },
  compareBlock: { alignItems: 'center', marginBottom: 14 },
  compareTitle: { color: colors.white, fontSize: 15, fontWeight: '800', textAlign: 'center', ...SHADOW },
  compareDelta: { fontSize: 32, fontWeight: '800', marginVertical: 4, ...SHADOW },
  compareSub: { color: 'rgba(245,247,250,0.92)', fontSize: 13, textAlign: 'center', marginTop: 4, ...SHADOW },
});
