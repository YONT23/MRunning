import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { getUnits, setUnits } from '../store/settingsStore';
import { colors, spacing, radius } from '../theme/colors';

export default function SettingsScreen({ navigation }) {
  const [units, setUnitsState] = useState('km');

  useEffect(() => {
    getUnits().then(setUnitsState);
  }, []);

  const choose = useCallback(async (u) => {
    setUnitsState(u);
    await setUnits(u);
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ajustes</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.sectionLabel}>Unidades de distancia</Text>
      <View style={styles.optionRow}>
        <Option label="Kilómetros" active={units === 'km'} onPress={() => choose('km')} />
        <Option label="Millas" active={units === 'mi'} onPress={() => choose('mi')} />
      </View>

      <Text style={styles.note}>Los cambios se aplican al siguiente recorrido.</Text>
    </ScreenContainer>
  );
}

function Option({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.option, active && styles.optionActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
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
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionActive: { borderColor: colors.blue, backgroundColor: 'rgba(46,107,255,0.12)' },
  optionText: { color: colors.textMuted, fontWeight: '600' },
  optionTextActive: { color: colors.white },
  note: { color: colors.textFaint, fontSize: 12, marginTop: spacing.lg },
});
