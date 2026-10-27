import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 180;
const WIDTH = 13;
const R = (SIZE - WIDTH) / 2;
const C = 2 * Math.PI * R;

export default function WeeklyRing({
  meters = 0,
  goalKm = 25,
  unit = 'km',
}) {
  const progress = Math.max(
    0,
    Math.min(1, meters / (goalKm * 1000))
  );

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 750,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const offset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C, 0],
  });

  const factor = unit === 'mi' ? 1 / 1609.344 : 1 / 1000;

  return (
    <View style={styles.box}>
      <Svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.border}
          strokeWidth={WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.blue}
          strokeWidth={WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.value}>
          {(meters * factor).toFixed(1)}
        </Text>
        <Text style={styles.unit}>
          {unit} esta semana
        </Text>
        <Text style={styles.goal}>
          Meta: {(goalKm * 1000 * factor).toFixed(1)} {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '800',
  },
  unit: {
    color: colors.textMuted,
    fontSize: 12,
  },
  goal: {
    color: colors.blue,
    fontSize: 11,
    marginTop: 5,
    fontWeight: '700',
  },
});
