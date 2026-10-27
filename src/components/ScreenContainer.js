import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

// Contenedor responsivo: en teléfonos usa padding proporcional al ancho; en
// pantallas grandes (700 px o más) limita el ancho del contenido y lo centra.
// Usa el SafeAreaView de react-native-safe-area-context, que sí respeta la
// barra de estado en Android (el de react-native no lo hace).
export default function ScreenContainer({ children, style, edges }) {
  const { width } = useWindowDimensions();
  const isLarge = width >= 700;
  const horizontalPadding = Math.max(16, Math.min(32, width * 0.06));

  return (
    <SafeAreaView style={styles.safe} edges={edges || ['top', 'bottom', 'left', 'right']}>
      <View
        style={[
          styles.inner,
          {
            paddingHorizontal: isLarge ? 0 : horizontalPadding,
            maxWidth: isLarge ? 480 : undefined,
            width: '100%',
            alignSelf: 'center',
          },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1 },
});
