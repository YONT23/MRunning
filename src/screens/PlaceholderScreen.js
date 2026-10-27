import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing } from '../theme/colors';

// Pantalla provisional para las pestañas que llegan en partes siguientes.
export default function PlaceholderScreen({ title }) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.text}>Esta sección llega pronto.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.md },
  title: { color: colors.white, fontSize: 24, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 14, marginTop: spacing.lg },
});
