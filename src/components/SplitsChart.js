import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPace } from '../utils/haversine';
import { colors, spacing } from '../theme/colors';

// Barras de ritmo por km. La barra más larga es el km más rápido.
export default function SplitsChart({ splits }) {
  if (!splits || splits.length === 0) {
    return <Text style={styles.empty}>Sin parciales para este recorrido.</Text>;
  }
  const full = splits.filter((s) => !s.partial);
  const fastest = full.length > 0 ? Math.min(...full.map((s) => s.seconds)) : 1;

  return (
    <View>
      {splits.map((s) => {
        const barW = s.seconds > 0 ? Math.max(8, (fastest / s.seconds) * 180) : 8;
        const label = s.partial ? `${(s.meters / 1000).toFixed(1)}` : `${s.km}`;
        const pace = s.partial ? formatPace(s.meters, s.seconds) : formatPace(1000, s.seconds);
        return (
          <View key={`${s.km}-${s.partial ? 'p' : 'f'}`} style={styles.row}>
            <Text style={styles.km}>{label}</Text>
            <View style={styles.barArea}>
              <View style={[styles.bar, { width: barW }]} />
            </View>
            <Text style={styles.pace}>{pace}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  km: { color: colors.white, fontSize: 13, fontWeight: '700', width: 34 },
  barArea: { flex: 1 },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.blue },
  pace: { color: colors.white, fontSize: 13, fontWeight: '700', width: 56, textAlign: 'right' },
});
