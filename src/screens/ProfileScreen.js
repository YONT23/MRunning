import React, {
  useCallback,
  useState,
} from 'react';

import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import ScreenContainer from '../components/ScreenContainer';
import { getHistory } from '../store/historyStore';

import {
  getUnits,
  getWeeklyGoalKm,
  setWeeklyGoalKm,
} from '../store/settingsStore';

import {
  getProfile,
  saveProfile,
} from '../store/profileStore';

import {
  normalizeProfileDraft,
} from '../utils/profileValidation';

import {
  colors,
  spacing,
  radius,
} from '../theme/colors';

const EMPTY_PROFILE = {
  name: '',
  weightKg: null,
  photoUri: null,
};

const PHOTO_DIR =
  FileSystem.documentDirectory + 'mrunning-profile/';

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

function initials(name) {
  const parts = name.trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.length
    ? parts.slice(0, 2)
        .map(s => s[0].toUpperCase())
        .join('')
    : 'MR';
}

export default function ProfileScreen({ navigation }) {
  const [saved, setSaved] = useState(EMPTY_PROFILE);

  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('25');

  const [photoUri, setPhotoUri] = useState(null);
  const [units, setUnits] = useState('km');

  const [summary, setSummary] = useState({
    count: 0,
    meters: 0,
    longest: 0,
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Actualizar el perfil al abrir la pestaña.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);

      Promise.all([
        getProfile(),
        getWeeklyGoalKm(),
        getUnits(),
        getHistory(),
      ])
        .then(async ([
          profile,
          weekly,
          selectedUnits,
          history,
        ]) => {
          if (!active) return;

          let picture = profile.photoUri;

          if (picture) {
            const info =
              await FileSystem.getInfoAsync(picture);

            if (!info.exists) picture = null;
          }

          if (!active) return;

          setSaved(profile);
          setName(profile.name);

          setWeight(
            profile.weightKg == null
              ? ''
              : String(profile.weightKg)
          );

          setGoal(String(weekly));
          setPhotoUri(picture);

          setUnits(
            selectedUnits === 'mi' ? 'mi' : 'km'
          );

          const valid = (
            Array.isArray(history) ? history : []
          ).filter(
            e =>
              Number.isFinite(e.distance) &&
              e.distance > 0 &&
              Number.isFinite(e.elapsed) &&
              e.elapsed > 0
          );

          setSummary({
            count: valid.length,

            meters: valid.reduce(
              (sum, e) => sum + e.distance,
              0
            ),

            longest: valid.reduce(
              (max, e) => Math.max(max, e.distance),
              0
            ),
          });
        })
        .catch(() => {
          if (active) {
            Alert.alert(
              'Error',
              'No se pudieron cargar los datos del perfil.'
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

  // Seleccionar y guardar la fotografía.
  const choosePhoto = async () => {
    if (busy) return;

    setBusy(true);
    let newUri = null;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Permite seleccionar fotografías para cambiar tu avatar.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,

          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

      if (
        result.canceled ||
        !result.assets?.[0]?.uri
      ) return;

      const asset = result.assets[0];

      await FileSystem.makeDirectoryAsync(
        PHOTO_DIR,
        { intermediates: true }
      );

      const extension = (
        asset.fileName || asset.uri
      ).split('.').pop()?.toLowerCase();

      const suffix = [
        'png',
        'jpg',
        'jpeg',
        'webp',
        'heic',
      ].includes(extension)
        ? extension
        : 'jpg';

      newUri =
        PHOTO_DIR +
        'avatar-' +
        Date.now() +
        '.' +
        suffix;

      await FileSystem.copyAsync({
        from: asset.uri,
        to: newUri,
      });

      const updated = await saveProfile({
        ...saved,
        photoUri: newUri,
      });

      const previous = saved.photoUri;

      setSaved(updated);
      setPhotoUri(newUri);

      if (
        previous &&
        previous.startsWith(PHOTO_DIR) &&
        previous !== newUri
      ) {
        FileSystem.deleteAsync(
          previous,
          { idempotent: true }
        ).catch(() => {});
      }
    } catch (e) {
      if (newUri) {
        FileSystem.deleteAsync(
          newUri,
          { idempotent: true }
        ).catch(() => {});
      }

      Alert.alert(
        'Error',
        'No se pudo guardar la fotografía. ' +
          (e.message || '')
      );
    } finally {
      setBusy(false);
    }
  };

  // Quitar foto sin borrar el resto del perfil.
  const removePhoto = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const old = saved.photoUri;

      const updated = await saveProfile({
        ...saved,
        photoUri: null,
      });

      setSaved(updated);
      setPhotoUri(null);

      if (old && old.startsWith(PHOTO_DIR)) {
        FileSystem.deleteAsync(
          old,
          { idempotent: true }
        ).catch(() => {});
      }
    } catch (e) {
      Alert.alert(
        'Error',
        'No se pudo quitar la fotografía.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Guardar datos personales y meta compartida con Inicio.
  const save = async () => {
    if (busy) return;

    let values;

    try {
      values = normalizeProfileDraft(
        name,
        weight,
        goal
      );
    } catch (e) {
      Alert.alert('Revisa los datos', e.message);
      return;
    }

    setBusy(true);

    try {
      const updated = await saveProfile({
        name: values.name,
        weightKg: values.weightKg,
        photoUri,
      });

      await setWeeklyGoalKm(values.goalKm);

      setSaved(updated);
      setName(updated.name);

      setWeight(
        updated.weightKg == null
          ? ''
          : String(updated.weightKg)
      );

      setGoal(String(values.goalKm));

      Alert.alert(
        'Perfil guardado',
        'Tus datos y tu meta semanal se actualizaron.'
      );
    } catch (e) {
      Alert.alert(
        'Error',
        'No se pudieron guardar todos los cambios. Inténtalo de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  };

  const divisor =
    units === 'mi' ? 1609.344 : 1000;

  const distance = meters =>
    (meters / divisor).toFixed(1) + ' ' + units;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          MRUNNING · PERFIL
        </Text>

        <Text style={styles.title}>
          Mi perfil
        </Text>

        <Text style={styles.subtitle}>
          Personaliza tu experiencia deportiva.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.blue}
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarLetters}>
                    {initials(name)}
                  </Text>
                )}
              </View>

              <Text style={styles.avatarTitle}>
                {name.trim() || 'Corredor MRunning'}
              </Text>

              <TouchableOpacity
                disabled={busy}
                style={styles.photoButton}
                onPress={choosePhoto}
              >
                <Text style={styles.photoButtonText}>
                  {photoUri
                    ? 'Cambiar fotografía'
                    : 'Añadir fotografía'}
                </Text>
              </TouchableOpacity>

              {photoUri ? (
                <TouchableOpacity
                  disabled={busy}
                  onPress={removePhoto}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>
                    Quitar fotografía
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>
              RESUMEN DE ACTIVIDAD
            </Text>

            <View style={styles.statsRow}>
              <Stat
                label="Actividades"
                value={String(summary.count)}
              />

              <Stat
                label="Distancia total"
                value={distance(summary.meters)}
              />

              <Stat
                label="Mayor recorrido"
                value={distance(summary.longest)}
              />
            </View>

            <Text style={styles.sectionTitle}>
              DATOS PERSONALES
            </Text>

            <View style={styles.panel}>
              <Text style={styles.label}>
                Nombre del corredor
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textFaint}
                value={name}
                onChangeText={setName}
                maxLength={60}
                autoCapitalize="words"
              />

              <Text style={styles.label}>
                Peso (kg) — opcional
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Ejemplo: 67.5"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />

              <Text style={styles.hint}>
                El peso se guarda para futuras
                estimaciones deportivas. No se
                calculan calorías automáticamente
                en esta parte.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              OBJETIVOS
            </Text>

            <View style={styles.panel}>
              <Text style={styles.label}>
                Meta semanal (km)
              </Text>

              <TextInput
                style={styles.input}
                value={goal}
                onChangeText={setGoal}
                keyboardType="decimal-pad"
                placeholder="25"
                placeholderTextColor={colors.textFaint}
              />

              <Text style={styles.hint}>
                La misma meta aparece en el anillo
                de progreso de Inicio. Se guarda
                siempre en kilómetros.
              </Text>
            </View>

            <TouchableOpacity
              disabled={busy}
              onPress={save}
              style={[
                styles.saveButton,
                busy && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.saveText}>
                {busy
                  ? 'Guardando...'
                  : 'Guardar perfil y meta'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Settings')
              }
              style={styles.settingsButton}
            >
              <Text style={styles.settingsText}>
                Ajustes de unidades (km / mi) ›
              </Text>
            </TouchableOpacity>

            <Text style={styles.privacy}>
              Tu perfil y fotografía se guardan
              en este dispositivo. No requieren
              cuenta ni se envían a un servidor
              desde esta pantalla.
            </Text>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
    paddingBottom: 60,
  },
  brand: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 3,
    borderColor: colors.blue,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetters: {
    color: colors.white,
    fontSize: 37,
    fontWeight: '800',
  },
  avatarTitle: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 20,
    marginTop: 12,
    textAlign: 'center',
  },
  photoButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.pill,
    marginTop: 14,
  },
  photoButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  removeButton: {
    padding: 10,
    marginTop: 2,
  },
  removeText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    minHeight: 77,
  },
  statValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  panel: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 20,
  },
  label: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.white,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  hint: {
    color: colors.textMuted,
    lineHeight: 17,
    fontSize: 11,
    marginTop: -5,
  },
  saveButton: {
    backgroundColor: colors.blue,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  settingsButton: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  settingsText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  privacy: {
    color: colors.textFaint,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
});
