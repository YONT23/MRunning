import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { setLastActivity } from '../store/settingsStore';
import { colors, spacing, radius } from '../theme/colors';

export default function ActivityTypeScreen({ navigation }) {
  const choose = async (type) => {
    await setLastActivity(type);
    // El registro en vivo se conecta en la siguiente actualización.
    Alert.alert('Próximamente', 'El registro en vivo llega en la siguiente actualización.');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Atrás</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>¿Qué vas a hacer?</Text>
      <Text style={styles.subtitle}>Elige tu actividad para empezar.</Text>

      <View style={styles.options}>
        <ActivityCard label="Running" hint="Ritmo en min/km, seguimiento continuo" onPress={() => choose('running')} />
        <ActivityCard label="Caminata" hint="Ideal para caminar o trotar suave" onPress={() => choose('walking')} />
      </View>
    </ScreenContainer>
  );
}

function ActivityCard({ label, hint, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.md },
  back: { color: colors.blue, fontSize: 16 },
  title: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  options: { gap: spacing.md, marginTop: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardLabel: { color: colors.white, fontSize: 18, fontWeight: '700' },
  cardHint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  chevron: { color: colors.textFaint, fontSize: 24 },
});
