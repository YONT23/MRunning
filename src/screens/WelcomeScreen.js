import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { setOnboarded } from '../store/settingsStore';
import { colors, spacing, radius } from '../theme/colors';

export default function WelcomeScreen({ navigation }) {
  const start = async () => {
    await setOnboarded();
    navigation.replace('MainTabs');
  };

  return (
    <ScreenContainer>
      <View style={styles.top}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>MRunning</Text>
        <Text style={styles.subtitle}>
          Registra tu ruta con GPS, incluso con la pantalla bloqueada.
        </Text>
      </View>

      <View style={styles.features}>
        <Feature text="Distancia, tiempo y ritmo en vivo" />
        <Feature text="Sigue funcionando en segundo plano" />
        <Feature text="Tarjetas para compartir con fondo transparente" />
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.cta} onPress={start} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Comenzar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={10}>
          <Text style={styles.settingsLink}>Ajustes</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function Feature({ text }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.dot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', marginTop: spacing.xxl },
  logo: { width: 96, height: 96, borderRadius: 22 },
  title: { color: colors.white, fontSize: 28, fontWeight: '800', marginTop: spacing.lg, letterSpacing: -0.5 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  features: { gap: spacing.md, marginTop: spacing.xxl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  featureText: { color: colors.white, fontSize: 15, flex: 1 },
  bottom: { marginTop: 'auto', paddingBottom: spacing.md },
  cta: {
    backgroundColor: colors.blue,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  ctaText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  settingsLink: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.md, fontSize: 13 },
});
