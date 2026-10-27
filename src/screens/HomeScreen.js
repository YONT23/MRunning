import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing, radius } from '../theme/colors';

export default function HomeScreen({ navigation }) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={10}>
          <Text style={styles.settings}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.kicker}>LISTO PARA CORRER</Text>
        <Text style={styles.heroTitle}>Sal a moverte</Text>
        <Text style={styles.heroText}>
          El GPS registra tu ruta aunque bloquees la pantalla.
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('ActivityType')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Iniciar recorrido</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  greeting: { color: colors.white, fontSize: 26, fontWeight: '800' },
  settings: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  hero: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  kicker: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  heroText: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  cta: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
