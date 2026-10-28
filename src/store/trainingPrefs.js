import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mrunning_training_prefs_v2';

export const DEFAULT_PREFS = {
  autoPause: false,
  voice: false,
  vibration: true,
  kilometerAlerts: true,
};

export async function getTrainingPrefs() {
  try {
    const raw = await AsyncStorage.getItem(KEY);

    return {
      ...DEFAULT_PREFS,
      ...(raw ? JSON.parse(raw) : {}),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setTrainingPrefs(values) {
  const next = {
    ...DEFAULT_PREFS,
    ...values,
  };

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(next)
  );

  return next;
}
