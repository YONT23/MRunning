import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

// Dibuja la ruta como trazo vectorial, sin mapas ni API keys. Mantiene la
// proporción para que la forma no se deforme.
export default function RoutePreview({ points, size = 120, strokeColor = colors.blue }) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return null;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;
    const padding = size * 0.12;
    const drawable = size - padding * 2;
    const scale = Math.min(drawable / latRange, drawable / lngRange);
    const usedW = lngRange * scale;
    const usedH = latRange * scale;
    const offsetX = (size - usedW) / 2;
    const offsetY = (size - usedH) / 2;
    const coords = points.map((p) => {
      const x = offsetX + (p.longitude - minLng) * scale;
      const y = offsetY + (maxLat - p.latitude) * scale; // latitud mayor = arriba
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      polyline: coords.join(' '),
      start: coords[0].split(','),
      end: coords[coords.length - 1].split(','),
    };
  }, [points, size]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {path ? (
        <Svg width={size} height={size}>
          <Polyline
            points={path.polyline}
            fill="none"
            stroke={strokeColor}
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={path.start[0]} cy={path.start[1]} r={4} fill={colors.white} />
          <Circle cx={path.end[0]} cy={path.end[1]} r={4} fill={colors.red} />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({});
