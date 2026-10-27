import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import ScreenContainer from '../components/ScreenContainer';
import WeeklyRing from '../components/WeeklyRing';
import { getHistory } from '../store/historyStore';
import {
  getUnits,
  getWeeklyGoalKm,
  setWeeklyGoalKm,
} from '../store/settingsStore';
import { calculateHomeStats } from '../utils/homeStats';
import {
  formatDuration,
  formatPace,
} from '../utils/haversine';
import { colors, spacing, radius } from '../theme/colors';

const EMPTY = calculateHomeStats([]);

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(EMPTY);
  const [unit, setUnit] = useState('km');
  const [goal, setGoal] = useState(25);
  const [draft, setDraft] = useState('25');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        getHistory(),
        getUnits(),
        getWeeklyGoalKm(),
      ])
        .then(([history, u, g]) => {
          if (active) {
            setStats(calculateHomeStats(history));
            setUnit(u);
            setGoal(g);
            setDraft(String(g));
          }
        })
        .catch(() => {
          if (active) {
            Alert.alert(
              'Error',
              'No se pudieron leer las estadísticas locales.'
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  const factor = unit === 'mi' ? 1 / 1609.344 : 1 / 1000;
  const formatted = m => (m * factor).toFixed(1);
  const paceDistance = unit === 'mi' ? 1609.344 : 1000;

  const saveGoal = async () => {
    const n = Number(draft.replace(',', '.'));

    if (!Number.isFinite(n) || n < 1 || n > 500) {
      Alert.alert(
        'Meta inválida',
        'Indica entre 1 y 500 kilómetros semanales.'
      );
      return;
    }

    try {
      await setWeeklyGoalKm(n);
      setGoal(n);
      setModal(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la meta.');
    }
  };

  const maxDay = Math.max(
    1000,
    ...stats.weekdays.map(x => x.meters)
  );

  const pct = Math.round(
    (stats.weekMeters / (goal * 1000)) * 100
  );

  const last = stats.lastActivity;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MRUNNING</Text>
            <Text style={styles.greeting}>
              Tu semana en movimiento
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settings}>Ajustes</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            color={colors.blue}
            size="large"
            style={{ marginTop: 48 }}
          />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.rowBetween}>
                <Text style={styles.section}>
                  PROGRESO SEMANAL
                </Text>

                <TouchableOpacity
                  onPress={() => setModal(true)}
                >
                  <Text style={styles.edit}>
                    Editar meta
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ringRow}>
                <WeeklyRing
                  meters={stats.weekMeters}
                  goalKm={goal}
                  unit={unit}
                />
              </View>

              <Text style={styles.centerText}>
                {pct}% de tu objetivo · {stats.weekCount} actividades
              </Text>

              {pct >= 100 && (
                <Text style={styles.success}>
                  ¡Meta semanal completada!
                </Text>
              )}
            </View>

            <View style={styles.twocol}>
              <View style={styles.smallCard}>
                <Text style={styles.muted}>
                  Tiempo semanal
                </Text>
                <Text style={styles.value}>
                  {formatDuration(stats.weekSeconds)}
                </Text>
              </View>

              <View style={styles.smallCard}>
                <Text style={styles.muted}>
                  Racha actual
                </Text>
                <Text style={styles.value}>
                  {stats.streakDays}{' '}
                  {stats.streakDays === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>
                DISTANCIA POR DÍA
              </Text>

              <View style={styles.chart}>
                {stats.weekdays.map((day, i) => (
                  <View style={styles.day} key={i}>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height:
                              Math.max(
                                day.meters > 0 ? 4 : 0,
                                (day.meters / maxDay) * 100
                              ) + '%',
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.dayLabel}>
                      {day.label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.tip}>
                Semana de lunes a domingo · {unit}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.section}>
                ÚLTIMA ACTIVIDAD
              </Text>

              {last ? (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('HistoryDetail', {
                      id: last.id,
                    })
                  }
                >
                  <Text style={styles.lastTitle}>
                    {last.activityType === 'walking'
                      ? 'Caminata'
                      : 'Carrera'}
                    {' · '}
                    {formatted(last.distance)} {unit}
                  </Text>

                  <Text style={styles.muted}>
                    {new Date(last.date).toLocaleDateString('es-CO')}
                    {' · '}
                    {formatDuration(last.elapsed)}
                    {' · '}
                    {formatPace(
                      1000,
                      last.elapsed /
                        (last.distance / paceDistance)
                    )}{' '}
                    /{unit}
                  </Text>

                  <Text style={styles.edit}>
                    Ver detalle ›
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.muted}>
                  Aún no hay recorridos. Tu próxima salida aparecerá aquí.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.cta}
              onPress={() =>
                navigation.navigate('ActivityType')
              }
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>
                + Iniciar recorrido
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={modal}
        transparent
        animationType="fade"
        onRequestClose={() => setModal(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              Meta semanal
            </Text>

            <Text style={styles.muted}>
              Especifica la distancia en kilómetros.
            </Text>

            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => setModal(false)}
                style={styles.action}
              >
                <Text style={styles.muted}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveGoal}
                style={[styles.action, styles.save]}
              >
                <Text style={styles.ctaText}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  greeting: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 5,
  },
  settings: {
    color: colors.blue,
    fontWeight: '600',
  },
  hero: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  edit: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  ringRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  centerText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  success: {
    color: '#4ADE80',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  twocol: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  smallCard: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  value: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 7,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  chart: {
    height: 125,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  day: {
    width: '11%',
    alignItems: 'center',
  },
  track: {
    height: 98,
    width: 20,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    backgroundColor: colors.blue,
    borderRadius: 5,
    minHeight: 0,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  tip: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  lastTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  cta: {
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
    padding: 16,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 20,
  },
  dialogTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.white,
    fontSize: 20,
    padding: 12,
    marginVertical: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  action: {
    padding: 12,
  },
  save: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
  },
});
