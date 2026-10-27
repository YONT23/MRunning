import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing, radius } from '../theme/colors';

// Pantalla provisional de la Parte 2. Se reemplaza en la parte de inicio.
export default function HomeScreen({ navigation }) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Inicio</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardText}>La pantalla de inicio llega en la siguiente parte.</Text>
      </View>
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Settings')}>
        <Text style={styles.linkText}>Ajustes</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.md },
  title: { color: colors.white, fontSize: 24, fontWeight: '800' },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  link: { alignItems: 'center', marginTop: spacing.lg },
  linkText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
});
