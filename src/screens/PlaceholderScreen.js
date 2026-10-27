import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { colors, spacing } from '../theme/colors';

export default function PlaceholderScreen({
  title = 'Próximamente',
}) {
  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>
          Estamos preparando esta sección de MRunning.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  note: {
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
});
