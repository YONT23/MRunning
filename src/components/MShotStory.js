import React from 'react';

import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';

import Svg, {
  Path,
  Circle,
} from 'react-native-svg';

import { routeGeometry } from '../utils/mshotRoute';

import {
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/haversine';

const BLUE = '#2E6BFF';
const WHITE = '#F5F7FA';

function RouteGraphic({ points }) {
  const geometry = routeGeometry(points, 900, 960);

  return (
    <View style={styles.routeContainer}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 900 960"
        preserveAspectRatio="xMidYMid meet"
      >
        {geometry.paths.map((line, index) => {
          const d = line
            .map(
              (point, i) =>
                `${i === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
            )
            .join(' ');

          return (
            <Path
              key={index}
              d={d}
              fill="none"
              stroke={BLUE}
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {geometry.start && (
          <Circle
            cx={geometry.start.x}
            cy={geometry.start.y}
            r="15"
            fill="#21C98B"
            stroke={WHITE}
            strokeWidth="5"
          />
        )}

        {geometry.end && (
          <Circle
            cx={geometry.end.x}
            cy={geometry.end.y}
            r="15"
            fill="#E93B3B"
            stroke={WHITE}
            strokeWidth="5"
          />
        )}
      </Svg>

      {geometry.paths.length === 0 && (
        <Text style={styles.empty}>
          No hay suficientes puntos GPS válidos
        </Text>
      )}
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text
        style={styles.metricValue}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function MShotStory({
  entry,
  points,
  photoUri,
  kind,
  transparent = false,
}) {
  const distance = Number(entry?.distance) || 0;
  const elapsed = Number(entry?.elapsed) || 0;

  const km = `${formatDistance(distance)} km`;
  const pace = `${formatPace(distance, elapsed)} /km`;
  const time = formatDuration(elapsed);

  const elevation =
    `${Math.round(Number(entry?.elevationGain) || 0)} m`;

  const splits = Array.isArray(entry?.splits)
    ? entry.splits.slice(0, 12)
    : [];

  const maxSeconds = Math.max(
    1,
    ...splits.map(item => Number(item.seconds) || 0)
  );

  return (
    <View
      style={[styles.story, transparent && styles.transparentStory]}
      collapsable={false}
    >
      {photoUri && (
        <Image
          source={{ uri: photoUri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
        />
      )}

      {!transparent && <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: photoUri
              ? 'rgba(0,0,0,0.58)'
              : '#0A0C10',
          },
        ]}
      />}

      {kind !== 'dataOnly' && <View style={styles.top}>
        <Text style={styles.brand}>
          MRUNNING
        </Text>

        <Text style={styles.subtitle}>
          PREMIUM MOTION · MSHOT
        </Text>
      </View>}

      {kind === 'dataOnly' && (
        <View style={styles.dataOnlyWrap}>
          <View style={styles.dataOnlyGroup}>
            <View style={styles.slashes}>
              <Text style={styles.slashText}>╱\n╱\n╱</Text>
            </View>
            <View style={styles.dataOnlyText}>
              <Text style={styles.dataOnlyNumber}>{km}</Text>
              <Text style={styles.dataOnlyLabel}>DISTANCIA</Text>
            </View>
          </View>
          <View style={styles.dataOnlyGroup}>
            <View style={styles.slashes}>
              <Text style={styles.slashText}>╱\n╱\n╱</Text>
            </View>
            <View style={styles.dataOnlyText}>
              <Text style={styles.dataOnlyNumber}>{time}</Text>
              <Text style={styles.dataOnlyLabel}>TIEMPO</Text>
            </View>
          </View>
          <View style={styles.dataOnlyGroup}>
            <View style={styles.slashes}>
              <Text style={styles.slashText}>╱\n╱\n╱</Text>
            </View>
            <View style={styles.dataOnlyText}>
              <Text style={styles.dataOnlyNumber}>{pace}</Text>
              <Text style={styles.dataOnlyLabel}>RITMO</Text>
            </View>
          </View>
          <View style={styles.dataOnlyBadge}>
            <Text style={styles.dataOnlyBrand}>MRUNNING</Text>
          </View>
        </View>
      )}

      {kind === 'route' && (
        <>
          <Text style={styles.heading}>
            MI RECORRIDO
          </Text>

          <RouteGraphic points={points} />

          <View style={styles.metricsGrid}>
            <Metric label="DISTANCIA" value={km} />
            <Metric label="RITMO" value={pace} />
            <Metric label="TIEMPO" value={time} />
          </View>
        </>
      )}

      {kind === 'routeStats' && (
        <>
          <Text style={styles.heading}>
            RUTA Y ESTADÍSTICAS
          </Text>

          <RouteGraphic points={points} />

          <View style={styles.metricsGrid}>
            <Metric label="DISTANCIA" value={km} />
            <Metric label="RITMO" value={pace} />
            <Metric label="DURACIÓN" value={time} />
            <Metric label="DESNIVEL" value={elevation} />
          </View>
        </>
      )}

      {kind === 'stats' && (
        <>
          <Text style={styles.heading}>
            MI ENTRENAMIENTO
          </Text>

          <View style={styles.centerMetrics}>
            <Metric label="DISTANCIA" value={km} />
            <Metric label="RITMO MEDIO" value={pace} />
            <Metric label="DURACIÓN" value={time} />
            <Metric label="DESNIVEL" value={elevation} />
          </View>
        </>
      )}

      {kind === 'splits' && (
        <>
          <Text style={styles.heading}>
            PARCIALES POR KILÓMETRO
          </Text>

          <View style={styles.splitsContainer}>
            {splits.length > 0 ? (
              splits.map((split, index) => {
                const seconds =
                  Number(split.seconds) || 0;

                const meters =
                  Number(split.meters) || 1000;

                const barWidth = Math.max(
                  5,
                  Math.min(
                    100,
                    (seconds / maxSeconds) * 100
                  )
                );

                return (
                  <View
                    key={index}
                    style={styles.splitRow}
                  >
                    <Text style={styles.splitKm}>
                      {split.partial
                        ? '•'
                        : String(split.km || index + 1)}
                    </Text>

                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            width: `${barWidth}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.splitPace}>
                      {formatPace(meters, seconds)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.empty}>
                Este entrenamiento no tiene parciales.
              </Text>
            )}
          </View>
        </>
      )}

      {kind !== 'dataOnly' && <View style={styles.footer}>
        <View style={styles.footerLine} />

        <Text style={styles.footerText}>
          CADA KILÓMETRO CUENTA
        </Text>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  transparentStory: {
    backgroundColor: 'transparent',
  },

  dataOnlyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  dataOnlyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
  },

  slashes: {
    width: 43,
    justifyContent: 'center',
  },

  slashText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 27,
  },

  dataOnlyText: {
    flex: 1,
  },

  dataOnlyNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },

  dataOnlyLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
    letterSpacing: 1,
  },

  dataOnlyBadge: {
    backgroundColor: '#2E6BFF',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 13,
    alignSelf: 'flex-start',
    marginLeft: 43,
    marginTop: 3,
  },

  dataOnlyBrand: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2,
  },

  story: {
    width: 360,
    height: 640,
    overflow: 'hidden',
    backgroundColor: '#0A0C10',
    paddingHorizontal: 25,
  },

  top: {
    marginTop: 42,
    alignItems: 'center',
  },

  brand: {
    color: WHITE,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2,
  },

  subtitle: {
    color: '#AAB8D0',
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 4,
  },

  heading: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 26,
  },

  routeContainer: {
    height: 320,
    justifyContent: 'center',
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
    marginTop: 6,
  },

  metric: {
    alignItems: 'center',
    minWidth: 120,
    marginVertical: 8,
  },

  metricLabel: {
    color: '#CED5E2',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  metricValue: {
    color: WHITE,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 5,
  },

  centerMetrics: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },

  splitsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  splitKm: {
    color: WHITE,
    width: 20,
    fontSize: 14,
  },

  barTrack: {
    flex: 1,
    height: 13,
  },

  bar: {
    height: 13,
    backgroundColor: BLUE,
    borderRadius: 7,
  },

  splitPace: {
    color: WHITE,
    width: 66,
    textAlign: 'right',
    fontWeight: '700',
  },

  footer: {
    position: 'absolute',
    bottom: 33,
    left: 25,
    right: 25,
    alignItems: 'center',
  },

  footerLine: {
    width: 60,
    height: 2,
    backgroundColor: BLUE,
    marginBottom: 12,
  },

  footerText: {
    color: '#AAB8D0',
    fontSize: 10,
    letterSpacing: 2,
  },

  empty: {
    color: WHITE,
    textAlign: 'center',
  },
});
