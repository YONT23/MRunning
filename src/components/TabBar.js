import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, HistoryIcon, ProgressIcon, ProfileIcon, PlusIcon } from './TabIcons';
import { colors } from '../theme/colors';

const LABELS = { Inicio: 'Inicio', Historial: 'Historial', Progreso: 'Progreso', Perfil: 'Perfil' };
const ICONS = {
  Inicio: (c) => <HomeIcon color={c} />,
  Historial: (c) => <HistoryIcon color={c} />,
  Progreso: (c) => <ProgressIcon color={c} />,
  Perfil: (c) => <ProfileIcon color={c} />,
};

// Barra de pestañas propia. Son 5 espacios de igual ancho; el botón "+"
// ocupa el del medio, así queda centrado por construcción (flexbox normal),
// sin posicionamiento absoluto.
export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        if (route.name === 'Nuevo') {
          return (
            <View key={route.key} style={styles.slot}>
              <TouchableOpacity
                style={styles.plus}
                onPress={() => navigation.navigate('ActivityType')}
                activeOpacity={0.85}
              >
                <PlusIcon color={colors.white} size={26} />
              </TouchableOpacity>
            </View>
          );
        }
        const color = state.index === index ? colors.blue : colors.textFaint;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.slot}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            {ICONS[route.name](color)}
            <Text style={[styles.label, { color }]}>{LABELS[route.name]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  slot: { flex: 1, alignItems: 'center' },
  label: { fontSize: 10.5, fontWeight: '600', marginTop: 4 },
  plus: {
    marginTop: -22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
