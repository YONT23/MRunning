import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'mrunning_profile_v1';

const DEFAULT_PROFILE = {
  name: '',
  weightKg: null,
  photoUri: null,
};

export async function getProfile() {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);

  if (!raw) return { ...DEFAULT_PROFILE };

  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object') {
    return { ...DEFAULT_PROFILE };
  }

  return {
    name: typeof parsed.name === 'string'
      ? parsed.name
      : '',

    weightKg:
      Number.isFinite(parsed.weightKg) &&
      parsed.weightKg >= 20 &&
      parsed.weightKg <= 350
        ? parsed.weightKg
        : null,

    photoUri: typeof parsed.photoUri === 'string'
      ? parsed.photoUri
      : null,
  };
}

export async function saveProfile(profile) {
  const name = String(profile.name ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  const weightKg = profile.weightKg == null
    ? null
    : Number(profile.weightKg);

  if (name.length > 60) {
    throw new Error('Nombre demasiado largo.');
  }

  if (
    weightKg != null &&
    (!Number.isFinite(weightKg) ||
      weightKg < 20 ||
      weightKg > 350)
  ) {
    throw new Error('Peso fuera del rango admitido.');
  }

  const next = {
    name,
    weightKg,
    photoUri: typeof profile.photoUri === 'string'
      ? profile.photoUri
      : null,
  };

  await AsyncStorage.setItem(
    PROFILE_KEY,
    JSON.stringify(next)
  );

  return next;
}
