import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../components/ScreenContainer';
import RoutePreview from '../components/RoutePreview';
import { getHistory } from '../store/historyStore';
import { formatDistance, formatDuration, formatPace } from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function shortDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  // Se recarga cada vez que la pestaña vuelve a estar a la vista.
  useFocusEffect(
    useCallback(() => {
      getHistory().then(setHistory);
    }, [])
  );

  const totalKm = history.reduce((sum, e) => sum + e.distance, 0) / 1000;

  return (
    <ScreenContainer>
      <Text style={styles.title}>Historial</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.pills}>
            <Pill value={`${history.length}`} label="Recorridos" />
            <Pill value={`${totalKm.toFixed(1)} km`} label="Total" />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aún no tienes recorridos. Termina uno para verlo aquí.
          </Text>
        }
        renderItem={({ item }) => (
          <Row item={item} onPress={() => navigation.navigate('HistoryDetail', { id: item.id })} />
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

function Pill({ value, label }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function Row({ item, onPress }) {
  const label = item.activityType === 'walking' ? 'Caminata' : 'Running';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <RoutePreview points={item.routePreview} size={52} strokeColor={colors.blue} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={styles.rowTitle}>
          {label} · {formatDistance(item.distance)} km
        </Text>
        <Text style={styles.rowSub}>
          {shortDate(item.date)} · {formatDuration(item.elapsed)} · {formatPace(item.distance, item.elapsed)} /km
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: 22, fontWeight: '800', paddingVertical: spacing.md },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pillValue: { color: colors.white, fontSize: 20, fontWeight: '800' },
  pillLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  chevron: { color: colors.textFaint, fontSize: 20, marginLeft: spacing.xs },
});
