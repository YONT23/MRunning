import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export function HomeIcon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function HistoryIcon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="13" r="8" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M12 9 V13 L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 2 H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function ProgressIcon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="13" width="3.5" height="7" rx="1" fill={color} />
      <Rect x="10.2" y="8" width="3.5" height="12" rx="1" fill={color} />
      <Rect x="16.5" y="4" width="3.5" height="16" rx="1" fill={color} />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M4 20 C4 15.5 7.5 13 12 13 C16.5 13 20 15.5 20 20" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function PlusIcon({ color, size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4 V20 M4 12 H20" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}
